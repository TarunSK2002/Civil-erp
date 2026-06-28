const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');

// @route   GET /api/master-settings
// @desc    Get all master settings
router.get('/', async (req, res) => {
    try {
        const [rows] = await sequelize.query('SELECT * FROM master_settings ORDER BY SettingKey ASC');
        const settings = {};
        rows.forEach(r => { settings[r.SettingKey] = r.SettingValue; });
        res.json(settings);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   PUT /api/master-settings/:key
// @desc    Update a master setting value
router.put('/:key', async (req, res) => {
    const { value } = req.body;
    try {
        const isSqlite = sequelize.options.dialect === 'sqlite';
        const query = isSqlite
            ? 'INSERT INTO master_settings (SettingKey, SettingValue) VALUES (?, ?) ON CONFLICT(SettingKey) DO UPDATE SET SettingValue = excluded.SettingValue'
            : 'INSERT INTO master_settings (SettingKey, SettingValue) VALUES (?, ?) ON DUPLICATE KEY UPDATE SettingValue = ?';
            
        const replacements = isSqlite
            ? [req.params.key, String(value)]
            : [req.params.key, String(value), String(value)];

        await sequelize.query(query, { replacements });
        res.json({ msg: 'Setting updated', key: req.params.key, value });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;
