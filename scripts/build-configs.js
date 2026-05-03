const fs = require('fs');
const path = require('path');

const SOURCES = {
  contacts:  'data_files/WIP [Maverick] Property _ Integration Mapping - API - Contact Properties.csv',
  companies: 'data_files/WIP [Maverick] Property _ Integration Mapping - API - Company Properties.csv',
  deals:     'data_files/WIP [Maverick] Property _ Integration Mapping - API - Deal Properties.csv',
  leads:     'data_files/WIP [Maverick] Property _ Integration Mapping - API - Lead Properties.csv',
};

const VALID_TYPE = ['string','enumeration','number','bool','datetime','date','phone_number'];
const VALID_FT   = ['textarea','text','date','file','number','select','radio','checkbox','booleancheckbox','calculation_equation','html','phonenumber'];
const DEFAULT_GROUP = 'Pipedrive Migration';

function parseCSV(text) {
  const rows = [];
  let i = 0, field = '', row = [], inQ = false;
  while (i < text.length) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i+1] === '"') { field += '"'; i += 2; continue; }
      if (c === '"') { inQ = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { inQ = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\n' || c === '\r') {
      if (field !== '' || row.length) { row.push(field); rows.push(row); }
      field = ''; row = [];
      if (c === '\r' && text[i+1] === '\n') i += 2; else i++;
      continue;
    }
    field += c; i++;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function normalizeGroupName(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseOptions(raw) {
  return raw.split(';').map((entry, i) => {
    const [labelPart, valuePart] = entry.split('|');
    const label = labelPart.trim();
    const value = (valuePart !== undefined ? valuePart : label)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    return { label, value, displayOrder: i, hidden: false };
  });
}

function build(objectType, csvPath) {
  const rows = parseCSV(fs.readFileSync(csvPath, 'utf8'));
  const header = rows[0].map(h => h.trim().toLowerCase());
  const col = name => header.indexOf(name);
  const iAction = col('action');
  const iLabel  = col('label');
  const iName   = col('name');
  const iType   = col('type');
  const iFT     = col('fieldtype');
  const iGroup  = col('groupname');
  const iDesc   = col('description');
  const iOpts   = col('options');

  if (iName < 0 || iType < 0 || iFT < 0) {
    throw new Error(`${objectType}: CSV missing required columns (name/type/fieldtype)`);
  }

  const out = [];
  const warnings = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row.some(c => c && c.trim())) continue;
    const name = (row[iName] || '').trim();
    if (!name) continue;

    const action = (row[iAction] || '').trim().toUpperCase();
    if (action && action !== 'POST') continue;

    const type = (row[iType] || '').trim();
    const fieldType = (row[iFT] || '').trim();
    const label = (row[iLabel] || '').trim();
    const groupRaw = (iGroup >= 0 && row[iGroup] ? row[iGroup].trim() : DEFAULT_GROUP);
    const description = (iDesc >= 0 ? (row[iDesc] || '').trim() : '');
    const optionsRaw = (iOpts >= 0 ? (row[iOpts] || '').trim() : '');

    if (name !== name.toLowerCase()) {
      warnings.push(`row ${r+1} ${name}: name has uppercase characters`);
    }
    if (!VALID_TYPE.includes(type)) {
      warnings.push(`row ${r+1} ${name}: invalid type="${type}"`);
    }
    if (!VALID_FT.includes(fieldType)) {
      warnings.push(`row ${r+1} ${name}: invalid fieldType="${fieldType}"`);
    }
    if ((type === 'enumeration' || type === 'bool') && !optionsRaw) {
      warnings.push(`row ${r+1} ${name}: ${type} requires options`);
    }

    const prop = {
      name,
      label,
      type,
      fieldType,
      groupName: normalizeGroupName(groupRaw),
      description,
    };
    if (optionsRaw) prop.options = parseOptions(optionsRaw);

    out.push(prop);
  }

  return { properties: out, warnings };
}

function main() {
  const summary = {};
  for (const [objectType, csvPath] of Object.entries(SOURCES)) {
    const { properties, warnings } = build(objectType, csvPath);
    const outPath = `config/${objectType}.json`;
    fs.writeFileSync(outPath, JSON.stringify(properties, null, 2) + '\n');
    summary[objectType] = { written: properties.length, warnings: warnings.length };
    console.log(`\n${objectType.toUpperCase()}: wrote ${properties.length} → ${outPath}`);
    warnings.forEach(w => console.log('  ! ' + w));
  }
  console.log('\nSummary:', summary);
}

main();
