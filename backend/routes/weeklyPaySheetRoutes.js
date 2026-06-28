const express = require('express');
const router = express.Router();
const { WeeklyPaySheet, WeeklyPaySheetItem, Payee, Site, Payment, Client, SiteMaterial, MaterialType, ActionLog, AttendanceRecord, sequelize } = require('../models');
const { Op } = require('sequelize');

// Helper: Synchronize dealer payee rows and grid items from site_materials
async function syncDealerItems(sheet, transaction = null) {
    const selectedSiteIds = sheet.SelectedSiteIds || [];
    if (selectedSiteIds.length === 0) return;

    // Calculate week range
    const weekEndDate = new Date(sheet.WeekDate);
    const weekStartDate = new Date(weekEndDate);
    weekStartDate.setDate(weekEndDate.getDate() - 6);
    weekStartDate.setHours(0, 0, 0, 0);
    weekEndDate.setHours(23, 59, 59, 999);

    // Fetch material purchases for this week
    const purchases = await SiteMaterial.findAll({
        where: {
            SiteId: { [Op.in]: selectedSiteIds },
            PurchaseDate: { [Op.between]: [weekStartDate, weekEndDate] }
        },
        transaction
    });

    // Group purchases by SiteId and DealerName (cleaned)
    const groups = {};
    for (const p of purchases) {
        const dealer = (p.DealerName || '').trim();
        if (!dealer) continue;
        const siteId = p.SiteId;
        const key = `${dealer.toLowerCase()}_${siteId}`;
        if (!groups[key]) {
            groups[key] = {
                dealerName: dealer,
                siteId,
                netAmount: 0,
                purchaseIds: []
            };
        }
        groups[key].netAmount += parseFloat(p.Amount || 0) - parseFloat(p.Discount || 0);
        groups[key].purchaseIds.push(p.id);
    }

    // Process each group: find/create Payee and update/create WeeklyPaySheetItem
    const activeDealerPayeeIds = new Set();
    
    for (const key of Object.keys(groups)) {
        const { dealerName, siteId, netAmount, purchaseIds } = groups[key];

        // Find or create Payee of Type = 'Supplier' (case-insensitive)
        let payee = await Payee.findOne({
            where: sequelize.where(sequelize.fn('lower', sequelize.col('Name')), dealerName.toLowerCase()),
            transaction
        });

        if (!payee) {
            payee = await Payee.create({
                Name: dealerName,
                Type: 'Supplier'
            }, { transaction });
            console.log(`Auto-created Supplier Payee: ${dealerName} (${payee.id})`);
        }

        activeDealerPayeeIds.add(payee.id);

        // Find or create WeeklyPaySheetItem for this sheet, payee, and site
        let item = await WeeklyPaySheetItem.findOne({
            where: {
                WeeklyPaySheetId: sheet.id,
                PayeeId: payee.id,
                SiteId: siteId
            },
            transaction
        });

        if (item) {
            // Update item if it's pending and not skipped
            if (item.PaymentStatus === 'Pending' && !item.IsSkipped) {
                await item.update({
                    Amount: netAmount,
                    SourceType: 'Material',
                    SourceMaterialIds: JSON.stringify(purchaseIds)
                }, { transaction });
            } else {
                // If it is paid or skipped, just update SourceType and SourceMaterialIds for tracking
                await item.update({
                    SourceType: 'Material',
                    SourceMaterialIds: JSON.stringify(purchaseIds)
                }, { transaction });
            }
        } else {
            // Create a new item
            await WeeklyPaySheetItem.create({
                WeeklyPaySheetId: sheet.id,
                PayeeId: payee.id,
                SiteId: siteId,
                Amount: netAmount,
                SourceType: 'Material',
                SourceMaterialIds: JSON.stringify(purchaseIds),
                PaymentStatus: 'Pending'
            }, { transaction });
        }
    }

    // Find all WeeklyPaySheetItems of SourceType = 'Material' for this sheet.
    // If they are not in our current groups, and they are Pending and not skipped, delete them.
    const existingMaterialItems = await WeeklyPaySheetItem.findAll({
        where: {
            WeeklyPaySheetId: sheet.id,
            SourceType: 'Material'
        },
        transaction
    });

    for (const item of existingMaterialItems) {
        if (!activeDealerPayeeIds.has(item.PayeeId)) {
            if (item.PaymentStatus === 'Pending' && !item.IsSkipped) {
                await item.destroy({ transaction });
            }
        }
    }
}


// Helper: Get sites with pending payments (derived from attendance records or material purchases) in the week ending on weekDate
async function getSitesWithPaymentsDue(weekDateVal) {
    const weekEndDate = new Date(weekDateVal);
    const weekStartDate = new Date(weekEndDate);
    weekStartDate.setDate(weekEndDate.getDate() - 6);
    weekStartDate.setHours(0, 0, 0, 0);
    weekEndDate.setHours(23, 59, 59, 999);

    const startStr = weekStartDate.toISOString().split('T')[0];
    const endStr = weekEndDate.toISOString().split('T')[0];

    // 1. Fetch site IDs from AttendanceRecord
    const attendanceRecords = await AttendanceRecord.findAll({
        attributes: ['SiteId'],
        where: {
            AttendanceDate: {
                [Op.between]: [startStr, endStr]
            }
        },
        raw: true
    });
    const attendanceSiteIds = attendanceRecords.map(r => r.SiteId).filter(Boolean);

    // 2. Fetch site IDs from SiteMaterial (purchases)
    const siteMaterials = await SiteMaterial.findAll({
        attributes: ['SiteId'],
        where: {
            PurchaseDate: {
                [Op.between]: [weekStartDate, weekEndDate]
            }
        },
        raw: true
    });
    const purchaseSiteIds = siteMaterials.map(m => m.SiteId).filter(Boolean);

    // Merge lists and return distinct site IDs
    return [...new Set([...attendanceSiteIds, ...purchaseSiteIds])];
}


// ============ SHEET CRUD ============

// @route   GET /api/weekly-pay-sheets
// @desc    List all sheets
router.get('/', async (req, res) => {
    try {
        const isSqlite = sequelize.options.dialect === 'sqlite';
        const foreignKey = isSqlite ? 'weekly_pay_sheet_id' : 'WeeklyPaySheetId';
        const primaryKey = isSqlite ? 'id' : 'Id';
        const amountField = isSqlite ? 'amount' : 'Amount';
        const statusField = isSqlite ? 'payment_status' : 'PaymentStatus';

        const sheets = await WeeklyPaySheet.findAll({
            order: [['WeekDate', 'DESC']],
            attributes: [
                'id', 'Title', 'WeekDate', 'Status', 'CreatedAt', 'SelectedPayeeIds', 'SelectedSiteIds',
                [
                    sequelize.literal(`(SELECT COUNT(*) FROM weekly_pay_sheet_items WHERE weekly_pay_sheet_items.${foreignKey} = WeeklyPaySheet.${primaryKey})`),
                    'itemCount'
                ],
                [
                    sequelize.literal(`(SELECT COALESCE(SUM(${amountField}), 0) FROM weekly_pay_sheet_items WHERE weekly_pay_sheet_items.${foreignKey} = WeeklyPaySheet.${primaryKey})`),
                    'totalAmount'
                ],
                [
                    sequelize.literal(`(SELECT COALESCE(SUM(${amountField}), 0) FROM weekly_pay_sheet_items WHERE weekly_pay_sheet_items.${foreignKey} = WeeklyPaySheet.${primaryKey} AND weekly_pay_sheet_items.${statusField} = 'Paid')`),
                    'paidAmount'
                ]
            ]
        });


        const result = sheets.map(sheet => {
            const itemCount = parseInt(sheet.getDataValue('itemCount') || 0);
            const totalAmount = parseFloat(sheet.getDataValue('totalAmount') || 0);
            const paidAmount = parseFloat(sheet.getDataValue('paidAmount') || 0);
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
                itemCount,
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
        // Find sites with payments due in this week (from attendance and purchase tables)
        const selectedSiteIds = await getSitesWithPaymentsDue(WeekDate);

        const sheet = await WeeklyPaySheet.create({
            Title,
            WeekDate,
            SelectedSiteIds: selectedSiteIds,
            SelectedPayeeIds: []
        });

        console.log(`Created sheet ${sheet.id} with ${selectedSiteIds.length} dynamically selected sites`);
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
        let sheet = await WeeklyPaySheet.findByPk(req.params.id);
        if (!sheet) return res.status(404).json({ msg: 'Sheet not found' });

        // Auto-synchronize material dealer rows
        await syncDealerItems(sheet);

        // Re-fetch sheet to include newly created/updated dealer items
        sheet = await WeeklyPaySheet.findByPk(req.params.id, {
            include: [{
                model: WeeklyPaySheetItem,
                as: 'Items',
                required: false,
                include: [
                    { model: Payee, as: 'Payee', attributes: ['id', 'Name', 'Type'], required: false },
                    { model: Site, as: 'Site', attributes: ['id', 'SiteName', 'SiteValue'], required: false }
                ]
            }]
        });

        // Get payees and sites from the stored IDs and the actual item payees
        const selectedPayeeIds = sheet.SelectedPayeeIds || [];
        const selectedSiteIds = sheet.SelectedSiteIds || [];
        
        const itemPayeeIds = (sheet.Items || []).map(it => it.PayeeId).filter(id => id != null);
        const allSheetPayeeIds = [...new Set([...selectedPayeeIds, ...itemPayeeIds])];

        let payees = [];
        let sites = [];

        if (allSheetPayeeIds.length > 0) {
            payees = await Payee.findAll({
                where: { id: { [Op.in]: allSheetPayeeIds } },
                attributes: ['id', 'Name', 'Type'],
                order: [['Name', 'ASC']]
            });
        }

        if (selectedSiteIds.length > 0) {
            sites = await Site.findAll({
                where: { id: { [Op.in]: selectedSiteIds } },
                attributes: ['id', 'SiteName', 'SiteValue', 'ClientId'],
                include: [{ model: Client, as: 'Client', attributes: ['Name'] }],
                order: [['SiteName', 'ASC']]
            });
        }

        // Build grid from items
        const items = sheet.Items || [];
        const grid = {};
        const extraPaymentData = {};

        items.forEach(item => {
            if (item.IsExtraPayment) {
                // Group extra payments by site
                if (!extraPaymentData[item.SiteId]) {
                    extraPaymentData[item.SiteId] = { total: 0, items: [] };
                }
                extraPaymentData[item.SiteId].total += parseFloat(item.Amount || 0);
                extraPaymentData[item.SiteId].items.push({
                    id: item.id,
                    amount: parseFloat(item.Amount || 0),
                    description: item.ExtraPaymentDescription || 'Additional works',
                    paymentDate: item.PaymentDate
                });
                return;
            }

            const key = item.PayeeId ? `${item.PayeeId}_${item.SiteId}` : `income_${item.SiteId}`;
            grid[key] = {
                id: item.id,
                amount: parseFloat(item.Amount || 0),
                status: item.PaymentStatus,
                paymentId: item.PaymentId,
                paymentDate: item.PaymentDate,
                paymentMode: item.PaymentMode,
                paymentNotes: item.PaymentNotes,
                isSkipped: item.IsSkipped || false,
                skippedToSheetId: item.SkippedToSheetId,
                sourceType: item.SourceType || 'Attendance',
                sourceMaterialIds: item.SourceMaterialIds
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

        // Fetch cumulative collections up to the end of this week
        const cumulativeCollections = await Payment.findAll({
            where: {
                PaymentCategory: 'Collection',
                SiteId: { [Op.in]: selectedSiteIds },
                PaymentDate: {
                    [Op.lte]: weekEndDate
                }
            },
            attributes: ['SiteId', 'Amount']
        });

        const cumulativeIncomeData = {};
        cumulativeCollections.forEach(c => {
            cumulativeIncomeData[c.SiteId] = (cumulativeIncomeData[c.SiteId] || 0) + parseFloat(c.Amount || 0);
        });

        // Fetch material purchases (from site_materials) for this week's date range
        const materialPurchases = await SiteMaterial.findAll({
            where: {
                SiteId: { [Op.in]: selectedSiteIds },
                PurchaseDate: {
                    [Op.between]: [weekStartDate, weekEndDate]
                }
            },
            include: [{ model: MaterialType, as: 'Material', attributes: ['Name'] }],
            order: [['PurchaseDate', 'ASC']]
        });

        // Build materialData: { [siteId]: { gross, discount, net, items: [...] } }
        const materialData = {};
        materialPurchases.forEach(p => {
            const siteId = p.SiteId;
            if (!materialData[siteId]) {
                materialData[siteId] = { gross: 0, discount: 0, net: 0, items: [] };
            }
            const gross = parseFloat(p.Amount || 0);
            const disc = parseFloat(p.Discount || 0);
            const net = Math.max(0, gross - disc);
            materialData[siteId].gross += gross;
            materialData[siteId].discount += disc;
            materialData[siteId].net += net;
            materialData[siteId].items.push({
                id: p.id,
                materialName: p.Material?.Name || 'Unknown Material',
                dealerName: p.DealerName || '—',
                quantity: p.Quantity,
                unit: p.Unit,
                gross,
                discount: disc,
                net,
                purchaseDate: p.PurchaseDate
            });
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
            cumulativeIncomeData,
            extraPaymentData,
            materialData,
            selectedPayeeIds,
            selectedSiteIds
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/weekly-pay-sheets/:id/sync-dealer-items
// @desc    Force sync dealer payee rows and grid items from site_materials
router.post('/:id/sync-dealer-items', async (req, res) => {
    try {
        const sheet = await WeeklyPaySheet.findByPk(req.params.id);
        if (!sheet) return res.status(404).json({ msg: 'Sheet not found' });

        await syncDealerItems(sheet);
        res.json({ msg: 'Dealer items synchronized successfully' });
    } catch (err) {
        console.error('Manual Dealer Sync Error:', err);
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
    const t = await sequelize.transaction();
    try {
        const sheet = await WeeklyPaySheet.findByPk(req.params.id, { transaction: t });
        if (!sheet) {
            await t.rollback();
            return res.status(404).json({ msg: 'Sheet not found' });
        }

        let item = await WeeklyPaySheetItem.findOne({
            where: { WeeklyPaySheetId: req.params.id, PayeeId, SiteId },
            transaction: t
        });

        const beforeAmount = item ? parseFloat(item.Amount || 0) : 0;
        const targetAmount = parseFloat(Amount || 0);

        if (item) {
            if (item.PaymentStatus === 'Paid') {
                await t.rollback();
                return res.status(400).json({ msg: 'Cannot update amount for a paid item. Unpay first.' });
            }
            await item.update({ Amount: targetAmount }, { transaction: t });
        } else {
            item = await WeeklyPaySheetItem.create({
                WeeklyPaySheetId: parseInt(req.params.id),
                PayeeId: PayeeId || null,
                SiteId,
                Amount: targetAmount,
                PaymentStatus: 'Pending'
            }, { transaction: t });
        }

        // Log cell edit action
        await ActionLog.create({
            WeeklyPaySheetId: sheet.id,
            ActionType: 'CellEdit',
            EntityType: 'WeeklyPaySheetItem',
            EntityId: item.id,
            BeforeData: { Amount: beforeAmount },
            AfterData: { Amount: targetAmount }
        }, { transaction: t });

        await t.commit();

        item = await WeeklyPaySheetItem.findByPk(item.id, {
            include: [
                { model: Payee, as: 'Payee', attributes: ['id', 'Name', 'Type'] },
                { model: Site, as: 'Site', attributes: ['id', 'SiteName', 'SiteValue'] }
            ]
        });

        res.json(item);
    } catch (err) {
        await t.rollback();
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

        const itemsBefore = items.map(it => ({ id: it.id, PaymentStatus: 'Pending', PaymentId: null }));
        const itemsAfter = [];

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

            itemsAfter.push({ id: item.id, PaymentStatus: 'Paid', PaymentId: payment.id });
        }

        // Log PayAll action
        await ActionLog.create({
            WeeklyPaySheetId: sheet.id,
            ActionType: 'PayAll',
            EntityType: 'WeeklyPaySheet',
            EntityId: sheet.id,
            BeforeData: { items: itemsBefore },
            AfterData: { items: itemsAfter }
        }, { transaction: t });

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
            ],
            transaction: t
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

        // Log Pay action
        await ActionLog.create({
            WeeklyPaySheetId: item.WeeklyPaySheetId,
            ActionType: 'Pay',
            EntityType: 'WeeklyPaySheetItem',
            EntityId: item.id,
            BeforeData: { PaymentStatus: 'Pending', PaymentId: null },
            AfterData: {
                PaymentStatus: 'Paid',
                PaymentId: payment.id,
                Amount: item.Amount,
                PaymentMode: payment.PaymentMode,
                PaymentNotes: payment.Notes,
                PaymentDate: payment.PaymentDate
            }
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
        const item = await WeeklyPaySheetItem.findByPk(req.params.id, { transaction: t });
        if (!item) {
            await t.rollback();
            return res.status(404).json({ msg: 'Item not found' });
        }
        if (item.PaymentStatus === 'Pending') {
            await t.rollback();
            return res.status(400).json({ msg: 'Item is already pending' });
        }

        const payment = item.PaymentId ? await Payment.findByPk(item.PaymentId, { transaction: t }) : null;
        const beforeData = {
            PaymentStatus: 'Paid',
            PaymentId: item.PaymentId,
            PaymentDate: item.PaymentDate,
            PaymentMode: item.PaymentMode,
            PaymentNotes: item.PaymentNotes,
            PaymentAmount: payment ? payment.Amount : item.Amount,
            PaymentCategory: payment ? payment.PaymentCategory : 'Labour',
            SiteId: item.SiteId,
            PayeeId: item.PayeeId
        };

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

        // Log Unpay action
        await ActionLog.create({
            WeeklyPaySheetId: item.WeeklyPaySheetId,
            ActionType: 'Unpay',
            EntityType: 'WeeklyPaySheetItem',
            EntityId: item.id,
            BeforeData: beforeData,
            AfterData: { PaymentStatus: 'Pending', PaymentId: null }
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

        const dateStr = typeof weeklySheet.WeekDate === 'string'
            ? weeklySheet.WeekDate
            : weeklySheet.WeekDate.toISOString().split('T')[0];

        const weekEndDate = new Date(weeklySheet.WeekDate);
        const weekStartDate = new Date(weekEndDate);
        weekStartDate.setDate(weekEndDate.getDate() - 6);
        weekStartDate.setHours(0, 0, 0, 0);
        weekEndDate.setHours(23, 59, 59, 999);

        // Fetch material purchases for this week
        const purchases = await SiteMaterial.findAll({
            where: {
                PurchaseDate: { [Op.between]: [weekStartDate, weekEndDate] }
            }
        });

        const materialPayeeIds = [];
        const materialSiteIds = [...new Set(purchases.map(p => p.SiteId).filter(Boolean))].map(id => parseInt(id));

        for (const p of purchases) {
            const dealer = (p.DealerName || '').trim();
            if (!dealer) continue;

            let payee = await Payee.findOne({
                where: sequelize.where(sequelize.fn('lower', sequelize.col('Name')), dealer.toLowerCase())
            });

            if (!payee) {
                payee = await Payee.create({
                    Name: dealer,
                    Type: 'Supplier'
                });
                console.log(`Auto-created Supplier Payee on Import: ${dealer} (${payee.id})`);
            }
            materialPayeeIds.push(payee.id);
        }

        const uniqueMaterialPayeeIds = [...new Set(materialPayeeIds)];

        // Find matching attendance sheets (where weeklySheet.WeekDate falls between start and end)
        const { AttendanceSheet, AttendanceRecord, AttendanceMisc, LiftingRecord } = require('../models');
        const attendanceSheets = await AttendanceSheet.findAll({
            where: {
                WeekStartDate: { [Op.lte]: dateStr },
                WeekEndDate: { [Op.gte]: dateStr }
            },
            order: [['Id', 'DESC']]
        });

        let records = [];
        let miscs = [];
        let liftingRecords = [];

        if (attendanceSheets.length > 0) {
            const sheetIds = attendanceSheets.map(s => s.id);
            records = await AttendanceRecord.findAll({ where: { AttendanceSheetId: { [Op.in]: sheetIds } } });
            miscs = await AttendanceMisc.findAll({ where: { AttendanceSheetId: { [Op.in]: sheetIds } } });
            liftingRecords = await LiftingRecord.findAll({ where: { AttendanceSheetId: { [Op.in]: sheetIds } } });
        }

        if (records.length === 0 && miscs.length === 0 && liftingRecords.length === 0 && purchases.length === 0) {
            return res.status(404).json({ msg: 'No attendance, lifting, or material purchases found for this week' });
        }

        // Update WeeklyPaySheet's selected lists to include those found in attendance, lifting, and materials
        const attendancePayeeIds = [...new Set([
            ...records.map(r => r.PayeeId),
            ...miscs.map(m => m.PayeeId),
            ...liftingRecords.map(l => l.PayeeId),
            ...uniqueMaterialPayeeIds
        ])].filter(id => !!id).map(id => parseInt(id));

        const attendanceSiteIds = [...new Set([
            ...records.map(r => r.SiteId),
            ...miscs.map(m => m.SiteId).filter(Boolean),
            ...liftingRecords.map(l => l.SiteId),
            ...materialSiteIds
        ])].filter(id => !!id).map(id => parseInt(id));

        // Aggregate by PayeeId_SiteId
        const totals = {};
        records.forEach(r => {
            const key = `${r.PayeeId}_${r.SiteId}`;
            totals[key] = (totals[key] || 0) + parseFloat(r.CalculatedAmount);
        });

        liftingRecords.forEach(l => {
            const key = `${l.PayeeId}_${l.SiteId}`;
            totals[key] = (totals[key] || 0) + parseFloat(l.Amount);
        });
        miscs.forEach(m => {
            let sId = m.SiteId;
            if (!sId) {
                // Find first site this payee worked at this week
                const payeeRec = records.find(r => r.PayeeId === m.PayeeId);
                if (payeeRec) {
                    sId = payeeRec.SiteId;
                } else if (attendanceSiteIds.length > 0) {
                    sId = attendanceSiteIds[0];
                }
            }
            if (sId) {
                const key = `${m.PayeeId}_${sId}`;
                totals[key] = (totals[key] || 0) + parseFloat(m.Amount);
            }
        });

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

        // Trigger dealer item synchronization to write them into the grid items immediately
        await syncDealerItems(weeklySheet);

        let sourceMsg = '';
        if (attendanceSheets.length > 0) {
            sourceMsg = `Attendance: ${attendanceSheets.map(s => s.Title).join(', ')}`;
        }
        if (purchases.length > 0) {
            if (sourceMsg) sourceMsg += ' and ';
            sourceMsg += `Material Purchases (${purchases.length} items)`;
        }
        if (!sourceMsg) sourceMsg = 'No sources';

        res.json({ msg: `Successfully imported data from ${sourceMsg}` });
    } catch (err) {
        console.error('Import Attendance Error:', err);
        res.status(500).json({ msg: 'Server Error' });
    }
});


// ============ SKIP / SPLIT / EXTRA PAYMENT ============

// Helper: find or create next week's sheet
async function findOrCreateNextWeekSheet(currentSheet, transaction) {
    const currentDate = new Date(currentSheet.WeekDate);
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 7);
    const nextWeekDate = nextDate.toISOString().split('T')[0];

    let nextSheet = await WeeklyPaySheet.findOne({
        where: { WeekDate: nextWeekDate },
        transaction
    });

    if (!nextSheet) {
        // Auto-create next week's sheet with same payees/sites
        nextSheet = await WeeklyPaySheet.create({
            Title: `Week of ${nextWeekDate}`,
            WeekDate: nextWeekDate,
            Status: 'Open',
            SelectedPayeeIds: currentSheet.SelectedPayeeIds || [],
            SelectedSiteIds: currentSheet.SelectedSiteIds || []
        }, { transaction });
    }

    return nextSheet;
}

// @route   POST /api/weekly-pay-sheets/items/:id/skip
// @desc    Full skip — mark item as skipped, move full amount to next week
router.post('/items/:id/skip', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const item = await WeeklyPaySheetItem.findByPk(req.params.id, { transaction: t });
        if (!item) { await t.rollback(); return res.status(404).json({ msg: 'Item not found' }); }
        if (item.PaymentStatus === 'Paid') { await t.rollback(); return res.status(400).json({ msg: 'Cannot skip a paid item' }); }

        const currentSheet = await WeeklyPaySheet.findByPk(item.WeeklyPaySheetId, { transaction: t });
        if (!currentSheet) { await t.rollback(); return res.status(404).json({ msg: 'Sheet not found' }); }

        const nextSheet = await findOrCreateNextWeekSheet(currentSheet, t);

        // Check if item already exists in next sheet for same payee+site
        let nextItem = await WeeklyPaySheetItem.findOne({
            where: {
                WeeklyPaySheetId: nextSheet.id,
                PayeeId: item.PayeeId,
                SiteId: item.SiteId,
                IsExtraPayment: false,
                IsSkipped: false
            },
            transaction: t
        });

        const nextItemBeforeAmount = nextItem ? parseFloat(nextItem.Amount) : 0;

        if (nextItem) {
            await nextItem.update({
                Amount: parseFloat(nextItem.Amount) + parseFloat(item.Amount)
            }, { transaction: t });
        } else {
            nextItem = await WeeklyPaySheetItem.create({
                WeeklyPaySheetId: nextSheet.id,
                PayeeId: item.PayeeId,
                SiteId: item.SiteId,
                Amount: item.Amount,
                PaymentStatus: 'Pending'
            }, { transaction: t });
        }

        // Mark current item as skipped (don't delete, keep for visibility)
        await item.update({
            IsSkipped: true,
            SkippedToSheetId: nextSheet.id
        }, { transaction: t });

        // Log Skip action
        await ActionLog.create({
            WeeklyPaySheetId: item.WeeklyPaySheetId,
            ActionType: 'Skip',
            EntityType: 'WeeklyPaySheetItem',
            EntityId: item.id,
            BeforeData: {
                IsSkipped: false,
                SkippedToSheetId: null,
                nextItemId: nextItem.id,
                nextItemBeforeAmount: nextItemBeforeAmount
            },
            AfterData: {
                IsSkipped: true,
                SkippedToSheetId: nextSheet.id,
                nextItemId: nextItem.id,
                nextItemAfterAmount: parseFloat(nextItem.Amount)
            }
        }, { transaction: t });

        await t.commit();
        res.json({ msg: 'Item skipped to next week', nextSheetId: nextSheet.id });
    } catch (err) {
        await t.rollback();
        console.error('Skip Error:', err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/weekly-pay-sheets/items/:id/split-pay
// @desc    Pay partial amount, move remainder to next week
router.post('/items/:id/split-pay', async (req, res) => {
    const { PaidAmount, PaymentDate, PaymentMode, Notes } = req.body;
    const t = await sequelize.transaction();
    try {
        const item = await WeeklyPaySheetItem.findByPk(req.params.id, {
            include: [
                { model: Payee, as: 'Payee' },
                { model: Site, as: 'Site' }
            ],
            transaction: t
        });
        if (!item) { await t.rollback(); return res.status(404).json({ msg: 'Item not found' }); }
        if (item.PaymentStatus === 'Paid') { await t.rollback(); return res.status(400).json({ msg: 'Item already paid' }); }

        const totalAmount = parseFloat(item.Amount);
        const paidAmount = parseFloat(PaidAmount);
        const remainderAmount = totalAmount - paidAmount;

        if (paidAmount <= 0 || paidAmount >= totalAmount) {
            await t.rollback();
            return res.status(400).json({ msg: 'Partial amount must be between 0 and total amount' });
        }

        const currentSheet = await WeeklyPaySheet.findByPk(item.WeeklyPaySheetId, { transaction: t });
        if (!currentSheet) { await t.rollback(); return res.status(404).json({ msg: 'Sheet not found' }); }

        // Create payment for the paid portion
        const payment = await Payment.create({
            PaymentCategory: item.PayeeId ? (item.Payee?.Type === 'Labour' ? 'Labour' : 'Material') : 'Collection',
            SiteId: item.SiteId,
            PayeeId: item.PayeeId,
            Amount: paidAmount,
            PaymentMode: PaymentMode || 'Cash',
            Notes: Notes || `Partial payment - ${item.Payee?.Name || 'Payee'}`,
            PaymentDate: PaymentDate || new Date()
        }, { transaction: t });

        // Update current item to the paid amount and mark as paid
        await item.update({
            Amount: paidAmount,
            PaymentStatus: 'Paid',
            PaymentId: payment.id,
            PaymentDate: PaymentDate || new Date(),
            PaymentMode: PaymentMode || 'Cash',
            PaymentNotes: Notes || `Partial: ₹${paidAmount} of ₹${totalAmount}`
        }, { transaction: t });

        // Move remainder to next week
        const nextSheet = await findOrCreateNextWeekSheet(currentSheet, t);

        let nextItem = await WeeklyPaySheetItem.findOne({
            where: {
                WeeklyPaySheetId: nextSheet.id,
                PayeeId: item.PayeeId,
                SiteId: item.SiteId,
                IsExtraPayment: false,
                IsSkipped: false
            },
            transaction: t
        });

        const nextItemBeforeAmount = nextItem ? parseFloat(nextItem.Amount) : 0;

        if (nextItem) {
            await nextItem.update({
                Amount: parseFloat(nextItem.Amount) + remainderAmount
            }, { transaction: t });
        } else {
            nextItem = await WeeklyPaySheetItem.create({
                WeeklyPaySheetId: nextSheet.id,
                PayeeId: item.PayeeId,
                SiteId: item.SiteId,
                Amount: remainderAmount,
                PaymentStatus: 'Pending'
            }, { transaction: t });
        }

        // Log SplitPay action
        await ActionLog.create({
            WeeklyPaySheetId: item.WeeklyPaySheetId,
            ActionType: 'SplitPay',
            EntityType: 'WeeklyPaySheetItem',
            EntityId: item.id,
            BeforeData: {
                Amount: totalAmount,
                PaymentStatus: 'Pending',
                nextItemId: nextItem.id,
                nextItemBeforeAmount: nextItemBeforeAmount
            },
            AfterData: {
                Amount: paidAmount,
                PaymentStatus: 'Paid',
                PaymentId: payment.id,
                nextItemId: nextItem.id,
                nextItemAfterAmount: parseFloat(nextItem.Amount)
            }
        }, { transaction: t });

        await t.commit();
        res.json({
            msg: `Paid ₹${paidAmount}. Remaining ₹${remainderAmount} moved to next week.`,
            nextSheetId: nextSheet.id
        });
    } catch (err) {
        await t.rollback();
        console.error('Split Pay Error:', err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/weekly-pay-sheets/:id/extra-payment
// @desc    Add an extra payment (client-billable additional cost)
router.post('/:id/extra-payment', async (req, res) => {
    const { SiteId, Amount, Description, PaymentDate } = req.body;
    const t = await sequelize.transaction();
    try {
        const sheet = await WeeklyPaySheet.findByPk(req.params.id, { transaction: t });
        if (!sheet) { await t.rollback(); return res.status(404).json({ msg: 'Sheet not found' }); }

        // Create extra payment item — auto-paid as cash
        const item = await WeeklyPaySheetItem.create({
            WeeklyPaySheetId: sheet.id,
            PayeeId: null, // Not linked to a payee
            SiteId: parseInt(SiteId),
            Amount: parseFloat(Amount),
            PaymentStatus: 'Paid',
            PaymentDate: PaymentDate || new Date(),
            PaymentMode: 'Cash',
            PaymentNotes: Description || 'Extra payment',
            IsExtraPayment: true,
            ExtraPaymentDescription: Description || 'Additional works'
        }, { transaction: t });

        // Log ExtraPayment action
        await ActionLog.create({
            WeeklyPaySheetId: sheet.id,
            ActionType: 'ExtraPayment',
            EntityType: 'WeeklyPaySheetItem',
            EntityId: item.id,
            BeforeData: null,
            AfterData: { id: item.id }
        }, { transaction: t });

        await t.commit();
        res.json({ msg: 'Extra payment added', item });
    } catch (err) {
        await t.rollback();
        console.error('Extra Payment Error:', err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;

