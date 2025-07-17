require('dotenv').config()
require('./tracing')
const express = require('express')
const redis = require('redis')
const axios = require('axios')
const { trace, SpanStatusCode, diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api')

// Configurar o logger do OpenTelemetry
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO)

const app = express()
const port = process.env.API_PORT || 3000

const redisClient = redis.createClient({
	host: process.env.REDIS_HOST,
	port: process.env.REDIS_PORT
})

redisClient.on('error', (err) => {
	const span = trace.getActiveSpan()
	if (span) {
		span.recordException(err)
		span.setStatus({ code: SpanStatusCode.ERROR, message: err.message })
		span.addEvent('Redis connection error', { error: err.message })
	}
	diag.error('Redis Client Error', err)
})

redisClient.connect()

app.use(express.json())

const MAX_AGE_SECONDS = 3600 
const STALE_KEY = 'posts::stale' 

app.get('/api/posts', async (req, res) => {
	const tracer = trace.getTracer('api-caching-nodejs')
	const span = tracer.startSpan('get-posts')

	try {
		const cached = await redisClient.get('posts')

		if (cached) {
			span.addEvent('Cache hit (stale-while-revalidate)')
			span.setAttribute('cache.hit', true)
			span.addEvent('Serving stale cache')
			diag.info('Serving stale cache')

			setTimeout(async () => {
				try {
					const revalidationSpan = tracer.startSpan('background-cache-revalidation')
					revalidationSpan.addEvent('Starting background cache revalidation')
					diag.info('Revalidating cache in background...')
					
					const response = await axios.get('https://jsonplaceholder.typicode.com/posts')
					await redisClient.set('posts', JSON.stringify(response.data), { EX: MAX_AGE_SECONDS })
					
					revalidationSpan.addEvent('Cache revalidated successfully')
					revalidationSpan.setStatus({ code: SpanStatusCode.OK })
					diag.info('Cache revalidated.')
					revalidationSpan.end()
				} catch (err) {
					const errorSpan = tracer.startSpan('background-revalidation-error')
					errorSpan.recordException(err)
					errorSpan.setStatus({ code: SpanStatusCode.ERROR, message: err.message })
					errorSpan.addEvent('Background revalidation failed', { error: err.message })
					diag.error('Background revalidation failed:', err.message)
					errorSpan.end()
				}
			}, 0)

			return res.json(JSON.parse(cached))
		}

		span.addEvent('Cache miss')
		span.setAttribute('cache.hit', false)
		diag.info('Fetching from API')

		const response = await axios.get('https://jsonplaceholder.typicode.com/posts')
		await redisClient.set('posts', JSON.stringify(response.data), { EX: MAX_AGE_SECONDS })

		span.setStatus({ code: SpanStatusCode.OK })
		res.json(response.data)
	} catch (error) {
		span.recordException(error)
		span.setStatus({ code: SpanStatusCode.ERROR, message: error.message })
		span.addEvent('Error fetching posts', { error: error.message })
		diag.error('Error:', error)
		res.status(500).json({ error: 'Internal Server Error' })
	} finally {
		span.end()
	}
})

app.delete('/api/cache', async (req, res) => {
	const tracer = trace.getTracer('api-caching-nodejs')
	const span = tracer.startSpan('clear-cache')

	try {
		await redisClient.del('posts')
		span.setStatus({ code: SpanStatusCode.OK })
		span.addEvent('Cache cleared successfully')
		diag.info('Cache cleared successfully')
		res.json({ message: 'Cache cleared successfully' })
	} catch (error) {
		span.recordException(error)
		span.setStatus({ code: SpanStatusCode.ERROR, message: error.message })
		span.addEvent('Error clearing cache', { error: error.message })
		diag.error('Error:', error)
		res.status(500).json({ error: 'Internal Server Error' })
	} finally {
		span.end()
	}
})

app.listen(port, () => {
	diag.info(`Server running on port ${port}`)
})
