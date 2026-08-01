const express = require('express');
const router = express.Router();
const { GpsAttendanceLog, Site } = require('../models');

// GET GPS Logs
router.get('/', async (req, res) => {
    try {
        const logs = await GpsAttendanceLog.findAll({
            include: [{ model: Site, as: 'Site', attributes: ['SiteName'] }],
            order: [['CheckInTime', 'DESC']],
            limit: 100
        });
        res.json(logs);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// POST GPS Check-in log
router.post('/checkin', async (req, res) => {
    const { UserId, Username, SiteId, Latitude, Longitude, Address } = req.body;
    try {
        if (!Username || Latitude === undefined || Longitude === undefined) {
            return res.status(400).json({ msg: 'Username, Latitude, and Longitude are required' });
        }
        const log = await GpsAttendanceLog.create({
            UserId,
            Username,
            SiteId: SiteId ? parseInt(SiteId) : null,
            Latitude,
            Longitude,
            Address
        });
        res.json(log);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;
