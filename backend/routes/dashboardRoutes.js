const express = require('express');
const router = express.Router();
const { Client, Site, Labour, Material, Payment, Payee, PersonType, ShiftMaster, MaterialType, SiteMaterial, AttendanceSheet, WeeklyPaySheet, PersonalExpense, sequelize } = require('../models');
const { Op } = require('sequelize');

// @route   GET api/dashboard
// @desc    Get aggregate stats for dashboard
router.get('/', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
            totalClients,
            activeSites,
            completedSites,
            upcomingSites,
            totalLabours,
            totalMaterials,
            totalPayees,
            totalPersonTypes,
            totalShiftTypes,
            totalMaterialTypes,
            totalPurchases,
            totalAttendanceSheets,
            totalWeeklySheets,
            totalPettyCash,
            todayPaymentsRaw,
            totalSiteValuesRaw,
            totalPaymentsRaw
        ] = await Promise.all([
            Client.count(),
            Site.count({ where: { Status: 'In Progress' } }),
            Site.count({ where: { Status: 'Completed' } }),
            Site.count({ where: { Status: 'Upcoming' } }),
            Labour.count(),
            Material.count(),
            Payee.count(),
            PersonType.count(),
            ShiftMaster.count(),
            MaterialType.count(),
            SiteMaterial.count(),
            AttendanceSheet.count(),
            WeeklyPaySheet.count(),
            PersonalExpense.count(),
            Payment.sum('Amount', {
                where: {
                    PaymentDate: {
                        [Op.gte]: today
                    }
                }
            }),
            Site.sum('SiteValue'),
            Payment.sum('Amount')
        ]);

        const todayPayments = todayPaymentsRaw || 0;
        const totalSiteValues = totalSiteValuesRaw || 0;
        const totalPayments = totalPaymentsRaw || 0;
        const pendingPayments = Math.max(0, totalSiteValues - totalPayments);

        res.json({
            totalClients,
            activeSites,
            completedSites,
            upcomingSites,
            totalLabours,
            totalMaterials,
            todayPayments,
            pendingPayments,
            totalPayees,
            totalPersonTypes,
            totalShiftTypes,
            totalMaterialTypes,
            totalPurchases,
            totalAttendanceSheets,
            totalWeeklySheets,
            totalPettyCash
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
