const express = require('express');
const router = express.Router();
const { Client, Site, Labour, Material, Payment, sequelize } = require('../models');
const { Op } = require('sequelize');

// @route   GET api/dashboard
// @desc    Get aggregate stats for dashboard
router.get('/', async (req, res) => {
    try {
        const totalClients = await Client.count();
        const activeSites = await Site.count({ where: { Status: 'In Progress' } });
        const completedSites = await Site.count({ where: { Status: 'Completed' } });
        const upcomingSites = await Site.count({ where: { Status: 'Upcoming' } });
        const totalLabours = await Labour.count();
        const totalMaterials = await Material.count();

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayPayments = await Payment.sum('Amount', {
            where: {
                PaymentDate: {
                    [Op.gte]: today
                }
            }
        }) || 0;

        const totalSiteValues = await Site.sum('SiteValue') || 0;
        const totalPayments = await Payment.sum('Amount') || 0;
        const pendingPayments = Math.max(0, totalSiteValues - totalPayments);

        res.json({
            totalClients,
            activeSites,
            completedSites,
            upcomingSites,
            totalLabours,
            totalMaterials,
            todayPayments,
            pendingPayments
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
