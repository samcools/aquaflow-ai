'use strict';

const { cleanString } = require('./store');

function parseCsv(text, { maxRows = 5000, maxColumns = 80 } = {}) {
  const input = String(text || '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n') {
      row.push(field.replace(/\r$/, '')); field = '';
      if (row.some(value => String(value).trim() !== '')) rows.push(row);
      row = [];
      if (rows.length > maxRows + 1) throw new Error(`CSV exceeds the ${maxRows} row import limit.`);
    } else field += char;
  }
  if (quoted) throw new Error('CSV contains an unterminated quoted field.');
  row.push(field.replace(/\r$/, ''));
  if (row.some(value => String(value).trim() !== '')) rows.push(row);
  if (!rows.length) return { headers: [], rows: [] };
  if (rows[0].length > maxColumns) throw new Error(`CSV exceeds the ${maxColumns} column limit.`);

  const headers = rows[0].map((header, index) => normalizeHeader(header) || `column_${index + 1}`);
  const duplicates = headers.filter((header, index) => headers.indexOf(header) !== index);
  if (duplicates.length) throw new Error(`CSV contains duplicate column names: ${[...new Set(duplicates)].join(', ')}`);

  return {
    headers,
    rows: rows.slice(1).map((values, rowIndex) => {
      if (values.length > maxColumns) throw new Error(`Row ${rowIndex + 2} exceeds the ${maxColumns} column limit.`);
      return Object.fromEntries(headers.map((header, index) => [header, cleanCell(values[index])]));
    })
  };
}

function normalizeHeader(value) {
  return cleanString(value, 100)
    .replace(/^\s+|\s+$/g, '')
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c ? c.toUpperCase() : '')
    .replace(/^[A-Z]/, c => c.toLowerCase());
}

function cleanCell(value) {
  const text = cleanString(value ?? '', 1000);
  if (/^-?\d+(\.\d+)?$/.test(text) && text.length < 20) return Number(text);
  if (/^(true|false)$/i.test(text)) return text.toLowerCase() === 'true';
  return text;
}

const SCHEMAS = {
  projects: {
    required: ['name', 'owner'],
    allowed: ['programmeId','name','owner','status','progress','risk','daysLate','budget','actualExpenditure','nextMilestone'],
    permission: 'project.create', prefix: 'proj', duplicate: row => `${row.name}|${row.owner}`.toLowerCase()
  },
  incidents: {
    required: ['zone', 'asset'],
    allowed: ['municipality','ward','zone','asset','category','severity','status','estimatedLossKlPerDay','populationAffected','criticalFacilityAffected','openHours','recurrenceCount','assignedTeam','location','detectedAt'],
    permission: 'incident.create', prefix: 'inc', duplicate: row => `${row.zone}|${row.asset}|${row.detectedAt || ''}`.toLowerCase()
  },
  workOrders: {
    required: ['description'],
    allowed: ['incidentId','projectId','description','priority','assignedTeam','status','slaHours','estimatedCost','actualCost'],
    permission: 'workorder.create', prefix: 'wo', duplicate: row => `${row.incidentId || ''}|${row.description}`.toLowerCase()
  },
  assets: {
    required: ['name', 'type'],
    allowed: ['name','type','zone','condition','criticality','location','serialNumber','commissionedAt'],
    permission: 'asset.create', prefix: 'asset', duplicate: row => `${row.name}|${row.type}`.toLowerCase()
  },
  meters: {
    required: ['accountReference'],
    allowed: ['accountReference','zone','status','currentReading','averageConsumptionKl','currentConsumptionKl','lastReadAt','meterNumber'],
    permission: 'meter.create', prefix: 'meter', duplicate: row => `${row.meterNumber || row.accountReference}`.toLowerCase()
  },
  contractors: {
    required: ['name'],
    allowed: ['name','status','performance','slaPercent','contactReference'],
    permission: 'contractor.create', prefix: 'contractor', duplicate: row => `${row.name}`.toLowerCase()
  }
};

function schemaFor(resource) {
  const schema = SCHEMAS[resource];
  if (!schema) throw new Error(`CSV import is not enabled for resource: ${resource}`);
  return schema;
}

function validateRows(resource, rows, existing = []) {
  const schema = schemaFor(resource);
  const existingKeys = new Set(existing.map(schema.duplicate));
  const batchKeys = new Set();
  return rows.map((raw, index) => {
    const row = {};
    for (const key of schema.allowed) if (raw[key] !== undefined && raw[key] !== '') row[key] = raw[key];
    const errors = [];
    for (const key of schema.required) if (row[key] === undefined || row[key] === '') errors.push(`${key} is required`);
    const key = schema.duplicate(row);
    const duplicateExisting = existingKeys.has(key);
    const duplicateBatch = batchKeys.has(key);
    if (key) batchKeys.add(key);
    if (duplicateExisting) errors.push('Duplicate of an existing record');
    if (duplicateBatch) errors.push('Duplicate within this import file');
    return { rowNumber: index + 2, valid: errors.length === 0, errors, record: row };
  });
}

module.exports = { parseCsv, normalizeHeader, cleanCell, SCHEMAS, schemaFor, validateRows };
