const express = require('express');
const router = express.Router();
const { WeeklyPaySheet, WeeklyPaySheetItem, Payment, ActionLog, sequelize } = require('../models');

// @route   GET /api/undo/:sheetId/history
// @desc    Get recent action logs for a sheet
router.get('/:sheetId/history', async (req, res) => {
    try {
        const history = await ActionLog.findAll({
            where: { WeeklyPaySheetId: req.params.sheetId },
            order: [['CreatedAt', 'DESC']],
            limit: 20
        });
        res.json(history);
    } catch (err) {
        console.error('Fetch Undo History Error:', err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/undo/latest
// @desc    Undo the latest action for a weekly pay sheet
router.post('/latest', async (req, res) => {
    const { WeeklyPaySheetId } = req.body;
    if (!WeeklyPaySheetId) {
        return res.status(400).json({ msg: 'WeeklyPaySheetId is required' });
    }

    const t = await sequelize.transaction();
    try {
        // Find the latest action log that is not undone
        const log = await ActionLog.findOne({
            where: { WeeklyPaySheetId, IsUndone: false },
            order: [['CreatedAt', 'DESC']],
            transaction: t
        });

        if (!log) {
            await t.rollback();
            return res.status(404).json({ msg: 'No actions to undo' });
        }

        console.log(`Undoing action: ${log.ActionType} on entity: ${log.EntityType} (ID: ${log.EntityId})`);

        switch (log.ActionType) {
            case 'CellEdit': {
                const item = await WeeklyPaySheetItem.findByPk(log.EntityId, { transaction: t });
                if (item) {
                    await item.update({ Amount: log.BeforeData.Amount }, { transaction: t });
                }
                break;
            }

            case 'Pay': {
                const item = await WeeklyPaySheetItem.findByPk(log.EntityId, { transaction: t });
                if (item) {
                    await item.update({
                        PaymentStatus: 'Pending',
                        PaymentId: null,
                        PaymentDate: null,
                        PaymentMode: null,
                        PaymentNotes: null
                    }, { transaction: t });
                }
                if (log.AfterData.PaymentId) {
                    await Payment.destroy({ where: { id: log.AfterData.PaymentId }, transaction: t });
                }
                break;
            }

            case 'Unpay': {
                const item = await WeeklyPaySheetItem.findByPk(log.EntityId, { transaction: t });
                if (item && log.BeforeData) {
                    // Create payment
                    const payment = await Payment.create({
                        PaymentCategory: log.BeforeData.PaymentCategory || 'Labour',
                        SiteId: log.BeforeData.SiteId,
                        PayeeId: log.BeforeData.PayeeId,
                        Amount: log.BeforeData.PaymentAmount,
                        PaymentMode: log.BeforeData.PaymentMode || 'Cash',
                        Notes: log.BeforeData.PaymentNotes || '',
                        PaymentDate: log.BeforeData.PaymentDate || new Date()
                    }, { transaction: t });

                    await item.update({
                        PaymentStatus: 'Paid',
                        PaymentId: payment.id,
                        PaymentDate: log.BeforeData.PaymentDate || new Date(),
                        PaymentMode: log.BeforeData.PaymentMode || 'Cash',
                        PaymentNotes: log.BeforeData.PaymentNotes || ''
                    }, { transaction: t });
                }
                break;
            }

            case 'Skip': {
                const item = await WeeklyPaySheetItem.findByPk(log.EntityId, { transaction: t });
                if (item) {
                    await item.update({
                        IsSkipped: false,
                        SkippedToSheetId: null
                    }, { transaction: t });
                }
                if (log.BeforeData.nextItemId) {
                    const nextItem = await WeeklyPaySheetItem.findByPk(log.BeforeData.nextItemId, { transaction: t });
                    if (nextItem) {
                        const newAmount = Math.max(0, parseFloat(nextItem.Amount) - parseFloat(item.Amount));
                        if (newAmount === 0 && log.BeforeData.nextItemBeforeAmount === 0 && nextItem.PaymentStatus === 'Pending') {
                            await nextItem.destroy({ transaction: t });
                        } else {
                            await nextItem.update({ Amount: newAmount }, { transaction: t });
                        }
                    }
                }
                break;
            }

            case 'SplitPay': {
                const item = await WeeklyPaySheetItem.findByPk(log.EntityId, { transaction: t });
                if (item) {
                    await item.update({
                        Amount: log.BeforeData.Amount,
                        PaymentStatus: 'Pending',
                        PaymentId: null,
                        PaymentDate: null,
                        PaymentMode: null,
                        PaymentNotes: null
                    }, { transaction: t });
                }
                if (log.AfterData.PaymentId) {
                    await Payment.destroy({ where: { id: log.AfterData.PaymentId }, transaction: t });
                }
                if (log.BeforeData.nextItemId) {
                    const nextItem = await WeeklyPaySheetItem.findByPk(log.BeforeData.nextItemId, { transaction: t });
                    if (nextItem) {
                        const originalAmount = parseFloat(log.BeforeData.Amount);
                        const paidAmount = parseFloat(log.AfterData.Amount);
                        const remainder = originalAmount - paidAmount;
                        const newAmount = Math.max(0, parseFloat(nextItem.Amount) - remainder);

                        if (newAmount === 0 && log.BeforeData.nextItemBeforeAmount === 0 && nextItem.PaymentStatus === 'Pending') {
                            await nextItem.destroy({ transaction: t });
                        } else {
                            await nextItem.update({ Amount: newAmount }, { transaction: t });
                        }
                    }
                }
                break;
            }

            case 'ExtraPayment': {
                const item = await WeeklyPaySheetItem.findByPk(log.EntityId, { transaction: t });
                if (item) {
                    await item.destroy({ transaction: t });
                }
                break;
            }

            case 'PayAll': {
                if (log.BeforeData.items && Array.isArray(log.BeforeData.items)) {
                    for (const it of log.BeforeData.items) {
                        const item = await WeeklyPaySheetItem.findByPk(it.id, { transaction: t });
                        if (item) {
                            await item.update({
                                PaymentStatus: 'Pending',
                                PaymentId: null,
                                PaymentDate: null,
                                PaymentMode: null,
                                PaymentNotes: null
                            }, { transaction: t });
                        }
                    }
                }
                if (log.AfterData.items && Array.isArray(log.AfterData.items)) {
                    const paymentIds = log.AfterData.items.map(it => it.PaymentId).filter(Boolean);
                    if (paymentIds.length > 0) {
                        await Payment.destroy({ where: { id: paymentIds }, transaction: t });
                    }
                }
                break;
            }

            case 'DiscountChange': {
                const { SiteMaterial } = require('../models');
                const material = await SiteMaterial.findByPk(log.EntityId, { transaction: t });
                if (material) {
                    await material.update({ Discount: log.BeforeData.Discount }, { transaction: t });
                }
                break;
            }

            default:
                await t.rollback();
                return res.status(400).json({ msg: `Unsupported undo action type: ${log.ActionType}` });
        }

        // Mark action log as undone
        await log.update({ IsUndone: true }, { transaction: t });

        await t.commit();
        res.json({ msg: `Undone successfully: ${log.ActionType}`, actionType: log.ActionType });
    } catch (err) {
        await t.rollback();
        console.error('Undo error:', err);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});

module.exports = router;
