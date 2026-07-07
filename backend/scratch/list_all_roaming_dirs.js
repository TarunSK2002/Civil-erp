const fs = require('fs');
const path = require('path');

const roamingPath = 'C:\\Users\\murug\\AppData\\Roaming';
console.log('Listing directories in Roaming...');

try {
  const files = fs.readdirSync(roamingPath);
  files.forEach(file => {
    const p = path.join(roamingPath, file);
    try {
      const stat = fs.statSync(p);
      if (stat.isDirectory()) {
        const lowerName = file.toLowerCase();
        if (lowerName.includes('jeeva') || lowerName.includes('erp') || lowerName.includes('construction') || lowerName === 'app' || lowerName.includes('electron')) {
          console.log(`- ${file} (Modified: ${stat.mtime})`);
        }
      }
    } catch (e) {
      // Ignore
    }
  });
} catch (err) {
  console.error(err);
}
