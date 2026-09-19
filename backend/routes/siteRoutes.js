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
                ConstructionType: s.ConstructionType || 'Normal',
                ContractRates: (() => {
                    if (!s.ContractRates) return [];
                    if (typeof s.ContractRates === 'string') {
                        try { return JSON.parse(s.ContractRates); } catch (e) { return []; }
                    }
                    return Array.isArray(s.ContractRates) ? s.ContractRates : [];
                })(),
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

        // Parse and enrich ContractRates with live measurement & labour payment tallying
        const rawContractRates = (() => {
            if (!plainSite.ContractRates) return [];
            if (typeof plainSite.ContractRates === 'string') {
                try { return JSON.parse(plainSite.ContractRates); } catch (e) { return []; }
            }
            return Array.isArray(plainSite.ContractRates) ? plainSite.ContractRates : [];
        })();

        const enrichedContractRates = await Promise.all(rawContractRates.map(async (cr) => {
            const payeeId = cr.payeeId;
            const ratePerSqFt = parseFloat(cr.ratePerSqFt || 0);
            const totalSqFt = parseFloat(cr.totalSqFt || 0);
            const contractValue = totalSqFt > 0 ? (totalSqFt * ratePerSqFt) : 0;

            // 1. Measured SqFt & Earned Work Value from attendance_records
            const [attStats] = await sequelize.query(`
                SELECT 
                    COALESCE(SUM(SqFt), 0) AS completedSqFt,
                    COALESCE(SUM(CalculatedAmount), 0) AS workValueEarned,
                    COUNT(*) AS entriesCount
                FROM attendance_records 
                WHERE SiteId = :siteId 
                  AND PayeeId = :payeeId 
                  AND is_deleted = 0
            `, {
                replacements: { siteId: site.id, payeeId },
                type: sequelize.QueryTypes.SELECT
            }).catch(() => ([{ completedSqFt: 0, workValueEarned: 0, entriesCount: 0 }]));

            const completedSqFt = parseFloat(attStats?.completedSqFt || 0);
            const workValueEarned = parseFloat(attStats?.workValueEarned || 0);
            const balanceSqFt = totalSqFt > 0 ? (totalSqFt - completedSqFt) : 0;
            const progressPct = totalSqFt > 0 ? Math.min(100, Math.max(0, (completedSqFt / totalSqFt) * 100)) : 0;

            // 2. Payments made to this contractor for this site
            const [payStats] = await sequelize.query(`
                SELECT COALESCE(SUM(Amount), 0) AS directPaid
                FROM payments 
                WHERE SiteId = :siteId 
                  AND (PayeeId = :payeeId OR LabourId = :payeeId) 
                  AND is_deleted = 0
            `, {
                replacements: { siteId: site.id, payeeId },
                type: sequelize.QueryTypes.SELECT
            }).catch(() => ([{ directPaid: 0 }]));

            const [sheetStats] = await sequelize.query(`
                SELECT COALESCE(SUM(TotalNetPayable), 0) AS sheetPaid
                FROM weekly_pay_sheet_items 
                WHERE SiteId = :siteId 
                  AND PayeeId = :payeeId 
                  AND is_deleted = 0
            `, {
                replacements: { siteId: site.id, payeeId },
                type: sequelize.QueryTypes.SELECT
            }).catch(() => ([{ sheetPaid: 0 }]));

            const totalPaid = Math.max(parseFloat(payStats?.directPaid || 0), parseFloat(sheetStats?.sheetPaid || 0));
            const balancePayable = Math.max(0, workValueEarned - totalPaid);

            return {
                ...cr,
                totalSqFt,
                ratePerSqFt,
                contractValue,
                completedSqFt,
                balanceSqFt,
                progressPct: parseFloat(progressPct.toFixed(1)),
                workValueEarned,
                totalPaid,
                balancePayable,
                entriesCount: parseInt(attStats?.entriesCount || 0, 10),
                isOverrun: totalSqFt > 0 && completedSqFt > totalSqFt
            };
        }));

        const contractSummary = {
            totalAllocatedSqFt: enrichedContractRates.reduce((sum, cr) => sum + (cr.totalSqFt || 0), 0),
            totalCompletedSqFt: enrichedContractRates.reduce((sum, cr) => sum + (cr.completedSqFt || 0), 0),
            totalContractBudget: enrichedContractRates.reduce((sum, cr) => sum + (cr.contractValue || 0), 0),
            totalWorkValueEarned: enrichedContractRates.reduce((sum, cr) => sum + (cr.workValueEarned || 0), 0),
            totalPaidAmount: enrichedContractRates.reduce((sum, cr) => sum + (cr.totalPaid || 0), 0),
            totalBalancePayable: enrichedContractRates.reduce((sum, cr) => sum + (cr.balancePayable || 0), 0)
        };

        res.json({
            ...plainSite,
            ConstructionType: plainSite.ConstructionType || 'Normal',
            ContractRates: enrichedContractRates,
            ContractSummary: contractSummary,
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
    const { SiteName, ClientId, SiteValue, Length, Breadth, Facing, Status, Progress, NextMilestone, ConstructionType, ContractRates } = req.body;
    try {
        const ratesJson = ContractRates ? (typeof ContractRates === 'string' ? ContractRates : JSON.stringify(ContractRates)) : '[]';
        const newSite = await Site.create({
            SiteName,
            ClientId,
            SiteValue,
            Length,
            Breadth,
            Facing,
            Status: Status || 'Upcoming',
            Progress: Progress || 0,
            NextMilestone: NextMilestone || '',
            ConstructionType: ConstructionType || 'Normal',
            ContractRates: ratesJson
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
    const { SiteName, ClientId, SiteValue, Length, Breadth, Facing, Status, Progress, NextMilestone, ConstructionType, ContractRates } = req.body;
    try {
        let site = await Site.findByPk(req.params.id);
        if (!site) return res.status(404).json({ msg: 'Site not found' });

        const updateData = {
            SiteName,
            ClientId,
            SiteValue,
            Length,
            Breadth,
            Facing,
            Status,
            Progress,
            NextMilestone
        };
        if (ConstructionType !== undefined) {
            updateData.ConstructionType = ConstructionType;
        }
        if (ContractRates !== undefined) {
            updateData.ContractRates = typeof ContractRates === 'string' ? ContractRates : JSON.stringify(ContractRates);
        }

        site = await site.update(updateData);
        res.json(site);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PATCH api/sites/:id/contract-rates
// @desc    Update site contract rates and construction type
router.patch('/:id/contract-rates', async (req, res) => {
    const { ConstructionType, ContractRates } = req.body;
    try {
        let site = await Site.findByPk(req.params.id);
        if (!site) return res.status(404).json({ msg: 'Site not found' });

        const updateData = {};
        if (ConstructionType !== undefined) updateData.ConstructionType = ConstructionType;
        if (ContractRates !== undefined) {
            updateData.ContractRates = typeof ContractRates === 'string' ? ContractRates : JSON.stringify(ContractRates);
        }

        site = await site.update(updateData);
        res.json(site);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/sites/contract-tally/:siteId/:payeeId
// @desc    Get live measurement & payment tally for a single contractor on a site
router.get('/contract-tally/:siteId/:payeeId', async (req, res) => {
    const { siteId, payeeId } = req.params;
    try {
        const site = await Site.findByPk(siteId);
        if (!site) return res.status(404).json({ msg: 'Site not found' });

        const rawContractRates = (() => {
            if (!site.ContractRates) return [];
            if (typeof site.ContractRates === 'string') {
                try { return JSON.parse(site.ContractRates); } catch (e) { return []; }
            }
            return Array.isArray(site.ContractRates) ? site.ContractRates : [];
        })();

        const matchedRate = rawContractRates.find(cr => String(cr.payeeId) === String(payeeId));

        const ratePerSqFt = parseFloat(matchedRate?.ratePerSqFt || 0);
        const totalSqFt = parseFloat(matchedRate?.totalSqFt || 0);
        const contractValue = totalSqFt > 0 ? (totalSqFt * ratePerSqFt) : 0;

        const [attStats] = await sequelize.query(`
            SELECT 
                COALESCE(SUM(SqFt), 0) AS completedSqFt,
                COALESCE(SUM(CalculatedAmount), 0) AS workValueEarned,
                COUNT(*) AS entriesCount
            FROM attendance_records 
            WHERE SiteId = :siteId 
              AND PayeeId = :payeeId 
              AND is_deleted = 0
        `, {
            replacements: { siteId, payeeId },
            type: sequelize.QueryTypes.SELECT
        }).catch(() => ([{ completedSqFt: 0, workValueEarned: 0, entriesCount: 0 }]));

        const completedSqFt = parseFloat(attStats?.completedSqFt || 0);
        const workValueEarned = parseFloat(attStats?.workValueEarned || 0);
        const balanceSqFt = totalSqFt > 0 ? (totalSqFt - completedSqFt) : 0;
        const progressPct = totalSqFt > 0 ? Math.min(100, Math.max(0, (completedSqFt / totalSqFt) * 100)) : 0;

        const [payStats] = await sequelize.query(`
            SELECT COALESCE(SUM(Amount), 0) AS directPaid
            FROM payments 
            WHERE SiteId = :siteId 
              AND (PayeeId = :payeeId OR LabourId = :payeeId) 
              AND is_deleted = 0
        `, {
            replacements: { siteId, payeeId },
            type: sequelize.QueryTypes.SELECT
        }).catch(() => ([{ directPaid: 0 }]));

        const [sheetStats] = await sequelize.query(`
            SELECT COALESCE(SUM(TotalNetPayable), 0) AS sheetPaid
            FROM weekly_pay_sheet_items 
            WHERE SiteId = :siteId 
              AND PayeeId = :payeeId 
              AND is_deleted = 0
        `, {
            replacements: { siteId, payeeId },
            type: sequelize.QueryTypes.SELECT
        }).catch(() => ([{ sheetPaid: 0 }]));

        const totalPaid = Math.max(parseFloat(payStats?.directPaid || 0), parseFloat(sheetStats?.sheetPaid || 0));
        const balancePayable = Math.max(0, workValueEarned - totalPaid);

        res.json({
            siteId: parseInt(siteId),
            payeeId: parseInt(payeeId),
            role: matchedRate?.role || 'Contractor',
            totalSqFt,
            ratePerSqFt,
            contractValue,
            completedSqFt,
            balanceSqFt,
            progressPct: parseFloat(progressPct.toFixed(1)),
            workValueEarned,
            totalPaid,
            balancePayable,
            entriesCount: parseInt(attStats?.entriesCount || 0, 10),
            isOverrun: totalSqFt > 0 && completedSqFt > totalSqFt
        });
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
