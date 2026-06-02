const express = require('express');
const router = express.Router();
const { Material, MaterialType } = require('../models');
const { Op } = require('sequelize');

// @route   GET api/materials
// @desc    Get all dealers (with search)
router.get('/', async (req, res) => {
    const { search } = req.query;
    let where = {};
    if (search) {
        where[Op.or] = [
            { Name: { [Op.like]: `%${search}%` } },
            { DealerName: { [Op.like]: `%${search}%` } },
            { MobileNo: { [Op.like]: `%${search}%` } }
        ];
    }

    try {
        const materials = await Material.findAll({
            where,
            include: [{ model: MaterialType, as: 'MaterialType', attributes: ['id', 'Name'] }],
            order: [['CreatedAt', 'DESC']]
        });
        res.json(materials);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/materials
// @desc    Create a dealer
router.post('/', async (req, res) => {
    const { Name, DealerName, MobileNo, AccountNo, MaterialTypeId } = req.body;
    try {
        const newMaterial = await Material.create({
            Name, DealerName, MobileNo, AccountNo, MaterialTypeId
        });
        // Re-fetch with association
        const full = await Material.findByPk(newMaterial.id, {
            include: [{ model: MaterialType, as: 'MaterialType', attributes: ['id', 'Name'] }]
        });
        res.json(full);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/materials/:id
// @desc    Update a dealer
router.put('/:id', async (req, res) => {
    const { Name, DealerName, MobileNo, AccountNo, MaterialTypeId } = req.body;
    try {
        let material = await Material.findByPk(req.params.id);
        if (!material) return res.status(404).json({ msg: 'Dealer not found' });

        await material.update({ Name, DealerName, MobileNo, AccountNo, MaterialTypeId });
        // Re-fetch with association
        const full = await Material.findByPk(material.id, {
            include: [{ model: MaterialType, as: 'MaterialType', attributes: ['id', 'Name'] }]
        });
        res.json(full);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/materials/:id
// @desc    Delete a dealer
router.delete('/:id', async (req, res) => {
    try {
        const material = await Material.findByPk(req.params.id);
        if (!material) return res.status(404).json({ msg: 'Dealer not found' });

        await material.destroy();
        res.json({ msg: 'Dealer removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
