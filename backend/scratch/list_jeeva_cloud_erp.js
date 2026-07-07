const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\murug\\AppData\\Roaming\\Jeeva Cloud ERP';
console.log(`\n=== Files in: ${dir} ===`);
try {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const p = path.join(dir, file);
    const stat = fs.statSync(p);
    if (stat.isFile()) {
      console.log(`- ${file} (Size: ${stat.size} bytes, Modified: ${stat.mtime})`);
    } else {
      console.log(`- [DIR] ${file}`);
    }
  });
} catch (e) {
  console.error(`Error reading ${dir}:`, e.message);
}
