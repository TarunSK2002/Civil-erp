const express = require('express');
const router = express.Router();
const { SiteMaterial, Site, MaterialType, Payee, ActionLog, WeeklyPaySheet, sequelize } = require('../models');
const { Op } = require('sequelize');

// Helper to check/create dealer payee
async function ensureDealerPayee(dealerName) {
    if (!dealerName || !dealerName.trim()) return;
    const name = dealerName.trim();
    // Search case-insensitively
    const payee = await Payee.findOne({
        where: sequelize.where(sequelize.fn('lower', sequelize.col('Name')), name.toLowerCase())
    });
    if (!payee) {
        await Payee.create({
            Name: name,
            Type: 'Supplier'
        });
        console.log(`Auto-created Supplier Payee: ${name}`);
    }
}

// Helper to calculate amounts based on calculation mode
function calculateMaterialAmount(body) {
    const { CalculationMode, Length, Breadth, WastagePercent, RatePerUnit, Quantity, Amount } = body;
    let finalSqFt = null;
    let finalAmount = parseFloat(Amount || 0);

    if (CalculationMode === 'SqFtRate') {
        const len = parseFloat(Length || 0);
        const brd = parseFloat(Breadth || 0);
        const rate = parseFloat(RatePerUnit || 0);
        const wastage = parseFloat(WastagePercent || 0);
        
        finalSqFt = len * brd;
        const billableSqFt = finalSqFt * (1 + wastage / 100);
        const calculatedAmount = billableSqFt * rate;
        
        if (finalAmount <= 0) {
            finalAmount = calculatedAmount;
        }
    } else if (CalculationMode === 'QuantityRate') {
        const qty = parseFloat(Quantity || 0);
        const rate = parseFloat(RatePerUnit || 0);
        const calculatedAmount = qty * rate;
        
        if (finalAmount <= 0) {
            finalAmount = calculatedAmount;
        }
    }
    
    return {
        SqFt: finalSqFt,
        Amount: finalAmount
    };
}

// @route   GET api/site-materials
// @desc    Get all site material purchases (with details)
router.get('/', async (req, res) => {
    try {
        const purchases = await SiteMaterial.findAll({
            include: [
                { model: Site, as: 'Site', attributes: ['SiteName'] },
                { model: MaterialType, as: 'Material', attributes: ['Name'] }
            ],
            order: [['PurchaseDate', 'DESC']]
        });
        res.json(purchases);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/site-materials
// @desc    Add a material purchase for a site
router.post('/', async (req, res) => {
    const { 
        SiteId, MaterialId, Quantity, Unit, PurchaseDate, Amount, Discount, DealerName,
        Length, Breadth, WastagePercent, RatePerUnit, CalculationMode, SectionId, ProjectId
    } = req.body;

    try {
        // Auto-calculate amount if needed
        const calc = calculateMaterialAmount(req.body);

        const newPurchase = await SiteMaterial.create({
            SiteId,
            MaterialId,
            Quantity,
            Unit,
            Amount: calc.Amount,
            Discount: Discount || 0,
            DealerName: DealerName || '',
            PurchaseDate: PurchaseDate || new Date(),
            Length: Length !== undefined ? parseFloat(Length) : null,
            Breadth: Breadth !== undefined ? parseFloat(Breadth) : null,
            SqFt: calc.SqFt,
            WastagePercent: WastagePercent !== undefined ? parseFloat(WastagePercent) : 0,
            RatePerUnit: RatePerUnit !== undefined ? parseFloat(RatePerUnit) : 0,
            CalculationMode: CalculationMode || 'Manual',
            SectionId: SectionId || null,
            ProjectId: ProjectId || null
        });

        // Ensure dealer is registered as payee
        if (DealerName) {
            await ensureDealerPayee(DealerName);
        }

        res.json(newPurchase);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/site-materials/:id
// @desc    Update a material purchase record
router.put('/:id', async (req, res) => {
    const { 
        SiteId, MaterialId, Quantity, Unit, PurchaseDate, Amount, Discount, DealerName,
        Length, Breadth, WastagePercent, RatePerUnit, CalculationMode, SectionId, ProjectId
    } = req.body;

    try {
        const record = await SiteMaterial.findByPk(req.params.id);
        if (!record) return res.status(404).json({ msg: 'Record not found' });

        // Auto-calculate amount if needed
        const calc = calculateMaterialAmount(req.body);

        await record.update({
            SiteId,
            MaterialId,
            Quantity,
            Unit,
            Amount: calc.Amount,
            Discount: Discount !== undefined ? parseFloat(Discount) : parseFloat(record.Discount || 0),
            DealerName: DealerName || '',
            PurchaseDate: PurchaseDate || new Date(),
            Length: Length !== undefined ? parseFloat(Length) : null,
            Breadth: Breadth !== undefined ? parseFloat(Breadth) : null,
            SqFt: calc.SqFt,
            WastagePercent: WastagePercent !== undefined ? parseFloat(WastagePercent) : 0,
            RatePerUnit: RatePerUnit !== undefined ? parseFloat(RatePerUnit) : 0,
            CalculationMode: CalculationMode || 'Manual',
            SectionId: SectionId || null,
            ProjectId: ProjectId || null
        });

        // Ensure dealer is registered as payee
        if (DealerName) {
            await ensureDealerPayee(DealerName);
        }

        res.json(record);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PATCH api/site-materials/:id/discount
// @desc    Update only the Discount field (called from Weekly Pay Sheet popup at payment time)
router.patch('/:id/discount', async (req, res) => {
    const { Discount } = req.body;
    try {
        const record = await SiteMaterial.findByPk(req.params.id);
        if (!record) return res.status(404).json({ msg: 'Record not found' });

        const discountVal = parseFloat(Discount) || 0;
        if (discountVal < 0) return res.status(400).json({ msg: 'Discount cannot be negative' });
        if (discountVal > parseFloat(record.Amount)) {
            return res.status(400).json({ msg: 'Discount cannot exceed the billed amount' });
        }

        const beforeDiscount = parseFloat(record.Discount || 0);
        await record.update({ Discount: discountVal });

        // Log DiscountChange in ActionLog if this purchase belongs to an active sheet
        const sheet = await WeeklyPaySheet.findOne({
            where: {
                WeekDate: { [Op.gte]: record.PurchaseDate }
            },
            order: [['WeekDate', 'ASC']]
        });

        if (sheet) {
            const weekEndDate = new Date(sheet.WeekDate);
            const weekStartDate = new Date(weekEndDate);
            weekStartDate.setDate(weekEndDate.getDate() - 6);
            weekStartDate.setHours(0, 0, 0, 0);
            weekEndDate.setHours(23, 59, 59, 999);

            const pDate = new Date(record.PurchaseDate);
            if (pDate >= weekStartDate && pDate <= weekEndDate) {
                await ActionLog.create({
                    WeeklyPaySheetId: sheet.id,
                    ActionType: 'DiscountChange',
                    EntityType: 'SiteMaterial',
                    EntityId: record.id,
                    BeforeData: { Discount: beforeDiscount },
                    AfterData: { Discount: discountVal }
                });
            }
        }

        res.json({
            id: record.id,
            Amount: parseFloat(record.Amount),
            Discount: discountVal,
            NetAmount: parseFloat(record.Amount) - discountVal
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   DELETE api/site-materials/:id
// @desc    Remove a material purchase record
router.delete('/:id', async (req, res) => {
    try {
        const record = await SiteMaterial.findByPk(req.params.id);
        if (!record) return res.status(404).json({ msg: 'Record not found' });

        await record.destroy();
        res.json({ msg: 'Record removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
