const { Payee, Labour } = require('../models');

async function check() {
    try {
        const payees = await Payee.findAll();
        const labours = await Labour.findAll();
        
        console.log('Payees total:', payees.length);
        console.log('Labours total:', labours.length);
        
        console.log('Sample Payees:', payees.slice(0, 3).map(p => p.Name));
        console.log('Sample Labours:', labours.slice(0, 3).map(l => l.Name));
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
