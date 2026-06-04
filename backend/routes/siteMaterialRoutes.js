const express = require('express');
const router = express.Router();
const { SiteMaterial, Site, MaterialType } = require('../models');

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
    const { SiteId, MaterialId, Quantity, Unit, PurchaseDate, Amount, Discount, DealerName } = req.body;
    try {
        const newPurchase = await SiteMaterial.create({
            SiteId,
            MaterialId,
            Quantity,
            Unit,
            Amount: Amount || 0,
            Discount: Discount || 0,
            DealerName: DealerName || '',
            PurchaseDate: PurchaseDate || new Date()
        });
        res.json(newPurchase);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/site-materials/:id
// @desc    Update a material purchase record
router.put('/:id', async (req, res) => {
    const { SiteId, MaterialId, Quantity, Unit, PurchaseDate, Amount, Discount, DealerName } = req.body;
    try {
        const record = await SiteMaterial.findByPk(req.params.id);
        if (!record) return res.status(404).json({ msg: 'Record not found' });

        await record.update({
            SiteId,
            MaterialId,
            Quantity,
            Unit,
            Amount: Amount || 0,
            Discount: Discount !== undefined ? parseFloat(Discount) : parseFloat(record.Discount || 0),
            DealerName: DealerName || '',
            PurchaseDate: PurchaseDate || new Date()
        });
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

        await record.update({ Discount: discountVal });
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
