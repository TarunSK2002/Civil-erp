const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const paths = [
  'C:\\Users\\murug\\AppData\\Roaming\\app\\jeeva.sqlite',
  'C:\\Users\\murug\\AppData\\Roaming\\jeeva-electron\\jeeva.sqlite'
];

paths.forEach(dbPath => {
  console.log(`\n=== Checking Database: ${dbPath} ===`);
  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error(`Error opening database ${dbPath}:`, err.message);
      return;
    }
  });

  db.serialize(() => {
    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
      if (err) {
        console.error('Error listing tables:', err.message);
        return;
      }
      console.log('Tables in database:', tables.map(t => t.name).join(', '));
      
      if (tables.some(t => t.name === 'sync_queue')) {
        db.all("SELECT status, COUNT(*) as count FROM sync_queue GROUP BY status", [], (err, rows) => {
          if (err) {
            console.error('Error grouping sync_queue:', err.message);
            return;
          }
          console.log('sync_queue count by status:', rows);
        });

        db.all("SELECT * FROM sync_queue ORDER BY id DESC LIMIT 5", [], (err, rows) => {
          if (err) {
            console.error('Error selecting sync_queue entries:', err.message);
            return;
          }
          console.log('Latest 5 sync_queue entries:');
          rows.forEach(r => {
            console.log(` - ID: ${r.Id || r.id}, Table: ${r.table_name || r.tableName}, Action: ${r.action}, Status: ${r.status}, Error: ${r.error_message || r.errorMessage}`);
          });
        });
      } else {
        console.log('Table sync_queue does not exist in this database.');
      }
    });
  });

  // Close connection after query
  setTimeout(() => {
    db.close();
  }, 1000);
});
