import type { Entry } from "./types";

function buildExportRows(entries: Entry[]) {
  return entries.map((entry) => ({
    stem: entry.lemma.stem,
    infinitive: entry.lemma.infinitive,
    verbClass: entry.grammar.verbClass,
    verbFormation: entry.derivation.verbFormation,
    transitivity: entry.summary.transitivityValues.join("; "),
    definitionCount: entry.definitions.length,
    firstDefinition: entry.definitions[0]?.definition ?? "",
    meaningRu: entry.definitions[0]?.meaningRu ?? "",
  }));
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportEntriesAsCsv(entries: Entry[]) {
  const rows = buildExportRows(entries);
  const headers = Object.keys(rows[0] ?? {
    stem: "",
    infinitive: "",
    verbClass: "",
    verbFormation: "",
    transitivity: "",
    definitionCount: "",
    firstDefinition: "",
    meaningRu: "",
  });

  const csvLines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = String(row[header as keyof typeof row] ?? "");
          return `"${value.replaceAll('"', '""')}"`;
        })
        .join(","),
    ),
  ];

  downloadBlob(new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8" }), "avar-verbal-database.csv");
}

export async function exportEntriesAsXlsx(entries: Entry[]) {
  const xlsx = await import("xlsx");
  const worksheet = xlsx.utils.json_to_sheet(buildExportRows(entries));
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, "AvarVerbs");
  const output = xlsx.write(workbook, { type: "array", bookType: "xlsx" });
  downloadBlob(
    new Blob([output], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    "avar-verbal-database.xlsx",
  );
}
