const fs = require('fs');
const path = require('path');

const userDir = 'C:\\Users\\murug';

function findSqliteFiles(dir) {
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
        // Skip AppData since we already searched it, and other system/temp folders
        if (file !== 'AppData' && file !== 'node_modules' && !file.startsWith('.') && !file.startsWith('$')) {
          results = results.concat(findSqliteFiles(filePath));
        }
      } else if (file.endsWith('.sqlite') || file.endsWith('.db')) {
        results.push(filePath);
      }
    });
  } catch (err) {
    // Ignore read errors
  }
  return results;
}

console.log('Searching for any .sqlite or .db file in C:\\Users\\murug (excluding AppData)...');
const matches = findSqliteFiles(userDir);
console.log('Matches found:');
matches.forEach(m => {
  const stat = fs.statSync(m);
  console.log(`- ${m} (Size: ${stat.size} bytes, Modified: ${stat.mtime})`);
});
