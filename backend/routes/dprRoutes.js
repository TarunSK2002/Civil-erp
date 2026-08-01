const express = require('express');
const router = express.Router();
const { DailyProgressReport, Site } = require('../models');

// GET all DPRs for a site
router.get('/site/:siteId', async (req, res) => {
    try {
        const dprs = await DailyProgressReport.findAll({
            where: { SiteId: req.params.siteId },
            include: [{ model: Site, as: 'Site', attributes: ['SiteName'] }],
            order: [['ReportDate', 'DESC']]
        });
        res.json(dprs);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// POST new DPR
router.post('/', async (req, res) => {
    const { SiteId, ReportDate, WorkDone, LabourCount, Issues, WeatherCondition, CreatedBy } = req.body;
    try {
        if (!SiteId || !ReportDate || !WorkDone) {
            return res.status(400).json({ msg: 'SiteId, ReportDate, and WorkDone are required' });
        }
        const newDpr = await DailyProgressReport.create({
            SiteId,
            ReportDate,
            WorkDone,
            LabourCount: parseInt(LabourCount) || 0,
            Issues,
            WeatherCondition: WeatherCondition || 'Sunny',
            CreatedBy
        });
        res.json(newDpr);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// DELETE DPR
router.delete('/:id', async (req, res) => {
    try {
        const dpr = await DailyProgressReport.findByPk(req.params.id);
        if (!dpr) return res.status(404).json({ msg: 'DPR record not found' });
        await dpr.destroy();
        res.json({ msg: 'DPR removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;
