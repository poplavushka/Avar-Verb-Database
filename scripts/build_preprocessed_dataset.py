#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


FILTER_SPECS = [
    ("verbClass", lambda entry: entry["grammar"]["verbClass"]),
    ("themeVowel", lambda entry: entry["grammar"]["themeVowel"]),
    ("agreementSlot", lambda entry: entry["grammar"]["agreementSlot"]),
    ("verbFormation", lambda entry: entry["derivation"]["verbFormation"]),
    ("verbFormationStemPos", lambda entry: entry["derivation"]["posVerbFormationStem"]),
]

SUMMARY_FILTER_SPECS = [
    ("transitivity", "transitivityValues"),
    ("lability", "labilityValues"),
]

DERIVATION_FLAG_SPECS = [
    ("hasCausative", "causative"),
    ("hasFullReduplication", "fullReduplication"),
    ("hasDReduplication", "dReduplication"),
    ("hasReduplicatedPToD", "reduplicatedPToD"),
    ("hasReduplicatedLToD", "reduplicatedLToD"),
    ("hasReduplicatedMToD", "reduplicatedMToD"),
    ("hasDurativeAqd", "durativeAqd"),
    ("hasDurativeD", "durativeD"),
    ("hasDurativeAr", "durativeAr"),
    ("hasDurativeAnq", "durativeAnq"),
    ("hasDurativeArD", "durativeArD"),
    ("hasDurativeDAr", "durativeDAr"),
    ("hasDurativeOld", "durativeOld"),
    ("hasAblautIToE", "ablautIToE"),
    ("hasAblautUToE", "ablautUToE"),
]


def nonempty(value: str) -> bool:
    return bool(value and value.strip())


def normalize_search_text(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).lower()
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def ordered_unique(values: list[str]) -> list[str]:
    seen = set()
    result = []
    for value in values:
        if not nonempty(value):
            continue
        if value not in seen:
            seen.add(value)
            result.append(value)
    return result


def compact_entry(entry: dict) -> dict:
    return {
        "id": entry["id"],
        "lemma": entry["lemma"],
        "grammar": entry["grammar"],
        "derivation": entry["derivation"],
        "references": entry["references"],
        "summary": entry["summary"],
        "definitions": entry["definitions"],
        "derivedFrom": entry["derivedFrom"],
        "outgoingDerivatives": entry["outgoingDerivatives"],
    }


def build_search_record(entry: dict) -> dict:
    definitions = entry["definitions"]
    contexts = [
        context
        for definition in definitions
        for context in definition["contexts"]
    ]

    definition_text = " ".join(
        value
        for value in [definition["definition"] for definition in definitions]
        if nonempty(value)
    )
    meaning_ru_text = " ".join(
        value
        for value in [definition["meaningRu"] for definition in definitions]
        if nonempty(value)
    )
    context_text = " ".join(
        value
        for value in [context["text"] for context in contexts]
        if nonempty(value)
    )
    context_ru_text = " ".join(
        value
        for value in [context["translationRu"] for context in contexts]
        if nonempty(value)
    )

    search_fields = ordered_unique(
        [
            entry["lemma"]["stem"],
            entry["lemma"]["infinitive"],
            entry["grammar"]["stems"]["stem0"],
            entry["grammar"]["stems"]["stem1"],
            entry["grammar"]["stems"]["stem2"],
            definition_text,
            meaning_ru_text,
            context_text,
            context_ru_text,
        ]
    )

    return {
        "entryId": entry["id"],
        "stem": entry["lemma"]["stem"],
        "infinitive": entry["lemma"]["infinitive"],
        "stem0": entry["grammar"]["stems"]["stem0"],
        "stem1": entry["grammar"]["stems"]["stem1"],
        "stem2": entry["grammar"]["stems"]["stem2"],
        "definitionCount": len(definitions),
        "searchText": " | ".join(search_fields),
        "searchTextNormalized": normalize_search_text(" ".join(search_fields)),
    }


def build_filters(entries: list[dict]) -> dict:
    filters = {}

    for key, getter in FILTER_SPECS:
        values = ordered_unique(
            sorted(
                {
                    getter(entry).strip()
                    for entry in entries
                    if nonempty(getter(entry))
                }
            )
        )
        filters[key] = {
            "type": "value-list",
            "values": values,
        }

    for key, summary_field in SUMMARY_FILTER_SPECS:
        values = ordered_unique(
            sorted(
                {
                    value.strip()
                    for entry in entries
                    for value in entry["summary"][summary_field]
                    if nonempty(value)
                }
            )
        )
        filters[key] = {
            "type": "value-list",
            "values": values,
        }

    for filter_key, flag_key in DERIVATION_FLAG_SPECS:
        filters[filter_key] = {
            "type": "boolean",
            "entryCount": sum(
                1
                for entry in entries
                if nonempty(entry["derivation"]["flags"][flag_key])
            ),
        }

    filters["hasOutgoingDerivatives"] = {
        "type": "boolean",
        "entryCount": sum(1 for entry in entries if entry["outgoingDerivatives"]),
    }
    filters["hasDerivedFrom"] = {
        "type": "boolean",
        "entryCount": sum(1 for entry in entries if entry["derivedFrom"]),
    }

    return filters


def build_meta(grouped: dict, entries: list[dict]) -> dict:
    definition_count = sum(len(entry["definitions"]) for entry in entries)
    context_count = sum(
        len(definition["contexts"])
        for entry in entries
        for definition in entry["definitions"]
    )
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "inputCsv": grouped["inputCsv"],
        "rowCount": grouped["rowCount"],
        "entryCount": grouped["entryCount"],
        "definitionCount": definition_count,
        "contextCount": context_count,
        "grouping": grouped["grouping"],
        "schemaVersion": 1,
    }


def build_dataset(grouped: dict) -> dict:
    entries = [compact_entry(entry) for entry in grouped["entries"]]
    return {
        "meta": build_meta(grouped, entries),
        "filters": build_filters(entries),
        "searchIndex": [build_search_record(entry) for entry in entries],
        "entries": entries,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("grouped_entries_json", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    grouped = json.loads(args.grouped_entries_json.read_text(encoding="utf-8"))
    dataset = build_dataset(grouped)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(
        json.dumps(dataset, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
