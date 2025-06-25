# Sample Log Backend Service

This project is a backend service designed to collect and process user logs from a client application (e.g., a game). It's built with TypeScript and Node.js, using Express for the API layer.

## Features

-   Accepts log data via a POST API endpoint.
-   Validates incoming log data.
-   Temporarily caches log entries in memory.
-   Periodically flushes cached logs to a database (currently a dummy service printing to console).
-   Configurable log levels for filtering.
-   Graceful shutdown mechanism to ensure logs are processed before exiting.
-   Basic health check endpoint.

## Project Structure

```
sample_log/
├── dist/                     # Compiled JavaScript files (after build)
├── node_modules/             # Project dependencies (after npm install)
├── src/                      # TypeScript source files
│   ├── controllers/          # API route handlers
│   │   └── log.controller.ts
│   ├── interfaces/           # TypeScript interfaces and enums
│   │   └── log.interface.ts
│   ├── services/             # Business logic (caching, DB interaction, logging)
│   │   ├── cache.service.ts
│   │   ├── database.service.ts
│   │   └── logger.service.ts
│   ├── utils/                # Utility functions and configuration
│   │   └── config.ts
│   └── index.ts              # Main application entry point
├── .gitignore
├── package.json
├── package-lock.json
└── tsconfig.json
```

## Setup and Installation

1.  **Clone the repository** (if applicable, or ensure you have the `sample_log` directory).
2.  **Navigate to the project directory**:
    ```bash
    cd sample_log
    ```
3.  **Install dependencies**:
    ```bash
    npm install
    ```
4.  **Compile TypeScript**:
    ```bash
    npm run build
    ```
    This will compile the TypeScript files from `src/` into JavaScript files in the `dist/` directory.

## Running the Service

After successful setup and build:

-   **Start the service**:
    ```bash
    npm start
    ```
    This command typically runs `node dist/index.js`. The server will start, usually on port 3000 (unless configured otherwise via the `PORT` environment variable).

-   **Development mode (with auto-restart on file changes)**:
    ```bash
    npm run dev
    ```
    This uses `tsc-watch` to monitor file changes, recompile, and restart the server.

## Configuration

The application can be configured using environment variables. Key variables include:

-   `NODE_ENV`: Application environment (e.g., `development`, `production`). Defaults to `development`.
-   `PORT`: Port number for the server to listen on. Defaults to `3000`.
-   `LOG_LEVEL`: Minimum log level to process. Options: `debug`, `info`, `warn`, `error`. Defaults to `info`.
-   `CACHE_TYPE`: Type of cache to use. Currently only `in-memory` is fully implemented. Defaults to `in-memory`.
-   `IN_MEMORY_CACHE_MAX_SIZE`: Maximum number of log entries to hold in the in-memory cache. Defaults to `1000`.
-   `IN_MEMORY_CACHE_FLUSH_INTERVAL_MS`: Interval in milliseconds to flush logs from cache to DB. `0` disables time-based flush. Defaults to `60000` (60 seconds).
-   `DATABASE_URL`: Connection string for PostgreSQL (e.g., `postgresql://user:pass@host:port/dbname`).
-   `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: Individual PostgreSQL connection parameters (used if `DATABASE_URL` is not set).
-   `DB_SSL`: Set to `true` if SSL connection to DB is required. Defaults to `false`.
-   (Redis configuration variables like `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT` are also present in `config.ts` for future use.)

Create a `.env` file in the `sample_log` directory for local development, e.g.:
```env
PORT=3001
LOG_LEVEL=debug
IN_MEMORY_CACHE_MAX_SIZE=500
```

## API Endpoints

All endpoints are prefixed with `/api`.

### 1. Submit Logs

-   **Endpoint**: `POST /api/logs`
-   **Description**: Submits a log entry for processing.
-   **Request Body**: JSON object representing a `RawLogEntry`.
    ```json
    {
      "level": "info",               // Required. Enum: "debug", "info", "warn", "error"
      "event": "user_login_success", // Required. String.
      "userId": "user123",           // Optional. String.
      "data": { "source": "mobile" },// Optional. JSON object.
      "clientIp": "192.168.1.10"     // Optional. String.
    }
    ```
-   **Responses**:
    -   `202 Accepted`: Log received and queued for processing.
        ```json
        { "message": "Log received and queued for processing." }
        ```
    -   `400 Bad Request`: Invalid request body (e.g., missing required fields, incorrect types).
        ```json
        { "message": "Invalid or missing log level (level). Must be one of: debug, info, warn, error." }
        ```
    -   `500 Internal Server Error`: If an unexpected error occurs on the server.

### 2. Health Check

-   **Endpoint**: `GET /api/health`
-   **Description**: Checks the health status of the service.
-   **Responses**:
    -   `200 OK`: Service is healthy.
        ```json
        {
          "status": "UP",
          "timestamp": "2023-10-27T10:00:00.000Z",
          "message": "Log service is healthy."
        }
        ```

## Testing (Manual)

As direct automated testing within the development tool environment is limited (due to `npm install` constraints), please perform manual testing in your local environment:

1.  **Ensure the service is running** (after setup and `npm start` or `npm run dev`).
2.  **Use an HTTP client** (like `curl`, Postman, or Insomnia) to send requests to the API endpoints.

### Example `curl` commands:

-   **Health Check**:
    ```bash
    curl http://localhost:3000/api/health
    ```

-   **Submit an INFO log**:
    ```bash
    curl -X POST -H "Content-Type: application/json" \
    -d '{
      "level": "info",
      "event": "test_event_from_curl",
      "userId": "curlUser001",
      "data": { "customData": "some_value", "isTest": true },
      "clientIp": "127.0.0.1"
    }' \
    http://localhost:3000/api/logs
    ```

-   **Submit a DEBUG log (will be filtered out if `LOG_LEVEL` is `info`)**:
    ```bash
    curl -X POST -H "Content-Type: application/json" \
    -d '{
      "level": "debug",
      "event": "debug_info_for_dev",
      "data": { "detail": "more data" }
    }' \
    http://localhost:3000/api/logs
    ```

-   **Submit a log with missing `level` (validation error)**:
    ```bash
    curl -X POST -H "Content-Type: application/json" \
    -d '{
      "event": "event_with_missing_level"
    }' \
    http://localhost:3000/api/logs
    ```

### Observe Server Logs:

Check the console output of the running server (`npm start`) for:
-   Server startup messages (port, environment, log level).
-   `ApplicationStart` log from `LoggerService`.
-   Initialization messages from `InMemoryCacheService`, `DummyDatabaseService`.
-   Request logs for each API call (method, path, status code, duration).
-   `LoggerService` messages indicating logs added to cache or filtered out.
-   `DummyDatabaseService` messages simulating log saves when cache flushes (due to being full or interval).
-   Graceful shutdown messages when you stop the server (e.g., with Ctrl+C).

## Future Enhancements (TODO)

-   Implement `PostgresDatabaseService` to save logs to a real PostgreSQL database.
-   Implement `RedisCacheService` as an alternative caching mechanism.
-   Add more robust input validation (e.g., using `joi` or `class-validator`).
-   Implement comprehensive automated tests (unit, integration, e2e).
-   Introduce a more structured logging format for server logs (e.g., JSON).
-   Add authentication/authorization for the log submission endpoint if needed.
-   Implement log rotation for file-based logging (if used as a fallback).

This README provides a starting point for understanding, setting up, and using the log backend service.
```
