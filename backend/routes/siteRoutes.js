const express = require('express');
const router = express.Router();
const { Site, Client, Payment, SiteMaterial, sequelize } = require('../models');
const { Op } = require('sequelize');

// @route   QUERY/POST/GET api/sites
// @desc    Get all sites with search, status filters and aggregated stats using a single optimized raw SQL query
router.all('/', async (req, res) => {
    if (req.method !== 'QUERY' && req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        // Extract parameters based on HTTP method (body for QUERY/POST, query parameters for GET)
        const isBodyMethod = req.method === 'QUERY' || req.method === 'POST';
        const search = isBodyMethod ? (req.body.search || '') : (req.query.search || '');
        const status = isBodyMethod ? (req.body.status || 'All') : (req.query.status || 'All');

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Bind parameters for raw SQL query
        const searchLike = `%${search}%`;

        const query = `
            SELECT 
                s.*,
                c.Name AS ClientName,
                (SELECT COUNT(DISTINCT p.LabourId) 
                 FROM payments p 
                 WHERE p.SiteId = s.Id 
                   AND p.PaymentCategory = 'Labour' 
                   AND p.LabourId IS NOT NULL 
                   AND p.PaymentDate >= :thirtyDaysAgo 
                   AND p.is_deleted = 0) AS ActiveLabourCount,
                (SELECT COUNT(DISTINCT sm.MaterialId) 
                 FROM site_materials sm 
                 WHERE sm.SiteId = s.Id 
                   AND sm.is_deleted = 0) AS MaterialItemCount,
                COALESCE((SELECT SUM(p.Amount) 
                          FROM payments p 
                          WHERE p.SiteId = s.Id 
                            AND p.PaymentCategory = 'Collection' 
                            AND p.is_deleted = 0), 0) AS ReceivedAmount
            FROM sites s
            LEFT JOIN clients c ON s.ClientId = c.id
            WHERE s.is_deleted = 0 
              AND (:status = 'All' OR s.Status = :status)
              AND (:search = '' OR s.SiteName LIKE :searchLike)
            ORDER BY s.CreatedAt DESC;
        `;

        const rawSites = await sequelize.query(query, {
            replacements: {
                thirtyDaysAgo,
                status,
                search,
                searchLike
            },
            type: sequelize.QueryTypes.SELECT
        });

        // Map database result column names to match original ORM attributes structure
        const sites = rawSites.map(s => {
            const siteValue = parseFloat(s.SiteValue || 0);
            const receivedAmount = parseFloat(s.ReceivedAmount || 0);
            return {
                id: s.Id,
                SiteName: s.SiteName,
                ClientId: s.ClientId,
                SiteValue: siteValue,
                Length: s.Length,
                Breadth: s.Breadth,
                Facing: s.Facing,
                Status: s.Status,
                Progress: s.Progress,
                NextMilestone: s.NextMilestone,
                uuid: s.uuid,
                is_deleted: !!s.is_deleted,
                CreatedAt: s.CreatedAt,
                UpdatedAt: s.UpdatedAt,
                Client: s.ClientId ? { Name: s.ClientName || 'No Client' } : null,
                ActiveLabourCount: parseInt(s.ActiveLabourCount || 0, 10),
                MaterialItemCount: parseInt(s.MaterialItemCount || 0, 10),
                ReceivedAmount: receivedAmount,
                BalanceAmount: siteValue - receivedAmount
            };
        });

        res.json(sites);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/sites/:id
// @desc    Get single site detail with financial summary
router.get('/:id', async (req, res) => {
    console.log('GET /api/sites/:id -> Requested site id:', req.params.id);
    try {
        const site = await Site.findByPk(req.params.id, {
            include: [{ model: Client, as: 'Client', attributes: ['id', 'Name', 'MobileNumber', 'PaymentType'] }]
        });
        if (!site) return res.status(404).json({ msg: 'Site not found' });

        const plainSite = site.get({ plain: true });
        const siteValue = parseFloat(plainSite.SiteValue || 0);

        // Received Amount: Sum of all Collection payments for this site
        const receivedAmount = await Payment.sum('Amount', {
            where: { SiteId: site.id, PaymentCategory: 'Collection' }
        }) || 0;

        // Active Labours
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

        // Material Items
        const materialItemCount = await SiteMaterial.count({
            distinct: true,
            col: 'MaterialId',
            where: { SiteId: site.id }
        });

        // Recent Collection payments (last 20)
        const recentPayments = await Payment.findAll({
            where: { SiteId: site.id, PaymentCategory: 'Collection' },
            order: [['PaymentDate', 'DESC']],
            limit: 20
        });

        res.json({
            ...plainSite,
            ReceivedAmount: receivedAmount,
            BalanceAmount: siteValue - receivedAmount,
            ActiveLabourCount: activeLabourCount,
            MaterialItemCount: materialItemCount,
            RecentPayments: recentPayments
        });
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
