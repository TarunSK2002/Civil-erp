const sequelize = require('../config/db');

async function forceClearData() {
    try {
        await sequelize.authenticate();
        console.log('Connected to Database.');

        console.log('Killing other connections...');
        const [processes] = await sequelize.query('SHOW PROCESSLIST');
        const [currentIdResult] = await sequelize.query('SELECT CONNECTION_ID() as id');
        const currentId = currentIdResult[0].id;

        for (const proc of processes) {
            if (proc.Id !== currentId && proc.Command !== 'Killed') {
                console.log(`Killing process ${proc.Id} (${proc.Info || 'No Info'})...`);
                try {
                    await sequelize.query(`KILL ${proc.Id}`);
                } catch (err) {
                    console.log(`Failed to kill process ${proc.Id}: ${err.message}`);
                }
            }
        }

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

forceClearData();
