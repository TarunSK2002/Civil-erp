const sqlite3 = require('sqlite3').verbose();

const dbPath = 'C:\\Users\\murug\\AppData\\Roaming\\app\\jeeva.sqlite';
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

db.all("SELECT id, table_name, action, status, created_at, updated_at FROM sync_queue ORDER BY id ASC", [], (err, rows) => {
  if (err) {
    console.error('Error selecting sync_queue entries:', err.message);
    db.close();
    return;
  }
  console.log(`Total sync_queue entries: ${rows.length}`);
  rows.forEach(r => {
    console.log(`ID: ${r.id} | Table: ${r.table_name} | Action: ${r.action} | Status: ${r.status} | Created: ${r.created_at} | Updated: ${r.updated_at}`);
  });
  db.close();
});
