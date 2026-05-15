// Temporary script to parse the Excel file
const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'New Microsoft Office Excel Worksheet - Copy.xlsx');
const workbook = XLSX.readFile(filePath);

console.log('=== SHEET NAMES ===');
console.log(workbook.SheetNames);

workbook.SheetNames.forEach((name, idx) => {
  console.log(`\n\n=== SHEET ${idx}: "${name}" ===`);
  const sheet = workbook.Sheets[name];
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  console.log(`Range: ${sheet['!ref']}`);
  console.log(`Rows: ${range.e.r - range.s.r + 1}, Cols: ${range.e.c - range.s.c + 1}`);
  
  // Print first 30 rows as JSON
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  console.log('\n--- First 30 rows ---');
  data.slice(0, 30).forEach((row, i) => {
    // Only print non-empty rows
    const nonEmpty = row.filter(c => c !== '');
    if (nonEmpty.length > 0) {
      console.log(`Row ${i}: ${JSON.stringify(row)}`);
    }
  });
  
  // Print merged cells
  if (sheet['!merges']) {
    console.log(`\n--- Merged cells: ${sheet['!merges'].length} ---`);
    sheet['!merges'].slice(0, 20).forEach(m => {
      console.log(`  ${XLSX.utils.encode_range(m)}`);
    });
  }
});
