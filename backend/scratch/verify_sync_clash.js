process.env.DB_DIALECT = 'sqlite';
process.env.USER_DATA_PATH = 'C:\\Users\\murug\\AppData\\Roaming\\app';
require('dotenv').config();

const { sequelize, Client, Site, SyncQueue } = require('../models');
const syncManager = require('../sync/syncManager');

// Keep track of original fetch
const originalFetch = global.fetch;

async function runTest() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    // 1. Clean up any existing test records to ensure clean state
    await Client.unscoped().destroy({ where: { id: [9999, 8888] }, force: true });
    await Site.unscoped().destroy({ where: { id: 9999, ClientId: [9999, 8888] }, force: true });
    await SyncQueue.destroy({ where: { recordUuid: ['test-client-uuid-9999', 'test-site-uuid-9999'] } });

    console.log('Cleaned up previous test records.');

    // 2. Create test client and site in local SQLite
    // Note: We bypass hooks to insert with specific test IDs
    const client = await Client.create({
      id: 9999,
      uuid: 'test-client-uuid-9999',
      Name: 'Clash Test Client',
      MobileNumber: '1234567890'
    }, { hooks: false });

    const site = await Site.create({
      id: 9999,
      uuid: 'test-site-uuid-9999',
      ClientId: 9999,
      SiteName: 'Clash Test Site',
      SiteValue: 500000.00,
      Length: 40.00,
      Breadth: 30.00
    }, { hooks: false });

    console.log('Created test client (ID: 9999) and site (ClientId: 9999) locally.');

    // 3. Queue these actions manually in the SyncQueue
    const clientQueue = await SyncQueue.create({
      tableName: 'clients',
      recordUuid: 'test-client-uuid-9999',
      action: 'CREATE',
      payload: JSON.stringify(client.toJSON()),
      status: 'PENDING'
    });

    const siteQueue = await SyncQueue.create({
      tableName: 'sites',
      recordUuid: 'test-site-uuid-9999',
      action: 'CREATE',
      payload: JSON.stringify(site.toJSON()),
      status: 'PENDING'
    });

    console.log('Queued sync operations.');

    // 4. Mock global.fetch to intercept sync requests
    global.fetch = async (url, options) => {
      // Allow internet/backend health checks to proceed normally
      if (url.includes('google.com') || url.includes('/health')) {
        return new Response(JSON.stringify({ status: 'OK' }), { status: 200 });
      }

      if (url.endsWith('/sync')) {
        const body = JSON.parse(options.body);
        console.log(`[Mock Server] Received sync request for ${body.tableName} (${body.action}), local ID: ${body.payload?.id || body.payload?.Id}`);
        
        if (body.tableName === 'clients' && body.payload.id === 9999) {
          // Simulate an ID clash on the cloud server, which returns new ID 8888
          console.log('[Mock Server] Simulating ID clash for client, returning newId: 8888');
          return new Response(JSON.stringify({ success: true, newId: 8888 }), { status: 200 });
        }

        if (body.tableName === 'sites' && body.payload.ClientId === 8888) {
          console.log('[Mock Server] Child site synced successfully with correct ClientId: 8888');
          return new Response(JSON.stringify({ success: true, newId: 9999 }), { status: 200 });
        }
      }

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    };

    // 5. Trigger sync
    console.log('\nTriggering synchronization loop...');
    await syncManager.syncNow();

    // 6. Verify assertions
    console.log('\n--- VERIFYING RESULTS ---');
    
    // Check Client
    const updatedClient = await Client.unscoped().findOne({ where: { uuid: 'test-client-uuid-9999' } });
    if (!updatedClient) {
      throw new Error('Test client was deleted or not found!');
    }
    console.log(`Updated Client ID: ${updatedClient.id} (Expected: 8888)`);
    if (updatedClient.id !== 8888) {
      throw new Error(`Assertion failed: Client ID is ${updatedClient.id}, not 8888`);
    }

    // Check Site
    const updatedSite = await Site.unscoped().findOne({ where: { uuid: 'test-site-uuid-9999' } });
    if (!updatedSite) {
      throw new Error('Test site was deleted or not found!');
    }
    console.log(`Updated Site ClientId: ${updatedSite.ClientId} (Expected: 8888)`);
    if (updatedSite.ClientId !== 8888) {
      throw new Error(`Assertion failed: Site ClientId is ${updatedSite.ClientId}, not 8888`);
    }

    // Check Site SyncQueue payload
    const updatedSiteQueue = await SyncQueue.findByPk(siteQueue.id);
    const sitePayload = JSON.parse(updatedSiteQueue.payload);
    console.log(`Site SyncQueue Payload ClientId: ${sitePayload.ClientId} (Expected: 8888)`);
    if (sitePayload.ClientId !== 8888) {
      throw new Error(`Assertion failed: SyncQueue payload ClientId is ${sitePayload.ClientId}, not 8888`);
    }

    console.log('\n✅ ALL INTEGRATION TESTS PASSED SUCCESSFULLY! Remapping works perfectly.');

  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
  } finally {
    // Restore fetch and close DB
    global.fetch = originalFetch;
    await sequelize.close();
  }
}

runTest();
