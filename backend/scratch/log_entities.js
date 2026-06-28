const { ShiftMaster, PersonType, AttendanceSheet, Payee, Site, sequelize } = require('../models');

async function test() {
    try {
        await sequelize.authenticate();
        
        console.log('--- Shift Masters ---');
        const shifts = await ShiftMaster.findAll();
        console.log(shifts.map(s => s.toJSON()));

        console.log('--- Person Types ---');
        const pts = await PersonType.findAll();
        console.log(pts.map(p => p.toJSON()));

        console.log('--- Sheets ---');
        const sheets = await AttendanceSheet.findAll();
        console.log(sheets.map(s => s.toJSON()));

        console.log('--- Payees ---');
        const payees = await Payee.findAll();
        console.log(payees.map(p => p.toJSON()));

        console.log('--- Sites ---');
        const sites = await Site.findAll();
        console.log(sites.map(s => s.toJSON()));

    } catch (err) {
        console.error(err);
    } finally {
        await sequelize.close();
    }
}
test();
