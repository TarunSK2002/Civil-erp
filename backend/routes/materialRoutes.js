const express = require('express');
const router = express.Router();
const { Material } = require('../models');
const { Op } = require('sequelize');

// @route   GET api/materials
// @desc    Get all materials (with search)
router.get('/', async (req, res) => {
    const { search } = req.query;
    let where = {};
    if (search) {
        where.Name = { [Op.like]: `%${search}%` };
    }

    try {
        const materials = await Material.findAll({
            where,
            order: [['CreatedAt', 'DESC']]
        });
        res.json(materials);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/materials
// @desc    Create a material
router.post('/', async (req, res) => {
    const { Name } = req.body;
    try {
        const newMaterial = await Material.create({
            Name
        });
        res.json(newMaterial);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/materials/:id
// @desc    Update a material
router.put('/:id', async (req, res) => {
    const { Name } = req.body;
    try {
        let material = await Material.findByPk(req.params.id);
        if (!material) return res.status(404).json({ msg: 'Material not found' });

        material = await material.update({
            Name
        });
        res.json(material);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/materials/:id
// @desc    Delete a material
router.delete('/:id', async (req, res) => {
    try {
        const material = await Material.findByPk(req.params.id);
        if (!material) return res.status(404).json({ msg: 'Material not found' });

        await material.destroy();
        res.json({ msg: 'Material removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
