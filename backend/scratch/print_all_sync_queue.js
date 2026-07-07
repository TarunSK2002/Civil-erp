const sqlite3 = require('sqlite3').verbose();

const dbPath = 'C:\\Users\\murug\\AppData\\Roaming\\app\\jeeva.sqlite';
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

db.all("SELECT * FROM sync_queue ORDER BY id ASC", [], (err, rows) => {
  if (err) {
    console.error('Error selecting sync_queue entries:', err.message);
    db.close();
    return;
  }
  console.log(`Total sync_queue entries: ${rows.length}`);
  rows.forEach(r => {
    console.log(`ID: ${r.Id || r.id} | Table: ${r.table_name || r.tableName} | Action: ${r.action} | Status: ${r.status} | UUID: ${r.record_uuid || r.recordUuid} | Error: ${r.error_message || r.errorMessage}`);
  });
  db.close();
});
