const sqlite3 = require('sqlite3').verbose();
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sqlitePath = 'C:\\Users\\murug\\AppData\\Roaming\\app\\jeeva.sqlite';

const mysqlSequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: false
  }
);

async function compare() {
  try {
    await mysqlSequelize.authenticate();
    console.log('Connected to Cloud MySQL DB.');
    
    const db = new sqlite3.Database(sqlitePath, sqlite3.OPEN_READONLY);
    
    // Get table names from sqlite
    const tables = await new Promise((resolve) => {
      db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
        if (err) {
          console.error(err);
          resolve([]);
        } else {
          resolve(rows.map(r => r.name).filter(n => n !== 'sqlite_sequence' && n !== 'master_settings'));
        }
      });
    });

    console.log('\n--- Table Row Count Comparison ---');
    console.log(String('Table').padEnd(25) + ' | ' + String('Local (SQLite)').padEnd(15) + ' | ' + String('Cloud (MySQL)').padEnd(15));
    console.log('-'.repeat(65));

    for (const tableName of tables) {
      // Local count
      const localCount = await new Promise((resolve) => {
        db.get(`SELECT COUNT(*) as cnt FROM \`${tableName}\``, [], (err, row) => {
          resolve(row ? row.cnt : 0);
        });
      });

      // Cloud count
      let cloudCount = 0;
      try {
        const [results] = await mysqlSequelize.query(`SELECT COUNT(*) as cnt FROM \`${tableName}\``);
        cloudCount = results[0].cnt;
      } catch (err) {
        cloudCount = `Error: ${err.message}`;
      }

      console.log(tableName.padEnd(25) + ' | ' + String(localCount).padEnd(15) + ' | ' + String(cloudCount).padEnd(15));
    }

    db.close();
  } catch (err) {
    console.error('Error during comparison:', err.message);
  } finally {
    await mysqlSequelize.close();
  }
}

compare();
