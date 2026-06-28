process.env.DB_DIALECT = 'sqlite';
process.env.USER_DATA_PATH = 'C:\\Users\\murug\\AppData\\Roaming\\app';
require('dotenv').config();

const { sequelize, Client, SyncQueue } = require('../models');
const syncManager = require('../sync/syncManager');

async function test() {
    await sequelize.authenticate();
    console.log('Database connected.');

    // Fetch the client with id = 1
    const client = await Client.findByPk(1);
    if (!client) {
        console.error('Client with id=1 not found!');
        return;
    }

    console.log('Found client to sync:', client.toJSON());

    // Create sync queue entry
    const queueEntry = await SyncQueue.create({
        tableName: 'clients',
        recordUuid: client.uuid,
        action: 'CREATE',
        payload: JSON.stringify(client.toJSON())
    });

    console.log('Sync queue entry created:', queueEntry.toJSON());

    console.log('Triggering sync now...');
    await syncManager.syncNow();

    // Check status of queueEntry
    const updatedEntry = await SyncQueue.findByPk(queueEntry.id);
    console.log('Updated queue entry status:', updatedEntry.toJSON());

    await sequelize.close();
}

test().catch(console.error);
