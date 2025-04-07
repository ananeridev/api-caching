require('dotenv').config();
const express = require('express');
const redis = require('redis');
const axios = require('axios');

const app = express();
const port = process.env.API_PORT || 3000;

const redisClient = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.connect();

app.use(express.json());

app.get('/api/posts', async (req, res) => {
    try {
        const cachedPosts = await redisClient.get('posts');
        
        if (cachedPosts) {
            console.log('Serving from cache');
            return res.json(JSON.parse(cachedPosts));
        }

        console.log('Fetching from external API');
        const response = await axios.get('https://jsonplaceholder.typicode.com/posts');
        const posts = response.data;

        await redisClient.set('posts', JSON.stringify(posts), {
            EX: 3600 // 1 hour in seconds
        });

        res.json(posts);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.delete('/api/cache', async (req, res) => {
    try {
        await redisClient.del('posts');
        res.json({ message: 'Cache cleared successfully' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 