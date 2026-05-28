#!/usr/bin/env python3

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

from build_normalized_column_map import build_column_map


def normalize_rows(input_csv: Path) -> dict:
    with input_csv.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.reader(handle)
        headers = next(reader)
        column_map = build_column_map(headers)
        fields = column_map["fields"]

        rows = []
        for row_index, raw_row in enumerate(reader, start=2):
            normalized_row = {}
            for field in fields:
                cell_index = field["index"]
                normalized_row[field["logicalKey"]] = (
                    raw_row[cell_index] if cell_index < len(raw_row) else ""
                )

            rows.append(
                {
                    "rowNumber": row_index,
                    "data": normalized_row,
                }
            )

    return {
        "inputCsv": str(input_csv.resolve()),
        "headerCount": column_map["headerCount"],
        "rowCount": len(rows),
        "columnMap": column_map,
        "rows": rows,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("input_csv", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    output = normalize_rows(args.input_csv)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(
        json.dumps(output, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
