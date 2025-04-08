require('dotenv').config();
require('./tracing');
const express = require('express');
const redis = require('redis');
const axios = require('axios');
const { trace, context, SpanStatusCode } = require('@opentelemetry/api');

const app = express();
const port = process.env.API_PORT || 3000;

const redisClient = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
});

redisClient.on('error', (err) => {
    const span = trace.getActiveSpan();
    if (span) {
        span.recordException(err);
        span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
    }
    console.log('Redis Client Error', err);
});

redisClient.connect();

app.use(express.json());

app.get('/api/posts', async (req, res) => {
    const tracer = trace.getTracer('api-caching-nodejs');
    const span = tracer.startSpan('get-posts');
    
    try {
        const cachedPosts = await redisClient.get('posts');
        
        if (cachedPosts) {
            span.addEvent('Cache hit');
            span.setAttribute('cache.hit', true);
            console.log('Serving from cache');
            return res.json(JSON.parse(cachedPosts));
        }

        span.addEvent('Cache miss');
        span.setAttribute('cache.hit', false);
        console.log('Fetching from external API');
        
        const response = await axios.get('https://jsonplaceholder.typicode.com/posts');
        const posts = response.data;

        await redisClient.set('posts', JSON.stringify(posts), {
            EX: 3600 // 1 hour in seconds
        });

        span.setStatus({ code: SpanStatusCode.OK });
        res.json(posts);
    } catch (error) {
        span.recordException(error);
        span.setStatus({ 
            code: SpanStatusCode.ERROR, 
            message: error.message 
        });
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        span.end();
    }
});

app.delete('/api/cache', async (req, res) => {
    const tracer = trace.getTracer('api-caching-nodejs');
    const span = tracer.startSpan('clear-cache');
    
    try {
        await redisClient.del('posts');
        span.setStatus({ code: SpanStatusCode.OK });
        res.json({ message: 'Cache cleared successfully' });
    } catch (error) {
        span.recordException(error);
        span.setStatus({ 
            code: SpanStatusCode.ERROR, 
            message: error.message 
        });
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        span.end();
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 