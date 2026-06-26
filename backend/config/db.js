const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const dialect = process.env.DB_DIALECT || 'mysql';
let sequelize;

if (dialect === 'sqlite') {
    // Resolve DB path (prefer Electron userData if provided, fallback to local file)
    const dbPath = process.env.USER_DATA_PATH 
        ? path.join(process.env.USER_DATA_PATH, 'jeeva.sqlite')
        : path.resolve(__dirname, '../data/jeeva.sqlite');
    
    // Ensure directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    console.log('Initializing SQLite connection at:', dbPath);
    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: dbPath,
        logging: false, // Set to console.log to see SQL queries
        define: {
            timestamps: true,
            underscored: true
        }
    });
} else {
    console.log('Initializing MySQL connection to host:', process.env.DB_HOST);
    sequelize = new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASS,
        {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            dialect: 'mysql',
            logging: false,
            pool: {
                max: 5,
                min: 0,
                acquire: 30000,
                idle: 10000
            }
        }
    );
}

module.exports = sequelize;
