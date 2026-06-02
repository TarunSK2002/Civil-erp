const express = require('express');
const router = express.Router();
const { MaterialType } = require('../models');

// @route   GET /api/material-types
router.get('/', async (req, res) => {
    try {
        const types = await MaterialType.findAll({
            order: [['SortOrder', 'ASC'], ['Name', 'ASC']]
        });
        res.json(types);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/material-types
router.post('/', async (req, res) => {
    const { Name, Price, DefaultUnit } = req.body;
    try {
        if (!Name || !Name.trim()) return res.status(400).json({ msg: 'Name is required' });
        const existing = await MaterialType.findOne({ where: { Name: Name.trim() } });
        if (existing) return res.status(400).json({ msg: `Material type "${Name}" already exists` });

        const maxOrder = await MaterialType.max('SortOrder') || 0;
        const type = await MaterialType.create({ 
            Name: Name.trim(), 
            SortOrder: maxOrder + 1,
            Price: parseFloat(Price) || 0,
            DefaultUnit: DefaultUnit || 'nos'
        });
        res.json(type);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   PUT /api/material-types/:id
router.put('/:id', async (req, res) => {
    const { Name, IsActive, Price, DefaultUnit } = req.body;
    try {
        const type = await MaterialType.findByPk(req.params.id);
        if (!type) return res.status(404).json({ msg: 'Material type not found' });

        const updates = {};
        if (Name !== undefined) updates.Name = Name.trim();
        if (IsActive !== undefined) updates.IsActive = IsActive;
        if (Price !== undefined) updates.Price = parseFloat(Price) || 0;
        if (DefaultUnit !== undefined) updates.DefaultUnit = DefaultUnit;
        await type.update(updates);
        res.json(type);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   DELETE /api/material-types/:id
router.delete('/:id', async (req, res) => {
    try {
        const type = await MaterialType.findByPk(req.params.id);
        if (!type) return res.status(404).json({ msg: 'Material type not found' });
        await type.destroy();
        res.json({ msg: 'Material type removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/material-types/seed
router.post('/seed', async (req, res) => {
    try {
        const count = await MaterialType.count();
        if (count > 0) return res.json({ msg: 'Material types already exist', seeded: false });

        const defaults = [
            { Name: 'Cement', SortOrder: 1 },
            { Name: 'Sand', SortOrder: 2 },
            { Name: 'Steel', SortOrder: 3 },
            { Name: 'Bricks', SortOrder: 4 },
            { Name: 'Aggregate', SortOrder: 5 },
            { Name: 'Tiles', SortOrder: 6 },
            { Name: 'Paint', SortOrder: 7 },
            { Name: 'Electrical', SortOrder: 8 },
            { Name: 'Plumbing', SortOrder: 9 },
            { Name: 'Wood', SortOrder: 10 },
            { Name: 'Hardware', SortOrder: 11 },
            { Name: 'Other', SortOrder: 12 },
        ];

        await MaterialType.bulkCreate(defaults);
        const types = await MaterialType.findAll({ order: [['SortOrder', 'ASC']] });
        res.json({ msg: 'Default material types created', seeded: true, types });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;
