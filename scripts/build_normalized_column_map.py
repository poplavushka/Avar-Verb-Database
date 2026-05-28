#!/usr/bin/env python3

from __future__ import annotations

import argparse
import csv
import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

LOOKALIKE_CYRILLIC_TO_LATIN = str.maketrans(
    {
        "А": "A",
        "В": "B",
        "Е": "E",
        "К": "K",
        "М": "M",
        "Н": "H",
        "О": "O",
        "Р": "P",
        "С": "C",
        "Т": "T",
        "У": "Y",
        "Х": "X",
        "а": "a",
        "е": "e",
        "о": "o",
        "р": "p",
        "с": "c",
        "у": "y",
        "х": "x",
    }
)

CYRILLIC_TO_ASCII = {
    "А": "A",
    "Б": "B",
    "В": "V",
    "Г": "G",
    "Д": "D",
    "Е": "E",
    "Ё": "E",
    "Ж": "Zh",
    "З": "Z",
    "И": "I",
    "Й": "I",
    "К": "K",
    "Л": "L",
    "М": "M",
    "Н": "N",
    "О": "O",
    "П": "P",
    "Р": "R",
    "С": "S",
    "Т": "T",
    "У": "U",
    "Ф": "F",
    "Х": "Kh",
    "Ц": "Ts",
    "Ч": "Ch",
    "Ш": "Sh",
    "Щ": "Shch",
    "Ъ": "",
    "Ы": "Y",
    "Ь": "",
    "Э": "E",
    "Ю": "Yu",
    "Я": "Ya",
    "а": "a",
    "б": "b",
    "в": "v",
    "г": "g",
    "д": "d",
    "е": "e",
    "ё": "e",
    "ж": "zh",
    "з": "z",
    "и": "i",
    "й": "i",
    "к": "k",
    "л": "l",
    "м": "m",
    "н": "n",
    "о": "o",
    "п": "p",
    "р": "r",
    "с": "s",
    "т": "t",
    "у": "u",
    "ф": "f",
    "х": "kh",
    "ц": "ts",
    "ч": "ch",
    "ш": "sh",
    "щ": "shch",
    "ъ": "",
    "ы": "y",
    "ь": "",
    "э": "e",
    "ю": "yu",
    "я": "ya",
}

LOGICAL_KEY_OVERRIDES = {
    "reduplicated + p > d": "reduplicated_p_to_d",
    "reduplicated + l > d": "reduplicated_l_to_d",
    "reduplicated + m > d": "reduplicated_m_to_d",
    "ablaut i > e": "ablaut_i_to_e",
    "ablaut u > e": "ablaut_u_to_e",
}


def transliterate_cyrillic(text: str) -> str:
    return "".join(CYRILLIC_TO_ASCII.get(char, char) for char in text)


def canonicalize_header(header: str) -> str:
    text = unicodedata.normalize("NFKC", header).strip()
    text = text.translate(LOOKALIKE_CYRILLIC_TO_LATIN)
    text = transliterate_cyrillic(text)
    text = re.sub(r"\s+", " ", text)
    return text.lower()


def slugify(text: str) -> str:
    text = text.replace("+", " plus ")
    text = text.replace(">", " to ")
    text = re.sub(r"[^a-z0-9]+", "_", text)
    return re.sub(r"_+", "_", text).strip("_")


def logical_key_for(canonical_header: str) -> str:
    return LOGICAL_KEY_OVERRIDES.get(canonical_header, slugify(canonical_header))


def build_column_map(headers: list[str]) -> dict:
    base_records = []
    base_key_counts = Counter()
    canonical_groups = defaultdict(list)

    for index, actual_header in enumerate(headers):
        canonical_header = canonicalize_header(actual_header)
        base_key = logical_key_for(canonical_header)
        base_key_counts[base_key] += 1
        canonical_groups[canonical_header].append(actual_header)
        base_records.append(
            {
                "index": index,
                "actualHeader": actual_header,
                "canonicalHeader": canonical_header,
                "baseLogicalKey": base_key,
            }
        )

    collision_counters = Counter()
    fields = []
    logical_field_map = {}
    collision_groups = defaultdict(list)

    for record in base_records:
        base_key = record["baseLogicalKey"]
        if base_key_counts[base_key] > 1:
            collision_counters[base_key] += 1
            logical_key = f"{base_key}_{collision_counters[base_key]}"
            collision_groups[base_key].append(logical_key)
        else:
            logical_key = base_key

        field = {
            "index": record["index"],
            "logicalKey": logical_key,
            "actualHeader": record["actualHeader"],
            "canonicalHeader": record["canonicalHeader"],
        }
        fields.append(field)
        logical_field_map[logical_key] = {
            "index": record["index"],
            "actualHeader": record["actualHeader"],
            "canonicalHeader": record["canonicalHeader"],
        }

    return {
        "headerCount": len(headers),
        "fields": fields,
        "logicalFieldMap": logical_field_map,
        "canonicalHeaderMap": {
            canonical_header: actual_headers
            for canonical_header, actual_headers in canonical_groups.items()
        },
        "collisionGroups": {
            base_key: logical_keys
            for base_key, logical_keys in collision_groups.items()
        },
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("input_csv", type=Path)
    parser.add_argument("--out", type=Path)
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    with args.input_csv.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.reader(handle)
        headers = next(reader)

    output = {
        "inputCsv": str(args.input_csv.resolve()),
        **build_column_map(headers),
    }

    if args.out is not None:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(
            json.dumps(output, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    else:
        print(json.dumps(output, ensure_ascii=False, indent=2))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
