const express = require('express');
const router = express.Router();
const { ShiftMaster } = require('../models');

// @route   GET /api/shift-master
// @desc    List all shift types with rates
router.get('/', async (req, res) => {
    try {
        const shifts = await ShiftMaster.findAll({
            order: [['ShiftMultiplier', 'ASC']]
        });
        res.json(shifts);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/shift-master
// @desc    Create a new shift type
router.post('/', async (req, res) => {
    const { ShiftType, ShiftMultiplier, Rate } = req.body;
    try {
        // Check for duplicates
        const existing = await ShiftMaster.findOne({ where: { ShiftMultiplier } });
        if (existing) {
            return res.status(400).json({ msg: `Shift with multiplier ${ShiftMultiplier} already exists` });
        }

        const shift = await ShiftMaster.create({ ShiftType, ShiftMultiplier, Rate });
        res.json(shift);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   PUT /api/shift-master/:id
// @desc    Update a shift type rate
router.put('/:id', async (req, res) => {
    const { ShiftType, ShiftMultiplier, Rate } = req.body;
    try {
        const shift = await ShiftMaster.findByPk(req.params.id);
        if (!shift) return res.status(404).json({ msg: 'Shift not found' });

        await shift.update({ ShiftType, ShiftMultiplier, Rate });
        res.json(shift);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   DELETE /api/shift-master/:id
// @desc    Delete a shift type
router.delete('/:id', async (req, res) => {
    try {
        const shift = await ShiftMaster.findByPk(req.params.id);
        if (!shift) return res.status(404).json({ msg: 'Shift not found' });

        await shift.destroy();
        res.json({ msg: 'Shift type removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/shift-master/seed
// @desc    Seed default shift types if none exist
router.post('/seed', async (req, res) => {
    try {
        const count = await ShiftMaster.count();
        if (count > 0) {
            return res.json({ msg: 'Shift types already exist', seeded: false });
        }

        const defaults = [
            { ShiftType: '½ Shift', ShiftMultiplier: 0.5, Rate: 0 },
            { ShiftType: '1 Shift', ShiftMultiplier: 1.0, Rate: 0 },
            { ShiftType: '1½ Shift', ShiftMultiplier: 1.5, Rate: 0 },
            { ShiftType: '2 Shift', ShiftMultiplier: 2.0, Rate: 0 },
            { ShiftType: '2½ Shift', ShiftMultiplier: 2.5, Rate: 0 },
            { ShiftType: '3 Shift', ShiftMultiplier: 3.0, Rate: 0 },
        ];

        await ShiftMaster.bulkCreate(defaults);
        const shifts = await ShiftMaster.findAll({ order: [['ShiftMultiplier', 'ASC']] });
        res.json({ msg: 'Default shift types created', seeded: true, shifts });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;
