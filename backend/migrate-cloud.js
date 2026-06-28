/**
 * migrate-cloud.js
 * 
 * Standalone migration script for the cloud MySQL database.
 * Consolidates ALL schema migrations (V1 → V5) into a single runnable file.
 * 
 * Usage:
 *   node backend/migrate-cloud.js
 * 
 * Ensure your .env file points to the cloud MySQL database before running.
 * Each migration is idempotent — safe to run multiple times.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Sequelize } = require('sequelize');
const crypto = require('crypto');

function generateUUID() {
    return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}


// ─── Configuration ───────────────────────────────────────────────────────────
const DB_NAME = process.env.DB_NAME || 'jeeva_construction';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASS || '12345678';
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = process.env.DB_PORT || 3306;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: 'mysql',
    logging: false,
});

// ─── Migration Definitions ──────────────────────────────────────────────────
const migrations = [
    // ═══════════════════════════════════════════════════════════════
    // Schema migrations (V1 → V2)
    // ═══════════════════════════════════════════════════════════════
    "ALTER TABLE weekly_pay_sheets ADD COLUMN SelectedPayeeIds TEXT NULL;",
    "ALTER TABLE weekly_pay_sheets ADD COLUMN SelectedSiteIds TEXT NULL;",
    "ALTER TABLE payments ADD COLUMN PayeeId INT NULL;",
    "ALTER TABLE labours ADD COLUMN PayeeId INT NULL;",
    "ALTER TABLE sites ADD COLUMN Progress DECIMAL(5,2) DEFAULT 0;",
    "ALTER TABLE site_materials ADD COLUMN Amount DECIMAL(18,2) DEFAULT 0;",
    "ALTER TABLE site_materials ADD COLUMN DealerName VARCHAR(100) DEFAULT '';",
    "ALTER TABLE sites ADD COLUMN NextMilestone VARCHAR(255) DEFAULT '';",
    "ALTER TABLE materials DROP COLUMN Rate;",

    // ═══════════════════════════════════════════════════════════════
    // Schema migrations (V2 → V3)
    // ═══════════════════════════════════════════════════════════════
    "ALTER TABLE attendance_records ADD COLUMN PersonType VARCHAR(30) NOT NULL DEFAULT 'Mason';",
    "ALTER TABLE person_types ADD COLUMN DailyRate DECIMAL(18,2) NOT NULL DEFAULT 0;",
    "ALTER TABLE materials ADD COLUMN DealerName VARCHAR(100) DEFAULT '';",
    "ALTER TABLE materials ADD COLUMN MobileNo VARCHAR(15) DEFAULT '';",
    "ALTER TABLE materials ADD COLUMN AccountNo VARCHAR(30) DEFAULT '';",
    "ALTER TABLE materials ADD COLUMN MaterialTypeId INT DEFAULT NULL;",
    "ALTER TABLE weekly_pay_sheet_items ADD COLUMN IsSkipped TINYINT(1) NOT NULL DEFAULT 0;",
    "ALTER TABLE weekly_pay_sheet_items ADD COLUMN SkippedToSheetId INT DEFAULT NULL;",
    "ALTER TABLE weekly_pay_sheet_items ADD COLUMN IsExtraPayment TINYINT(1) NOT NULL DEFAULT 0;",
    "ALTER TABLE weekly_pay_sheet_items ADD COLUMN ExtraPaymentDescription VARCHAR(255) DEFAULT NULL;",
    "ALTER TABLE weekly_pay_sheets ADD COLUMN Status VARCHAR(20) NOT NULL DEFAULT 'Open';",
    "ALTER TABLE material_types ADD COLUMN Price DECIMAL(18,2) NOT NULL DEFAULT 0;",
    "ALTER TABLE material_types ADD COLUMN DefaultUnit VARCHAR(50) DEFAULT 'nos';",
    `CREATE TABLE IF NOT EXISTS master_settings (
        Id INT AUTO_INCREMENT PRIMARY KEY,
        SettingKey VARCHAR(100) NOT NULL UNIQUE,
        SettingValue VARCHAR(255) NOT NULL DEFAULT '',
        UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );`,
    `INSERT IGNORE INTO master_settings (SettingKey, SettingValue) VALUES ('TeaExpense', '20'), ('BusExpense', '50');`,

    // Fix site_materials foreign key constraint mismatch
    "ALTER TABLE site_materials DROP FOREIGN KEY site_materials_ibfk_14;",
    "ALTER TABLE site_materials DROP FOREIGN KEY site_materials_ibfk_6;",
    "ALTER TABLE site_materials ADD CONSTRAINT fk_site_materials_material_type FOREIGN KEY (MaterialId) REFERENCES material_types (Id) ON DELETE CASCADE ON UPDATE CASCADE;",

    // ═══════════════════════════════════════════════════════════════
    // Schema migrations (V3 → V4)
    // ═══════════════════════════════════════════════════════════════
    "ALTER TABLE material_types ADD COLUMN CalculationMode VARCHAR(30) DEFAULT 'Manual';",
    "ALTER TABLE site_materials ADD COLUMN Length DECIMAL(10,2) DEFAULT NULL;",
    "ALTER TABLE site_materials ADD COLUMN Breadth DECIMAL(10,2) DEFAULT NULL;",
    "ALTER TABLE site_materials ADD COLUMN SqFt DECIMAL(12,2) DEFAULT NULL;",
    "ALTER TABLE site_materials ADD COLUMN WastagePercent DECIMAL(5,2) DEFAULT 0;",
    "ALTER TABLE site_materials ADD COLUMN RatePerUnit DECIMAL(18,2) DEFAULT 0;",
    "ALTER TABLE site_materials ADD COLUMN CalculationMode VARCHAR(30) DEFAULT 'Manual';",
    "ALTER TABLE weekly_pay_sheet_items ADD COLUMN SourceType VARCHAR(30) DEFAULT 'Attendance';",
    "ALTER TABLE weekly_pay_sheet_items ADD COLUMN SourceMaterialIds TEXT DEFAULT NULL;",
    `CREATE TABLE IF NOT EXISTS action_logs (
        Id INT AUTO_INCREMENT PRIMARY KEY,
        WeeklyPaySheetId INT NOT NULL,
        ActionType VARCHAR(50) NOT NULL,
        EntityType VARCHAR(30) NOT NULL,
        EntityId INT DEFAULT NULL,
        BeforeData JSON DEFAULT NULL,
        AfterData JSON DEFAULT NULL,
        CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        IsUndone TINYINT(1) NOT NULL DEFAULT 0,
        INDEX idx_action_logs_sheet (WeeklyPaySheetId),
        INDEX idx_action_logs_created (CreatedAt)
    );`,
    `CREATE TABLE IF NOT EXISTS site_sections (
        Id INT AUTO_INCREMENT PRIMARY KEY,
        SiteId INT NOT NULL,
        Name VARCHAR(100) NOT NULL,
        SortOrder INT DEFAULT 0,
        CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (SiteId) REFERENCES sites(Id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS site_projects (
        Id INT AUTO_INCREMENT PRIMARY KEY,
        SiteId INT NOT NULL,
        ProjectName VARCHAR(200) NOT NULL,
        WorkType VARCHAR(100) DEFAULT 'New Construction',
        StartDate DATE DEFAULT NULL,
        EndDate DATE DEFAULT NULL,
        Status VARCHAR(30) DEFAULT 'In Progress',
        QuotedValue DECIMAL(18,2) DEFAULT 0,
        Notes VARCHAR(500) DEFAULT NULL,
        CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (SiteId) REFERENCES sites(Id) ON DELETE CASCADE
    );`,
    "ALTER TABLE site_materials ADD COLUMN SectionId INT DEFAULT NULL;",
    "ALTER TABLE site_materials ADD COLUMN ProjectId INT DEFAULT NULL;",
    "ALTER TABLE attendance_records ADD COLUMN SectionId INT DEFAULT NULL;",
    "ALTER TABLE attendance_records ADD COLUMN ProjectId INT DEFAULT NULL;",
    "ALTER TABLE weekly_pay_sheet_items ADD COLUMN ProjectId INT DEFAULT NULL;",

    // ═══════════════════════════════════════════════════════════════
    // Schema migrations (V4 → V5)
    // ═══════════════════════════════════════════════════════════════
    "ALTER TABLE site_sections ADD COLUMN Length DECIMAL(10,2) DEFAULT NULL;",
    "ALTER TABLE site_sections ADD COLUMN Breadth DECIMAL(10,2) DEFAULT NULL;",
    "ALTER TABLE site_sections ADD COLUMN Height DECIMAL(10,2) DEFAULT NULL;",
    "ALTER TABLE site_sections ADD COLUMN Area DECIMAL(12,2) DEFAULT NULL;",
    "ALTER TABLE site_sections ADD COLUMN SectionValue DECIMAL(18,2) DEFAULT 0;",
    "ALTER TABLE site_sections ADD COLUMN RatePerSqFt DECIMAL(18,2) DEFAULT NULL;",
    "ALTER TABLE attendance_records ADD COLUMN CalculationMode VARCHAR(30) DEFAULT 'Shift';",
    "ALTER TABLE attendance_records ADD COLUMN Length DECIMAL(10,2) DEFAULT NULL;",
    "ALTER TABLE attendance_records ADD COLUMN Breadth DECIMAL(10,2) DEFAULT NULL;",
    "ALTER TABLE attendance_records ADD COLUMN SqFt DECIMAL(12,2) DEFAULT NULL;",
    "ALTER TABLE attendance_records ADD COLUMN RatePerSqFt DECIMAL(18,2) DEFAULT NULL;",
    `CREATE TABLE IF NOT EXISTS lifting_charge_rates (
        Id INT AUTO_INCREMENT PRIMARY KEY,
        MaterialType VARCHAR(50) NOT NULL,
        Floor VARCHAR(50) NOT NULL,
        Rate DECIMAL(18,2) NOT NULL DEFAULT 0,
        CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY idx_lifting_rates_mat_floor (MaterialType, Floor)
    );`,
    `INSERT IGNORE INTO lifting_charge_rates (MaterialType, Floor, Rate) VALUES
        ('M.Sand', 'G.Floor', 1700.00),
        ('M.Sand', '1st floor', 2200.00),
        ('M.Sand', '2nd floor', 3200.00),
        ('M.Sand', '3rd floor', 4200.00),
        ('Jally', 'G.Floor', 2000.00),
        ('Jally', '1st floor', 2600.00),
        ('Jally', '2nd floor', 3600.00),
        ('Jally', '3rd floor', 4600.00),
        ('Sengal', 'G.Floor', 0.90),
        ('Sengal', '1st floor', 1.30),
        ('Sengal', '2nd floor', 2.20),
        ('Sengal', '3rd floor', 3.60);`,
    `CREATE TABLE IF NOT EXISTS lifting_records (
        Id INT AUTO_INCREMENT PRIMARY KEY,
        AttendanceSheetId INT NOT NULL,
        PayeeId INT NOT NULL,
        SiteId INT NOT NULL,
        MaterialType VARCHAR(50) NOT NULL,
        Floor VARCHAR(50) NOT NULL,
        Quantity DECIMAL(12,2) NOT NULL DEFAULT 1,
        Rate DECIMAL(18,2) NOT NULL DEFAULT 0,
        Amount DECIMAL(18,2) NOT NULL DEFAULT 0,
        LiftingDate DATE NOT NULL,
        CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (AttendanceSheetId) REFERENCES attendance_sheets(Id) ON DELETE CASCADE,
        FOREIGN KEY (PayeeId) REFERENCES payees(Id) ON DELETE CASCADE,
        FOREIGN KEY (SiteId) REFERENCES sites(Id) ON DELETE CASCADE
    );`
];

// ─── Syncable tables that need uuid + is_deleted columns ────────────────────
const SYNCABLE_TABLES = [
    'clients', 'sites', 'labours', 'materials', 'site_materials',
    'payments', 'payees', 'weekly_pay_sheets', 'weekly_pay_sheet_items',
    'site_work_values', 'shift_masters', 'attendance_sheets',
    'attendance_records', 'attendance_miscs', 'person_types',
    'material_types', 'petty_cash_transactions', 'personal_expenses',
    'site_sections', 'site_projects', 'lifting_records',
    'master_settings'
];

// ─── Run Migrations ─────────────────────────────────────────────────────────
async function run() {
    try {
        await sequelize.authenticate();
        console.log(`\n✅ Connected to MySQL: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}\n`);
    } catch (err) {
        console.error('❌ Failed to connect to MySQL:', err.message);
        process.exit(1);
    }

    // 1. Run schema migrations
    console.log('═══════════════════════════════════════════');
    console.log('  Running Schema Migrations (V1 → V5)');
    console.log('═══════════════════════════════════════════\n');

    let applied = 0;
    let skipped = 0;

    for (let i = 0; i < migrations.length; i++) {
        const sql = migrations[i];
        const label = sql.trim().substring(0, 80).replace(/\s+/g, ' ');
        try {
            await sequelize.query(sql);
            console.log(`  ✅ [${i + 1}/${migrations.length}] ${label}...`);
            applied++;
        } catch (e) {
            console.log(`  ⏭️  [${i + 1}/${migrations.length}] Skipped (already applied): ${label}...`);
            skipped++;
        }
    }

    console.log(`\n  Results: ${applied} applied, ${skipped} skipped\n`);

    // 2. Add uuid + is_deleted columns to syncable tables
    console.log('═══════════════════════════════════════════');
    console.log('  Adding Sync Columns (uuid, is_deleted)');
    console.log('═══════════════════════════════════════════\n');

    for (const tableName of SYNCABLE_TABLES) {
        // uuid
        try {
            await sequelize.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`uuid\` CHAR(36) NULL;`);
            console.log(`  ✅ Added uuid column to ${tableName}`);
        } catch (e) {
            // already exists
        }

        // is_deleted
        try {
            await sequelize.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`is_deleted\` TINYINT(1) NOT NULL DEFAULT 0;`);
            console.log(`  ✅ Added is_deleted column to ${tableName}`);
        } catch (e) {
            // already exists
        }

        // Generate UUIDs for existing rows where uuid IS NULL
        try {
            const [rows] = await sequelize.query(`SELECT * FROM \`${tableName}\` WHERE \`uuid\` IS NULL`);
            if (rows.length > 0) {
                const sampleRow = rows[0];
                const pkCol = 'Id' in sampleRow ? 'Id' : ('id' in sampleRow ? 'id' : null);
                
                if (pkCol) {
                    let updatedCount = 0;
                    for (const row of rows) {
                        const pkValue = row[pkCol];
                        const newUuid = generateUUID();
                        await sequelize.query(`UPDATE \`${tableName}\` SET \`uuid\` = ? WHERE \`${pkCol}\` = ?`, {
                            replacements: [newUuid, pkValue]
                        });
                        updatedCount++;
                    }
                    console.log(`  ✨ Generated unique UUIDs for ${updatedCount} rows in ${tableName}`);
                } else {
                    console.log(`  ⚠️ Could not identify primary key (Id/id) for ${tableName}. Skipping UUID generation.`);
                }
            }
        } catch (err) {
            console.error(`  ❌ Error updating UUIDs for ${tableName}:`, err.message);
        }
    }


    console.log('\n══════════════════════════════════════');
    console.log('  ✅ Cloud migration complete!');
    console.log('══════════════════════════════════════\n');

    await sequelize.close();
    process.exit(0);
}

run().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
