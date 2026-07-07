process.env.DB_DIALECT = 'sqlite';
process.env.USER_DATA_PATH = 'C:\\Users\\murug\\AppData\\Roaming\\app';
require('dotenv').config();

const dbModels = require('../models');
const sequelize = dbModels.sequelize;
const SyncQueue = dbModels.SyncQueue;

async function checkSync() {
  try {
    await sequelize.authenticate();
    console.log('Connected to local SQLite database successfully.');

    const pendingCount = await SyncQueue.count({
      where: { status: ['PENDING', 'FAILED'] }
    });
    console.log(`Total Pending/Failed Sync Queue Items: ${pendingCount}`);

    const failedCount = await SyncQueue.count({
      where: { status: 'FAILED' }
    });
    console.log(`Total Failed Sync Queue Items: ${failedCount}`);

    const failedItems = await SyncQueue.findAll({
      where: { status: 'FAILED' },
      order: [['id', 'ASC']],
      limit: 10
    });

    console.log('\n--- FIRST 10 FAILED ITEMS ---');
    failedItems.forEach(item => {
      console.log(`ID: ${item.id}`);
      console.log(`Table Name: ${item.tableName}`);
      console.log(`Action: ${item.action}`);
      console.log(`Record UUID: ${item.recordUuid}`);
      console.log(`Error Message: ${item.errorMessage}`);
      try {
        const payloadObj = JSON.parse(item.payload);
        console.log(`Payload (truncated):`, JSON.stringify(payloadObj).substring(0, 200));
      } catch (err) {
        console.log(`Payload: ${item.payload}`);
      }
      console.log('-----------------------------');
    });

    const pendingItems = await SyncQueue.findAll({
      where: { status: 'PENDING' },
      order: [['id', 'ASC']],
      limit: 10
    });

    console.log('\n--- FIRST 10 PENDING ITEMS ---');
    pendingItems.forEach(item => {
      console.log(`ID: ${item.id}`);
      console.log(`Table Name: ${item.tableName}`);
      console.log(`Action: ${item.action}`);
      console.log(`Record UUID: ${item.recordUuid}`);
      try {
        const payloadObj = JSON.parse(item.payload);
        console.log(`Payload (truncated):`, JSON.stringify(payloadObj).substring(0, 200));
      } catch (err) {
        console.log(`Payload: ${item.payload}`);
      }
      console.log('-----------------------------');
    });

  } catch (error) {
    console.error('Error querying SyncQueue:', error);
  } finally {
    await sequelize.close();
  }
}

checkSync();
