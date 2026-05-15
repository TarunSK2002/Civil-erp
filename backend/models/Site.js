const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Site = sequelize.define('Site', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    SiteName: {
        type: DataTypes.STRING(150),
        allowNull: false
    },
    ClientId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    SiteValue: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false
    },
    Length: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    Breadth: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    Facing: {
        type: DataTypes.STRING(10),
        defaultValue: ''
    },
    Status: {
        type: DataTypes.STRING(20),
        defaultValue: 'Upcoming'
    },
    Progress: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0
    },
    NextMilestone: {
        type: DataTypes.STRING(255),
        defaultValue: ''
    },
    CreatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'sites',
    timestamps: false
});

module.exports = Site;
