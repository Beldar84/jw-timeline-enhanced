import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const base = "/Users/beldar/Documents/GitHub/jw-timeline-enhanced/outputs/jw-timeline-investigacion";
const input = await FileBlob.load(`${base}/cartas-jw-timeline.xlsx`);
const workbook = await SpreadsheetFile.importXlsx(input);

const summary = await workbook.inspect({
  kind: "workbook,sheet,table",
  maxChars: 12000,
  tableMaxRows: 12,
  tableMaxCols: 10,
  tableMaxCellChars: 160,
});
console.log(summary.ndjson);

const sheets = await workbook.inspect({ kind: "sheet", include: "id,name", maxChars: 4000 });
console.log(sheets.ndjson);

for (const item of workbook.worksheets.items) {
  const used = item.getUsedRange();
  console.log(JSON.stringify({ sheet: item.name, usedAddress: used?.address ?? null }));
  const table = await workbook.inspect({
    kind: "table",
    sheetId: item.name,
    range: used?.address ?? "A1:J20",
    include: "values,formulas",
    tableMaxRows: 20,
    tableMaxCols: 12,
    maxChars: 10000,
  });
  console.log(table.ndjson);
  const style = await workbook.inspect({
    kind: "computedStyle",
    sheetId: item.name,
    range: "A1:F8",
    maxChars: 6000,
  });
  console.log(style.ndjson);
  const preview = await workbook.render({ sheetName: item.name, autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(`${base}/preview-${item.name.replaceAll(/[^a-zA-Z0-9_-]/g, "_")}.png`, new Uint8Array(await preview.arrayBuffer()));
}

const cards = workbook.worksheets.getItem("Cartas").getUsedRange().values;
await fs.writeFile(`${base}/cartas_existentes.json`, JSON.stringify(cards, null, 2));
