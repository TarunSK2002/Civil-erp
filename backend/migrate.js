require('dotenv').config();
const seq = require('./config/db');

async function migrate() {
    await seq.authenticate();
    console.log('Connected to DB');
    
    try {
        await seq.query("ALTER TABLE weekly_pay_sheets ADD COLUMN SelectedPayeeIds TEXT NULL");
        console.log('Added SelectedPayeeIds column');
    } catch(e) {
        if (e.original && e.original.code === 'ER_DUP_FIELDNAME') {
            console.log('SelectedPayeeIds already exists');
        } else throw e;
    }
    
    try {
        await seq.query("ALTER TABLE weekly_pay_sheets ADD COLUMN SelectedSiteIds TEXT NULL");
        console.log('Added SelectedSiteIds column');
    } catch(e) {
        if (e.original && e.original.code === 'ER_DUP_FIELDNAME') {
            console.log('SelectedSiteIds already exists');
        } else throw e;
    }
    
    try {
        await seq.query("ALTER TABLE payments ADD COLUMN PayeeId INT NULL");
        console.log('Added PayeeId column to payments');
    } catch(e) {
        if (e.original && e.original.code === 'ER_DUP_FIELDNAME') {
            console.log('PayeeId already exists in payments');
        } else throw e;
    }
    
    try {
        await seq.query("ALTER TABLE labours ADD COLUMN PayeeId INT NULL");
        console.log('Added PayeeId column to labours');
    } catch(e) {
        if (e.original && e.original.code === 'ER_DUP_FIELDNAME') {
            console.log('PayeeId already exists in labours');
        } else throw e;
    }
    
    try {
        await seq.query("ALTER TABLE sites ADD COLUMN Progress DECIMAL(5,2) DEFAULT 0");
        console.log('Added Progress column to sites');
    } catch(e) {
        if (e.original && e.original.code === 'ER_DUP_FIELDNAME') {
            console.log('Progress already exists in sites');
        } else throw e;
    }

    try {
        await seq.query("ALTER TABLE site_materials ADD COLUMN Amount DECIMAL(18,2) DEFAULT 0");
        console.log('Added Amount column to site_materials');
    } catch(e) {
        if (e.original && e.original.code === 'ER_DUP_FIELDNAME') {
            console.log('Amount already exists in site_materials');
        } else throw e;
    }

    try {
        await seq.query("ALTER TABLE site_materials ADD COLUMN DealerName VARCHAR(100) DEFAULT ''");
        console.log('Added DealerName column to site_materials');
    } catch(e) {
        if (e.original && e.original.code === 'ER_DUP_FIELDNAME') {
            console.log('DealerName already exists in site_materials');
        } else throw e;
    }
    
    try {
        await seq.query("ALTER TABLE sites ADD COLUMN NextMilestone VARCHAR(255) DEFAULT ''");
        console.log('Added NextMilestone column to sites');
    } catch(e) {
        if (e.original && e.original.code === 'ER_DUP_FIELDNAME') {
            console.log('NextMilestone already exists in sites');
        } else throw e;
    }
    
    try {
        await seq.query("ALTER TABLE materials DROP COLUMN Rate");
        console.log('Dropped Rate column from materials');
    } catch(e) {
        if (e.original && e.original.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
            console.log('Rate column already dropped or does not exist in materials');
        } else throw e;
    }
    
    console.log('Migration complete');
    process.exit(0);
}

migrate().catch(e => { console.error(e); process.exit(1); });
