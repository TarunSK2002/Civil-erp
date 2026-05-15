const express = require('express');
const router = express.Router();
const { Site, Client, Payment, SiteMaterial } = require('../models');
const { Op } = require('sequelize');

// @route   GET api/sites
// @desc    Get all sites (with search and status filter)
router.get('/', async (req, res) => {
    const { search, status } = req.query;
    let where = {};
    if (status && status !== 'All') {
        where.Status = status;
    }
    if (search) {
        where[Op.or] = [
            { SiteName: { [Op.like]: `%${search}%` } }
        ];
    }

    try {
        const sites = await Site.findAll({
            where,
            include: [{ model: Client, as: 'Client', attributes: ['Name'] }],
            order: [['CreatedAt', 'DESC']]
        });

        // Calculate stats for each site
        const sitesWithStats = await Promise.all(sites.map(async (site) => {
            const plainSite = site.get({ plain: true });
            
            // Active Labours: Unique LabourIds in Payments for this site in last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const activeLabourCount = await Payment.count({
                distinct: true,
                col: 'LabourId',
                where: {
                    SiteId: site.id,
                    PaymentCategory: 'Labour',
                    LabourId: { [Op.ne]: null },
                    PaymentDate: { [Op.gte]: thirtyDaysAgo }
                }
            });

            // Material Items: Count of unique MaterialIds in SiteMaterial for this site
            const materialItemCount = await SiteMaterial.count({
                distinct: true,
                col: 'MaterialId',
                where: { SiteId: site.id }
            });

            return {
                ...plainSite,
                ActiveLabourCount: activeLabourCount,
                MaterialItemCount: materialItemCount
            };
        }));

        res.json(sitesWithStats);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/sites
// @desc    Create a site
router.post('/', async (req, res) => {
    const { SiteName, ClientId, SiteValue, Length, Breadth, Facing, Status, Progress, NextMilestone } = req.body;
    try {
        const newSite = await Site.create({
            SiteName,
            ClientId,
            SiteValue,
            Length,
            Breadth,
            Facing,
            Status: Status || 'Upcoming',
            Progress: Progress || 0,
            NextMilestone: NextMilestone || ''
        });
        res.json(newSite);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/sites/:id
// @desc    Update a site
router.put('/:id', async (req, res) => {
    const { SiteName, ClientId, SiteValue, Length, Breadth, Facing, Status, Progress, NextMilestone } = req.body;
    try {
        let site = await Site.findByPk(req.params.id);
        if (!site) return res.status(404).json({ msg: 'Site not found' });

        site = await site.update({
            SiteName,
            ClientId,
            SiteValue,
            Length,
            Breadth,
            Facing,
            Status,
            Progress,
            NextMilestone
        });
        res.json(site);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PATCH api/sites/:id/status
// @desc    Update site status only
router.patch('/:id/status', async (req, res) => {
    const { Status } = req.body;
    try {
        let site = await Site.findByPk(req.params.id);
        if (!site) return res.status(404).json({ msg: 'Site not found' });

        site = await site.update({ Status });
        res.json(site);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/sites/:id
// @desc    Delete a site
router.delete('/:id', async (req, res) => {
    try {
        const site = await Site.findByPk(req.params.id);
        if (!site) return res.status(404).json({ msg: 'Site not found' });

        await site.destroy();
        res.json({ msg: 'Site removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
