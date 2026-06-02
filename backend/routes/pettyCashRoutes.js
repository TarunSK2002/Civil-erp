const express = require('express');
const router = express.Router();
const { PettyCash, WeeklyPaySheet, WeeklyPaySheetItem, Payment, sequelize } = require('../models');
const { Op } = require('sequelize');

// @route   GET /api/petty-cash
// @desc    Get current running balance & transaction history
router.get('/', async (req, res) => {
    try {
        const history = await PettyCash.findAll({
            order: [['id', 'DESC']]
        });
        const currentBalance = history.length > 0 ? parseFloat(history[0].RunningBalance) : 0;
        res.json({ currentBalance, history });
    } catch (err) {
        console.error('Petty Cash GET Error:', err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/petty-cash/close-week/:sheetId
// @desc    Close week: calculate profit/loss and snapshot to petty cash running balance
router.post('/close-week/:sheetId', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const sheet = await WeeklyPaySheet.findByPk(req.params.sheetId, {
            include: [{
                model: WeeklyPaySheetItem,
                as: 'Items'
            }],
            transaction: t
        });

        if (!sheet) {
            await t.rollback();
            return res.status(404).json({ msg: 'Weekly sheet not found' });
        }

        if (sheet.Status === 'Closed') {
            await t.rollback();
            return res.status(400).json({ msg: 'This week is already closed' });
        }

        // 1. Calculate week range for income
        const weekEndDate = new Date(sheet.WeekDate);
        const weekStartDate = new Date(weekEndDate);
        weekStartDate.setDate(weekEndDate.getDate() - 6);
        weekStartDate.setHours(0, 0, 0, 0);
        weekEndDate.setHours(23, 59, 59, 999);

        // 2. Fetch income (Collections)
        const selectedSiteIds = sheet.SelectedSiteIds || [];
        const collections = await Payment.findAll({
            where: {
                PaymentCategory: 'Collection',
                SiteId: { [Op.in]: selectedSiteIds },
                PaymentDate: {
                    [Op.between]: [weekStartDate, weekEndDate]
                }
            },
            transaction: t
        });
        const totalIncome = collections.reduce((sum, c) => sum + parseFloat(c.Amount || 0), 0);

        // 3. Fetch expenses from the sheet items
        const items = sheet.Items || [];
        let regularExpense = 0;
        let extraPaymentExpense = 0;

        items.forEach(item => {
            if (item.IsSkipped) return; // Exclude skipped items
            if (item.IsExtraPayment) {
                extraPaymentExpense += parseFloat(item.Amount || 0);
            } else if (item.PayeeId) {
                regularExpense += parseFloat(item.Amount || 0);
            }
        });

        const totalExpense = regularExpense + extraPaymentExpense;
        const profitAmount = totalIncome - totalExpense;

        // 4. Get last running balance
        const lastRecord = await PettyCash.findOne({
            order: [['id', 'DESC']],
            transaction: t
        });
        const lastBalance = lastRecord ? parseFloat(lastRecord.RunningBalance) : 0;
        const newRunningBalance = lastBalance + profitAmount;

        // 5. Create Petty Cash transaction snapshot
        const pettyRecord = await PettyCash.create({
            WeeklyPaySheetId: sheet.id,
            WeekDate: sheet.WeekDate,
            TotalIncome: totalIncome,
            TotalExpense: regularExpense,
            ExtraPayments: extraPaymentExpense,
            ProfitAmount: profitAmount,
            RunningBalance: newRunningBalance
        }, { transaction: t });

        // 6. Mark sheet as Closed
        await sheet.update({ Status: 'Closed' }, { transaction: t });

        await t.commit();
        res.json({
            msg: `Sheet closed successfully. Profit of ₹${profitAmount.toLocaleString('en-IN')} added to Petty Cash.`,
            pettyRecord
        });
    } catch (err) {
        await t.rollback();
        console.error('Close Week Error:', err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;
