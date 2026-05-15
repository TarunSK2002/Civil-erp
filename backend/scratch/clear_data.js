const sequelize = require('../config/db');

async function clearData() {
    try {
        await sequelize.authenticate();
        console.log('Connected to Database.');

        console.log('Disabling foreign key checks...');
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

        const tables = [
            'weekly_pay_sheet_items',
            'weekly_pay_sheets',
            'payments',
            'site_materials',
            'labours',
            'materials',
            'sites',
            'clients',
            'payees'
        ];

        for (const table of tables) {
            console.log(`Truncating table: ${table}...`);
            await sequelize.query(`TRUNCATE TABLE ${table}`);
        }

        console.log('Enabling foreign key checks...');
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('Database tables cleared successfully (Users preserved).');
        process.exit(0);
    } catch (error) {
        console.error('Failed to clear database:', error);
        process.exit(1);
    }
}

clearData();
