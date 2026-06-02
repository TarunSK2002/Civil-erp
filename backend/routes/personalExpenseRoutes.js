const express = require('express');
const router = express.Router();
const { PersonalExpense, PettyCash, sequelize } = require('../models');

// @route   GET /api/personal-expenses
// @desc    List all personal/office expenses
router.get('/', async (req, res) => {
    try {
        const expenses = await PersonalExpense.findAll({
            order: [['ExpenseDate', 'DESC'], ['id', 'DESC']]
        });
        res.json(expenses);
    } catch (err) {
        console.error('Fetch Expenses Error:', err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/personal-expenses
// @desc    Create a personal/office expense, reducing petty cash balance
router.post('/', async (req, res) => {
    const { Description, Amount, ExpenseDate, Category, Notes } = req.body;
    const t = await sequelize.transaction();
    try {
        const amt = parseFloat(Amount);
        if (isNaN(amt) || amt <= 0) {
            await t.rollback();
            return res.status(400).json({ msg: 'Invalid amount' });
        }

        // Create the personal expense record
        const expense = await PersonalExpense.create({
            Description,
            Amount: amt,
            ExpenseDate,
            Category,
            Notes
        }, { transaction: t });

        // Update petty cash running ledger
        const lastRecord = await PettyCash.findOne({
            order: [['id', 'DESC']],
            transaction: t
        });
        const lastBalance = lastRecord ? parseFloat(lastRecord.RunningBalance) : 0;
        const newRunningBalance = lastBalance - amt;

        // Insert ledger entry
        await PettyCash.create({
            WeeklyPaySheetId: null,
            WeekDate: ExpenseDate,
            TotalIncome: 0,
            TotalExpense: amt,
            ExtraPayments: 0,
            ProfitAmount: -amt,
            RunningBalance: newRunningBalance
        }, { transaction: t });

        await t.commit();
        res.json(expense);
    } catch (err) {
        await t.rollback();
        console.error('Create Expense Error:', err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   DELETE /api/personal-expenses/:id
// @desc    Delete a personal/office expense, refunding the petty cash balance
router.delete('/:id', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const expense = await PersonalExpense.findByPk(req.params.id, { transaction: t });
        if (!expense) {
            await t.rollback();
            return res.status(404).json({ msg: 'Expense not found' });
        }

        const amt = parseFloat(expense.Amount);

        // Update petty cash running ledger (refund the amount)
        const lastRecord = await PettyCash.findOne({
            order: [['id', 'DESC']],
            transaction: t
        });
        const lastBalance = lastRecord ? parseFloat(lastRecord.RunningBalance) : 0;
        const newRunningBalance = lastBalance + amt;

        await PettyCash.create({
            WeeklyPaySheetId: null,
            WeekDate: new Date().toISOString().split('T')[0],
            TotalIncome: amt, // Refund treated as income in ledger
            TotalExpense: 0,
            ExtraPayments: 0,
            ProfitAmount: amt,
            RunningBalance: newRunningBalance
        }, { transaction: t });

        // Delete the expense
        await expense.destroy({ transaction: t });

        await t.commit();
        res.json({ msg: 'Expense deleted, balance refunded' });
    } catch (err) {
        await t.rollback();
        console.error('Delete Expense Error:', err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;
