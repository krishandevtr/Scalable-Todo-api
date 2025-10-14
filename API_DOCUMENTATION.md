# Todo API Documentation

## Overview
A RESTful API for managing todos with user authentication, built with Node.js, Express, and MongoDB.

## Base URL
```
http://localhost:5000/api
```

## Authentication
All API endpoints (except auth and health checks) require a Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Response Format
All responses follow this consistent format:
```json
{
    "success": boolean,
    "message": "string",
    "data": object | array,
    "error": "string (only on errors)"
}
```

## Health Check Endpoints

### GET /health
Check API health status
- **Response**: `200 OK` or `503 Service Unavailable`

### GET /ready
Check if API is ready to serve requests
- **Response**: `200 OK` or `503 Service Unavailable`

### GET /live
Check if API is alive
- **Response**: `200 OK`

## Authentication Endpoints

### POST /api/auth/signup
Register a new user
- **Body**:
```json
{
    "name": "string (required, 2-50 chars)",
    "email": "string (required, valid email)",
    "password": "string (required, min 6 chars)"
}
```
- **Response**: `201 Created`
```json
{
    "success": true,
    "message": "User created successfully",
    "data": {
        "user": {
            "id": "string",
            "name": "string",
            "email": "string"
        },
        "accessToken": "string"
    }
}
```

### POST /api/auth/login
Login user
- **Body**:
```json
{
    "email": "string (required)",
    "password": "string (required)"
}
```
- **Response**: `200 OK` (same format as signup)

### POST /api/auth/refresh
Refresh access token (requires refresh token cookie)
- **Response**: `200 OK`
```json
{
    "success": true,
    "message": "Token refreshed successfully",
    "data": {
        "accessToken": "string"
    }
}
```

### POST /api/auth/logout
Logout user (clears refresh token cookie)
- **Response**: `200 OK`

### GET /api/auth/profile
Get user profile (requires authentication)
- **Response**: `200 OK`
```json
{
    "success": true,
    "data": {
        "user": {
            "id": "string",
            "name": "string",
            "email": "string",
            "createdAt": "string",
            "lastLogin": "string"
        }
    }
}
```

## Todo Endpoints

### POST /api/todo
Create a new todo (requires authentication)
- **Body**:
```json
{
    "title": "string (required, max 100 chars)",
    "description": "string (optional, max 500 chars)",
    "priority": "string (optional: low|medium|high, default: medium)",
    "dueDate": "string (optional, ISO date)"
}
```
- **Response**: `201 Created`

### GET /api/todo
Get todos with filtering and pagination (requires authentication)
- **Query Parameters**:
  - `page`: number (default: 1)
  - `limit`: number (default: 10, max: 50)
  - `status`: string (pending|in-progress|completed)
  - `priority`: string (low|medium|high)
  - `sortBy`: string (createdAt|updatedAt|title|priority|dueDate)
  - `sortOrder`: string (asc|desc)
  - `search`: string (searches in title and description)
- **Response**: `200 OK`
```json
{
    "success": true,
    "data": {
        "todos": [
            {
                "id": "string",
                "title": "string",
                "description": "string",
                "status": "string",
                "priority": "string",
                "dueDate": "string",
                "completedAt": "string",
                "isArchived": boolean,
                "createdAt": "string",
                "updatedAt": "string"
            }
        ],
        "pagination": {
            "currentPage": number,
            "totalPages": number,
            "totalCount": number,
            "hasNextPage": boolean,
            "hasPrevPage": boolean,
            "limit": number
        }
    }
}
```

### GET /api/todo/:todoID
Get a specific todo (requires authentication)
- **Response**: `200 OK` or `404 Not Found`

### PUT /api/todo/:todoID
Update a todo (requires authentication)
- **Body**:
```json
{
    "title": "string (optional)",
    "description": "string (optional)",
    "status": "string (optional: pending|in-progress|completed)",
    "priority": "string (optional: low|medium|high)",
    "dueDate": "string (optional, ISO date or null)"
}
```
- **Response**: `200 OK` or `404 Not Found`

### DELETE /api/todo/:todoID
Delete a todo (requires authentication)
- **Response**: `200 OK` or `404 Not Found`

### PATCH /api/todo/:todoID/archive
Toggle archive status of a todo (requires authentication)
- **Response**: `200 OK` or `404 Not Found`

### GET /api/todo/stats
Get todo statistics (requires authentication)
- **Response**: `200 OK`
```json
{
    "success": true,
    "data": {
        "stats": {
            "total": number,
            "pending": number,
            "inProgress": number,
            "completed": number,
            "highPriority": number,
            "overdue": number
        }
    }
}
```

## Error Codes
- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Authentication required or invalid token
- `403 Forbidden`: Access denied
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Rate Limiting
- General API: 100 requests per 15 minutes per IP
- Auth endpoints: 10 requests per 15 minutes per IP
- Password reset: 3 requests per hour per IP

## Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up --build

# Scale the application
docker-compose up --scale todo-app=3
```

## Environment Variables
See `.env.example` for all required environment variables.

## Security Features
- JWT authentication with refresh tokens
- Password hashing with bcrypt
- Rate limiting
- Input validation and sanitization
- CORS protection
- Security headers via Nginx
- Non-root Docker containers