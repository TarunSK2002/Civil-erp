const express = require('express');
const router = express.Router();
const { Labour, Payee } = require('../models');
const { Op } = require('sequelize');

// @route   GET api/labours
// @desc    Get all labours (with search and type filter)
router.get('/', async (req, res) => {
    const { search, type } = req.query;
    let where = {};
    if (type && type !== 'All') {
        where.LabourType = type;
    }
    if (search) {
        where[Op.or] = [
            { Name: { [Op.like]: `%${search}%` } },
            { MobileNo: { [Op.like]: `%${search}%` } }
        ];
    }

    try {
        const labours = await Labour.findAll({
            where,
            order: [['CreatedAt', 'DESC']]
        });
        res.json(labours);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/labours
// @desc    Create a labour
router.post('/', async (req, res) => {
    const { Name, MobileNo, AccountNo, LabourType } = req.body;
    try {
        // Create the Payee first
        const newPayee = await Payee.create({
            Name,
            Type: 'Labour',
            MobileNo: MobileNo || '',
            AccountNo: AccountNo || '',
            Notes: `Linked to Labour: ${LabourType}`
        });

        const newLabour = await Labour.create({
            Name,
            MobileNo,
            AccountNo,
            LabourType,
            PayeeId: newPayee.id
        });
        res.json(newLabour);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/labours/:id
// @desc    Update a labour
router.put('/:id', async (req, res) => {
    const { Name, MobileNo, AccountNo, LabourType } = req.body;
    try {
        let labour = await Labour.findByPk(req.params.id);
        if (!labour) return res.status(404).json({ msg: 'Labour not found' });

        labour = await labour.update({
            Name,
            MobileNo,
            AccountNo,
            LabourType
        });

        // Update the Payee as well
        if (labour.PayeeId) {
            const payee = await Payee.findByPk(labour.PayeeId);
            if (payee) {
                await payee.update({
                    Name,
                    MobileNo: MobileNo || '',
                    AccountNo: AccountNo || '',
                    Notes: `Linked to Labour: ${LabourType}`
                });
            }
        }

        res.json(labour);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/labours/:id
// @desc    Delete a labour
router.delete('/:id', async (req, res) => {
    try {
        const labour = await Labour.findByPk(req.params.id);
        if (!labour) return res.status(404).json({ msg: 'Labour not found' });

        const payeeId = labour.PayeeId;
        await labour.destroy();

        // Also delete the payee if approved by user (which they did)
        if (payeeId) {
            const payee = await Payee.findByPk(payeeId);
            if (payee) {
                await payee.destroy().catch(err => {
                    console.log('Could not delete payee (likely has history):', err.message);
                });
            }
        }

        res.json({ msg: 'Labour and associated Payee removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
