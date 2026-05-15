const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const workbookPath = path.resolve(__dirname, '..', '..', 'tarun.xlsx');
const outputDir = path.resolve(__dirname, '..', '..', 'generated');
const sqlOutputPath = path.join(outputDir, 'jeeva_excel_full_import.sql');
const summaryOutputPath = path.join(outputDir, 'jeeva_excel_full_import_summary.json');

const IGNORE_ROW_NAMES = new Set([
  'LABOUR',
  'TOTAL',
  'GRAND TOTAL',
  'GRANT TOTAL',
  'FILL GPAY FIRST',
]);

const HOLDING_SITE = 'Holding / Cash';
const IMPORT_CLIENT_MOBILE = 'EXCEL_IMPORT';

function cleanText(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

function keyText(value) {
  return cleanText(value).toUpperCase();
}

function normalKey(value) {
  return keyText(value).replace(/[^A-Z0-9]/g, '');
}

function sqlString(value) {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
}

function sqlDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/,/g, '').trim();
    if (!cleaned) return null;
    const number = Number(cleaned);
    return Number.isFinite(number) ? number : null;
  }
  return null;
}

function parseDateText(text) {
  const cleaned = cleanText(text).replace(/\s*\(\d+\)\s*$/, '');
  const match = cleaned.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  let year = Number(match[3]);
  if (year < 100) year += 2000;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function isIgnoredHeader(value) {
  const text = keyText(value);
  if (!text) return true;
  if (parseNumber(text) !== null) return true;
  return ['LABOUR', 'TOTAL', 'AMOUNT', 'CLIENT', 'FILL GPAY FIRST'].includes(text);
}

function isIgnoredPayeeName(name) {
  const key = keyText(name);
  if (!key || IGNORE_ROW_NAMES.has(key)) return true;
  if (/^(GRAND|GRANT)?\s*TOTAL\b/.test(key)) return true;
  if (/\bTOTAL\b/.test(key)) return true;
  return false;
}

function findHeaderRow(rows) {
  const searchLimit = Math.min(rows.length, 10);
  for (let r = 0; r < searchLimit; r += 1) {
    for (let c = 0; c < (rows[r] || []).length; c += 1) {
      if (keyText(rows[r][c]) === 'LABOUR') return { rowIndex: r, labourCol: c };
    }
  }
  return null;
}

const materialRules = [
  [/CEMENT/, 'Cement'],
  [/\bM\s*SAND\b|\bMSAND\b|\bSAND\b/, 'M Sand'],
  [/BRICK|BRICKS|BLOCK|FLYASH|HOLLOW/, 'Bricks / Blocks'],
  [/STEEL|ROD|TMT/, 'Steel'],
  [/PAINT(?!ER)|PAINTS/, 'Paint'],
  [/TILE|TILES/, 'Tiles'],
  [/TIMBER|WOOD|PLYWOOD|SAW MILL/, 'Wood / Plywood'],
  [/GLASS/, 'Glass'],
  [/ALUMINIUM|ALUMINUM/, 'Aluminium'],
  [/PVC|UPVC|PIPE/, 'PVC / Plumbing'],
  [/WIRE|ELECTRICAL/, 'Electrical Material'],
  [/GRAVEL|JALLY|JELLY|METAL|BLUE/, 'Aggregate / Metal'],
  [/CONCRETE|READYMIX|REDIMIX|RMC/, 'Concrete / Readymix'],
  [/SHEET/, 'Sheet Material'],
  [/DOOR|LOCK|HINGE/, 'Door / Hardware'],
];

const contractorWords = [
  'CENTERING',
  'CENTRING',
  'CONTRACT',
  'MESTHRI',
  'MASTHIRI',
  'MASONS',
  'GRILL WORK',
  'ELECTRICIAN',
  'PAINTER',
  'DRIVER',
  'BREAKER',
  'SCAFFOLDING',
  'TILES WORK',
];

function parseMaterial(name) {
  const original = cleanText(name);
  const upper = keyText(original);
  let materialName = null;
  for (const [pattern, label] of materialRules) {
    if (pattern.test(upper)) {
      materialName = label;
      break;
    }
  }
  if (!materialName) return null;

  const qtyMatch = original.match(/(\d+(?:\.\d+)?)\s*(unit|units|bag|bags|load|loads|trip|trips|cft|sq\.?\s*ft|sqft|feet|ft|mm)\b/i);
  const quantity = qtyMatch ? Number(qtyMatch[1]) : 1;
  const unit = qtyMatch ? qtyMatch[2].replace(/\s+/g, '').toUpperCase() : 'Old Record';

  return {
    materialName,
    quantity: Number.isFinite(quantity) ? quantity : 1,
    unit,
    dealerName: original,
  };
}

function classifyPayee(name) {
  const upper = keyText(name);
  const material = parseMaterial(name);
  if (material) {
    if (/PAINTER|ELECTRICIAN|GRILL WORK|CENTERING(?!.*SHEET|.*WIRE)|CENTRING/.test(upper)) {
      return { type: 'Contractor', material: null };
    }
    return { type: 'Supplier', material };
  }
  if (contractorWords.some((word) => upper.includes(word))) return { type: 'Contractor', material: null };
  return { type: 'Labour', material: null };
}

function paymentModeFromClient(clientName) {
  const upper = keyText(clientName);
  if (upper.includes('GPAY')) return 'GPay';
  if (upper.includes('ACC') || upper.includes('BANK')) return 'Bank Transfer';
  return 'Cash';
}

function bestSiteForClientName(clientName, siteByNormalKey) {
  const key = normalKey(clientName)
    .replace(/CASH|GPAY|SUNDAY|SATURDAY|WEDNESDAY|MONDAY|TUESDAY|THURSDAY|FRIDAY|ACC|ACCOUNT|WITH|SHED|AND|INT/g, '');
  if (!key) return HOLDING_SITE;
  for (const [siteKey, siteName] of siteByNormalKey.entries()) {
    if (key.includes(siteKey) || siteKey.includes(key)) return siteName;
  }
  if (key.includes('KOLLIMALAI') || key.includes('KATHIR')) {
    for (const [siteKey, siteName] of siteByNormalKey.entries()) {
      if (siteKey.includes('KOLLIMALAI') || siteKey.includes('KATHIR')) return siteName;
    }
  }
  return HOLDING_SITE;
}

const workbook = XLSX.readFile(workbookPath, { cellDates: true });

const sites = new Map();
const payees = new Map();
const labours = new Map();
const materials = new Map();
const weeks = [];
const weeklyItems = [];
const purchases = [];
const clientPayments = [];
const skippedSheets = [];

for (const sheetName of workbook.SheetNames) {
  const weekDate = parseDateText(sheetName);
  if (!weekDate) {
    skippedSheets.push({ sheetName, reason: 'Sheet name is not a date' });
    continue;
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
  const header = findHeaderRow(rows);
  if (!header) {
    skippedSheets.push({ sheetName, reason: 'No labour header row' });
    continue;
  }

  const headerRow = rows[header.rowIndex] || [];
  const siteColumns = [];
  for (let c = header.labourCol + 1; c < headerRow.length; c += 1) {
    const headerValue = cleanText(headerRow[c]);
    if (keyText(headerValue) === 'TOTAL') break;
    if (isIgnoredHeader(headerValue)) continue;
    siteColumns.push({ col: c, name: headerValue });
    sites.set(normalKey(headerValue), headerValue);
  }

  const week = {
    title: `Excel ${cleanText(sheetName)}`,
    sheetName,
    date: weekDate,
    payeeKeys: new Set(),
    siteKeys: new Set(),
    amount: 0,
    itemCount: 0,
  };

  for (let r = header.rowIndex + 1; r < rows.length; r += 1) {
    const payeeName = cleanText(rows[r][header.labourCol]);
    if (isIgnoredPayeeName(payeeName)) continue;

    const classification = classifyPayee(payeeName);
    const payeeKey = normalKey(payeeName);
    if (!payeeKey) continue;
    if (!payees.has(payeeKey)) {
      payees.set(payeeKey, {
        name: payeeName,
        type: classification.type,
        notes: `Imported from Excel workbook; source row name: ${payeeName}`,
      });
    }
    if (classification.type === 'Labour' || classification.type === 'Contractor') {
      labours.set(payeeKey, {
        name: payeeName,
        labourType: classification.type,
      });
    }
    if (classification.material) materials.set(normalKey(classification.material.materialName), classification.material.materialName);

    for (const siteCol of siteColumns) {
      const amount = parseNumber(rows[r][siteCol.col]);
      if (amount === null || amount <= 0) continue;
      const siteKey = normalKey(siteCol.name);
      week.payeeKeys.add(payeeKey);
      week.siteKeys.add(siteKey);
      week.amount += amount;
      week.itemCount += 1;
      weeklyItems.push({
        sheetTitle: week.title,
        sheetName,
        weekDate,
        payeeName,
        siteName: sites.get(siteKey),
        amount,
      });
      if (classification.material) {
        purchases.push({
          weekDate,
          sheetName,
          siteName: sites.get(siteKey),
          materialName: classification.material.materialName,
          quantity: classification.material.quantity,
          unit: classification.material.unit,
          amount,
          dealerName: classification.material.dealerName,
          notes: `Imported from weekly sheet ${sheetName}; original row: ${payeeName}`,
        });
      }
    }
  }

  if (week.itemCount > 0) weeks.push(week);

  const siteByNormalKey = new Map(sites);
  for (let r = 0; r < rows.length; r += 1) {
    const clientName = cleanText(rows[r][17]);
    const amount = parseNumber(rows[r][18]);
    if (!clientName || keyText(clientName) === 'CLIENT' || amount === null || amount <= 0) continue;
    const siteName = bestSiteForClientName(clientName, siteByNormalKey);
    sites.set(normalKey(siteName), siteName);
    clientPayments.push({
      weekDate,
      sheetName,
      rowNumber: r + 1,
      clientName,
      siteName,
      amount,
      mode: paymentModeFromClient(clientName),
    });
  }
}

sites.set(normalKey(HOLDING_SITE), HOLDING_SITE);

const orderedSites = [...sites.values()].sort((a, b) => a.localeCompare(b));
const orderedPayees = [...payees.values()].sort((a, b) => a.name.localeCompare(b.name));
const orderedLabours = [...labours.values()].sort((a, b) => a.name.localeCompare(b.name));
const orderedMaterials = [...materials.values()].sort((a, b) => a.localeCompare(b));
const orderedWeeks = weeks.sort((a, b) => a.date - b.date || a.title.localeCompare(b.title));

function insertIfMissingClient(out) {
  out.push('-- Required parent client for imported Excel sites.');
  out.push("INSERT INTO `clients` (`Name`, `MobileNumber`, `PaymentType`, `CreatedAt`)");
  out.push(`SELECT 'Excel Import Client', ${sqlString(IMPORT_CLIENT_MOBILE)}, 'Cash', NOW(6)`);
  out.push(`WHERE NOT EXISTS (SELECT 1 FROM \`clients\` WHERE \`MobileNumber\` = ${sqlString(IMPORT_CLIENT_MOBILE)});`);
  out.push(`SET @excel_client_id := (SELECT \`Id\` FROM \`clients\` WHERE \`MobileNumber\` = ${sqlString(IMPORT_CLIENT_MOBILE)} LIMIT 1);`);
  out.push('');
}

function addCompatibilitySql(out) {
  out.push('-- Compatibility for the current Electron app purchase schema.');
  out.push("SET @sql := IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'materials' AND COLUMN_NAME = 'Rate') > 0, 'ALTER TABLE `materials` DROP COLUMN `Rate`', 'SELECT 1');");
  out.push('PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;');
  out.push("SET @sql := IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'site_materials' AND COLUMN_NAME = 'Amount') = 0, 'ALTER TABLE `site_materials` ADD COLUMN `Amount` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1');");
  out.push('PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;');
  out.push("SET @sql := IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'site_materials' AND COLUMN_NAME = 'DealerName') = 0, 'ALTER TABLE `site_materials` ADD COLUMN `DealerName` VARCHAR(100) NULL DEFAULT ''''', 'SELECT 1');");
  out.push('PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;');
  out.push('');
}

function writeSql() {
  const out = [];
  out.push('-- Jeeva Construction Excel import SQL.');
  out.push(`-- Source workbook: ${workbookPath.replace(/\\/g, '/')}`);
  out.push(`-- Generated at: ${new Date().toISOString()}`);
  out.push(`-- Sheets imported: ${orderedWeeks.length}; skipped sheets: ${skippedSheets.length}`);
  out.push(`-- Weekly payable items: ${weeklyItems.length}; material purchase rows: ${purchases.length}; client collections: ${clientPayments.length}`);
  out.push('');
  out.push('USE `jeeva_construction`;');
  out.push('START TRANSACTION;');
  out.push('SET @OLD_SQL_SAFE_UPDATES := @@SQL_SAFE_UPDATES;');
  out.push('SET SQL_SAFE_UPDATES = 0;');
  out.push('');
  addCompatibilitySql(out);
  insertIfMissingClient(out);

  out.push('-- Sites from Excel sheet columns and unmatched client cash holding.');
  for (const siteName of orderedSites) {
    out.push('INSERT INTO `sites` (`SiteName`, `ClientId`, `SiteValue`, `Length`, `Breadth`, `Facing`, `Status`, `CreatedAt`, `Progress`, `NextMilestone`)');
    out.push(`SELECT ${sqlString(siteName)}, @excel_client_id, 0.00, 0.00, 0.00, '', 'In Progress', NOW(6), 0.00, 'Imported from Excel'`);
    out.push(`WHERE NOT EXISTS (SELECT 1 FROM \`sites\` WHERE UPPER(\`SiteName\`) = UPPER(${sqlString(siteName)}));`);
  }
  out.push('');

  out.push('-- Payees include labour, contractors, and material vendors/dealers payable at weekend.');
  for (const payee of orderedPayees) {
    out.push('INSERT INTO `payees` (`Name`, `Type`, `MobileNo`, `AccountNo`, `Notes`, `CreatedAt`)');
    out.push(`SELECT ${sqlString(payee.name)}, ${sqlString(payee.type)}, '', '', ${sqlString(payee.notes)}, NOW()`);
    out.push(`WHERE NOT EXISTS (SELECT 1 FROM \`payees\` WHERE UPPER(\`Name\`) = UPPER(${sqlString(payee.name)}));`);
  }
  out.push('');

  out.push('-- Labour table rows for labour and contractor payees.');
  for (const labour of orderedLabours) {
    out.push('INSERT INTO `labours` (`Name`, `MobileNo`, `AccountNo`, `LabourType`, `CreatedAt`, `PayeeId`)');
    out.push(`SELECT ${sqlString(labour.name)}, '', '', ${sqlString(labour.labourType)}, NOW(6), p.\`id\``);
    out.push('FROM `payees` p');
    out.push(`WHERE UPPER(p.\`Name\`) = UPPER(${sqlString(labour.name)})`);
    out.push(`  AND NOT EXISTS (SELECT 1 FROM \`labours\` WHERE UPPER(\`Name\`) = UPPER(${sqlString(labour.name)}));`);
  }
  out.push('');

  out.push('-- Common material master rows inferred from old purchase/vendor rows.');
  for (const materialName of orderedMaterials) {
    out.push('INSERT INTO `materials` (`Name`, `CreatedAt`)');
    out.push(`SELECT ${sqlString(materialName)}, NOW(6)`);
    out.push(`WHERE NOT EXISTS (SELECT 1 FROM \`materials\` WHERE UPPER(\`Name\`) = UPPER(${sqlString(materialName)}));`);
  }
  out.push('');

  out.push('-- Dummy historical material purchases by site. Amount comes from the Excel weekly cell; payment is still handled through weekly pay sheet/payee.');
  for (const purchase of purchases) {
    out.push('INSERT INTO `site_materials` (`SiteId`, `MaterialId`, `Quantity`, `Unit`, `Amount`, `DealerName`, `PurchaseDate`)');
    out.push(`SELECT s.\`Id\`, m.\`Id\`, ${purchase.quantity.toFixed(2)}, ${sqlString(purchase.unit)}, ${purchase.amount.toFixed(2)}, ${sqlString(purchase.dealerName)}, '${sqlDate(purchase.weekDate)} 00:00:00'`);
    out.push('FROM `sites` s');
    out.push('JOIN `materials` m');
    out.push(`WHERE UPPER(s.\`SiteName\`) = UPPER(${sqlString(purchase.siteName)})`);
    out.push(`  AND UPPER(m.\`Name\`) = UPPER(${sqlString(purchase.materialName)})`);
    out.push('  AND NOT EXISTS (');
    out.push('    SELECT 1 FROM `site_materials` sm');
    out.push('    WHERE sm.`SiteId` = s.`Id` AND sm.`MaterialId` = m.`Id`');
    out.push(`      AND sm.\`PurchaseDate\` = '${sqlDate(purchase.weekDate)} 00:00:00'`);
    out.push(`      AND sm.\`Amount\` = ${purchase.amount.toFixed(2)} AND UPPER(COALESCE(sm.\`DealerName\`, '')) = UPPER(${sqlString(purchase.dealerName)})`);
    out.push('  );');
  }
  out.push('');

  out.push('-- Weekly pay sheet headers.');
  for (const week of orderedWeeks) {
    out.push('INSERT INTO `weekly_pay_sheets` (`Title`, `WeekDate`, `Status`, `CreatedAt`, `SelectedPayeeIds`, `SelectedSiteIds`)');
    out.push(`SELECT ${sqlString(week.title)}, '${sqlDate(week.date)}', 'Open', NOW(), NULL, NULL`);
    out.push(`WHERE NOT EXISTS (SELECT 1 FROM \`weekly_pay_sheets\` WHERE \`Title\` = ${sqlString(week.title)} AND \`WeekDate\` = '${sqlDate(week.date)}');`);
  }
  out.push('');

  out.push('-- Weekly pay sheet item cells, all pending until you pay at weekend.');
  for (const item of weeklyItems) {
    out.push('INSERT INTO `weekly_pay_sheet_items` (`WeeklyPaySheetId`, `PayeeId`, `SiteId`, `Amount`, `PaymentStatus`, `PaymentId`, `PaymentDate`, `PaymentMode`, `PaymentNotes`, `CreatedAt`)');
    out.push(`SELECT w.\`id\`, p.\`id\`, s.\`Id\`, ${item.amount.toFixed(2)}, 'Pending', NULL, NULL, NULL, ${sqlString(`Imported from Excel sheet ${item.sheetName}`)}, NOW()`);
    out.push('FROM `weekly_pay_sheets` w');
    out.push('JOIN `payees` p');
    out.push('JOIN `sites` s');
    out.push(`WHERE w.\`Title\` = ${sqlString(item.sheetTitle)} AND w.\`WeekDate\` = '${sqlDate(item.weekDate)}'`);
    out.push(`  AND UPPER(p.\`Name\`) = UPPER(${sqlString(item.payeeName)})`);
    out.push(`  AND UPPER(s.\`SiteName\`) = UPPER(${sqlString(item.siteName)})`);
    out.push('  AND NOT EXISTS (');
    out.push('    SELECT 1 FROM `weekly_pay_sheet_items` existing');
    out.push('    WHERE existing.`WeeklyPaySheetId` = w.`id`');
    out.push('      AND existing.`PayeeId` = p.`id`');
    out.push('      AND existing.`SiteId` = s.`Id`');
    out.push('  );');
  }
  out.push('');

  out.push('-- Client/holding collections from the right-side client payment table.');
  for (const payment of clientPayments) {
    out.push('INSERT INTO `payments` (`PaymentCategory`, `SiteId`, `LabourId`, `MaterialId`, `PayeeId`, `Amount`, `PaymentMode`, `Notes`, `PaymentDate`, `CreatedAt`)');
    out.push(`SELECT 'Collection', s.\`Id\`, NULL, NULL, NULL, ${payment.amount.toFixed(2)}, ${sqlString(payment.mode)}, ${sqlString(`Client payment: ${payment.clientName}; Excel sheet ${payment.sheetName} row ${payment.rowNumber}`)}, '${sqlDate(payment.weekDate)} 00:00:00', NOW(6)`);
    out.push('FROM `sites` s');
    out.push(`WHERE UPPER(s.\`SiteName\`) = UPPER(${sqlString(payment.siteName)})`);
    out.push('  AND NOT EXISTS (');
    out.push('    SELECT 1 FROM `payments` p');
    out.push("    WHERE p.`PaymentCategory` = 'Collection' AND p.`SiteId` = s.`Id`");
    out.push(`      AND p.\`PaymentDate\` = '${sqlDate(payment.weekDate)} 00:00:00' AND p.\`Amount\` = ${payment.amount.toFixed(2)}`);
    out.push(`      AND p.\`Notes\` = ${sqlString(`Client payment: ${payment.clientName}; Excel sheet ${payment.sheetName} row ${payment.rowNumber}`)}`);
    out.push('  );');
  }
  out.push('');

  out.push('-- Fill selected payee/site JSON arrays for the app grid.');
  for (const week of orderedWeeks) {
    out.push('UPDATE `weekly_pay_sheets` w');
    out.push('SET');
    out.push("  `SelectedPayeeIds` = (SELECT CONCAT('[', GROUP_CONCAT(DISTINCT i.`PayeeId` ORDER BY i.`PayeeId`), ']') FROM `weekly_pay_sheet_items` i WHERE i.`WeeklyPaySheetId` = w.`id`),");
    out.push("  `SelectedSiteIds` = (SELECT CONCAT('[', GROUP_CONCAT(DISTINCT i.`SiteId` ORDER BY i.`SiteId`), ']') FROM `weekly_pay_sheet_items` i WHERE i.`WeeklyPaySheetId` = w.`id`)");
    out.push(`WHERE w.\`Title\` = ${sqlString(week.title)} AND w.\`WeekDate\` = '${sqlDate(week.date)}';`);
  }
  out.push('');
  out.push('SET SQL_SAFE_UPDATES = @OLD_SQL_SAFE_UPDATES;');
  out.push('COMMIT;');
  out.push('');

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(sqlOutputPath, out.join('\n'), 'utf8');
}

writeSql();

const summary = {
  sourceWorkbook: workbookPath,
  sqlOutputPath,
  sheetsInWorkbook: workbook.SheetNames.length,
  weeklySheetsImported: orderedWeeks.length,
  skippedSheets,
  sites: orderedSites.length,
  payees: orderedPayees.length,
  labours: orderedLabours.length,
  materials: orderedMaterials.length,
  weeklyPaySheetItems: weeklyItems.length,
  purchaseRows: purchases.length,
  clientCollectionRows: clientPayments.length,
  totalWeeklyPayableAmount: Number(weeklyItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2)),
  totalPurchaseAmount: Number(purchases.reduce((sum, item) => sum + item.amount, 0).toFixed(2)),
  totalClientCollectionAmount: Number(clientPayments.reduce((sum, item) => sum + item.amount, 0).toFixed(2)),
  payeeTypeCounts: orderedPayees.reduce((acc, payee) => {
    acc[payee.type] = (acc[payee.type] || 0) + 1;
    return acc;
  }, {}),
  materialNames: orderedMaterials,
};

fs.writeFileSync(summaryOutputPath, JSON.stringify(summary, null, 2), 'utf8');
console.log(JSON.stringify(summary, null, 2));
