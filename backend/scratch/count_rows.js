const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const paths = [
  'C:\\Users\\murug\\AppData\\Roaming\\app\\jeeva.sqlite',
  'C:\\Users\\murug\\AppData\\Roaming\\jeeva-electron\\jeeva.sqlite'
];

async function checkRowCounts() {
  for (const dbPath of paths) {
    console.log(`\n=== Database: ${dbPath} ===`);
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
    
    await new Promise((resolve) => {
      db.all("SELECT name FROM sqlite_master WHERE type='table'", [], async (err, tables) => {
        if (err) {
          console.error('Error listing tables:', err.message);
          resolve();
          return;
        }

        const tableNames = tables.map(t => t.name).filter(name => name !== 'sqlite_sequence');
        for (const tableName of tableNames) {
          await new Promise((resolveCount) => {
            db.get(`SELECT COUNT(*) as cnt FROM \`${tableName}\``, [], (errCount, row) => {
              if (errCount) {
                console.error(`Error counting ${tableName}:`, errCount.message);
              } else if (row.cnt > 0) {
                console.log(`Table "${tableName}": ${row.cnt} rows`);
              }
              resolveCount();
            });
          });
        }
        resolve();
      });
    });
    
    db.close();
  }
}

checkRowCounts();
