const { Payment, WeeklyPaySheetItem } = require('./models');

async function fix() {
    try {
        const items = await WeeklyPaySheetItem.findAll({
            where: { PaymentStatus: 'Paid' }
        });
        
        let count = 0;
        for (const item of items) {
            if (item.PaymentId && item.PayeeId) {
                const payment = await Payment.findByPk(item.PaymentId);
                if (payment && !payment.PayeeId) {
                    await payment.update({ PayeeId: item.PayeeId });
                    count++;
                }
            }
        }
        console.log(`Fixed ${count} orphaned payments.`);
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}

fix();
