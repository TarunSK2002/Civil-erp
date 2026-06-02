const express = require('express');
const router = express.Router();
const { AttendanceSheet, AttendanceRecord, AttendanceMisc, ShiftMaster, PersonType, Payee, Site, Payment, sequelize } = require('../models');
const { Op } = require('sequelize');

// ============ SHEET CRUD ============

// @route   GET /api/attendance-sheets
// @desc    List all attendance sheets with summaries
router.get('/', async (req, res) => {
    try {
        const sheets = await AttendanceSheet.findAll({
            order: [['WeekStartDate', 'DESC']],
            include: [
                { model: AttendanceRecord, as: 'Records', attributes: ['id', 'CalculatedAmount'] },
                { model: AttendanceMisc, as: 'Miscs', attributes: ['id', 'Amount'] }
            ]
        });

        const result = sheets.map(sheet => {
            const records = sheet.Records || [];
            const miscs = sheet.Miscs || [];
            const totalAttendance = records.reduce((sum, r) => sum + parseFloat(r.CalculatedAmount || 0), 0);
            const totalMisc = miscs.reduce((sum, m) => sum + parseFloat(m.Amount || 0), 0);
            return {
                id: sheet.id,
                Title: sheet.Title,
                WeekStartDate: sheet.WeekStartDate,
                WeekEndDate: sheet.WeekEndDate,
                Status: sheet.Status,
                CreatedAt: sheet.CreatedAt,
                totalAmount: totalAttendance + totalMisc,
                totalAttendance,
                totalMisc,
                recordCount: records.length,
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

// @route   POST /api/attendance-sheets
// @desc    Create a new attendance sheet
router.post('/', async (req, res) => {
    const { Title, WeekStartDate, WeekEndDate } = req.body;
    try {
        // Auto-include active sites
        const activeSites = await Site.findAll({
            where: { Status: { [Op.in]: ['Upcoming', 'In Progress'] } },
            attributes: ['id']
        });
        const selectedSiteIds = activeSites.map(s => s.id);

        const sheet = await AttendanceSheet.create({
            Title,
            WeekStartDate,
            WeekEndDate,
            SelectedSiteIds: selectedSiteIds,
            SelectedPayeeIds: []
        });

        res.json(sheet);
    } catch (err) {
        console.error('Sheet creation error:', err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   GET /api/attendance-sheets/:id
// @desc    Get sheet with full grid data
router.get('/:id', async (req, res) => {
    try {
        const sheet = await AttendanceSheet.findByPk(req.params.id);
        if (!sheet) return res.status(404).json({ msg: 'Sheet not found' });

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

        // Fetch all attendance records for this sheet
        const records = await AttendanceRecord.findAll({
            where: { AttendanceSheetId: sheet.id },
            order: [['AttendanceDate', 'ASC'], ['CreatedAt', 'ASC']]
        });

        // Fetch all misc items for this sheet
        const miscs = await AttendanceMisc.findAll({
            where: { AttendanceSheetId: sheet.id },
            order: [['CreatedAt', 'ASC']]
        });

        // Build grid: payeeId_siteId -> { totalAmount, records: [...] }
        const grid = {};
        records.forEach(rec => {
            const key = `${rec.PayeeId}_${rec.SiteId}`;
            if (!grid[key]) {
                grid[key] = { totalAmount: 0, records: [] };
            }
            grid[key].totalAmount += parseFloat(rec.CalculatedAmount || 0);
            grid[key].records.push({
                id: rec.id,
                date: rec.AttendanceDate,
                personType: rec.PersonType || 'Mason',
                shiftType: rec.ShiftType,
                shiftMultiplier: parseFloat(rec.ShiftMultiplier),
                labourCount: rec.LabourCount,
                ratePerShift: parseFloat(rec.RatePerShift),
                calculatedAmount: parseFloat(rec.CalculatedAmount)
            });
        });

        // Build misc data: payeeId -> { total, items: [...], siteTotals: { siteId: total } }
        const miscData = {};
        miscs.forEach(m => {
            if (!miscData[m.PayeeId]) {
                miscData[m.PayeeId] = { total: 0, items: [], siteTotals: {} };
            }
            const amt = parseFloat(m.Amount || 0);
            miscData[m.PayeeId].total += amt;
            miscData[m.PayeeId].items.push({
                id: m.id,
                name: m.MiscName,
                amount: amt,
                siteId: m.SiteId
            });

            if (m.SiteId) {
                miscData[m.PayeeId].siteTotals[m.SiteId] = (miscData[m.PayeeId].siteTotals[m.SiteId] || 0) + amt;
            }
        });

        // Generate dates array for the week
        const dates = [];
        const start = new Date(sheet.WeekStartDate);
        const end = new Date(sheet.WeekEndDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            dates.push(d.toISOString().split('T')[0]);
        }

        res.json({
            id: sheet.id,
            Title: sheet.Title,
            WeekStartDate: sheet.WeekStartDate,
            WeekEndDate: sheet.WeekEndDate,
            Status: sheet.Status,
            CreatedAt: sheet.CreatedAt,
            payees,
            sites,
            grid,
            miscData,
            dates,
            selectedPayeeIds,
            selectedSiteIds
        });
    } catch (err) {
        console.error(err.message, err.stack);
        res.status(500).json({ msg: 'Server Error', error: err.message, stack: err.stack });
    }
});

// @route   DELETE /api/attendance-sheets/:id
// @desc    Delete sheet + all records + misc
router.delete('/:id', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const sheet = await AttendanceSheet.findByPk(req.params.id);
        if (!sheet) {
            await t.rollback();
            return res.status(404).json({ msg: 'Sheet not found' });
        }

        await AttendanceRecord.destroy({ where: { AttendanceSheetId: req.params.id }, transaction: t });
        await AttendanceMisc.destroy({ where: { AttendanceSheetId: req.params.id }, transaction: t });
        await sheet.destroy({ transaction: t });

        await t.commit();
        res.json({ msg: 'Sheet and all data removed' });
    } catch (err) {
        await t.rollback();
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// ============ SYNC PAYEES/SITES ============

// @route   POST /api/attendance-sheets/:id/sync-payees
router.post('/:id/sync-payees', async (req, res) => {
    const { payeeIds } = req.body;
    const t = await sequelize.transaction();
    try {
        const sheet = await AttendanceSheet.findByPk(req.params.id, { transaction: t });
        if (!sheet) {
            await t.rollback();
            return res.status(404).json({ msg: 'Sheet not found' });
        }

        const currentIds = (sheet.SelectedPayeeIds || []).map(id => parseInt(id));
        const requestedIds = (payeeIds || []).map(id => parseInt(id));
        const removedIds = currentIds.filter(id => !requestedIds.includes(id));

        await sheet.update({ SelectedPayeeIds: requestedIds }, { transaction: t });

        // Remove records and misc for removed payees
        for (const payeeId of removedIds) {
            await AttendanceRecord.destroy({
                where: { AttendanceSheetId: sheet.id, PayeeId: payeeId },
                transaction: t
            });
            await AttendanceMisc.destroy({
                where: { AttendanceSheetId: sheet.id, PayeeId: payeeId },
                transaction: t
            });
        }

        await t.commit();
        res.json({ msg: 'Payees synchronized successfully' });
    } catch (err) {
        if (t) await t.rollback();
        console.error('Sync Payees Error:', err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/attendance-sheets/:id/sync-sites
router.post('/:id/sync-sites', async (req, res) => {
    const { siteIds } = req.body;
    const t = await sequelize.transaction();
    try {
        const sheet = await AttendanceSheet.findByPk(req.params.id, { transaction: t });
        if (!sheet) {
            await t.rollback();
            return res.status(404).json({ msg: 'Sheet not found' });
        }

        const currentIds = (sheet.SelectedSiteIds || []).map(id => parseInt(id));
        const requestedIds = (siteIds || []).map(id => parseInt(id));
        const removedIds = currentIds.filter(id => !requestedIds.includes(id));

        await sheet.update({ SelectedSiteIds: requestedIds }, { transaction: t });

        // Remove records and misc for removed sites
        for (const siteId of removedIds) {
            await AttendanceRecord.destroy({
                where: { AttendanceSheetId: sheet.id, SiteId: siteId },
                transaction: t
            });
            await AttendanceMisc.destroy({
                where: { AttendanceSheetId: sheet.id, SiteId: siteId },
                transaction: t
            });
        }

        await t.commit();
        res.json({ msg: 'Sites synchronized successfully' });
    } catch (err) {
        if (t) await t.rollback();
        console.error('Sync Sites Error:', err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   DELETE /api/attendance-sheets/:id/payees/:payeeId
router.delete('/:id/payees/:payeeId', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const sheet = await AttendanceSheet.findByPk(req.params.id);
        if (!sheet) {
            await t.rollback();
            return res.status(404).json({ msg: 'Sheet not found' });
        }

        const payeeId = parseInt(req.params.payeeId);
        const updatedIds = (sheet.SelectedPayeeIds || []).filter(id => id != payeeId);
        await sheet.update({ SelectedPayeeIds: updatedIds }, { transaction: t });

        await AttendanceRecord.destroy({
            where: { AttendanceSheetId: sheet.id, PayeeId: payeeId },
            transaction: t
        });
        await AttendanceMisc.destroy({
            where: { AttendanceSheetId: sheet.id, PayeeId: payeeId },
            transaction: t
        });

        await t.commit();
        res.json({ msg: 'Payee and associated data removed' });
    } catch (err) {
        await t.rollback();
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   DELETE /api/attendance-sheets/:id/sites/:siteId
router.delete('/:id/sites/:siteId', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const sheet = await AttendanceSheet.findByPk(req.params.id);
        if (!sheet) {
            await t.rollback();
            return res.status(404).json({ msg: 'Sheet not found' });
        }

        const siteId = parseInt(req.params.siteId);
        const updatedIds = (sheet.SelectedSiteIds || []).filter(id => id != siteId);
        await sheet.update({ SelectedSiteIds: updatedIds }, { transaction: t });

        await AttendanceRecord.destroy({
            where: { AttendanceSheetId: sheet.id, SiteId: siteId },
            transaction: t
        });
        await AttendanceMisc.destroy({
            where: { AttendanceSheetId: sheet.id, SiteId: siteId },
            transaction: t
        });

        await t.commit();
        res.json({ msg: 'Site and associated records removed' });
    } catch (err) {
        await t.rollback();
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// ============ ATTENDANCE RECORDS ============

// @route   POST /api/attendance-sheets/:id/records
// @desc    Add a shift attendance record
router.post('/:id/records', async (req, res) => {
    const { PayeeId, SiteId, AttendanceDate, PersonType: personTypeName, ShiftType, ShiftMultiplier, LabourCount } = req.body;
    try {
        const sheet = await AttendanceSheet.findByPk(req.params.id);
        if (!sheet) return res.status(404).json({ msg: 'Sheet not found' });

        // Get rate from PersonType DailyRate
        const personTypeRecord = await PersonType.findOne({
            where: { Name: personTypeName || 'Mason' }
        });

        const dailyRate = personTypeRecord ? parseFloat(personTypeRecord.DailyRate) : 0;
        const rate = dailyRate * parseFloat(ShiftMultiplier);
        const calculatedAmount = parseInt(LabourCount) * rate;

        const record = await AttendanceRecord.create({
            AttendanceSheetId: parseInt(req.params.id),
            PayeeId: parseInt(PayeeId),
            SiteId: parseInt(SiteId),
            PersonType: personTypeName || 'Mason',
            AttendanceDate,
            ShiftType,
            ShiftMultiplier: parseFloat(ShiftMultiplier),
            LabourCount: parseInt(LabourCount),
            RatePerShift: rate,
            CalculatedAmount: calculatedAmount
        });

        await syncMiscAllowances(record.AttendanceSheetId, record.PayeeId, record.SiteId);

        res.json(record);
    } catch (err) {
        console.error('POST record error:', err);
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
});

// @route   PUT /api/attendance-sheets/:id/records/:recordId
// @desc    Update a shift attendance record
router.put('/:id/records/:recordId', async (req, res) => {
    const { PersonType: personTypeName, ShiftType, ShiftMultiplier, LabourCount } = req.body;
    try {
        const record = await AttendanceRecord.findByPk(req.params.recordId);
        if (!record) return res.status(404).json({ msg: 'Record not found' });

        // Get rate from PersonType DailyRate
        const personTypeRecord = await PersonType.findOne({
            where: { Name: personTypeName || record.PersonType }
        });

        const dailyRate = personTypeRecord ? parseFloat(personTypeRecord.DailyRate) : 0;
        const rate = dailyRate * parseFloat(ShiftMultiplier);
        const calculatedAmount = parseInt(LabourCount) * rate;

        await record.update({
            PersonType: personTypeName || record.PersonType,
            ShiftType,
            ShiftMultiplier: parseFloat(ShiftMultiplier),
            LabourCount: parseInt(LabourCount),
            RatePerShift: rate,
            CalculatedAmount: calculatedAmount
        });

        await syncMiscAllowances(record.AttendanceSheetId, record.PayeeId, record.SiteId);

        res.json(record);
    } catch (err) {
        console.error('PUT record error:', err);
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
});

// @route   DELETE /api/attendance-sheets/:id/records/:recordId
// @desc    Delete a single attendance record
router.delete('/:id/records/:recordId', async (req, res) => {
    try {
        const record = await AttendanceRecord.findByPk(req.params.recordId);
        if (!record) return res.status(404).json({ msg: 'Record not found' });

        const sheetId = record.AttendanceSheetId;
        const payeeId = record.PayeeId;
        const siteId = record.SiteId;

        await record.destroy();

        await syncMiscAllowances(sheetId, payeeId, siteId);

        res.json({ msg: 'Record removed' });
    } catch (err) {
        console.error('DELETE record error:', err);
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
});

// ============ MISC CHARGES ============

// @route   POST /api/attendance-sheets/:id/misc
// @desc    Add misc charge for a mason
router.post('/:id/misc', async (req, res) => {
        const { PayeeId, SiteId, MiscName, Amount } = req.body;
        try {
            const sheet = await AttendanceSheet.findByPk(req.params.id);
            if (!sheet) return res.status(404).json({ msg: 'Sheet not found' });
    
            const misc = await AttendanceMisc.create({
                AttendanceSheetId: parseInt(req.params.id),
                PayeeId: parseInt(PayeeId),
                SiteId: SiteId ? parseInt(SiteId) : null,
                MiscName,
                Amount: parseFloat(Amount) || 0
            });

        res.json(misc);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   DELETE /api/attendance-sheets/:id/misc/:miscId
// @desc    Delete a misc charge
router.delete('/:id/misc/:miscId', async (req, res) => {
    try {
        const misc = await AttendanceMisc.findByPk(req.params.miscId);
        if (!misc) return res.status(404).json({ msg: 'Misc item not found' });

        await misc.destroy();
        res.json({ msg: 'Misc item removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

async function syncMiscAllowances(sheetId, payeeId, siteId) {
    try {
        const { AttendanceRecord, AttendanceMisc } = require('../models');

        const records = await AttendanceRecord.findAll({
            where: { AttendanceSheetId: sheetId, PayeeId: payeeId, SiteId: siteId }
        });
        const weeklySiteLabourCount = records.reduce((sum, r) => sum + (r.LabourCount || 0), 0);

        const [rows] = await sequelize.query("SELECT * FROM master_settings WHERE SettingKey IN ('TeaExpense', 'BusExpense')");
        let teaRate = 20;
        let busRate = 50;
        rows.forEach(r => {
            if (r.SettingKey === 'TeaExpense') teaRate = parseFloat(r.SettingValue) || 20;
            if (r.SettingKey === 'BusExpense') busRate = parseFloat(r.SettingValue) || 50;
        });

        // Sync Tea Charges
        const teaMisc = await AttendanceMisc.findOne({
            where: { AttendanceSheetId: sheetId, PayeeId: payeeId, SiteId: siteId, MiscName: 'Tea Charges' }
        });
        if (teaMisc) {
            if (weeklySiteLabourCount === 0) {
                await teaMisc.destroy();
            } else {
                await teaMisc.update({ Amount: weeklySiteLabourCount * teaRate });
            }
        } else if (weeklySiteLabourCount > 0) {
            await AttendanceMisc.create({
                AttendanceSheetId: sheetId,
                PayeeId: payeeId,
                SiteId: siteId,
                MiscName: 'Tea Charges',
                Amount: weeklySiteLabourCount * teaRate
            });
        }

        // Sync Bus Charges
        const busMisc = await AttendanceMisc.findOne({
            where: { AttendanceSheetId: sheetId, PayeeId: payeeId, SiteId: siteId, MiscName: 'Bus Charges' }
        });
        if (busMisc) {
            if (weeklySiteLabourCount === 0) {
                await busMisc.destroy();
            } else {
                await busMisc.update({ Amount: weeklySiteLabourCount * busRate });
            }
        } else if (weeklySiteLabourCount > 0) {
            await AttendanceMisc.create({
                AttendanceSheetId: sheetId,
                PayeeId: payeeId,
                SiteId: siteId,
                MiscName: 'Bus Charges',
                Amount: weeklySiteLabourCount * busRate
            });
        }

        // Sync Mason Profit (if percentage-based)
        const allMiscs = await AttendanceMisc.findAll({
            where: { AttendanceSheetId: sheetId, PayeeId: payeeId, SiteId: siteId }
        });
        for (const m of allMiscs) {
            const match = m.MiscName.match(/Mason Profit \((\d+(\.\d+)?)\%\)/);
            if (match) {
                const percent = parseFloat(match[1]);
                if (!isNaN(percent)) {
                    const weeklySiteAttendance = records.reduce((sum, r) => sum + parseFloat(r.CalculatedAmount || 0), 0);
                    const newProfitAmount = (weeklySiteAttendance * percent) / 100;
                    await m.update({ Amount: newProfitAmount });
                }
            }
        }
    } catch (err) {
        console.error('syncMiscAllowances Error:', err);
    }
}

module.exports = router;
