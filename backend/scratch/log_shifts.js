const { ShiftMaster, PersonType, sequelize } = require('../models');

async function test() {
    try {
        await sequelize.authenticate();
        
        console.log('--- Shift Masters ---');
        const shifts = await ShiftMaster.findAll();
        console.log(shifts.map(s => s.toJSON()));

        console.log('--- Person Types ---');
        const pts = await PersonType.findAll();
        console.log(pts.map(p => p.toJSON()));

    } catch (err) {
        console.error(err);
    } finally {
        await sequelize.close();
    }
}
test();
