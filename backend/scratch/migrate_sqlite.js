const path = require('path');
const fs = require('fs');

process.env.DB_DIALECT = 'sqlite';
process.env.USER_DATA_PATH = '';
require('dotenv').config();

const seq = require('../config/db');

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

async function run() {
    await seq.authenticate();
    console.log('Connected to SQLite database at:', seq.options.storage);

    // Get list of tables
    const [tables] = await seq.query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    const tableNames = tables.map(t => t.name);
    console.log('Found tables:', tableNames);

    const excludedTables = ['users', 'sync_queue', 'action_logs', 'lifting_charge_rates'];

    for (const tableName of tableNames) {
        if (excludedTables.includes(tableName)) {
            console.log(`Skipping system table: ${tableName}`);
            continue;
        }

        console.log(`Checking table: ${tableName}`);
        const columns = await seq.query(`PRAGMA table_info(\`${tableName}\`)`, { type: 'SELECT' });
        const columnNames = columns.map(c => c.name.toLowerCase());

        let altered = false;

        // 1. Check uuid column
        if (!columnNames.includes('uuid')) {
            console.log(` - Adding 'uuid' column to table '${tableName}'`);
            await seq.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`uuid\` CHAR(36) DEFAULT NULL`);
            altered = true;
        }

        // 2. Check is_deleted column
        if (!columnNames.includes('is_deleted')) {
            console.log(` - Adding 'is_deleted' column to table '${tableName}'`);
            await seq.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`is_deleted\` TINYINT(1) NOT NULL DEFAULT 0`);
        }

        // 3. Populate existing rows with UUIDs if altered or if any are null
        const rows = await seq.query(`SELECT * FROM \`${tableName}\``, { type: 'SELECT' });
        let updatedCount = 0;
        for (const row of rows) {
            const pkCol = columns.find(c => c.pk === 1)?.name || 'Id';
            const pkValue = row[pkCol];

            if (!row.uuid) {
                const newUuid = generateUUID();
                await seq.query(`UPDATE \`${tableName}\` SET \`uuid\` = ? WHERE \`${pkCol}\` = ?`, {
                    replacements: [newUuid, pkValue]
                });
                updatedCount++;
            }
        }
        if (updatedCount > 0) {
            console.log(` - Updated ${updatedCount} rows with unique UUIDs in '${tableName}'`);
        }
    }

    console.log('Migration complete!');
    await seq.close();
}

run().catch(e => {
    console.error('Migration failed:', e);
    process.exit(1);
});
