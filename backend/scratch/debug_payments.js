const { Payment, Labour, Material, Payee, WeeklyPaySheetItem } = require('../models');

async function debug() {
    try {
        const payments = await Payment.findAll({
            limit: 5,
            include: [
                { model: Labour, as: 'Labour', attributes: ['Name'] },
                { model: Material, as: 'Material', attributes: ['Name'] },
                { model: Payee, as: 'Payee', attributes: ['Name'] },
                { 
                    model: WeeklyPaySheetItem, 
                    as: 'SheetItem', 
                    include: [{ model: Payee, as: 'Payee', attributes: ['Name'] }] 
                }
            ],
            order: [['id', 'DESC']]
        });
        
        console.log(JSON.stringify(payments, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debug();
