# API Caching with Node.js and Redis

This project demonstrates the implementation of caching in a Node.js API using Redis, showcasing the performance benefits that caching can bring to your application.

## 🚀 Requirements

- Node.js (version 14 or higher)
- Redis Server
- npm or yarn

## 🔧 Installation

1. Clone the repository:
```bash
git clone [your-repository]
cd api-caching-nodejs
```

2. Install dependencies:
```bash
npm install
```

3. Configure Redis:
- Make sure Redis is installed and running on your machine
- Redis should be running on port 6379 (default configuration)

4. Configure environment variables:
- The `.env` file is already configured with default settings
- You can adjust the settings as needed

## 🏃‍♂️ How to Run

1. Start the server:
```bash
node index.js
```

2. The API will be available at `http://localhost:3000`

## 📚 Endpoints

- `GET /api/posts`: Returns a list of posts
- `DELETE /api/cache`: Clears the cache

## 🔄 Practical Examples

### Example 1: First Request (No Cache)
```bash
# First request to /api/posts
curl http://localhost:3000/api/posts
```

Server logs will show:
```
Fetching from external API
```

Response time: ~200-300ms (varies based on network conditions)

### Example 2: Second Request (With Cache)
```bash
# Second request to /api/posts (immediately after first request)
curl http://localhost:3000/api/posts
```

Server logs will show:
```
Serving from cache
```

Response time: ~1-5ms (much faster!)

### Example 3: Clearing Cache
```bash
# Clear the cache
curl -X DELETE http://localhost:3000/api/cache
```

Response:
```json
{
    "message": "Cache cleared successfully"
}
```

### Example 4: Request After Cache Clear
```bash
# Request after cache clear
curl http://localhost:3000/api/posts
```

Server logs will show:
```
Fetching from external API
```

### Cache Behavior Timeline

1. **Initial State (No Cache)**
   - First request hits the external API
   - Data is stored in Redis cache
   - Response time is slower

2. **Cached State**
   - Subsequent requests serve data from Redis
   - No external API calls
   - Much faster response times
   - Cache persists for 1 hour (TTL)

3. **Cache Clear**
   - DELETE request to `/api/cache` removes cached data
   - Next request will fetch fresh data from external API

4. **Cache Expiration**
   - After 1 hour (TTL), cache automatically expires
   - Next request will fetch fresh data from external API

### Visual Representation

```
Request 1 (No Cache)
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Server    │────▶│ External API│
└─────────────┘     └─────────────┘     └─────────────┘
                         │
                         ▼
                    ┌─────────────┐
                    │   Redis     │
                    │   Cache     │
                    └─────────────┘

Request 2 (With Cache)
┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Server    │
└─────────────┘     └─────────────┘
                         │
                         ▼
                    ┌─────────────┐
                    │   Redis     │
                    │   Cache     │
                    └─────────────┘
```

## 💡 Cache Benefits

### 1. Performance
- **Reduced Latency**: Cached data is served directly from memory, eliminating the need for database queries or external API calls.
- **Response Time**: Cached responses are served in milliseconds, while external API calls can take hundreds of milliseconds.

### 2. Scalability
- **Reduced Load**: Cache significantly reduces the load on the origin server, allowing it to handle more requests.
- **Resource Efficiency**: Less processing is required on the origin server, saving computational resources.

### 3. Availability
- **Resilience**: Even if the external API is temporarily unavailable, the cache can continue serving data.
- **Consistency**: Frequently accessed data remains available even in high-demand situations.

### 4. Cost Efficiency
- **Cost Reduction**: Fewer external API calls mean less resource consumption and potentially lower costs for external services.
- **Infrastructure Optimization**: Reduced need to scale infrastructure due to decreased load.

## 📊 Efficiency Demonstration

To demonstrate cache efficiency, you can:

1. Make a first call to the `/api/posts` endpoint:
   - Observe the "Fetching from external API" log
   - Note the response time

2. Make a second call immediately:
   - Observe the "Serving from cache" log
   - Compare the response time with the first call

3. Clear the cache using `DELETE /api/cache` and repeat the test

## 🔄 Cache Strategies

This project implements a basic caching strategy with:
- TTL (Time To Live) of 1 hour
- In-memory cache using Redis
- Manual cache invalidation

## 📝 Best Practices

1. **Appropriate TTL**: Configure TTL based on data update frequency
2. **Invalidation**: Implement appropriate cache invalidation strategies
3. **Monitoring**: Monitor cache usage and adjust as needed
4. **Fallback**: Always have a fallback plan in case the cache fails
