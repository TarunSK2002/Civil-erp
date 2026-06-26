const express = require('express');
const router = express.Router();
const { SiteSection } = require('../models');

// @route   GET /api/site-sections/site/:siteId
// @desc    Get all sections for a specific site
router.get('/site/:siteId', async (req, res) => {
    try {
        const sections = await SiteSection.findAll({
            where: { SiteId: req.params.siteId },
            order: [['SortOrder', 'ASC'], ['Name', 'ASC']]
        });
        res.json(sections);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/site-sections
// @desc    Create a new site section
router.post('/', async (req, res) => {
    const { SiteId, Name, SortOrder, Length, Breadth, Height, Area, SectionValue, RatePerSqFt } = req.body;
    try {
        if (!SiteId) return res.status(400).json({ msg: 'SiteId is required' });
        if (!Name || !Name.trim()) return res.status(400).json({ msg: 'Name is required' });

        const maxOrder = await SiteSection.max('SortOrder', { where: { SiteId } }) || 0;

        const section = await SiteSection.create({
            SiteId,
            Name: Name.trim(),
            SortOrder: SortOrder !== undefined ? parseInt(SortOrder) : maxOrder + 1,
            Length: Length ? parseFloat(Length) : null,
            Breadth: Breadth ? parseFloat(Breadth) : null,
            Height: Height ? parseFloat(Height) : null,
            Area: Area ? parseFloat(Area) : null,
            SectionValue: SectionValue ? parseFloat(SectionValue) : 0,
            RatePerSqFt: RatePerSqFt ? parseFloat(RatePerSqFt) : null
        });
        res.json(section);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   PUT /api/site-sections/:id
// @desc    Update a site section
router.put('/:id', async (req, res) => {
    const { Name, SortOrder, Length, Breadth, Height, Area, SectionValue, RatePerSqFt } = req.body;
    try {
        const section = await SiteSection.findByPk(req.params.id);
        if (!section) return res.status(404).json({ msg: 'Section not found' });

        const updates = {};
        if (Name !== undefined) updates.Name = Name.trim();
        if (SortOrder !== undefined) updates.SortOrder = parseInt(SortOrder);
        
        updates.Length = Length !== undefined && Length !== '' ? parseFloat(Length) : null;
        updates.Breadth = Breadth !== undefined && Breadth !== '' ? parseFloat(Breadth) : null;
        updates.Height = Height !== undefined && Height !== '' ? parseFloat(Height) : null;
        updates.Area = Area !== undefined && Area !== '' ? parseFloat(Area) : null;
        updates.SectionValue = SectionValue !== undefined && SectionValue !== '' ? parseFloat(SectionValue) : 0;
        updates.RatePerSqFt = RatePerSqFt !== undefined && RatePerSqFt !== '' ? parseFloat(RatePerSqFt) : null;

        await section.update(updates);
        res.json(section);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   DELETE /api/site-sections/:id
// @desc    Delete a site section
router.delete('/:id', async (req, res) => {
    try {
        const section = await SiteSection.findByPk(req.params.id);
        if (!section) return res.status(404).json({ msg: 'Section not found' });

        await section.destroy();
        res.json({ msg: 'Section removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;
