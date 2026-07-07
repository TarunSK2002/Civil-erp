const sqlite3 = require('sqlite3').verbose();

const dbPath = 'C:\\Users\\murug\\AppData\\Roaming\\app\\jeeva.sqlite';
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

async function findTodayRecords() {
  db.all("SELECT name FROM sqlite_master WHERE type='table'", [], async (err, tables) => {
    if (err) {
      console.error(err);
      db.close();
      return;
    }

    const tableNames = tables.map(t => t.name).filter(name => name !== 'sqlite_sequence' && name !== 'master_settings');
    
    for (const tableName of tableNames) {
      await new Promise((resolve) => {
        // Query columns for the table to check if there's a CreatedAt or updated_at column
        db.all(`PRAGMA table_info(\`${tableName}\`)`, [], (errCol, columns) => {
          if (errCol) {
            resolve();
            return;
          }
          
          const dateCols = columns
            .map(c => c.name)
            .filter(name => ['CreatedAt', 'created_at', 'UpdatedAt', 'updated_at'].includes(name));
            
          if (dateCols.length === 0) {
            resolve();
            return;
          }
          
          // Construct query to find records from today (2026-07-07)
          const conditions = dateCols.map(col => `\`${col}\` LIKE '2026-07-07%'`).join(' OR ');
          
          db.all(`SELECT * FROM \`${tableName}\` WHERE ${conditions}`, [], (errQuery, rows) => {
            if (errQuery) {
              // Try another format if LIKE doesn't work (e.g. date function)
            } else if (rows && rows.length > 0) {
              console.log(`\nTable "${tableName}" has ${rows.length} records created/updated today:`);
              rows.forEach(r => {
                console.log(` - ID: ${r.Id || r.id}, UUID: ${r.uuid}, Dates:`, dateCols.map(col => `${col}: ${r[col]}`).join(', '));
              });
            }
            resolve();
          });
        });
      });
    }
    
    db.close();
  });
}

findTodayRecords();
