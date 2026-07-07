const { Sequelize } = require('sequelize');

const localMySQL = new Sequelize(
  'jeeva_construction',
  'root',
  '12345678',
  {
    host: '127.0.0.1',
    dialect: 'mysql',
    logging: false
  }
);

async function countLocalMySQL() {
  try {
    await localMySQL.authenticate();
    console.log('Connected to local MySQL.');
    
    const [tables] = await localMySQL.query("SHOW TABLES");
    const tableNames = tables.map(t => Object.values(t)[0]).filter(n => n !== '__efmigrationshistory');

    console.log('\n--- Local MySQL Row Counts ---');
    for (const tableName of tableNames) {
      const [results] = await localMySQL.query(`SELECT COUNT(*) as cnt FROM \`${tableName}\``);
      const count = results[0].cnt;
      if (count > 0) {
        console.log(`${tableName}: ${count} rows`);
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await localMySQL.close();
  }
}

countLocalMySQL();
