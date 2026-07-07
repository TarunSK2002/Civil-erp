const { Sequelize } = require('sequelize');
require('dotenv').config();

console.log('Initializing MySQL connection to host:', process.env.DB_HOST);
const sequelize = new Sequelize(
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

// Register beforeDefine hook on Sequelize to inject uuid and is_deleted into models
sequelize.addHook('beforeDefine', (attributes, options) => {
    const modelName = options.modelName || options.name.singular;
    // Exclude system/special tables
    if (modelName === 'User' || modelName === 'ActionLog' || modelName === 'LiftingChargeRate') {
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

module.exports = sequelize;
