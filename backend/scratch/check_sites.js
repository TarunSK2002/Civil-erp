const { Site } = require('../models');
const { Op } = require('sequelize');

async function checkSites() {
    try {
        const activeSites = await Site.findAll({
            where: {
                Status: { [Op.in]: ['Upcoming', 'In Progress'] }
            }
        });
        console.log(`Found ${activeSites.length} active sites:`);
        activeSites.forEach(s => console.log(`- ${s.id}: ${s.SiteName} (${s.Status})`));
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}

checkSites();
