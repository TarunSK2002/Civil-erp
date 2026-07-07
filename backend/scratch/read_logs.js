const fs = require('fs');
const path = require('path');

const paths = [
  'C:\\Users\\murug\\AppData\\Roaming\\app\\backend.log',
  'C:\\Users\\murug\\AppData\\Roaming\\jeeva-electron\\backend.log',
  'C:\\Users\\murug\\AppData\\Roaming\\Jeeva Cloud ERP\\backend.log'
];

paths.forEach(p => {
  if (fs.existsSync(p)) {
    console.log(`\n=== Reading Log: ${p} ===`);
    const logs = fs.readFileSync(p, 'utf8');
    // Print the last 50 lines of the log file
    const lines = logs.split('\n');
    const lastLines = lines.slice(-50).join('\n');
    console.log(lastLines);
  } else {
    console.log(`Log file not found: ${p}`);
  }
});
