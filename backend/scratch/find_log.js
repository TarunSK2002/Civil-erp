const fs = require('fs');
const path = require('path');

const appDataPath = 'C:\\Users\\murug\\AppData';

function findFile(dir, fileName) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const filePath = path.join(dir, file);
      let stat;
      try {
        stat = fs.statSync(filePath);
      } catch (e) {
        return; // Skip files that can't be read
      }
      
      if (stat && stat.isDirectory()) {
        if (file !== 'node_modules' && file !== 'Cache' && file !== 'Code Cache' && !file.startsWith('.')) {
          results = results.concat(findFile(filePath, fileName));
        }
      } else if (file === fileName) {
        results.push(filePath);
      }
    });
  } catch (err) {
    // Ignore read errors
  }
  return results;
}

console.log('Searching for backend.log in AppData...');
const matches = findFile(appDataPath, 'backend.log');
console.log('Matches found:');
matches.forEach(m => {
  const stat = fs.statSync(m);
  console.log(`- ${m} (Size: ${stat.size} bytes, Modified: ${stat.mtime})`);
});
