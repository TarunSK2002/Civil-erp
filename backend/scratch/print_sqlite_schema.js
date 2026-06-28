const path = require('path');
const { Sequelize } = require('sequelize');

process.env.DB_DIALECT = 'sqlite';
process.env.USER_DATA_PATH = path.join(process.env.APPDATA, 'app');

const dbModels = require('../models');

async function run() {
    try {
        await dbModels.sequelize.authenticate();
        console.log('Connected.');

        const [info] = await dbModels.sequelize.query("PRAGMA table_info(weekly_pay_sheet_items);");
        console.log('TABLE INFO FOR weekly_pay_sheet_items:');
        console.log(JSON.stringify(info, null, 2));

        const [sheetsInfo] = await dbModels.sequelize.query("PRAGMA table_info(weekly_pay_sheets);");
        console.log('TABLE INFO FOR weekly_pay_sheets:');
        console.log(JSON.stringify(sheetsInfo, null, 2));
    } catch (err) {
        console.error('❌ Failed:', err);
    } finally {
        await dbModels.sequelize.close();
        process.exit(0);
    }
}

run();
