const express = require('express');
const router = express.Router();
const { SiteWorkValue, Site, Client, Payment, Labour, SiteMaterial, Material, MaterialType, Payee, sequelize } = require('../models');
const { Op } = require('sequelize');

// =============================================
// WORK VALUE CRUD
// =============================================

// @route   GET api/reports/work-values/:siteId
// @desc    Get all work items for a site
router.get('/work-values/:siteId', async (req, res) => {
    try {
        const items = await SiteWorkValue.findAll({
            where: { SiteId: req.params.siteId },
            order: [['CreatedAt', 'ASC']]
        });
        res.json(items);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/reports/work-values
// @desc    Add a work item
router.post('/work-values', async (req, res) => {
    const { SiteId, WorkName, Value } = req.body;
    try {
        const item = await SiteWorkValue.create({ SiteId, WorkName, Value });

        // Auto-sync SiteValue
        const total = await SiteWorkValue.sum('Value', { where: { SiteId } }) || 0;
        await Site.update({ SiteValue: total }, { where: { id: SiteId } });

        res.json(item);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/reports/work-values/:id
// @desc    Update a work item
router.put('/work-values/:id', async (req, res) => {
    const { WorkName, Value } = req.body;
    try {
        const item = await SiteWorkValue.findByPk(req.params.id);
        if (!item) return res.status(404).json({ msg: 'Work item not found' });

        await item.update({ WorkName, Value });

        // Auto-sync SiteValue
        const total = await SiteWorkValue.sum('Value', { where: { SiteId: item.SiteId } }) || 0;
        await Site.update({ SiteValue: total }, { where: { id: item.SiteId } });

        res.json(item);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/reports/work-values/:id
// @desc    Delete a work item
router.delete('/work-values/:id', async (req, res) => {
    try {
        const item = await SiteWorkValue.findByPk(req.params.id);
        if (!item) return res.status(404).json({ msg: 'Work item not found' });

        const siteId = item.SiteId;
        await item.destroy();

        // Auto-sync SiteValue
        const total = await SiteWorkValue.sum('Value', { where: { SiteId: siteId } }) || 0;
        await Site.update({ SiteValue: total }, { where: { id: siteId } });

        res.json({ msg: 'Work item removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// =============================================
// SITE REPORT
// =============================================

// @route   GET api/reports/site/:siteId
// @desc    Get site report summary (work values, expenses, profit)
router.get('/site/:siteId', async (req, res) => {
    try {
        const siteId = parseInt(req.params.siteId);

        // Work items
        const workItems = await SiteWorkValue.findAll({
            where: { SiteId: siteId },
            order: [['CreatedAt', 'ASC']]
        });
        
        const site = await Site.findByPk(siteId);
        const siteTotalValue = site ? parseFloat(site.SiteValue || 0) : 0;

        // Labour expenses (from payments table)
        const labourExpense = await Payment.sum('Amount', {
            where: { SiteId: siteId, PaymentCategory: 'Labour' }
        }) || 0;

        // Material expenses (from site_materials table)
        const materialExpense = await SiteMaterial.sum('Amount', {
            where: { SiteId: siteId }
        }) || 0;

        // Received amount from client (Collection payments)
        const receivedAmount = await Payment.sum('Amount', {
            where: { SiteId: siteId, PaymentCategory: 'Collection' }
        }) || 0;

        res.json({
            workItems,
            siteValue: siteTotalValue,
            labourExpense,
            materialExpense,
            totalExpenses: labourExpense + materialExpense,
            profit: siteTotalValue - (labourExpense + materialExpense),
            receivedAmount,
            balanceAmount: siteTotalValue - receivedAmount
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/reports/site/:siteId/client-payments
// @desc    Get all Collection payments for a site (payment report)
router.get('/site/:siteId/client-payments', async (req, res) => {
    try {
        const siteId = parseInt(req.params.siteId);
        const { fromDate, toDate } = req.query;

        const where = {
            SiteId: siteId,
            PaymentCategory: 'Collection'
        };

        // Date filter
        if (fromDate || toDate) {
            where.PaymentDate = {};
            if (fromDate) where.PaymentDate[Op.gte] = new Date(fromDate);
            if (toDate) {
                const endDate = new Date(toDate);
                endDate.setHours(23, 59, 59, 999);
                where.PaymentDate[Op.lte] = endDate;
            }
        }

        const payments = await Payment.findAll({
            where,
            include: [
                { model: Site, as: 'Site', attributes: ['SiteName'], include: [{ model: Client, as: 'Client', attributes: ['Name'] }] }
            ],
            order: [['PaymentDate', 'DESC']]
        });

        const totalReceived = payments.reduce((sum, p) => sum + (parseFloat(p.Amount) || 0), 0);

        // Get site value for balance calculation
        const site = await Site.findByPk(siteId);
        const siteValue = site ? parseFloat(site.SiteValue || 0) : 0;

        res.json({
            payments: payments.map(p => ({
                id: p.id,
                date: p.PaymentDate,
                amount: parseFloat(p.Amount) || 0,
                mode: p.PaymentMode,
                notes: p.Notes,
                siteName: p.Site?.SiteName,
                clientName: p.Site?.Client?.Name
            })),
            totalReceived,
            siteValue,
            balanceAmount: siteValue - totalReceived,
            totalPayments: payments.length
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/reports/site/:siteId/labour-detail
// @desc    Get labour-wise payment breakdown for a site
router.get('/site/:siteId/labour-detail', async (req, res) => {
    try {
        const siteId = parseInt(req.params.siteId);

        // Get all labour payments for this site, grouped by LabourId
        const payments = await Payment.findAll({
            where: {
                SiteId: siteId,
                PaymentCategory: 'Labour',
                LabourId: { [Op.ne]: null }
            },
            include: [
                { model: Labour, as: 'Labour', attributes: ['Name', 'LabourType'] }
            ],
            attributes: [
                'LabourId',
                [sequelize.fn('SUM', sequelize.col('Amount')), 'totalPaid'],
                [sequelize.fn('COUNT', sequelize.col('Payment.id')), 'paymentCount']
            ],
            group: ['LabourId', 'Labour.id', 'Labour.Name', 'Labour.LabourType'],
            raw: true,
            nest: true
        });

        // Also get payments with PayeeId but no LabourId (direct payee payments marked as Labour)
        const payeePayments = await Payment.findAll({
            where: {
                SiteId: siteId,
                PaymentCategory: 'Labour',
                LabourId: null,
                PayeeId: { [Op.ne]: null }
            },
            include: [
                { model: Payee, as: 'Payee', attributes: ['Name', 'Type'] }
            ],
            attributes: [
                'PayeeId',
                [sequelize.fn('SUM', sequelize.col('Amount')), 'totalPaid'],
                [sequelize.fn('COUNT', sequelize.col('Payment.id')), 'paymentCount']
            ],
            group: ['PayeeId', 'Payee.id', 'Payee.Name', 'Payee.Type'],
            raw: true,
            nest: true
        });

        const result = [];

        // Add labour-based entries
        for (const p of payments) {
            result.push({
                id: p.LabourId,
                name: p.Labour?.Name || 'Unknown',
                type: p.Labour?.LabourType || 'Labour',
                totalPaid: parseFloat(p.totalPaid) || 0,
                paymentCount: parseInt(p.paymentCount) || 0,
                source: 'labour'
            });
        }

        // Add payee-based entries (that aren't already covered by labour entries)
        for (const p of payeePayments) {
            result.push({
                id: p.PayeeId,
                name: p.Payee?.Name || 'Unknown',
                type: p.Payee?.Type || 'Labour',
                totalPaid: parseFloat(p.totalPaid) || 0,
                paymentCount: parseInt(p.paymentCount) || 0,
                source: 'payee'
            });
        }

        const grandTotal = result.reduce((sum, r) => sum + r.totalPaid, 0);

        res.json({ labours: result, grandTotal });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/reports/site/:siteId/material-detail
// @desc    Get material-wise purchase breakdown for a site (grouped by material name)
router.get('/site/:siteId/material-detail', async (req, res) => {
    try {
        const siteId = parseInt(req.params.siteId);

        const materials = await SiteMaterial.findAll({
            where: { SiteId: siteId },
            include: [
                { model: MaterialType, as: 'Material', attributes: ['Name'] }
            ],
            attributes: [
                'MaterialId',
                [sequelize.fn('SUM', sequelize.col('SiteMaterial.Amount')), 'totalAmount'],
                [sequelize.fn('COUNT', sequelize.col('SiteMaterial.id')), 'purchaseCount']
            ],
            group: ['MaterialId', 'Material.id', 'Material.Name'],
            raw: true,
            nest: true
        });

        const result = materials.map(m => ({
            materialId: m.MaterialId,
            materialName: m.Material?.Name || 'Unknown',
            totalAmount: parseFloat(m.totalAmount) || 0,
            purchaseCount: parseInt(m.purchaseCount) || 0
        }));

        const grandTotal = result.reduce((sum, r) => sum + r.totalAmount, 0);

        res.json({ materials: result, grandTotal });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// =============================================
// LABOUR REPORT
// =============================================

// @route   GET api/reports/labour/:labourId
// @desc    Get payment history for a specific labour across sites with date filtering
//          Query: siteIds (comma-separated or 'all'), fromDate, toDate
router.get('/labour/:labourId', async (req, res) => {
    try {
        const labourId = parseInt(req.params.labourId);
        const { siteIds, fromDate, toDate } = req.query;

        // Get labour info
        const labour = await Labour.findByPk(labourId);
        if (!labour) return res.status(404).json({ msg: 'Labour not found' });

        // Build where clause
        const where = {
            PaymentCategory: 'Labour',
            [Op.or]: [
                { LabourId: labourId },
                ...(labour.PayeeId ? [{ PayeeId: labour.PayeeId }] : [])
            ]
        };

        // Site filter
        if (siteIds && siteIds !== 'all') {
            const ids = siteIds.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
            if (ids.length > 0) {
                where.SiteId = { [Op.in]: ids };
            }
        }

        // Date filter
        if (fromDate || toDate) {
            where.PaymentDate = {};
            if (fromDate) where.PaymentDate[Op.gte] = new Date(fromDate);
            if (toDate) {
                const endDate = new Date(toDate);
                endDate.setHours(23, 59, 59, 999);
                where.PaymentDate[Op.lte] = endDate;
            }
        }

        // Get all individual payments
        const payments = await Payment.findAll({
            where,
            include: [
                { model: Site, as: 'Site', attributes: ['SiteName'] }
            ],
            order: [['PaymentDate', 'DESC']]
        });

        // Site-wise breakdown
        const siteBreakdown = {};
        for (const p of payments) {
            const sid = p.SiteId;
            if (!siteBreakdown[sid]) {
                siteBreakdown[sid] = {
                    siteId: sid,
                    siteName: p.Site?.SiteName || 'Unknown',
                    totalPaid: 0,
                    paymentCount: 0
                };
            }
            siteBreakdown[sid].totalPaid += parseFloat(p.Amount) || 0;
            siteBreakdown[sid].paymentCount++;
        }

        const grandTotal = payments.reduce((sum, p) => sum + (parseFloat(p.Amount) || 0), 0);

        res.json({
            labour: {
                id: labour.id,
                name: labour.Name,
                type: labour.LabourType,
                mobile: labour.MobileNo
            },
            payments: payments.map(p => ({
                id: p.id,
                date: p.PaymentDate,
                siteName: p.Site?.SiteName || 'Unknown',
                siteId: p.SiteId,
                amount: parseFloat(p.Amount) || 0,
                mode: p.PaymentMode,
                notes: p.Notes
            })),
            siteBreakdown: Object.values(siteBreakdown),
            grandTotal,
            totalPayments: payments.length
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
