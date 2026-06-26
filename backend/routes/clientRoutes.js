const express = require('express');
const router = express.Router();
const { Client } = require('../models');
const { Op } = require('sequelize');

// @route   GET api/clients
// @desc    Get all clients (with search)
router.get('/', async (req, res) => {
    const { search } = req.query;
    let where = {};
    if (search) {
        where = {
            [Op.or]: [
                { Name: { [Op.like]: `%${search}%` } },
                { MobileNumber: { [Op.like]: `%${search}%` } }
            ]
        };
    }

    try {
        const clients = await Client.findAll({
            where,
            order: [['CreatedAt', 'DESC']]
        });
        res.json(clients);
    } catch (err) {
        console.error('GET /api/clients error:', err);
        res.status(500).json({ error: err.message, stack: err.stack });
    }
});

// @route   POST api/clients
// @desc    Create a client
router.post('/', async (req, res) => {
    const { Name, MobileNumber, PaymentType } = req.body;
    try {
        const newClient = await Client.create({
            Name,
            MobileNumber,
            PaymentType
        });
        res.json(newClient);
    } catch (err) {
        console.error('POST /api/clients error:', err);
        res.status(500).json({ error: err.message, stack: err.stack });
    }
});

// @route   PUT api/clients/:id
// @desc    Update a client
router.put('/:id', async (req, res) => {
    const { Name, MobileNumber, PaymentType } = req.body;
    try {
        let client = await Client.findByPk(req.params.id);
        if (!client) return res.status(404).json({ msg: 'Client not found' });

        client = await client.update({
            Name,
            MobileNumber,
            PaymentType
        });
        res.json(client);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/clients/:id
// @desc    Delete a client
router.delete('/:id', async (req, res) => {
    try {
        const client = await Client.findByPk(req.params.id);
        if (!client) return res.status(404).json({ msg: 'Client not found' });

        await client.destroy();
        res.json({ msg: 'Client removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
