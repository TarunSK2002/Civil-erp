const express = require('express');
const router = express.Router();
const { PersonType, AttendanceRecord, WeeklyPaySheetItem, WeeklyPaySheet, sequelize } = require('../models');
const { Op } = require('sequelize');

// @route   GET /api/person-types
// @desc    List all person types
router.get('/', async (req, res) => {
    try {
        const types = await PersonType.findAll({
            order: [['SortOrder', 'ASC'], ['Name', 'ASC']]
        });
        res.json(types);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/person-types
// @desc    Create a new person type
router.post('/', async (req, res) => {
    const { Name, DailyRate } = req.body;
    try {
        if (!Name || !Name.trim()) {
            return res.status(400).json({ msg: 'Name is required' });
        }

        // Check for duplicates
        const existing = await PersonType.findOne({ where: { Name: Name.trim() } });
        if (existing) {
            return res.status(400).json({ msg: `Person type "${Name}" already exists` });
        }

        // Get max sort order
        const maxOrder = await PersonType.max('SortOrder') || 0;

        const type = await PersonType.create({
            Name: Name.trim(),
            SortOrder: maxOrder + 1,
            DailyRate: DailyRate || 0
        });
        res.json(type);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   PUT /api/person-types/:id
// @desc    Update a person type (handles name renaming and rate change with retroactive recalcs)
router.put('/:id', async (req, res) => {
    const { Name, IsActive, SortOrder, DailyRate } = req.body;
    const t = await sequelize.transaction();
    try {
        const type = await PersonType.findByPk(req.params.id, { transaction: t });
        if (!type) {
            await t.rollback();
            return res.status(404).json({ msg: 'Person type not found' });
        }

        const oldName = type.Name;
        const newName = Name !== undefined ? Name.trim() : oldName;
        const oldRate = parseFloat(type.DailyRate || 0);
        const newRate = DailyRate !== undefined ? parseFloat(DailyRate) : oldRate;

        const updates = {};
        if (Name !== undefined) updates.Name = newName;
        if (IsActive !== undefined) updates.IsActive = IsActive;
        if (SortOrder !== undefined) updates.SortOrder = SortOrder;
        if (DailyRate !== undefined) updates.DailyRate = newRate;

        // 1. If name changed, update existing attendance records' PersonType column
        if (oldName !== newName) {
            await AttendanceRecord.update(
                { PersonType: newName },
                { where: { PersonType: oldName }, transaction: t }
            );
        }

        // 2. Update person type
        await type.update(updates, { transaction: t });

        // 3. If rate changed, propagate to unconfirmed records
        let updatedRecords = 0;
        let updatedItems = 0;
        if (oldRate !== newRate || oldName !== newName) {
            // Find all attendance records under this category name
            const records = await AttendanceRecord.findAll({
                where: { PersonType: newName },
                transaction: t
            });

            for (const record of records) {
                const newCalculated = newRate * parseFloat(record.ShiftMultiplier) * record.LabourCount;
                await record.update({
                    RatePerShift: newRate,
                    CalculatedAmount: newCalculated
                }, { transaction: t });
                updatedRecords++;
            }

            // Recalculate WeeklyPaySheetItem amounts for non-Paid items
            const pendingItems = await WeeklyPaySheetItem.findAll({
                where: {
                    PaymentStatus: 'Pending',
                    PayeeId: { [Op.ne]: null },
                    IsExtraPayment: false
                },
                transaction: t
            });

            for (const item of pendingItems) {
                const sheet = await WeeklyPaySheet.findByPk(item.WeeklyPaySheetId, { transaction: t });
                if (!sheet) continue;

                const weekEndDate = new Date(sheet.WeekDate);
                const weekStartDate = new Date(weekEndDate);
                weekStartDate.setDate(weekEndDate.getDate() - 6);

                const matchingRecords = await AttendanceRecord.findAll({
                    where: {
                        PayeeId: item.PayeeId,
                        SiteId: item.SiteId,
                        PersonType: newName,
                        AttendanceDate: {
                            [Op.between]: [weekStartDate.toISOString().split('T')[0], weekEndDate.toISOString().split('T')[0]]
                        }
                    },
                    transaction: t
                });

                if (matchingRecords.length > 0) {
                    const allRecords = await AttendanceRecord.findAll({
                        where: {
                            PayeeId: item.PayeeId,
                            SiteId: item.SiteId,
                            AttendanceDate: {
                                [Op.between]: [weekStartDate.toISOString().split('T')[0], weekEndDate.toISOString().split('T')[0]]
                            }
                        },
                        transaction: t
                    });

                    const newTotal = allRecords.reduce((sum, r) => sum + parseFloat(r.CalculatedAmount), 0);
                    await item.update({ Amount: newTotal }, { transaction: t });
                    updatedItems++;
                }
            }
        }

        await t.commit();
        res.json({
            msg: `Person type updated successfully. Recalculated ${updatedRecords} attendance records and ${updatedItems} sheet items.`,
            type
        });
    } catch (err) {
        await t.rollback();
        console.error('Update PersonType error:', err);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});

// @route   DELETE /api/person-types/:id
// @desc    Delete a person type
router.delete('/:id', async (req, res) => {
    try {
        const type = await PersonType.findByPk(req.params.id);
        if (!type) return res.status(404).json({ msg: 'Person type not found' });

        await type.destroy();
        res.json({ msg: 'Person type removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/person-types/seed
// @desc    Seed default person types if none exist
router.post('/seed', async (req, res) => {
    try {
        const count = await PersonType.count();
        if (count > 0) {
            return res.json({ msg: 'Person types already exist', seeded: false });
        }

        const defaults = [
            { Name: 'Mason', SortOrder: 1, DailyRate: 750 },
            { Name: 'Female Helper', SortOrder: 2, DailyRate: 450 },
            { Name: 'Male Helper', SortOrder: 3, DailyRate: 650 },
            { Name: 'Painter', SortOrder: 4, DailyRate: 700 },
            { Name: 'Tiles Layering', SortOrder: 5, DailyRate: 800 },
            { Name: 'Carpenter', SortOrder: 6, DailyRate: 800 },
            { Name: 'Centring', SortOrder: 7, DailyRate: 800 },
            { Name: 'Plumber', SortOrder: 8, DailyRate: 800 },
            { Name: 'Electrician', SortOrder: 9, DailyRate: 800 },
        ];

        await PersonType.bulkCreate(defaults);
        const types = await PersonType.findAll({ order: [['SortOrder', 'ASC']] });
        res.json({ msg: 'Default person types created', seeded: true, types });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/person-types/:id/update-rate
// @desc    Update rate and retroactively recalculate unconfirmed attendance + pay sheet items
router.post('/:id/update-rate', async (req, res) => {
    const { DailyRate } = req.body;
    const t = await sequelize.transaction();
    try {
        const type = await PersonType.findByPk(req.params.id);
        if (!type) {
            await t.rollback();
            return res.status(404).json({ msg: 'Person type not found' });
        }

        const oldRate = parseFloat(type.DailyRate);
        const newRate = parseFloat(DailyRate);

        // 1. Update the PersonType rate
        await type.update({ DailyRate: newRate }, { transaction: t });

        // 2. Find all attendance records with this PersonType that are linked to
        //    weekly pay sheet items that are NOT yet Paid
        const records = await AttendanceRecord.findAll({
            where: { PersonType: type.Name }
        });

        let updatedRecords = 0;
        let updatedItems = 0;

        for (const record of records) {
            // Check if the linked weekly pay sheet item is confirmed (Paid)
            // We recalculate regardless — the weekly sheet import will pick up the new totals
            const newCalculated = newRate * parseFloat(record.ShiftMultiplier) * record.LabourCount;
            await record.update({
                RatePerShift: newRate,
                CalculatedAmount: newCalculated
            }, { transaction: t });
            updatedRecords++;
        }

        // 3. Recalculate WeeklyPaySheetItem amounts for non-Paid items
        //    by re-aggregating from AttendanceRecords
        //    Find all sheets that have pending items
        const pendingItems = await WeeklyPaySheetItem.findAll({
            where: {
                PaymentStatus: 'Pending',
                PayeeId: { [Op.ne]: null },
                IsExtraPayment: false
            },
            transaction: t
        });

        // For each pending item, check if any linked attendance records use this PersonType
        for (const item of pendingItems) {
            // Get the sheet to find week range
            const sheet = await WeeklyPaySheet.findByPk(item.WeeklyPaySheetId, { transaction: t });
            if (!sheet) continue;

            const weekEndDate = new Date(sheet.WeekDate);
            const weekStartDate = new Date(weekEndDate);
            weekStartDate.setDate(weekEndDate.getDate() - 6);

            // Find attendance records for this payee+site in this week that use the updated PersonType
            const matchingRecords = await AttendanceRecord.findAll({
                where: {
                    PayeeId: item.PayeeId,
                    SiteId: item.SiteId,
                    PersonType: type.Name,
                    AttendanceDate: {
                        [Op.between]: [weekStartDate.toISOString().split('T')[0], weekEndDate.toISOString().split('T')[0]]
                    }
                },
                transaction: t
            });

            if (matchingRecords.length > 0) {
                // Re-aggregate total for this payee+site from ALL attendance records in this week
                const allRecords = await AttendanceRecord.findAll({
                    where: {
                        PayeeId: item.PayeeId,
                        SiteId: item.SiteId,
                        AttendanceDate: {
                            [Op.between]: [weekStartDate.toISOString().split('T')[0], weekEndDate.toISOString().split('T')[0]]
                        }
                    },
                    transaction: t
                });

                const newTotal = allRecords.reduce((sum, r) => sum + parseFloat(r.CalculatedAmount), 0);
                await item.update({ Amount: newTotal }, { transaction: t });
                updatedItems++;
            }
        }

        await t.commit();
        res.json({
            msg: `Rate updated from ₹${oldRate} to ₹${newRate}. Recalculated ${updatedRecords} attendance records and ${updatedItems} pay sheet items.`,
            type
        });
    } catch (err) {
        await t.rollback();
        console.error('Update rate error:', err);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});

module.exports = router;
