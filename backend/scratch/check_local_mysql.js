const { Sequelize } = require('sequelize');

const localMySQL = new Sequelize(
  'jeeva_construction',
  'root',
  '12345678', // from server.js default fallback
  {
    host: '127.0.0.1',
    dialect: 'mysql',
    logging: false
  }
);

async function checkLocalMySQL() {
  try {
    await localMySQL.authenticate();
    console.log('Successfully connected to local MySQL on 127.0.0.1');
    
    const [tables] = await localMySQL.query("SHOW TABLES");
    console.log('Tables in local MySQL:', tables);
    
    // Check if sync_queue exists
    const hasSyncQueue = tables.some(t => Object.values(t)[0] === 'sync_queue');
    if (hasSyncQueue) {
      const [rows] = await localMySQL.query("SELECT status, COUNT(*) as count FROM sync_queue GROUP BY status");
      console.log('sync_queue status in local MySQL:', rows);
    } else {
      console.log('sync_queue does not exist in local MySQL');
    }
  } catch (err) {
    console.log('Failed to connect to local MySQL:', err.message);
  } finally {
    await localMySQL.close();
  }
}

checkLocalMySQL();
