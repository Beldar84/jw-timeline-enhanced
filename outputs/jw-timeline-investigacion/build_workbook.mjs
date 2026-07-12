import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const base = "/Users/beldar/Documents/GitHub/jw-timeline-enhanced/outputs/jw-timeline-investigacion";
const input = await FileBlob.load(`${base}/cartas-jw-timeline.xlsx`);
const workbook = await SpreadsheetFile.importXlsx(input);
const researched = JSON.parse(await fs.readFile(`${base}/fechas_jw_extraidas.json`, "utf8"));

const sheet = workbook.worksheets.add("Fechas adicionales");
sheet.showGridLines = false;
sheet.freezePanes.freezeRows(1);

const headers = [[
  "ID",
  "Nombre",
  "Año (negativo = a.e.c.)",
  "Fecha mostrada",
  "Referencia bíblica",
  "Enlace",
]];
const body = researched.map((row, index) => [
  113 + index,
  row.name,
  row.year,
  row.shown,
  row.reference,
  row.url,
]);

sheet.getRange("A1:F1").values = headers;
sheet.getRange(`A2:F${body.length + 1}`).values = body;

const header = sheet.getRange("A1:F1");
header.format.fill = "#8A6A2A";
header.format.font = { bold: true, color: "#FFFFFF", fontSize: 11, name: "Arial" };
header.format.horizontalAlignment = "center";
header.format.verticalAlignment = "center";
header.format.rowHeight = 28;

const data = sheet.getRange(`A2:F${body.length + 1}`);
data.format.font = { fontSize: 10, name: "Arial", color: "#222222" };
data.format.verticalAlignment = "top";
data.format.wrapText = true;
data.format.borders = {
  insideHorizontal: { style: "thin", color: "#D9CBA8" },
  bottom: { style: "thin", color: "#D9CBA8" },
};

sheet.getRange(`A2:A${body.length + 1}`).format.horizontalAlignment = "center";
sheet.getRange(`C2:C${body.length + 1}`).format.horizontalAlignment = "right";
sheet.getRange(`C2:C${body.length + 1}`).setNumberFormat("0");
sheet.getRange(`D2:D${body.length + 1}`).format.font = { italic: true, color: "#667788", fontSize: 10, name: "Arial" };
sheet.getRange(`F2:F${body.length + 1}`).format.font = { color: "#0563C1", underline: true, fontSize: 9, name: "Arial" };

sheet.getRange("A:A").format.columnWidth = 8;
sheet.getRange("B:B").format.columnWidth = 48;
sheet.getRange("C:C").format.columnWidth = 24;
sheet.getRange("D:D").format.columnWidth = 27;
sheet.getRange("E:E").format.columnWidth = 45;
sheet.getRange("F:F").format.columnWidth = 58;
sheet.getRange(`A2:F${body.length + 1}`).format.rowHeight = 34;

const table = sheet.tables.add(`A1:F${body.length + 1}`, true, "FechasAdicionalesTable");
table.showFilterButton = true;
table.showBandedRows = false;

const outputPath = `${base}/cartas-jw-timeline-ampliado.xlsx`;
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);

const finalInput = await FileBlob.load(outputPath);
const finalWorkbook = await SpreadsheetFile.importXlsx(finalInput);
const finalSheets = await finalWorkbook.inspect({ kind: "sheet", include: "id,name", maxChars: 4000 });
console.log(finalSheets.ndjson);

const keyRange = await workbook.inspect({
  kind: "table",
  sheetId: "Fechas adicionales",
  range: `A1:F${Math.min(body.length + 1, 18)}`,
  include: "values,formulas",
  tableMaxRows: 18,
  tableMaxCols: 6,
  maxChars: 12000,
});
console.log(keyRange.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 300 },
  summary: "final formula error scan",
  maxChars: 4000,
});
console.log(errors.ndjson);

for (const [name, range, suffix] of [
  ["Cartas", "A1:F25", "final-cartas"],
  ["Leyenda", "A1:B11", "final-leyenda"],
  ["Fechas adicionales", "A1:F30", "final-adicionales-inicio"],
  ["Fechas adicionales", `A${Math.max(2, body.length - 18)}:F${body.length + 1}`, "final-adicionales-fin"],
]) {
  const preview = await finalWorkbook.render({ sheetName: name, range, scale: 1, format: "png" });
  await fs.writeFile(`${base}/${suffix}.png`, new Uint8Array(await preview.arrayBuffer()));
}

console.log(JSON.stringify({ outputPath, rowsAdded: body.length, firstId: 113, lastId: 112 + body.length }));
