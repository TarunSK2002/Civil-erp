const express = require('express');
const router = express.Router();
const { Payment, Site, Labour, Material, Payee, WeeklyPaySheetItem } = require('../models');
const { Op } = require('sequelize');

// @route   GET api/payments/debug
// @desc    Temporary diagnostic — shows raw DB rows, Sequelize scope, and any errors
router.get('/debug', async (req, res) => {
    try {
        const { sequelize } = require('../models');
        const [rawRows] = await sequelize.query('SELECT Id, PaymentCategory, Amount, is_deleted FROM payments LIMIT 20');
        const [countRows] = await sequelize.query('SELECT COUNT(*) as total FROM payments');
        const [isDelCount] = await sequelize.query('SELECT is_deleted, COUNT(*) as cnt FROM payments GROUP BY is_deleted');
        const scoped = await Payment.findAll({ limit: 5 });
        const unscoped = await Payment.unscoped().findAll({ limit: 5 });
        res.json({
            rawRows,
            totalCount: countRows[0],
            isDeletedGroups: isDelCount,
            scopedCount: scoped.length,
            unscopedCount: unscoped.length,
            paymentModelScope: Payment.options?.defaultScope || 'none'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// @route   GET api/payments
// @desc    Get all payments (with filters)
router.get('/', async (req, res) => {
    const { category, fromDate, toDate } = req.query;
    let where = {};
    
    if (category && category !== 'All') {
        where.PaymentCategory = category;
    }
    
    if (fromDate || toDate) {
        where.PaymentDate = {};
        if (fromDate) where.PaymentDate[Op.gte] = new Date(fromDate);
        if (toDate) where.PaymentDate[Op.lte] = new Date(toDate);
    }

    try {
        // --- DEBUG: run raw query to verify DB connectivity and data ---
        const { sequelize } = require('../models');
        const [rawRows] = await sequelize.query('SELECT Id, PaymentCategory, Amount FROM payments LIMIT 10');
        console.log('[payments debug] raw SQL rows:', JSON.stringify(rawRows));

        const payments = await Payment.findAll({
            where,
            include: [
                { model: Site, as: 'Site', attributes: ['SiteName'] },
                { model: Labour, as: 'Labour', attributes: ['Name'] },
                { model: Material, as: 'Material', attributes: ['Name'] },
                { model: Payee, as: 'Payee', attributes: ['Name'] },
                { 
                    model: WeeklyPaySheetItem, 
                    as: 'SheetItem', 
                    include: [{ model: Payee, as: 'Payee', attributes: ['Name'] }] 
                }
            ],
            order: [['PaymentDate', 'DESC']]
        });
        console.log('[payments debug] Payment.findAll() count:', payments.length);
        res.json(payments);
    } catch (err) {
        console.error('[payments error]', err.message);
        res.status(500).json({ error: err.message, stack: err.stack });
    }
});

// @route   POST api/payments
// @desc    Add a payment
router.post('/', async (req, res) => {
    const { 
        PaymentCategory, SiteId, LabourId, MaterialId, PayeeId,
        Amount, PaymentMode, Notes, PaymentDate 
    } = req.body;
    
    try {
        const newPayment = await Payment.create({
            PaymentCategory,
            SiteId,
            LabourId: PaymentCategory === 'Labour' ? LabourId : null,
            MaterialId: PaymentCategory === 'Material' ? MaterialId : null,
            PayeeId: PayeeId || null,
            Amount,
            PaymentMode,
            Notes,
            PaymentDate: PaymentDate || new Date()
        });
        res.json(newPayment);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/payments/:id
// @desc    Update a payment record
router.put('/:id', async (req, res) => {
    const { 
        PaymentCategory, SiteId, LabourId, MaterialId, PayeeId,
        Amount, PaymentMode, Notes, PaymentDate 
    } = req.body;
    
    try {
        const payment = await Payment.findByPk(req.params.id);
        if (!payment) return res.status(404).json({ msg: 'Payment not found' });

        await payment.update({
            PaymentCategory,
            SiteId,
            LabourId: PaymentCategory === 'Labour' ? LabourId : null,
            MaterialId: PaymentCategory === 'Material' ? MaterialId : null,
            PayeeId: PayeeId || null,
            Amount,
            PaymentMode,
            Notes,
            PaymentDate: PaymentDate || new Date()
        });
        res.json(payment);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/payments/:id
// @desc    Delete a payment
router.delete('/:id', async (req, res) => {
    try {
        const payment = await Payment.findByPk(req.params.id);
        if (!payment) return res.status(404).json({ msg: 'Payment not found' });

        await payment.destroy();
        res.json({ msg: 'Payment removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
