/**
 * load-cloud-data.js
 * 
 * Tool script to import the local `jeeva_constructuion_data_final.sql` dump
 * directly into your cloud MySQL database using the credentials in your `.env` file.
 * 
 * Usage:
 *   node backend/load-cloud-data.js
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function run() {
    const host = process.env.DB_HOST;
    const user = process.env.DB_USER;
    const password = process.env.DB_PASS;
    const database = process.env.DB_NAME;
    const port = process.env.DB_PORT || 3306;

    if (!host || host === '127.0.0.1' || host === 'localhost') {
        console.error('\n❌ ERROR: Your .env file is still configured for localhost/127.0.0.1.');
        console.error('Please configure your cloud database host name in backend/.env before running this script.\n');
        process.exit(1);
    }

    console.log(`\nConnecting to cloud MySQL database: ${user}@${host}:${port}/${database}`);

    // Resolve path to the dump file
    const sqlPath = path.join(__dirname, '..', 'jeeva_constructuion_data_final.sql');
    if (!fs.existsSync(sqlPath)) {
        console.error(`❌ ERROR: Could not find SQL dump file at: ${sqlPath}`);
        process.exit(1);
    }

    console.log(`Reading SQL file: ${path.basename(sqlPath)}...`);
    let sql = fs.readFileSync(sqlPath, 'utf8');

    // Strip CREATE DATABASE and USE statements from the dump file 
    // to prevent conflicts with custom cloud database names.
    sql = sql.replace(/CREATE DATABASE[\s\S]*?;/i, '');
    sql = sql.replace(/USE[\s\S]*?;/i, '');

    let connection;
    try {
        connection = await mysql.createConnection({
            host,
            user,
            password,
            database,
            port: parseInt(port),
            multipleStatements: true // Allows running the entire dump in one go
        });
        
        console.log('Connected successfully. Executing import script (this may take a few seconds)...');
        
        // Execute the entire SQL script
        await connection.query(sql);
        
        console.log('\n══════════════════════════════════════');
        console.log('  ✅ Data successfully imported!');
        console.log('══════════════════════════════════════\n');

    } catch (err) {
        console.error('\n❌ ERROR executing SQL import:', err.message);
    } finally {
        if (connection) {
            await connection.end();
        }
        process.exit(0);
    }
}

run().catch(err => {
    console.error('❌ Run failed:', err);
    process.exit(1);
});
