const express = require('express');
const router = express.Router();
const { WeeklyPaySheet, WeeklyPaySheetItem, Payee, Site, Payment, sequelize } = require('../models');
const { Op } = require('sequelize');

// ============ SHEET CRUD ============

// @route   GET /api/weekly-pay-sheets
// @desc    List all sheets
router.get('/', async (req, res) => {
    try {
        const sheets = await WeeklyPaySheet.findAll({
            order: [['WeekDate', 'DESC']],
            include: [{
                model: WeeklyPaySheetItem,
                as: 'Items',
                attributes: ['id', 'Amount', 'PaymentStatus']
            }]
        });

        const result = sheets.map(sheet => {
            const items = sheet.Items || [];
            const totalAmount = items.reduce((sum, it) => sum + parseFloat(it.Amount || 0), 0);
            const paidAmount = items.filter(it => it.PaymentStatus === 'Paid')
                .reduce((sum, it) => sum + parseFloat(it.Amount || 0), 0);
            const pendingAmount = totalAmount - paidAmount;
            return {
                id: sheet.id,
                Title: sheet.Title,
                WeekDate: sheet.WeekDate,
                Status: sheet.Status,
                CreatedAt: sheet.CreatedAt,
                totalAmount,
                paidAmount,
                pendingAmount,
                itemCount: items.length,
                payeeCount: (sheet.SelectedPayeeIds || []).length,
                siteCount: (sheet.SelectedSiteIds || []).length
            };
        });

        res.json(result);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/weekly-pay-sheets
// @desc    Create a new sheet
router.post('/', async (req, res) => {
    const { Title, WeekDate } = req.body;
    try {
        // Find active sites to auto-include
        const activeSites = await Site.findAll({
            where: {
                Status: { [Op.in]: ['Upcoming', 'In Progress'] }
            },
            attributes: ['id']
        });
        const selectedSiteIds = activeSites.map(s => s.id);

        const sheet = await WeeklyPaySheet.create({ 
            Title, 
            WeekDate,
            SelectedSiteIds: selectedSiteIds,
            SelectedPayeeIds: []
        });
        
        console.log(`Created sheet ${sheet.id} with ${selectedSiteIds.length} sites`);
        res.json(sheet);
    } catch (err) {
        console.error('Sheet creation error:', err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   GET /api/weekly-pay-sheets/:id
// @desc    Get a sheet with all items (grid data)
router.get('/:id', async (req, res) => {
    try {
        const sheet = await WeeklyPaySheet.findByPk(req.params.id, {
            include: [{
                model: WeeklyPaySheetItem,
                as: 'Items',
                include: [
                    { model: Payee, as: 'Payee', attributes: ['id', 'Name', 'Type'] },
                    { model: Site, as: 'Site', attributes: ['id', 'SiteName', 'SiteValue'] }
                ]
            }]
        });

        if (!sheet) return res.status(404).json({ msg: 'Sheet not found' });

        // Get payees and sites from the stored IDs (not just from items)
        const selectedPayeeIds = sheet.SelectedPayeeIds || [];
        const selectedSiteIds = sheet.SelectedSiteIds || [];

        let payees = [];
        let sites = [];

        if (selectedPayeeIds.length > 0) {
            payees = await Payee.findAll({
                where: { id: { [Op.in]: selectedPayeeIds } },
                attributes: ['id', 'Name', 'Type'],
                order: [['Name', 'ASC']]
            });
        }

        if (selectedSiteIds.length > 0) {
            sites = await Site.findAll({
                where: { id: { [Op.in]: selectedSiteIds } },
                attributes: ['id', 'SiteName', 'SiteValue'],
                order: [['SiteName', 'ASC']]
            });
        }

        // Build grid from items
        const items = sheet.Items || [];
        const grid = {};

        items.forEach(item => {
            const key = item.PayeeId ? `${item.PayeeId}_${item.SiteId}` : `income_${item.SiteId}`;
            grid[key] = {
                id: item.id,
                amount: parseFloat(item.Amount || 0),
                status: item.PaymentStatus,
                paymentId: item.PaymentId,
                paymentDate: item.PaymentDate,
                paymentMode: item.PaymentMode,
                paymentNotes: item.PaymentNotes
            };
        });

        // Calculate week range for income
        const weekEndDate = new Date(sheet.WeekDate);
        const weekStartDate = new Date(weekEndDate);
        weekStartDate.setDate(weekEndDate.getDate() - 6);
        weekStartDate.setHours(0, 0, 0, 0);
        weekEndDate.setHours(23, 59, 59, 999);

        // Fetch collections (income) for this site in this week
        const collections = await Payment.findAll({
            where: {
                PaymentCategory: 'Collection',
                SiteId: { [Op.in]: selectedSiteIds },
                PaymentDate: {
                    [Op.between]: [weekStartDate, weekEndDate]
                }
            },
            attributes: ['SiteId', 'Amount']
        });

        const incomeData = {};
        collections.forEach(c => {
            incomeData[c.SiteId] = (incomeData[c.SiteId] || 0) + parseFloat(c.Amount || 0);
        });

        res.json({
            id: sheet.id,
            Title: sheet.Title,
            WeekDate: sheet.WeekDate,
            Status: sheet.Status,
            CreatedAt: sheet.CreatedAt,
            payees,
            sites,
            grid,
            incomeData,
            selectedPayeeIds,
            selectedSiteIds
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   PUT /api/weekly-pay-sheets/:id
// @desc    Update a sheet title/status
router.put('/:id', async (req, res) => {
    const { Title, WeekDate, Status } = req.body;
    try {
        const sheet = await WeeklyPaySheet.findByPk(req.params.id);
        if (!sheet) return res.status(404).json({ msg: 'Sheet not found' });

        await sheet.update({ Title, WeekDate, Status });
        res.json(sheet);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   DELETE /api/weekly-pay-sheets/:id
// @desc    Delete a sheet and all its items
router.delete('/:id', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const sheet = await WeeklyPaySheet.findByPk(req.params.id);
        if (!sheet) {
            await t.rollback();
            return res.status(404).json({ msg: 'Sheet not found' });
        }

        // Delete linked records: Item first to clear FK, then Payment
        const items = await WeeklyPaySheetItem.findAll({
            where: { WeeklyPaySheetId: req.params.id },
            transaction: t
        });
        
        // Collect all payment IDs
        const paymentIds = items.map(it => it.PaymentId).filter(id => id != null);

        // 1. Delete items first
        await WeeklyPaySheetItem.destroy({ where: { WeeklyPaySheetId: req.params.id }, transaction: t });

        // 2. Delete linked payments
        if (paymentIds.length > 0) {
            await Payment.destroy({ where: { id: { [Op.in]: paymentIds } }, transaction: t });
        }

        await sheet.destroy({ transaction: t });

        await t.commit();
        res.json({ msg: 'Sheet and all items removed' });
    } catch (err) {
        await t.rollback();
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// ============ ITEM OPERATIONS ============

// @route   POST /api/weekly-pay-sheets/:id/items
// @desc    Add or update a cell item (upsert)
router.post('/:id/items', async (req, res) => {
    const { PayeeId, SiteId, Amount } = req.body;
    try {
        const sheet = await WeeklyPaySheet.findByPk(req.params.id);
        if (!sheet) return res.status(404).json({ msg: 'Sheet not found' });

        let item = await WeeklyPaySheetItem.findOne({
            where: { WeeklyPaySheetId: req.params.id, PayeeId, SiteId }
        });

        if (item) {
            if (item.PaymentStatus === 'Paid') {
                return res.status(400).json({ msg: 'Cannot update amount for a paid item. Unpay first.' });
            }
            await item.update({ Amount: Amount || 0 });
        } else {
            item = await WeeklyPaySheetItem.create({
                WeeklyPaySheetId: parseInt(req.params.id),
                PayeeId: PayeeId || null,
                SiteId,
                Amount: Amount || 0,
                PaymentStatus: 'Pending'
            });
        }

        item = await WeeklyPaySheetItem.findByPk(item.id, {
            include: [
                { model: Payee, as: 'Payee', attributes: ['id', 'Name', 'Type'] },
                { model: Site, as: 'Site', attributes: ['id', 'SiteName', 'SiteValue'] }
            ]
        });

        res.json(item);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   DELETE /api/weekly-pay-sheets/:sheetId/items/:itemId
// @desc    Remove a cell item
router.delete('/:sheetId/items/:itemId', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const item = await WeeklyPaySheetItem.findByPk(req.params.itemId);
        if (!item) {
            await t.rollback();
            return res.status(404).json({ msg: 'Item not found' });
        }

        if (item.PaymentId) {
            await Payment.destroy({ where: { id: item.PaymentId }, transaction: t });
        }

        await item.destroy({ transaction: t });
        await t.commit();
        res.json({ msg: 'Item removed' });
    } catch (err) {
        await t.rollback();
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   PATCH /api/weekly-pay-sheets/:id/pay-all
// @desc    Mark all pending items with Amount > 0 as paid
router.patch('/:id/pay-all', async (req, res) => {
    const { PaymentDate, PaymentMode, Notes } = req.body;
    const t = await sequelize.transaction();
    try {
        const sheet = await WeeklyPaySheet.findByPk(req.params.id);
        if (!sheet) {
            await t.rollback();
            return res.status(404).json({ msg: 'Sheet not found' });
        }

        const items = await WeeklyPaySheetItem.findAll({
            where: {
                WeeklyPaySheetId: req.params.id,
                PaymentStatus: 'Pending',
                Amount: { [Op.gt]: 0 }
            },
            include: [
                { model: Payee, as: 'Payee' },
                { model: Site, as: 'Site' }
            ],
            transaction: t
        });

        for (const item of items) {
            const payment = await Payment.create({
                PaymentCategory: item.PayeeId ? (item.Payee?.Type === 'Labour' ? 'Labour' : 'Material') : 'Collection',
                SiteId: item.SiteId,
                LabourId: null,
                MaterialId: null,
                PayeeId: item.PayeeId,
                Amount: item.Amount,
                PaymentMode: PaymentMode || 'Cash',
                Notes: Notes || (item.PayeeId ? `Weekly sheet batch payment - ${item.Payee?.Name || 'Payee'}` : `Weekly sheet batch collection - ${item.Site?.SiteName || 'Site'}`),
                PaymentDate: PaymentDate || new Date()
            }, { transaction: t });

            await item.update({
                PaymentStatus: 'Paid',
                PaymentId: payment.id,
                PaymentDate: PaymentDate || new Date(),
                PaymentMode: PaymentMode || 'Cash',
                PaymentNotes: Notes || ''
            }, { transaction: t });
        }

        await t.commit();
        res.json({ msg: `Successfully marked ${items.length} items as paid.` });
    } catch (err) {
        await t.rollback();
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});


// @route   PATCH /api/weekly-pay-sheets/items/:id/pay
// @desc    Mark an item as paid (creates a Payment record)
router.patch('/items/:id/pay', async (req, res) => {
    const { PaymentDate, PaymentMode, Notes } = req.body;
    const t = await sequelize.transaction();
    try {
        const item = await WeeklyPaySheetItem.findByPk(req.params.id, {
            include: [
                { model: Payee, as: 'Payee' },
                { model: Site, as: 'Site' }
            ]
        });
        if (!item) {
            await t.rollback();
            return res.status(404).json({ msg: 'Item not found' });
        }
        if (item.PaymentStatus === 'Paid') {
            await t.rollback();
            return res.status(400).json({ msg: 'Item is already paid' });
        }

        const payment = await Payment.create({
            PaymentCategory: item.PayeeId ? (item.Payee?.Type === 'Labour' ? 'Labour' : 'Material') : 'Collection',
            SiteId: item.SiteId,
            LabourId: null,
            MaterialId: null,
            PayeeId: item.PayeeId,
            Amount: item.Amount,
            PaymentMode: PaymentMode || 'Cash',
            Notes: Notes || (item.PayeeId ? `Weekly sheet payment - ${item.Payee?.Name || 'Payee'}` : `Weekly sheet collection - ${item.Site?.SiteName || 'Site'}`),
            PaymentDate: PaymentDate || new Date()
        }, { transaction: t });

        await item.update({
            PaymentStatus: 'Paid',
            PaymentId: payment.id,
            PaymentDate: PaymentDate || new Date(),
            PaymentMode: PaymentMode || 'Cash',
            PaymentNotes: Notes || ''
        }, { transaction: t });

        await t.commit();

        const updated = await WeeklyPaySheetItem.findByPk(item.id, {
            include: [
                { model: Payee, as: 'Payee', attributes: ['id', 'Name', 'Type'] },
                { model: Site, as: 'Site', attributes: ['id', 'SiteName'] }
            ]
        });

        res.json(updated);
    } catch (err) {
        await t.rollback();
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   PATCH /api/weekly-pay-sheets/items/:id/unpay
// @desc    Revert an item to pending (deletes linked Payment)
router.patch('/items/:id/unpay', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const item = await WeeklyPaySheetItem.findByPk(req.params.id);
        if (!item) {
            await t.rollback();
            return res.status(404).json({ msg: 'Item not found' });
        }
        if (item.PaymentStatus === 'Pending') {
            await t.rollback();
            return res.status(400).json({ msg: 'Item is already pending' });
        }

        if (item.PaymentId) {
            await Payment.destroy({ where: { id: item.PaymentId }, transaction: t });
        }

        await item.update({
            PaymentStatus: 'Pending',
            PaymentId: null,
            PaymentDate: null,
            PaymentMode: null,
            PaymentNotes: null
        }, { transaction: t });

        await t.commit();
        res.json(item);
    } catch (err) {
        await t.rollback();
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/weekly-pay-sheets/:id/add-payees
// @desc    Add payees to a sheet and create grid items for existing sites
router.post('/:id/add-payees', async (req, res) => {
    const { payeeIds } = req.body;
    try {
        const sheet = await WeeklyPaySheet.findByPk(req.params.id);
        if (!sheet) return res.status(404).json({ msg: 'Sheet not found' });

        // Merge new payee IDs into the tracked list
        const currentPayeeIds = sheet.SelectedPayeeIds || [];
        const mergedPayeeIds = [...new Set([...currentPayeeIds, ...payeeIds])];
        await sheet.update({ SelectedPayeeIds: mergedPayeeIds });

        // Create items for new payees × existing sites
        const siteIds = sheet.SelectedSiteIds || [];
        let created = 0;
        for (const payeeId of payeeIds) {
            for (const siteId of siteIds) {
                const existing = await WeeklyPaySheetItem.findOne({
                    where: { WeeklyPaySheetId: sheet.id, PayeeId: payeeId, SiteId: siteId }
                });
                if (!existing) {
                    await WeeklyPaySheetItem.create({
                        WeeklyPaySheetId: sheet.id,
                        PayeeId: payeeId,
                        SiteId: siteId,
                        Amount: 0,
                        PaymentStatus: 'Pending'
                    });
                    created++;
                }
            }
        }

        res.json({ msg: `Added ${payeeIds.length} payees, created ${created} grid cells` });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/weekly-pay-sheets/:id/add-sites
// @desc    Add sites to a sheet and create grid items for existing payees
router.post('/:id/add-sites', async (req, res) => {
    const { siteIds } = req.body;
    try {
        const sheet = await WeeklyPaySheet.findByPk(req.params.id);
        if (!sheet) return res.status(404).json({ msg: 'Sheet not found' });

        // Merge new site IDs into the tracked list
        const currentSiteIds = sheet.SelectedSiteIds || [];
        const mergedSiteIds = [...new Set([...currentSiteIds, ...siteIds])];
        await sheet.update({ SelectedSiteIds: mergedSiteIds });

        // Create items for existing payees × new sites
        const payeeIds = sheet.SelectedPayeeIds || [];
        let created = 0;
        for (const siteId of siteIds) {
            for (const payeeId of payeeIds) {
                const existing = await WeeklyPaySheetItem.findOne({
                    where: { WeeklyPaySheetId: sheet.id, PayeeId: payeeId, SiteId: siteId }
                });
                if (!existing) {
                    await WeeklyPaySheetItem.create({
                        WeeklyPaySheetId: sheet.id,
                        PayeeId: payeeId,
                        SiteId: siteId,
                        Amount: 0,
                        PaymentStatus: 'Pending'
                    });
                    created++;
                }
            }
        }

        res.json({ msg: `Added ${siteIds.length} sites, created ${created} grid cells` });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/weekly-pay-sheets/:id/sync-payees
// @desc    Sync payees list (add/remove)
router.post('/:id/sync-payees', async (req, res) => {
    const { payeeIds } = req.body; // Full list of desired payee IDs
    const t = await sequelize.transaction();
    try {
        const sheet = await WeeklyPaySheet.findByPk(req.params.id, { transaction: t });
        if (!sheet) {
            await t.rollback();
            return res.status(404).json({ msg: 'Sheet not found' });
        }

        const currentIds = (sheet.SelectedPayeeIds || []).map(id => parseInt(id));
        const requestedIds = (payeeIds || []).map(id => parseInt(id));

        const newIds = requestedIds.filter(id => !currentIds.includes(id));
        const removedIds = currentIds.filter(id => !requestedIds.includes(id));

        // Update sheet list
        await sheet.update({ SelectedPayeeIds: requestedIds }, { transaction: t });

        // Handle removals
        for (const payeeId of removedIds) {
            const items = await WeeklyPaySheetItem.findAll({
                where: { WeeklyPaySheetId: sheet.id, PayeeId: payeeId },
                transaction: t
            });
            for (const item of items) {
                const paymentId = item.PaymentId;
                // 1. Delete item first
                await item.destroy({ transaction: t });
                // 2. Delete linked payment
                if (paymentId) {
                    await Payment.destroy({ where: { id: paymentId }, transaction: t });
                }
            }
        }

        // Handle additions (create items for all current sites)
        const siteIds = (sheet.SelectedSiteIds || []).map(id => parseInt(id));
        for (const payeeId of newIds) {
            for (const siteId of siteIds) {
                const existing = await WeeklyPaySheetItem.findOne({
                    where: { WeeklyPaySheetId: sheet.id, PayeeId: payeeId, SiteId: siteId },
                    transaction: t
                });
                if (!existing) {
                    await WeeklyPaySheetItem.create({
                        WeeklyPaySheetId: sheet.id,
                        PayeeId: payeeId,
                        SiteId: siteId,
                        Amount: 0,
                        PaymentStatus: 'Pending'
                    }, { transaction: t });
                }
            }
        }

        await t.commit();
        res.json({ msg: 'Payees synchronized successfully' });
    } catch (err) {
        if (t) await t.rollback();
        console.error('Sync Payees Error:', err);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});

// @route   POST /api/weekly-pay-sheets/:id/sync-sites
// @desc    Sync sites list (add/remove)
router.post('/:id/sync-sites', async (req, res) => {
    const { siteIds } = req.body; // Full list of desired site IDs
    const t = await sequelize.transaction();
    try {
        const sheet = await WeeklyPaySheet.findByPk(req.params.id, { transaction: t });
        if (!sheet) {
            await t.rollback();
            return res.status(404).json({ msg: 'Sheet not found' });
        }

        const currentIds = (sheet.SelectedSiteIds || []).map(id => parseInt(id));
        const requestedIds = (siteIds || []).map(id => parseInt(id));

        const newIds = requestedIds.filter(id => !currentIds.includes(id));
        const removedIds = currentIds.filter(id => !requestedIds.includes(id));

        // Update sheet list
        await sheet.update({ SelectedSiteIds: requestedIds }, { transaction: t });

        // Handle removals
        for (const siteId of removedIds) {
            const items = await WeeklyPaySheetItem.findAll({
                where: { WeeklyPaySheetId: sheet.id, SiteId: siteId },
                transaction: t
            });
            for (const item of items) {
                const paymentId = item.PaymentId;
                // 1. Delete item first
                await item.destroy({ transaction: t });
                // 2. Delete linked payment
                if (paymentId) {
                    await Payment.destroy({ where: { id: paymentId }, transaction: t });
                }
            }
        }

        // Handle additions (create items for all current payees)
        const payeeIds = (sheet.SelectedPayeeIds || []).map(id => parseInt(id));
        for (const siteId of newIds) {
            for (const payeeId of payeeIds) {
                const existing = await WeeklyPaySheetItem.findOne({
                    where: { WeeklyPaySheetId: sheet.id, PayeeId: payeeId, SiteId: siteId },
                    transaction: t
                });
                if (!existing) {
                    await WeeklyPaySheetItem.create({
                        WeeklyPaySheetId: sheet.id,
                        PayeeId: payeeId,
                        SiteId: siteId,
                        Amount: 0,
                        PaymentStatus: 'Pending'
                    }, { transaction: t });
                }
            }
        }

        await t.commit();
        res.json({ msg: 'Sites synchronized successfully' });
    } catch (err) {
        if (t) await t.rollback();
        console.error('Sync Sites Error:', err);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});

// @route   DELETE /api/weekly-pay-sheets/:id/payees/:payeeId
// @desc    Remove a payee from a sheet's tracked list and delete their items
router.delete('/:id/payees/:payeeId', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const sheet = await WeeklyPaySheet.findByPk(req.params.id);
        if (!sheet) {
            await t.rollback();
            return res.status(404).json({ msg: 'Sheet not found' });
        }

        const payeeId = parseInt(req.params.payeeId);
        const currentPayeeIds = sheet.SelectedPayeeIds || [];
        const updatedPayeeIds = currentPayeeIds.filter(id => id != payeeId);
        
        await sheet.update({ SelectedPayeeIds: updatedPayeeIds }, { transaction: t });

        // Delete items and their payments
        const items = await WeeklyPaySheetItem.findAll({
            where: { WeeklyPaySheetId: sheet.id, PayeeId: payeeId }
        });

        for (const item of items) {
            if (item.PaymentId) {
                await Payment.destroy({ where: { id: item.PaymentId }, transaction: t });
            }
            await item.destroy({ transaction: t });
        }

        await t.commit();
        res.json({ msg: 'Payee and associated items removed from sheet' });
    } catch (err) {
        await t.rollback();
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   DELETE /api/weekly-pay-sheets/:id/sites/:siteId
// @desc    Remove a site column from a sheet's tracked list and delete its items
router.delete('/:id/sites/:siteId', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const sheet = await WeeklyPaySheet.findByPk(req.params.id);
        if (!sheet) {
            await t.rollback();
            return res.status(404).json({ msg: 'Sheet not found' });
        }

        const siteId = parseInt(req.params.siteId);
        const currentSiteIds = sheet.SelectedSiteIds || [];
        const updatedSiteIds = currentSiteIds.filter(id => id != siteId);
        
        await sheet.update({ SelectedSiteIds: updatedSiteIds }, { transaction: t });

        // Delete items and their payments
        const items = await WeeklyPaySheetItem.findAll({
            where: { WeeklyPaySheetId: sheet.id, SiteId: siteId }
        });

        for (const item of items) {
            if (item.PaymentId) {
                await Payment.destroy({ where: { id: item.PaymentId }, transaction: t });
            }
            await item.destroy({ transaction: t });
        }

        await t.commit();
        res.json({ msg: 'Site and associated items removed from sheet' });
    } catch (err) {
        await t.rollback();
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/weekly-pay-sheets/:id/import-attendance
// @desc    Import amounts from matching Attendance Sheet
router.post('/:id/import-attendance', async (req, res) => {
    try {
        const weeklySheet = await WeeklyPaySheet.findByPk(req.params.id);
        if (!weeklySheet) return res.status(404).json({ msg: 'Weekly sheet not found' });

        const weekDate = new Date(weeklySheet.WeekDate);
        
        // Find matching attendance sheet (where weeklySheet.WeekDate falls between start and end)
        const { AttendanceSheet, AttendanceRecord, AttendanceMisc } = require('../models');
        const attendanceSheet = await AttendanceSheet.findOne({
            where: {
                WeekStartDate: { [Op.lte]: weekDate },
                WeekEndDate: { [Op.gte]: weekDate }
            }
        });

        if (!attendanceSheet) return res.status(404).json({ msg: 'No matching attendance sheet found for this week' });

        // Get all records and miscs for this attendance sheet
        const records = await AttendanceRecord.findAll({ where: { AttendanceSheetId: attendanceSheet.id } });
        const miscs = await AttendanceMisc.findAll({ where: { AttendanceSheetId: attendanceSheet.id } });

        // Aggregate by PayeeId_SiteId
        const totals = {};
        records.forEach(r => {
            const key = `${r.PayeeId}_${r.SiteId}`;
            totals[key] = (totals[key] || 0) + parseFloat(r.CalculatedAmount);
        });
        miscs.forEach(m => {
            if (m.SiteId) {
                const key = `${m.PayeeId}_${m.SiteId}`;
                totals[key] = (totals[key] || 0) + parseFloat(m.Amount);
            }
        });

        // Update WeeklyPaySheet's selected lists to include those found in attendance
        const attendancePayeeIds = [...new Set(records.map(r => r.PayeeId).concat(miscs.map(m => m.PayeeId)))].filter(id => !!id).map(id => parseInt(id));
        const attendanceSiteIds = [...new Set(records.map(r => r.SiteId).concat(miscs.filter(m => m.SiteId).map(m => m.SiteId)))].filter(id => !!id).map(id => parseInt(id));

        let currentPayees = (weeklySheet.SelectedPayeeIds || []).map(id => parseInt(id));
        let currentSites = (weeklySheet.SelectedSiteIds || []).map(id => parseInt(id));
        
        let needsUpdate = false;
        attendancePayeeIds.forEach(id => { if (!currentPayees.includes(id)) { currentPayees.push(id); needsUpdate = true; } });
        attendanceSiteIds.forEach(id => { if (!currentSites.includes(id)) { currentSites.push(id); needsUpdate = true; } });

        if (needsUpdate) {
            await weeklySheet.update({
                SelectedPayeeIds: currentPayees,
                SelectedSiteIds: currentSites
            });
        }

        // Update WeeklyPaySheetItems
        let updatedCount = 0;
        for (const [key, amount] of Object.entries(totals)) {
            const [pIdStr, sIdStr] = key.split('_');
            const payeeId = parseInt(pIdStr);
            const siteId = sIdStr === 'null' ? null : parseInt(sIdStr);
            
            let item = await WeeklyPaySheetItem.findOne({
                where: { WeeklyPaySheetId: weeklySheet.id, PayeeId: payeeId, SiteId: siteId }
            });

            if (item) {
                // Only update if not paid
                if (item.PaymentStatus !== 'Paid') {
                    await item.update({ Amount: amount });
                    updatedCount++;
                }
            } else {
                // Now they are definitely in the lists (we added them above)
                await WeeklyPaySheetItem.create({
                    WeeklyPaySheetId: weeklySheet.id,
                    PayeeId: payeeId,
                    SiteId: siteId,
                    Amount: amount,
                    PaymentStatus: 'Pending'
                });
                updatedCount++;
            }
        }

        res.json({ msg: `Successfully imported data for ${updatedCount} cells from Attendance Sheet: ${attendanceSheet.Title}` });
    } catch (err) {
        console.error('Import Attendance Error:', err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;
