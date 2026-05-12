#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import ExcelJS from 'exceljs';

const HEADERS = {
  zone: 'Nome da Zona Relacionada',
  item: 'Nome de Item de Biblioteca',
  qty: 'Quantidade',
};

const ILUM_PLACEHOLDER = 'Natural + Led';

function parseQuantity(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const normalized = String(value)
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '')
    .trim();
  if (!normalized) return 0;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function findHeaderRow(rows) {
  return rows.findIndex((row = []) => {
    const normalized = row.map((cell) => (cell ?? '').toString().trim());
    return Object.values(HEADERS).every((header) => normalized.includes(header));
  });
}

function classifyItem(name) {
  const normalized = name.toLowerCase();
  if (normalized.startsWith('cadeira')) return 'chair';
  if (normalized.includes('ar condicionado')) return 'ac';
  if (normalized.includes('projetor')) return 'projector';
  return 'furniture';
}

function addFurnitureItem(room, name, quantity) {
  if (!name) return;
  const current = room.mobiliarioItems.get(name) ?? 0;
  room.mobiliarioItems.set(name, current + quantity);
}

function buildRooms(rows, headerRowIndex, headerRow) {
  const colIndexes = {
    zone: headerRow.findIndex((value) => value === HEADERS.zone),
    item: headerRow.findIndex((value) => value === HEADERS.item),
    qty: headerRow.findIndex((value) => value === HEADERS.qty),
  };

  if (colIndexes.zone === -1 || colIndexes.item === -1 || colIndexes.qty === -1) {
    throw new Error('Missing required columns in worksheet.');
  }

  const rooms = new Map();
  let lastZone = '';

  for (let i = headerRowIndex + 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const zoneCell = row[colIndexes.zone];
    const rawZone = zoneCell !== undefined && zoneCell !== null ? zoneCell.toString().trim() : '';
    const itemCell = row[colIndexes.item];
    const rawItem = itemCell !== undefined && itemCell !== null ? itemCell.toString().trim() : '';
    const qtyCell = row[colIndexes.qty];
    const quantity = parseQuantity(qtyCell);

    if (rawZone) {
      lastZone = rawZone;
    }
    if (!lastZone || !rawItem) continue;

    const roomId = lastZone;
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        id: roomId,
        displayName: lastZone,
        capacidade: 0,
        ar_condicionado: 0,
        iluminacao: ILUM_PLACEHOLDER,
        mobiliarioItems: new Map(),
        projetor: 0,
      });
    }

    const room = rooms.get(roomId);
    room.displayName = lastZone;
    const itemType = classifyItem(rawItem);
    const qtyInt = Math.round(quantity);

    if (qtyInt <= 0) continue;

    if (itemType === 'chair') {
      room.capacidade += qtyInt;
      addFurnitureItem(room, rawItem, qtyInt);
    } else if (itemType === 'ac') {
      room.ar_condicionado += qtyInt;
    } else if (itemType === 'projector') {
      room.projetor += qtyInt;
    } else {
      addFurnitureItem(room, rawItem, qtyInt);
    }
  }

  return Array.from(rooms.values())
    .map((room) => {
      const mobiliarioList = Array.from(room.mobiliarioItems.entries()).map(
        ([name, total]) => `${name} (${total})`,
      );
      return {
        id: room.id,
        displayName: room.displayName,
        capacidade: room.capacidade,
        ar_condicionado: room.ar_condicionado,
        iluminacao: room.iluminacao,
        mobiliario: mobiliarioList.join(', '),
        projetor: room.projetor,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id, 'pt-BR', { numeric: true, sensitivity: 'accent' }));
}

function getCellValue(cell) {
  const val = cell.value;
  if (val === null || val === undefined) return null;
  if (val && typeof val === 'object') {
    if (val.richText) return val.richText.map((r) => r.text).join('');
    if (val.formula !== undefined) return val.result ?? null;
    if (val instanceof Date) return val.toISOString();
  }
  return val;
}

async function loadWorksheetRows(inputPath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(inputPath);

  if (!workbook.worksheets.length) throw new Error('Workbook does not contain any sheets.');

  const worksheet = workbook.worksheets[0];
  const colCount = worksheet.columnCount;
  const rows = [];

  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const rowValues = [];
    for (let col = 1; col <= colCount; col++) {
      rowValues.push(getCellValue(row.getCell(col)));
    }
    rows.push(rowValues);
  });

  return rows;
}

function writeOutput(outputPath, data, pretty) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const payload = { rooms: data };
  const spacing = pretty ? 2 : 0;
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, spacing)}\n`, 'utf8');
}

async function main() {
  const program = new Command();
  program
    .name('xlsx-to-popup-db')
    .description('Convert qt.Ativos.xlsx to pins_db_popup.json')
    .requiredOption('-i, --input <file>', 'Input XLSX file')
    .requiredOption('-o, --output <file>', 'Output JSON file')
    .option('--no-pretty', 'Disable pretty printed JSON output');

  program.parse(process.argv);
  const options = program.opts();

  const inputPath = path.resolve(options.input);
  const outputPath = path.resolve(options.output);

  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  let rows;
  try {
    rows = await loadWorksheetRows(inputPath);
  } catch (err) {
    console.error(`Failed to read workbook: ${err.message}`);
    process.exit(1);
  }

  const headerRowIndex = findHeaderRow(rows);
  if (headerRowIndex === -1) {
    console.error('Could not locate the header row in the worksheet.');
    process.exit(1);
  }

  const headerRow = rows[headerRowIndex].map((cell) => (cell ?? '').toString().trim());
  const rooms = buildRooms(rows, headerRowIndex, headerRow);

  writeOutput(outputPath, rooms, options.pretty);
  console.log(`Wrote ${rooms.length} rooms to ${outputPath}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
