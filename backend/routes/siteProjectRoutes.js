const express = require('express');
const router = express.Router();
const { SiteProject } = require('../models');

// @route   GET /api/site-projects/site/:siteId
// @desc    Get all projects for a specific site
router.get('/site/:siteId', async (req, res) => {
    try {
        const projects = await SiteProject.findAll({
            where: { SiteId: req.params.siteId },
            order: [['StartDate', 'DESC'], ['ProjectName', 'ASC']]
        });
        res.json(projects);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/site-projects
// @desc    Create a new site project
router.post('/', async (req, res) => {
    const { SiteId, ProjectName, WorkType, StartDate, EndDate, Status, QuotedValue, Notes } = req.body;
    try {
        if (!SiteId) return res.status(400).json({ msg: 'SiteId is required' });
        if (!ProjectName || !ProjectName.trim()) return res.status(400).json({ msg: 'ProjectName is required' });

        const project = await SiteProject.create({
            SiteId,
            ProjectName: ProjectName.trim(),
            WorkType: WorkType ? WorkType.trim() : 'New Construction',
            StartDate: StartDate || null,
            EndDate: EndDate || null,
            Status: Status || 'In Progress',
            QuotedValue: QuotedValue !== undefined ? parseFloat(QuotedValue) : 0,
            Notes: Notes || null
        });
        res.json(project);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   PUT /api/site-projects/:id
// @desc    Update a site project
router.put('/:id', async (req, res) => {
    const { ProjectName, WorkType, StartDate, EndDate, Status, QuotedValue, Notes } = req.body;
    try {
        const project = await SiteProject.findByPk(req.params.id);
        if (!project) return res.status(404).json({ msg: 'Project not found' });

        const updates = {};
        if (ProjectName !== undefined) updates.ProjectName = ProjectName.trim();
        if (WorkType !== undefined) updates.WorkType = WorkType.trim();
        if (StartDate !== undefined) updates.StartDate = StartDate || null;
        if (EndDate !== undefined) updates.EndDate = EndDate || null;
        if (Status !== undefined) updates.Status = Status;
        if (QuotedValue !== undefined) updates.QuotedValue = parseFloat(QuotedValue) || 0;
        if (Notes !== undefined) updates.Notes = Notes;

        await project.update(updates);
        res.json(project);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   DELETE /api/site-projects/:id
// @desc    Delete a site project
router.delete('/:id', async (req, res) => {
    try {
        const project = await SiteProject.findByPk(req.params.id);
        if (!project) return res.status(404).json({ msg: 'Project not found' });

        await project.destroy();
        res.json({ msg: 'Project removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;
