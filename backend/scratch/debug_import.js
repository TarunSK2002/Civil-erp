const { WeeklyPaySheet, WeeklyPaySheetItem, AttendanceSheet, AttendanceRecord, AttendanceMisc, Site, Payee, sequelize } = require('../models');
const { Op } = require('sequelize');

async function debugImport() {
    try {
        const weeklySheet = await WeeklyPaySheet.findOne({ order: [['id', 'DESC']] });
        if (!weeklySheet) {
            console.log('No weekly sheet found');
            return;
        }

        console.log('Testing Weekly Sheet:', weeklySheet.id, weeklySheet.Title, weeklySheet.WeekDate);
        const weekDate = new Date(weeklySheet.WeekDate);

        const attendanceSheet = await AttendanceSheet.findOne({
            where: {
                WeekStartDate: { [Op.lte]: weekDate },
                WeekEndDate: { [Op.gte]: weekDate }
            }
        });

        if (!attendanceSheet) {
            console.log('No matching attendance sheet found');
            return;
        }
        console.log('Found Attendance Sheet:', attendanceSheet.id, attendanceSheet.Title);

        const records = await AttendanceRecord.findAll({ where: { AttendanceSheetId: attendanceSheet.id } });
        const miscs = await AttendanceMisc.findAll({ where: { AttendanceSheetId: attendanceSheet.id } });

        console.log('Records count:', records.length);
        console.log('Miscs count:', miscs.length);

        const totals = {};
        records.forEach(r => {
            const key = `${r.PayeeId}_${r.SiteId}`;
            totals[key] = (totals[key] || 0) + parseFloat(r.CalculatedAmount || 0);
        });
        miscs.forEach(m => {
            if (m.SiteId) {
                const key = `${m.PayeeId}_${m.SiteId}`;
                totals[key] = (totals[key] || 0) + parseFloat(m.Amount || 0);
            }
        });

        console.log('Totals keys:', Object.keys(totals));

        for (const [key, amount] of Object.entries(totals)) {
            console.log('Processing key:', key, 'Amount:', amount);
            const [pIdStr, sIdStr] = key.split('_');
            const payeeId = parseInt(pIdStr);
            const siteId = sIdStr === 'null' ? null : parseInt(sIdStr);
            
            console.log(`Parsed IDs: PayeeId=${payeeId} (type ${typeof payeeId}), SiteId=${siteId} (type ${typeof siteId})`);

            let item = await WeeklyPaySheetItem.findOne({
                where: { WeeklyPaySheetId: weeklySheet.id, PayeeId: payeeId, SiteId: siteId }
            });

            if (item) {
                console.log(`FOUND ITEM ${item.id} - Updating...`);
            } else {
                console.log(`ITEM NOT FOUND - Creating... (SelectedPayees: ${JSON.stringify(weeklySheet.SelectedPayeeIds)}, SelectedSites: ${JSON.stringify(weeklySheet.SelectedSiteIds)})`);
            }
        }
        console.log('Debug finished successfully');

    } catch (err) {
        console.error('DEBUG ERROR:', err);
    } finally {
        process.exit();
    }
}

debugImport();
