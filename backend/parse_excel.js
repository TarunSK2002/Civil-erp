// Detailed analysis of the Excel structure
const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'New Microsoft Office Excel Worksheet - Copy.xlsx');
const workbook = XLSX.readFile(filePath);

console.log('Total sheets:', workbook.SheetNames.length);
console.log('\nSheet names (last 10):');
workbook.SheetNames.slice(-10).forEach(n => console.log(`  "${n}"`));

// Analyze the latest sheet fully
const latestSheet = workbook.SheetNames[workbook.SheetNames.length - 1];
console.log('\n\n=== LATEST SHEET:', latestSheet, '===');
const sheet = workbook.Sheets[latestSheet];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

// Print ALL rows
console.log('\n--- ALL rows ---');
data.forEach((row, i) => {
  const nonEmpty = row.filter(c => c !== '');
  if (nonEmpty.length > 0) {
    console.log(`Row ${i}: ${JSON.stringify(row.slice(0, 17))}`);
  }
});

// Analyze header structure
console.log('\n\n=== HEADER ANALYSIS ===');
console.log('Row 0 (title):', JSON.stringify(data[0]?.slice(0, 17)));
console.log('Row 1 (headers):', JSON.stringify(data[1]?.slice(0, 17)));

// Analyze a populated sheet - pick one from middle
const midIdx = Math.floor(workbook.SheetNames.length / 2);
const midSheet = workbook.SheetNames[midIdx];
console.log('\n\n=== MID SHEET:', midSheet, '===');
const mData = XLSX.utils.sheet_to_json(workbook.Sheets[midSheet], { header: 1, defval: '' });
console.log('Row 1 (headers):', JSON.stringify(mData[1]?.slice(0, 17)));
mData.forEach((row, i) => {
  const nonEmpty = row.filter(c => c !== '');
  if (nonEmpty.length > 0 && i < 45) {
    console.log(`Row ${i}: ${JSON.stringify(row.slice(0, 17))}`);
  }
});

// Check the extra columns (R onwards) for a few sheets 
console.log('\n\n=== RIGHT-SIDE COLUMNS (R to Z) ===');
const lastData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[workbook.SheetNames.length - 2]], { header: 1, defval: '' });
lastData.slice(0, 45).forEach((row, i) => {
  const rightCols = row.slice(17);
  const nonEmpty = rightCols.filter(c => c !== '');
  if (nonEmpty.length > 0) {
    console.log(`Row ${i}: rightCols=${JSON.stringify(rightCols)}`);
  }
});
