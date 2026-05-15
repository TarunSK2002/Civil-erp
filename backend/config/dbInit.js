const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Ensures the MySQL database exists before the application starts.
 * This is useful for first-time installations.
 */
async function ensureDatabaseExists() {
    const { DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT } = process.env;

    try {
        // Connect to MySQL without specifying a database
        const connection = await mysql.createConnection({
            host: DB_HOST || '127.0.0.1',
            user: DB_USER || 'root',
            password: DB_PASS || '',
            port: DB_PORT || 3306
        });

        console.log(`Checking if database "${DB_NAME}" exists...`);
        
        // Check and create database if not exists
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        
        console.log(`Database "${DB_NAME}" is ready.`);
        await connection.end();
    } catch (err) {
        if (err.code === 'ECONNREFUSED') {
            console.error('ERROR: Could not connect to MySQL Server. Please ensure MySQL service is running.');
        } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('ERROR: MySQL Access Denied. Please check your DB_USER and DB_PASS in .env');
        } else {
            console.error('Database Initialization Error:', err.message);
        }
        // We don't exit process here because we want the main app to try and fail with its own error handling
    }
}

module.exports = ensureDatabaseExists;
