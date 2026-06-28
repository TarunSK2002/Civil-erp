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
        const sheet = await AttendanceSheet.create({
            Title,
            WeekStartDate,
            WeekEndDate,
            SelectedSiteIds: [],
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
                calculationMode: rec.CalculationMode || 'Shift',
                shiftType: rec.ShiftType,
                shiftMultiplier: rec.ShiftMultiplier ? parseFloat(rec.ShiftMultiplier) : null,
                labourCount: rec.LabourCount,
                ratePerShift: rec.RatePerShift ? parseFloat(rec.RatePerShift) : null,
                calculatedAmount: parseFloat(rec.CalculatedAmount),
                length: rec.Length ? parseFloat(rec.Length) : null,
                breadth: rec.Breadth ? parseFloat(rec.Breadth) : null,
                sqFt: rec.SqFt ? parseFloat(rec.SqFt) : null,
                ratePerSqFt: rec.RatePerSqFt ? parseFloat(rec.RatePerSqFt) : null,
                sectionId: rec.SectionId
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

        // Fetch all lifting records for this sheet
        const { LiftingRecord } = require('../models');
        const liftingRecords = await LiftingRecord.findAll({
            where: { AttendanceSheetId: sheet.id },
            order: [['LiftingDate', 'ASC'], ['CreatedAt', 'ASC']]
        });

        // Add lifting records to grid totals
        liftingRecords.forEach(l => {
            const key = `${l.PayeeId}_${l.SiteId}`;
            if (!grid[key]) {
                grid[key] = { totalAmount: 0, records: [] };
            }
            grid[key].totalAmount += parseFloat(l.Amount || 0);
        });

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
            selectedSiteIds,
            liftingRecords
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
// @desc    Add a shift or sqft attendance record
router.post('/:id/records', async (req, res) => {
    const { PayeeId, SiteId, AttendanceDate, PersonType: personTypeName, CalculationMode, ShiftType, ShiftMultiplier, LabourCount, SectionId, Length, Breadth, RatePerSqFt } = req.body;
    try {
        const sheet = await AttendanceSheet.findByPk(req.params.id);
        if (!sheet) return res.status(404).json({ msg: 'Sheet not found' });

        let calculatedAmount = 0;
        let rate = 0;
        let calculatedSqFt = null;

        const mode = CalculationMode || 'Shift';

        if (mode === 'Shift') {
            const personTypeRecord = await PersonType.findOne({
                where: { Name: personTypeName || 'Mason' }
            });
            const dailyRate = personTypeRecord ? parseFloat(personTypeRecord.DailyRate) : 0;
            rate = dailyRate * parseFloat(ShiftMultiplier || 1);
            calculatedAmount = parseInt(LabourCount || 1) * rate;
        } else {
            // SqFt Calculation
            if (Length && Breadth) {
                calculatedSqFt = parseFloat(Length) * parseFloat(Breadth);
            }
            const rateSqFt = parseFloat(RatePerSqFt || 0);
            const count = parseInt(LabourCount || 1);
            calculatedAmount = (calculatedSqFt !== null ? calculatedSqFt : 1) * rateSqFt * count;
        }

        const record = await AttendanceRecord.create({
            AttendanceSheetId: parseInt(req.params.id),
            PayeeId: parseInt(PayeeId),
            SiteId: parseInt(SiteId),
            PersonType: personTypeName || 'Mason',
            AttendanceDate,
            CalculationMode: mode,
            ShiftType: mode === 'Shift' ? ShiftType : null,
            ShiftMultiplier: mode === 'Shift' ? parseFloat(ShiftMultiplier) : null,
            LabourCount: parseInt(LabourCount || 1),
            RatePerShift: mode === 'Shift' ? rate : null,
            Length: mode === 'SqFt' && Length ? parseFloat(Length) : null,
            Breadth: mode === 'SqFt' && Breadth ? parseFloat(Breadth) : null,
            SqFt: mode === 'SqFt' ? calculatedSqFt : null,
            RatePerSqFt: mode === 'SqFt' ? parseFloat(RatePerSqFt) : null,
            SectionId: mode === 'SqFt' && SectionId ? parseInt(SectionId) : null,
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
// @desc    Update a shift or sqft attendance record
router.put('/:id/records/:recordId', async (req, res) => {
    const { PersonType: personTypeName, CalculationMode, ShiftType, ShiftMultiplier, LabourCount, SectionId, Length, Breadth, RatePerSqFt } = req.body;
    try {
        const record = await AttendanceRecord.findByPk(req.params.recordId);
        if (!record) return res.status(404).json({ msg: 'Record not found' });

        const mode = CalculationMode || record.CalculationMode || 'Shift';
        let calculatedAmount = 0;
        let rate = 0;
        let calculatedSqFt = null;

        if (mode === 'Shift') {
            const personTypeRecord = await PersonType.findOne({
                where: { Name: personTypeName || record.PersonType }
            });
            const dailyRate = personTypeRecord ? parseFloat(personTypeRecord.DailyRate) : 0;
            rate = dailyRate * parseFloat(ShiftMultiplier !== undefined ? ShiftMultiplier : record.ShiftMultiplier);
            calculatedAmount = parseInt(LabourCount !== undefined ? LabourCount : record.LabourCount) * rate;
        } else {
            const finalLength = Length !== undefined ? Length : record.Length;
            const finalBreadth = Breadth !== undefined ? Breadth : record.Breadth;
            if (finalLength && finalBreadth) {
                calculatedSqFt = parseFloat(finalLength) * parseFloat(finalBreadth);
            }
            const rateSqFt = parseFloat(RatePerSqFt !== undefined ? RatePerSqFt : record.RatePerSqFt || 0);
            const count = parseInt(LabourCount !== undefined ? LabourCount : record.LabourCount || 1);
            calculatedAmount = (calculatedSqFt !== null ? calculatedSqFt : 1) * rateSqFt * count;
        }

        const updates = {
            PersonType: personTypeName || record.PersonType,
            CalculationMode: mode,
            LabourCount: parseInt(LabourCount !== undefined ? LabourCount : record.LabourCount),
            CalculatedAmount: calculatedAmount
        };

        if (mode === 'Shift') {
            updates.ShiftType = ShiftType !== undefined ? ShiftType : record.ShiftType;
            updates.ShiftMultiplier = ShiftMultiplier !== undefined ? parseFloat(ShiftMultiplier) : record.ShiftMultiplier;
            updates.RatePerShift = rate;
            updates.Length = null;
            updates.Breadth = null;
            updates.SqFt = null;
            updates.RatePerSqFt = null;
            updates.SectionId = null;
        } else {
            updates.ShiftType = null;
            updates.ShiftMultiplier = null;
            updates.RatePerShift = null;
            updates.Length = Length !== undefined && Length !== '' ? parseFloat(Length) : null;
            updates.Breadth = Breadth !== undefined && Breadth !== '' ? parseFloat(Breadth) : null;
            updates.SqFt = calculatedSqFt;
            updates.RatePerSqFt = RatePerSqFt !== undefined && RatePerSqFt !== '' ? parseFloat(RatePerSqFt) : null;
            updates.SectionId = SectionId !== undefined && SectionId !== '' ? parseInt(SectionId) : null;
        }

        await record.update(updates);

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

// ============ MATERIAL LIFTING ============

// @route   GET /api/attendance-sheets/lifting/rates
// @desc    Get all lifting rates
router.get('/lifting/rates', async (req, res) => {
    try {
        const { LiftingChargeRate } = require('../models');
        const rates = await LiftingChargeRate.findAll({
            order: [['MaterialType', 'ASC'], ['Floor', 'ASC']]
        });
        res.json(rates);
    } catch (err) {
        console.error('GET lifting rates error:', err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/attendance-sheets/lifting/rates
// @desc    Update or create a lifting rate
router.post('/lifting/rates', async (req, res) => {
    const { MaterialType, Floor, Rate } = req.body;
    try {
        const { LiftingChargeRate } = require('../models');
        let rateRecord = await LiftingChargeRate.findOne({
            where: { MaterialType, Floor }
        });

        if (rateRecord) {
            await rateRecord.update({ Rate: parseFloat(Rate) });
        } else {
            rateRecord = await LiftingChargeRate.create({
                MaterialType,
                Floor,
                Rate: parseFloat(Rate)
            });
        }
        res.json(rateRecord);
    } catch (err) {
        console.error('POST lifting rates error:', err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   GET /api/attendance-sheets/:id/lifting-records
// @desc    Get lifting records for an attendance sheet
router.get('/:id/lifting-records', async (req, res) => {
    try {
        const { LiftingRecord, Payee, Site } = require('../models');
        const records = await LiftingRecord.findAll({
            where: { AttendanceSheetId: req.params.id },
            include: [
                { model: Payee, as: 'Payee', attributes: ['id', 'Name'] },
                { model: Site, as: 'Site', attributes: ['id', 'SiteName'] }
            ],
            order: [['LiftingDate', 'ASC'], ['CreatedAt', 'ASC']]
        });
        res.json(records);
    } catch (err) {
        console.error('GET lifting records error:', err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/attendance-sheets/:id/lifting-records
// @desc    Create a new lifting record
router.post('/:id/lifting-records', async (req, res) => {
    const { PayeeId, SiteId, MaterialType, Floor, Quantity, Rate, LiftingDate } = req.body;
    try {
        const { LiftingRecord } = require('../models');
        const amount = parseFloat(Quantity || 1) * parseFloat(Rate || 0);

        const record = await LiftingRecord.create({
            AttendanceSheetId: parseInt(req.params.id),
            PayeeId: parseInt(PayeeId),
            SiteId: parseInt(SiteId),
            MaterialType,
            Floor,
            Quantity: parseFloat(Quantity),
            Rate: parseFloat(Rate),
            Amount: amount,
            LiftingDate
        });
        res.json(record);
    } catch (err) {
        console.error('POST lifting record error:', err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   DELETE /api/attendance-sheets/:id/lifting-records/:liftingId
// @desc    Delete a lifting record
router.delete('/:id/lifting-records/:liftingId', async (req, res) => {
    try {
        const { LiftingRecord } = require('../models');
        const record = await LiftingRecord.findByPk(req.params.liftingId);
        if (!record) return res.status(404).json({ msg: 'Lifting record not found' });

        await record.destroy();
        res.json({ msg: 'Lifting record removed' });
    } catch (err) {
        console.error('DELETE lifting record error:', err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;
