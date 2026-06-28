const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const dialect = process.env.DB_DIALECT || 'mysql';
let sequelize;

if (dialect === 'sqlite') {
    // Resolve DB path (prefer Electron userData if provided, fallback to local file)
    const dbPath = process.env.USER_DATA_PATH 
        ? path.join(process.env.USER_DATA_PATH, 'jeeva.sqlite')
        : path.resolve(__dirname, '../data/jeeva.sqlite');
    
    // Ensure directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    console.log('Initializing SQLite connection at:', dbPath);
    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: dbPath,
        logging: false, // Set to console.log to see SQL queries
        define: {
            timestamps: true,
            underscored: true
        },
        pool: {
            max: 1,      // SQLite supports only 1 write connection
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        retry: {
            max: 3        // Retry on SQLITE_BUSY
        }
    });

    // Enable WAL mode for better concurrent read/write performance
    sequelize.query('PRAGMA journal_mode=WAL;').catch(() => {});
    sequelize.query('PRAGMA busy_timeout=5000;').catch(() => {});
} else {
    console.log('Initializing MySQL connection to host:', process.env.DB_HOST);
    sequelize = new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASS,
        {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            dialect: 'mysql',
            logging: false,
            pool: {
                max: 5,
                min: 0,
                acquire: 30000,
                idle: 10000
            }
        }
    );
}

// Register beforeDefine hook on Sequelize to inject uuid and is_deleted into models
sequelize.addHook('beforeDefine', (attributes, options) => {
    const modelName = options.modelName || options.name.singular;
    // Exclude system/special tables
    if (modelName === 'SyncQueue' || modelName === 'User' || modelName === 'ActionLog' || modelName === 'LiftingChargeRate') {
        return;
    }

    if (!attributes.uuid) {
        attributes.uuid = {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            allowNull: false
        };
    }

    if (!attributes.is_deleted) {
        attributes.is_deleted = {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
            allowNull: false
        };
    }

    // Add default scope to exclude soft-deleted records automatically
    if (!options.defaultScope) {
        options.defaultScope = {};
    }
    if (!options.defaultScope.where) {
        options.defaultScope.where = {};
    }
    options.defaultScope.where.is_deleted = false;
});

// Register CRUD hooks for local SQLite synchronization queueing
if (dialect === 'sqlite') {
    sequelize.addHook('afterCreate', async (instance, options) => {
        const modelName = instance.constructor.name;
        if (modelName === 'SyncQueue' || modelName === 'User' || modelName === 'ActionLog' || modelName === 'LiftingChargeRate') {
            return;
        }

        try {
            const SyncQueue = sequelize.models.SyncQueue;
            if (SyncQueue) {
                await SyncQueue.create({
                    tableName: instance.constructor.tableName,
                    recordUuid: instance.uuid,
                    action: 'CREATE',
                    payload: JSON.stringify(instance.toJSON())
                }, { transaction: options.transaction });
                
                // Schedule sync on next tick to avoid blocking the HTTP response
                setImmediate(() => {
                    const syncManager = require('../sync/syncManager');
                    syncManager.syncNow();
                });
            }
        } catch (err) {
            console.error('Failed to queue CREATE operation:', err.message);
        }
    });

    sequelize.addHook('afterUpdate', async (instance, options) => {
        const modelName = instance.constructor.name;
        if (modelName === 'SyncQueue' || modelName === 'User' || modelName === 'ActionLog' || modelName === 'LiftingChargeRate') {
            return;
        }

        try {
            const SyncQueue = sequelize.models.SyncQueue;
            if (SyncQueue) {
                await SyncQueue.create({
                    tableName: instance.constructor.tableName,
                    recordUuid: instance.uuid,
                    action: 'UPDATE',
                    payload: JSON.stringify(instance.toJSON())
                }, { transaction: options.transaction });
                
                setImmediate(() => {
                    const syncManager = require('../sync/syncManager');
                    syncManager.syncNow();
                });
            }
        } catch (err) {
            console.error('Failed to queue UPDATE operation:', err.message);
        }
    });

    sequelize.addHook('afterDestroy', async (instance, options) => {
        const modelName = instance.constructor.name;
        if (modelName === 'SyncQueue' || modelName === 'User' || modelName === 'ActionLog' || modelName === 'LiftingChargeRate') {
            return;
        }

        try {
            const SyncQueue = sequelize.models.SyncQueue;
            if (SyncQueue) {
                await SyncQueue.create({
                    tableName: instance.constructor.tableName,
                    recordUuid: instance.uuid,
                    action: 'DELETE',
                    payload: null
                }, { transaction: options.transaction });
                
                setImmediate(() => {
                    const syncManager = require('../sync/syncManager');
                    syncManager.syncNow();
                });
            }
        } catch (err) {
            console.error('Failed to queue DELETE operation:', err.message);
        }
    });
}

module.exports = sequelize;

