// Quick test to find the actual error when querying/creating clients
process.env.DB_DIALECT = 'sqlite';
process.env.USER_DATA_PATH = 'C:\\Users\\murug\\AppData\\Roaming\\jeeva-electron';
require('dotenv').config();

const { Client, sequelize } = require('../models');

async function test() {
  try {
    await sequelize.authenticate();
    console.log('DB connected');

    // Test 1: List clients
    console.log('\n--- TEST: List Clients ---');
    try {
      const clients = await Client.findAll({ order: [['CreatedAt', 'DESC']] });
      console.log('Clients found:', clients.length);
      clients.forEach(c => console.log(' -', c.toJSON()));
    } catch (err) {
      console.error('LIST ERROR:', err.message);
      console.error('FULL ERROR:', err);
    }

    // Test 2: Create client
    console.log('\n--- TEST: Create Client ---');
    try {
      const newClient = await Client.create({
        Name: 'Test Client',
        MobileNumber: '9876543210',
        PaymentType: 'Cash'
      });
      console.log('Created:', newClient.toJSON());
    } catch (err) {
      console.error('CREATE ERROR:', err.message);
      console.error('FULL ERROR:', err);
    }

    // Test 3: Check table schema
    console.log('\n--- TEST: Table Schema ---');
    try {
      const desc = await sequelize.getQueryInterface().describeTable('clients');
      console.log('Columns:', Object.keys(desc));
      console.log('Full schema:', JSON.stringify(desc, null, 2));
    } catch (err) {
      console.error('SCHEMA ERROR:', err.message);
    }

  } catch (err) {
    console.error('Connection error:', err);
  } finally {
    await sequelize.close();
  }
}

test();
