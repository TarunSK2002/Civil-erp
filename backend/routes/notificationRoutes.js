const express = require('express');
const router = express.Router();
const { PushToken } = require('../models');

// POST Register Expo Push Token
router.post('/register-token', async (req, res) => {
    const { Username, ExpoPushToken, DeviceOS } = req.body;
    try {
        if (!Username || !ExpoPushToken) {
            return res.status(400).json({ msg: 'Username and ExpoPushToken are required' });
        }
        const [tokenRecord, created] = await PushToken.findOrCreate({
            where: { ExpoPushToken },
            defaults: { Username, DeviceOS }
        });
        if (!created) {
            await tokenRecord.update({ Username, DeviceOS });
        }
        res.json({ msg: 'Push token registered successfully', token: tokenRecord });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;
