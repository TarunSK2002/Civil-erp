const express = require('express');
const router = express.Router();
const { Payment, Site, Labour, Material, Payee, WeeklyPaySheetItem } = require('../models');
const { Op } = require('sequelize');

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
        res.json(payments);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
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
