#!/usr/bin/env python3

from __future__ import annotations

import argparse
import hashlib
import json
from collections import defaultdict
from pathlib import Path


ENTRY_LEVEL_FIELDS = [
    "theme_vowel",
    "verb_class",
    "stem0",
    "stem1",
    "stem2",
    "stem_type",
    "stem_notes",
    "accent_paradigm",
    "phonological_structure",
    "phonological_structure_unaccented",
    "principle_parts",
    "unaccented_principle_parts",
    "presence",
    "future",
    "aorist",
    "imperative",
    "masdar",
    "agreement_slot",
    "verb_formation",
    "verb_formation_stem",
    "pos_verb_formation_stem",
    "formation_stem_does_not_match",
    "variation",
    "causative",
    "full_reduplication",
    "d_reduplication",
    "reduplicated_p_to_d",
    "reduplicated_l_to_d",
    "reduplicated_m_to_d",
    "durative_aqd",
    "durative_d",
    "durative_ar",
    "durative_anq",
    "durative_ar_d",
    "durative_d_ar",
    "durative_old",
    "ablaut_i_to_e",
    "ablaut_u_to_e",
    "done",
    "light_verb",
    "reference",
    "notes",
    "comments",
]

FRAME_SLOT_FIELDS = ["x", "y", "z", "x2", "y2", "z2", "x3", "y3", "z3"]

CONTEXT_TRIPLES = [
    ("context", "context_ru", "example_source_1"),
    ("context2", "context2_ru", "example_source_2"),
    ("context3", "context3_ru", "example_source_3"),
]


def nonempty(value: str) -> bool:
    return bool(value and value.strip())


def first_nonempty(rows: list[dict], field: str) -> str:
    for row in rows:
        value = row.get(field, "")
        if nonempty(value):
            return value
    return ""


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


def stable_entry_id(group_key: str) -> str:
    digest = hashlib.sha1(group_key.encode("utf-8")).hexdigest()[:12]
    return f"verb-{digest}"


def make_group_key(row: dict) -> str:
    source = row.get("source", "").strip()
    if source:
        return f"source:{source}"
    stem = row.get("stem", "").strip()
    infinitive = row.get("infinitive", "").strip()
    return f"fallback:{stem}||{infinitive}"


def collect_contexts(row: dict) -> list[dict]:
    contexts = []
    for index, (context_field, translation_field, source_field) in enumerate(
        CONTEXT_TRIPLES, start=1
    ):
        context = row.get(context_field, "")
        translation = row.get(translation_field, "")
        example_source = row.get(source_field, "")
        if not any(nonempty(value) for value in [context, translation, example_source]):
            continue
        contexts.append(
            {
                "slot": index,
                "text": context,
                "translationRu": translation,
                "exampleSource": example_source,
            }
        )
    return contexts


def collect_frame_slots(row: dict) -> dict:
    return {
        field: row.get(field, "")
        for field in FRAME_SLOT_FIELDS
        if nonempty(row.get(field, ""))
    }


def build_definition(entry_id: str, row_payload: dict) -> dict:
    row = row_payload["data"]
    definition_index = row.get("id_definition", "").strip() or str(row_payload["rowNumber"])
    return {
        "id": f"{entry_id}:def:{definition_index}",
        "idDefinition": row.get("id_definition", ""),
        "rowNumber": row_payload["rowNumber"],
        "definition": row.get("definition", ""),
        "meaningRu": row.get("meaning_ru", ""),
        "exampleImperative": row.get("example_imperative", ""),
        "transitivity": row.get("transitivity", ""),
        "lability": row.get("lability", ""),
        "lightVerb": row.get("light_verb", ""),
        "frameSlots": collect_frame_slots(row),
        "contexts": collect_contexts(row),
    }


def build_entry(group_key: str, row_payloads: list[dict]) -> dict:
    rows = [row_payload["data"] for row_payload in row_payloads]
    entry_id = stable_entry_id(group_key)
    first_row = rows[0]

    entry_fields = {
        field: first_nonempty(rows, field)
        for field in ENTRY_LEVEL_FIELDS
    }

    summary = {
        "transitivityValues": ordered_unique([row.get("transitivity", "") for row in rows]),
        "labilityValues": ordered_unique([row.get("lability", "") for row in rows]),
    }

    definitions = [
        build_definition(entry_id, row_payload)
        for row_payload in sorted(
            row_payloads,
            key=lambda item: (
                int(item["data"]["id_definition"])
                if item["data"].get("id_definition", "").isdigit()
                else 10**9,
                item["rowNumber"],
            ),
        )
    ]

    return {
        "id": entry_id,
        "groupKey": group_key,
        "rowNumbers": [row_payload["rowNumber"] for row_payload in row_payloads],
        "lemma": {
            "stem": first_row.get("stem", ""),
            "infinitive": first_row.get("infinitive", ""),
            "source": first_row.get("source", ""),
        },
        "grammar": {
            "themeVowel": entry_fields["theme_vowel"],
            "verbClass": entry_fields["verb_class"],
            "stems": {
                "stem0": entry_fields["stem0"],
                "stem1": entry_fields["stem1"],
                "stem2": entry_fields["stem2"],
                "stemType": entry_fields["stem_type"],
                "stemNotes": entry_fields["stem_notes"],
            },
            "accentParadigm": entry_fields["accent_paradigm"],
            "phonology": {
                "structure": entry_fields["phonological_structure"],
                "structureUnaccented": entry_fields["phonological_structure_unaccented"],
            },
            "principalParts": {
                "presence": entry_fields["presence"],
                "future": entry_fields["future"],
                "aorist": entry_fields["aorist"],
                "imperative": entry_fields["imperative"],
                "masdar": entry_fields["masdar"],
                "principlePartsRaw": entry_fields["principle_parts"],
                "unaccentedPrinciplePartsRaw": entry_fields["unaccented_principle_parts"],
            },
            "agreementSlot": entry_fields["agreement_slot"],
        },
        "derivation": {
            "verbFormation": entry_fields["verb_formation"],
            "verbFormationStem": entry_fields["verb_formation_stem"],
            "posVerbFormationStem": entry_fields["pos_verb_formation_stem"],
            "formationStemDoesNotMatch": entry_fields["formation_stem_does_not_match"],
            "variation": entry_fields["variation"],
            "flags": {
                "causative": entry_fields["causative"],
                "fullReduplication": entry_fields["full_reduplication"],
                "dReduplication": entry_fields["d_reduplication"],
                "reduplicatedPToD": entry_fields["reduplicated_p_to_d"],
                "reduplicatedLToD": entry_fields["reduplicated_l_to_d"],
                "reduplicatedMToD": entry_fields["reduplicated_m_to_d"],
                "durativeAqd": entry_fields["durative_aqd"],
                "durativeD": entry_fields["durative_d"],
                "durativeAr": entry_fields["durative_ar"],
                "durativeAnq": entry_fields["durative_anq"],
                "durativeArD": entry_fields["durative_ar_d"],
                "durativeDAr": entry_fields["durative_d_ar"],
                "durativeOld": entry_fields["durative_old"],
                "ablautIToE": entry_fields["ablaut_i_to_e"],
                "ablautUToE": entry_fields["ablaut_u_to_e"],
            },
        },
        "references": {
            "reference": entry_fields["reference"],
            "notes": entry_fields["notes"],
            "comments": entry_fields["comments"],
            "done": entry_fields["done"],
        },
        "summary": summary,
        "definitions": definitions,
        "derivedFrom": [],
        "outgoingDerivatives": [],
    }


def link_derivations(entries: list[dict]) -> None:
    by_stem = defaultdict(list)
    for entry in entries:
        stem = entry["lemma"]["stem"]
        if nonempty(stem):
            by_stem[stem].append(entry)

    for entry in entries:
        derivation = entry["derivation"]
        formation_stem = derivation["verbFormationStem"].strip()
        if not nonempty(formation_stem) or formation_stem == "?":
            continue

        parents = by_stem.get(formation_stem, [])
        parent_links = []
        for parent in parents:
            link = {
                "entryId": parent["id"],
                "stem": parent["lemma"]["stem"],
                "infinitive": parent["lemma"]["infinitive"],
                "source": parent["lemma"]["source"],
                "matchStem": formation_stem,
                "formationType": derivation["verbFormation"],
                "sourcePos": derivation["posVerbFormationStem"],
            }
            parent_links.append(link)
            parent["outgoingDerivatives"].append(
                {
                    "entryId": entry["id"],
                    "stem": entry["lemma"]["stem"],
                    "infinitive": entry["lemma"]["infinitive"],
                    "source": entry["lemma"]["source"],
                    "formationType": derivation["verbFormation"],
                    "formationStem": formation_stem,
                }
            )

        if parent_links:
            entry["derivedFrom"] = parent_links

    for entry in entries:
        entry["outgoingDerivatives"].sort(key=lambda item: (item["stem"], item["infinitive"], item["source"]))


def build_grouped_entries(normalized_rows: dict) -> dict:
    groups = defaultdict(list)
    for row_payload in normalized_rows["rows"]:
        groups[make_group_key(row_payload["data"])].append(row_payload)

    ordered_group_keys = []
    seen = set()
    for row_payload in normalized_rows["rows"]:
        group_key = make_group_key(row_payload["data"])
        if group_key not in seen:
            seen.add(group_key)
            ordered_group_keys.append(group_key)

    entries = [build_entry(group_key, groups[group_key]) for group_key in ordered_group_keys]
    link_derivations(entries)

    return {
        "inputCsv": normalized_rows["inputCsv"],
        "rowCount": normalized_rows["rowCount"],
        "entryCount": len(entries),
        "grouping": {
            "strategy": "source if non-empty, otherwise stem + infinitive",
            "sourceBackedEntries": sum(
                1 for entry in entries if entry["groupKey"].startswith("source:")
            ),
            "fallbackEntries": sum(
                1 for entry in entries if entry["groupKey"].startswith("fallback:")
            ),
        },
        "entries": entries,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("normalized_rows_json", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    normalized_rows = json.loads(args.normalized_rows_json.read_text(encoding="utf-8"))
    grouped = build_grouped_entries(normalized_rows)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(
        json.dumps(grouped, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
