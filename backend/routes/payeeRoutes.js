const express = require('express');
const router = express.Router();
const { Payee } = require('../models');
const { Op } = require('sequelize');

// @route   GET /api/payees
// @desc    Get all payees (with optional type filter)
router.get('/', async (req, res) => {
    const { type } = req.query;
    let where = {};
    if (type && type !== 'All') {
        where.Type = type;
    }
    try {
        const payees = await Payee.findAll({ where, order: [['Name', 'ASC']] });
        res.json(payees);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/payees
// @desc    Create a new payee
router.post('/', async (req, res) => {
    const { Name, Type, MobileNo, AccountNo, Notes } = req.body;
    try {
        const payee = await Payee.create({ Name, Type, MobileNo, AccountNo, Notes });
        res.json(payee);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   PUT /api/payees/:id
// @desc    Update a payee
router.put('/:id', async (req, res) => {
    const { Name, Type, MobileNo, AccountNo, Notes } = req.body;
    try {
        const payee = await Payee.findByPk(req.params.id);
        if (!payee) return res.status(404).json({ msg: 'Payee not found' });

        await payee.update({ Name, Type, MobileNo, AccountNo, Notes });
        res.json(payee);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   DELETE /api/payees/:id
// @desc    Delete a payee
router.delete('/:id', async (req, res) => {
    try {
        const payee = await Payee.findByPk(req.params.id);
        if (!payee) return res.status(404).json({ msg: 'Payee not found' });

        await payee.destroy();
        res.json({ msg: 'Payee removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;
