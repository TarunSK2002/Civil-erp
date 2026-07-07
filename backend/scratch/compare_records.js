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

async function compareTables() {
  try {
    await mysqlSequelize.authenticate();
    const db = new sqlite3.Database(sqlitePath, sqlite3.OPEN_READONLY);

    const tables = ['weekly_pay_sheets', 'attendance_sheets'];

    for (const table of tables) {
      console.log(`\n=== Table: ${table} ===`);
      
      // Fetch local
      const localRecords = await new Promise((resolve) => {
        db.all(`SELECT Id, uuid FROM \`${table}\` ORDER BY Id ASC`, [], (err, rows) => {
          resolve(rows || []);
        });
      });

      // Fetch cloud
      const [cloudRecords] = await mysqlSequelize.query(`SELECT Id, uuid FROM \`${table}\` ORDER BY Id ASC`);

      console.log('Local Records:');
      localRecords.forEach(r => console.log(` - ID: ${r.Id || r.id}, UUID: ${r.uuid}`));

      console.log('Cloud Records:');
      cloudRecords.forEach(r => console.log(` - ID: ${r.Id || r.id}, UUID: ${r.uuid}`));
    }

    db.close();
  } catch (err) {
    console.error(err);
  } finally {
    await mysqlSequelize.close();
  }
}

compareTables();
