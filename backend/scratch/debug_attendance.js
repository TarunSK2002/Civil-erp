const { AttendanceSheet, AttendanceRecord, PersonType, sequelize } = require('../models');

async function test() {
    try {
        await sequelize.authenticate();
        console.log('Connected...');

        const sheetId = 2; // a valid sheet id
        const reqBody = {
            PayeeId: 1,
            SiteId: 1,
            AttendanceDate: '2026-05-19',
            PersonType: 'Mason',
            ShiftType: '1 Shift (1.0x)',
            ShiftMultiplier: 1.0,
            LabourCount: 2
        };

        const sheet = await AttendanceSheet.findByPk(sheetId);
        if (!sheet) {
            console.log('Sheet not found');
            return;
        }
        console.log('Sheet found:', sheet.id);

        console.log('Finding PersonType for Name:', reqBody.PersonType);
        const personTypeRecord = await PersonType.findOne({
            where: { Name: reqBody.PersonType || 'Mason' }
        });
        console.log('PersonType record:', personTypeRecord ? personTypeRecord.toJSON() : 'null');

        const dailyRate = personTypeRecord ? parseFloat(personTypeRecord.DailyRate) : 0;
        const rate = dailyRate * parseFloat(reqBody.ShiftMultiplier);
        console.log('Calculated rate:', rate);
        const calculatedAmount = parseInt(reqBody.LabourCount) * rate;
        console.log('Calculated Amount:', calculatedAmount);

        console.log('Creating AttendanceRecord...');
        const record = await AttendanceRecord.create({
            AttendanceSheetId: parseInt(sheetId),
            PayeeId: parseInt(reqBody.PayeeId),
            SiteId: parseInt(reqBody.SiteId),
            PersonType: reqBody.PersonType || 'Mason',
            AttendanceDate: reqBody.AttendanceDate,
            ShiftType: reqBody.ShiftType,
            ShiftMultiplier: parseFloat(reqBody.ShiftMultiplier),
            LabourCount: parseInt(reqBody.LabourCount),
            RatePerShift: rate,
            CalculatedAmount: calculatedAmount
        });
        console.log('Success! Created ID:', record.id);
        await record.destroy();
    } catch (err) {
        console.error('CRASHED WITH ERROR:', err);
    } finally {
        await sequelize.close();
    }
}
test();
