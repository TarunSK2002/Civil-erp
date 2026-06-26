const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ActionLog = sequelize.define('ActionLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'Id'
    },
    WeeklyPaySheetId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    ActionType: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    EntityType: {
        type: DataTypes.STRING(30),
        allowNull: false
    },
    EntityId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    BeforeData: {
        type: DataTypes.JSON,
        allowNull: true,
        get() {
            const val = this.getDataValue('BeforeData');
            if (typeof val === 'string') {
                try { return JSON.parse(val); } catch { return val; }
            }
            return val;
        },
        set(val) {
            this.setDataValue('BeforeData', typeof val === 'object' && val !== null ? JSON.stringify(val) : val);
        }
    },
    AfterData: {
        type: DataTypes.JSON,
        allowNull: true,
        get() {
            const val = this.getDataValue('AfterData');
            if (typeof val === 'string') {
                try { return JSON.parse(val); } catch { return val; }
            }
            return val;
        },
        set(val) {
            this.setDataValue('AfterData', typeof val === 'object' && val !== null ? JSON.stringify(val) : val);
        }
    },
    IsUndone: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    CreatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'action_logs',
    timestamps: false
});

module.exports = ActionLog;
