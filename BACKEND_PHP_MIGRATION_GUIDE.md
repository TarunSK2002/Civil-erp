# Backend Architecture & PHP Migration Reference Guide

This document captures the technical analysis and answers regarding migrating the **Jeeva Construction ERP Backend** from a free 3rd-party cloud service (Node.js/Render/Vercel) to a **paid PHP/cPanel shared server**, including cross-platform compatibility and architectural differences.

---

## 1. Core Question: Will PHP Support Both Windows and Mobile Apps?

> **Answer:** **Yes, 100% fully supported.**

### Why It Works Seamlessly
Neither the **Windows Desktop App (Electron)** nor the **Mobile App (React Native / Expo)** knows or cares which programming language runs on the server.

Both client applications communicate exclusively via standard **HTTP REST APIs**:
1. **Request**: The app sends an HTTP request (`GET`, `POST`, `PUT`, `DELETE`) with JSON payload or URL parameters.
2. **Authorization**: The app attaches the JWT token via HTTP header:
   ```http
   Authorization: Bearer <jwt_token>
   ```
3. **Response**: The server responds with an HTTP status code (`200`, `201`, `400`, `401`, `500`) and a **JSON body**.

As long as the PHP backend provides the **exact same endpoint routes** (e.g., `/api/materials`, `/api/attendance`, `/api/auth/login`) and returns the **identical JSON response structure**, both Windows and Mobile apps will work without changing any application code. You only need to update the `API_BASE_URL` in the client environment files.

---

## 2. Key Differences: PHP vs. Node.js as a Backend

| Feature | Node.js (Express) | PHP (Apache / Nginx / cPanel) |
| :--- | :--- | :--- |
| **Execution Lifecycle** | **Persistent Process**: A long-running server (`node server.js`) stays active in memory, continuously listening on a port (e.g., 5000). | **Request-Based (Stateless)**: Each incoming HTTP request triggers PHP execution. Once the response is sent, the process terminates and frees memory immediately. |
| **Concurrency Model** | **Asynchronous / Non-blocking**: Single-threaded event loop utilizing `async/await` and Promises to handle multiple requests concurrently. | **Multi-process / Multi-threaded**: Synchronous execution per request. Apache or PHP-FPM spawns worker processes to handle multiple simultaneous requests. |
| **Hosting & Deployment** | Requires VPS, containerization (Docker), or Node.js hosting platform (Render, Railway, AWS EC2) + process manager (PM2). Free tiers often "sleep" after 15 min. | **Simple File Upload**: Native support in 99% of web hosting (cPanel, Hostinger, GoDaddy, Namecheap). Always active 24/7 without cold starts. |
| **Database Connections** | Maintains a continuous connection pool in memory. | Connects to MySQL per request (or uses persistent PDO connections). |
| **Crash Resilience** | An unhandled exception in Node.js can crash the entire server process for all users (unless handled by PM2). | A fatal error in PHP only terminates that specific request; all other users remain unaffected. |
| **Real-Time Communication** | Native, excellent support for persistent WebSockets (`socket.io`). | Better suited for REST APIs; real-time updates usually rely on polling or external services (e.g., Pusher). |

---

## 3. Side-by-Side Code Comparison

### Example: Fetch All Materials (`GET /api/materials`)

#### Node.js (Express + Sequelize)
```javascript
// routes/materialRoutes.js
const express = require('express');
const router = express.Router();
const { Material } = require('../models');

router.get('/api/materials', async (req, res) => {
  try {
    const materials = await Material.findAll({ order: [['id', 'DESC']] });
    return res.json({
      success: true,
      data: materials
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
```

#### PHP (Vanilla PHP + PDO)
```php
<?php
// api/materials.php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../config/database.php';

try {
    $stmt = $pdo->prepare("SELECT * FROM materials ORDER BY id DESC");
    $stmt->execute();
    $materials = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $materials
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
```

---

## 4. Key Implementation Rules for PHP Backend Migration

To ensure seamless integration with the existing Windows and Mobile apps, the PHP backend must adhere to these standards:

### A. CORS Headers Configuration
Add global CORS headers to allow cross-origin requests from both Electron (`file://` or `localhost`) and Mobile apps:
```php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
```

### B. Clean URL Rewriting (`.htaccess`)
To allow clean endpoints like `https://yourdomain.com/api/materials` rather than `materials.php`:
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^api/(.*)$ api/index.php?endpoint=$1 [QSA,L]
```

### C. Password Hashing Compatibility
* Node.js uses `bcryptjs`.
* PHP has native bcrypt compatibility out of the box:
  ```php
  // Hashing
  $hash = password_hash($plainPassword, PASSWORD_BCRYPT);

  // Verifying (matches passwords hashed by Node.js bcryptjs)
  if (password_verify($plainPassword, $storedHash)) {
      // Password is valid
  }
  ```

### D. JWT Authentication
Use `firebase/php-jwt` or a lightweight JWT class with the same `JWT_SECRET` and `HS256` algorithm:
```php
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

// Decoding token from header
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? '';
if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    $token = $matches[1];
    $decoded = JWT::decode($token, new Key($jwtSecret, 'HS256'));
    $currentUserId = $decoded->id;
}
```

---

## 5. Pre-Migration Checklist

1. **Check cPanel for "Setup Node.js App":**
   Many shared hosting providers (Hostinger, cPanel on GoDaddy/Namecheap) include CloudLinux Passenger ("Setup Node.js App"). If this feature is present in your hosting dashboard, you can run the existing Node.js code directly without rewriting to PHP.
2. **If PHP is required:**
   - Create the MySQL database and user in cPanel.
   - Import the schema (`jeeva_constructuion_data_final.sql`).
   - Implement the PHP API endpoints matching the Node.js route signatures.
   - Update `API_BASE_URL` in Windows app and Mobile app to point to your domain.
