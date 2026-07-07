const fs = require('fs');
const path = require('path');

const appDataPath = 'C:\\Users\\murug\\AppData';

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
        if (file !== 'node_modules' && file !== 'Cache' && file !== 'Code Cache' && !file.startsWith('.')) {
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

console.log('Searching for any .sqlite or .db file in AppData...');
const matches = findSqliteFiles(appDataPath);
console.log('Matches found:');
matches.forEach(m => {
  const stat = fs.statSync(m);
  console.log(`- ${m} (Size: ${stat.size} bytes, Modified: ${stat.mtime})`);
});
