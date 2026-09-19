const sequelize = require('./db');

async function ensureContractColumns() {
    try {
        const queryInterface = sequelize.getQueryInterface();

        // 1. Check attendance_records columns
        const attendanceTableInfo = await queryInterface.describeTable('attendance_records').catch(() => ({}));
        if (!attendanceTableInfo.WorkDescription && !attendanceTableInfo.work_description) {
            console.log('Migrating: Adding WorkDescription to attendance_records...');
            await sequelize.query('ALTER TABLE attendance_records ADD COLUMN WorkDescription VARCHAR(255) NULL').catch(e => {
                console.warn('Notice (WorkDescription):', e.message);
            });
        }
        if (!attendanceTableInfo.DeductionSqFt && !attendanceTableInfo.deduction_sq_ft) {
            console.log('Migrating: Adding DeductionSqFt to attendance_records...');
            await sequelize.query('ALTER TABLE attendance_records ADD COLUMN DeductionSqFt DECIMAL(12,2) NULL DEFAULT 0.00').catch(e => {
                console.warn('Notice (DeductionSqFt):', e.message);
            });
        }

        // 2. Check weekly_pay_sheet_items columns
        const sheetItemTableInfo = await queryInterface.describeTable('weekly_pay_sheet_items').catch(() => ({}));
        if (!sheetItemTableInfo.GrossAmount && !sheetItemTableInfo.gross_amount) {
            console.log('Migrating: Adding GrossAmount to weekly_pay_sheet_items...');
            await sequelize.query('ALTER TABLE weekly_pay_sheet_items ADD COLUMN GrossAmount DECIMAL(18,2) NOT NULL DEFAULT 0.00').catch(e => {
                console.warn('Notice (GrossAmount):', e.message);
            });
        }
        if (!sheetItemTableInfo.AdvanceAmount && !sheetItemTableInfo.advance_amount) {
            console.log('Migrating: Adding AdvanceAmount to weekly_pay_sheet_items...');
            await sequelize.query('ALTER TABLE weekly_pay_sheet_items ADD COLUMN AdvanceAmount DECIMAL(18,2) NOT NULL DEFAULT 0.00').catch(e => {
                console.warn('Notice (AdvanceAmount):', e.message);
            });
        }
        if (!sheetItemTableInfo.RetentionPercent && !sheetItemTableInfo.retention_percent) {
            console.log('Migrating: Adding RetentionPercent to weekly_pay_sheet_items...');
            await sequelize.query('ALTER TABLE weekly_pay_sheet_items ADD COLUMN RetentionPercent DECIMAL(5,2) NOT NULL DEFAULT 0.00').catch(e => {
                console.warn('Notice (RetentionPercent):', e.message);
            });
        }
        if (!sheetItemTableInfo.RetentionAmount && !sheetItemTableInfo.retention_amount) {
            console.log('Migrating: Adding RetentionAmount to weekly_pay_sheet_items...');
            await sequelize.query('ALTER TABLE weekly_pay_sheet_items ADD COLUMN RetentionAmount DECIMAL(18,2) NOT NULL DEFAULT 0.00').catch(e => {
                console.warn('Notice (RetentionAmount):', e.message);
            });
        }

        // 3. Check sites columns
        const sitesTableInfo = await queryInterface.describeTable('sites').catch(() => ({}));
        if (!sitesTableInfo.ConstructionType && !sitesTableInfo.construction_type) {
            console.log('Migrating: Adding ConstructionType to sites...');
            await sequelize.query("ALTER TABLE sites ADD COLUMN ConstructionType VARCHAR(30) NOT NULL DEFAULT 'Normal'").catch(e => {
                console.warn('Notice (ConstructionType):', e.message);
            });
        }
        if (!sitesTableInfo.ContractRates && !sitesTableInfo.contract_rates) {
            console.log('Migrating: Adding ContractRates to sites...');
            await sequelize.query("ALTER TABLE sites ADD COLUMN ContractRates TEXT NULL").catch(e => {
                console.warn('Notice (ContractRates):', e.message);
            });
        }

        console.log('Contract & MB schema migration verified.');
    } catch (err) {
        console.warn('Could not complete dynamic contract column check:', err.message);
    }
}

module.exports = ensureContractColumns;
