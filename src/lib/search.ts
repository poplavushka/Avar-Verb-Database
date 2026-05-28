import type { Entry, SearchField, SearchRecord, SearchState, SortOption } from "./types";

const LOOKALIKE_MAP: Record<string, string> = {
  А: "A",
  В: "B",
  Е: "E",
  К: "K",
  М: "M",
  Н: "H",
  О: "O",
  Р: "P",
  С: "C",
  Т: "T",
  У: "Y",
  Х: "X",
  а: "a",
  е: "e",
  о: "o",
  р: "p",
  с: "c",
  у: "y",
  х: "x",
};

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  гь: "gh",
  гъ: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "i",
  к: "k",
  къ: "q",
  кь: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  хъ: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ы: "y",
  э: "e",
  ю: "yu",
  я: "ya",
  ӏ: "1",
  І: "1",
  і: "1",
  қ: "q",
  ғ: "gh",
  ҳ: "h",
  ӯ: "u",
};

function replaceLookalikes(text: string): string {
  return Array.from(text, (char) => LOOKALIKE_MAP[char] ?? char).join("");
}

function transliterateCyrillic(text: string): string {
  const prepared = text.toLowerCase();
  let output = "";

  for (let index = 0; index < prepared.length; index += 1) {
    const digraph = prepared.slice(index, index + 2);
    if (CYRILLIC_TO_LATIN[digraph]) {
      output += CYRILLIC_TO_LATIN[digraph];
      index += 1;
      continue;
    }

    output += CYRILLIC_TO_LATIN[prepared[index]] ?? prepared[index];
  }

  return output;
}

function stripDiacritics(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function normalizeBase(text: string, translit: boolean): string {
  const normalized = stripDiacritics(replaceLookalikes(text.normalize("NFKC"))).toLowerCase();

  const base = translit ? stripDiacritics(transliterateCyrillic(normalized)) : normalized;

  return base
    .replace(/[~`'"’ʼ"“”«»„.,;:!?()[\]{}<>/\\|+=_*&#%^@-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactForSearch(text: string): string {
  return text.replace(/\s+/g, "");
}

function buildComparableForms(text: string, translit: boolean) {
  const normalized = normalizeBase(text, translit);

  return {
    normalized,
    compact: compactForSearch(normalized),
  };
}

export function normalizeForSearch(text: string, translit: boolean): string {
  return buildComparableForms(text, translit).normalized;
}

export function matchesNormalizedQuery(
  query: string,
  target: string,
  translit: boolean,
): boolean {
  const normalizedQuery = buildComparableForms(query, translit);
  if (!normalizedQuery.normalized) {
    return true;
  }

  const normalizedTarget = buildComparableForms(target, translit);

  return (
    normalizedTarget.normalized.includes(normalizedQuery.normalized) ||
    normalizedTarget.compact.includes(normalizedQuery.compact)
  );
}

function getEntryField(entry: Entry, searchRecord: SearchRecord, field: SearchField): string {
  switch (field) {
    case "infinitive":
      return entry.lemma.infinitive;
    case "stem":
      return entry.lemma.stem;
    case "stem0":
      return searchRecord.stem0;
    case "stem1":
      return searchRecord.stem1;
    case "stem2":
      return searchRecord.stem2;
    case "all":
    default:
      return [
        entry.lemma.stem,
        entry.lemma.infinitive,
        searchRecord.stem0,
        searchRecord.stem1,
        searchRecord.stem2,
        ...entry.definitions.flatMap((definition) => [
          definition.definition,
          definition.meaningRu,
          definition.exampleImperative,
          ...definition.contexts.flatMap((context) => [
            context.text,
            context.translationRu,
            context.exampleSource,
          ]),
        ]),
      ]
        .filter(Boolean)
        .join(" ");
  }
}

function getSearchRecordField(record: SearchRecord, field: SearchField): string {
  switch (field) {
    case "infinitive":
      return record.infinitive;
    case "stem":
      return record.stem;
    case "stem0":
      return record.stem0;
    case "stem1":
      return record.stem1;
    case "stem2":
      return record.stem2;
    case "all":
    default:
      return [record.stem, record.infinitive, record.stem0, record.stem1, record.stem2]
        .filter(Boolean)
        .join(" ");
  }
}

function compileRegex(query: string): RegExp | null {
  if (!query.trim()) {
    return null;
  }

  try {
    return new RegExp(query, "iu");
  } catch {
    return null;
  }
}

function valencyScore(entry: Entry): number {
  return entry.definitions.reduce(
    (sum, definition) => sum + Object.keys(definition.frameSlots).length,
    0,
  );
}

function completenessScore(entry: Entry): number {
  let score = 0;
  const grammar = entry.grammar;
  const derivation = entry.derivation;

  const values = [
    entry.lemma.stem,
    entry.lemma.infinitive,
    grammar.verbClass,
    grammar.themeVowel,
    grammar.stems.stem0,
    grammar.stems.stem1,
    grammar.stems.stem2,
    grammar.accentParadigm,
    grammar.phonology.structure,
    grammar.principalParts.presence,
    grammar.principalParts.future,
    grammar.principalParts.aorist,
    grammar.principalParts.imperative,
    grammar.principalParts.masdar,
    derivation.verbFormation,
    derivation.verbFormationStem,
    entry.references.reference,
    entry.references.notes,
    entry.references.comments,
  ];

  values.forEach((value) => {
    if (value.trim()) {
      score += 1;
    }
  });

  score += entry.definitions.length * 2;
  score += entry.definitions.reduce((sum, definition) => sum + definition.contexts.length, 0);
  score += entry.outgoingDerivatives.length;
  score += entry.derivedFrom.length;

  return score;
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, "ru");
}

export function sortEntries(entries: Entry[], sort: SortOption): Entry[] {
  return [...entries].sort((left, right) => {
    if (sort === "verbClass") {
      return (
        compareText(left.grammar.verbClass, right.grammar.verbClass) ||
        compareText(left.lemma.stem, right.lemma.stem)
      );
    }

    if (sort === "valency") {
      return (
        valencyScore(right) - valencyScore(left) ||
        compareText(left.lemma.stem, right.lemma.stem)
      );
    }

    if (sort === "derivation") {
      return (
        compareText(left.derivation.verbFormation, right.derivation.verbFormation) ||
        compareText(left.lemma.stem, right.lemma.stem)
      );
    }

    if (sort === "completeness") {
      return (
        completenessScore(right) - completenessScore(left) ||
        compareText(left.lemma.stem, right.lemma.stem)
      );
    }

    return compareText(left.lemma.stem, right.lemma.stem);
  });
}

export function filterEntries(
  entries: Entry[],
  searchIndexById: Record<string, SearchRecord>,
  state: SearchState,
  bookmarks: Set<string>,
): Entry[] {
  const regex = state.useRegex ? compileRegex(state.query) : null;
  const hasQuery = state.query.trim().length > 0;

  return entries.filter((entry) => {
    const searchRecord = searchIndexById[entry.id];
    if (!searchRecord) {
      return false;
    }

    if (state.onlyBookmarks && !bookmarks.has(entry.id)) {
      return false;
    }

    if (state.onlyDerived && entry.derivedFrom.length === 0) {
      return false;
    }

    if (state.onlyWithChildren && entry.outgoingDerivatives.length === 0) {
      return false;
    }

    if (state.onlyCausative && !entry.derivation.flags.causative.trim()) {
      return false;
    }

    if (state.verbClass && entry.grammar.verbClass !== state.verbClass) {
      return false;
    }

    if (state.verbFormation && entry.derivation.verbFormation !== state.verbFormation) {
      return false;
    }

    if (
      state.transitivity &&
      !entry.summary.transitivityValues.includes(state.transitivity)
    ) {
      return false;
    }

    if (state.lability && !entry.summary.labilityValues.includes(state.lability)) {
      return false;
    }

    if (!hasQuery) {
      return true;
    }

    const rawTarget = getEntryField(entry, searchRecord, state.field);
    if (state.useRegex) {
      if (!regex) {
        return false;
      }

      const transliteratedTarget = state.translit ? transliterateCyrillic(rawTarget) : "";
      return regex.test(rawTarget) || (transliteratedTarget ? regex.test(transliteratedTarget) : false);
    }

    return matchesNormalizedQuery(state.query, rawTarget, state.translit);
  });
}

export function buildSearchIndexMap(searchIndex: SearchRecord[]): Record<string, SearchRecord> {
  return Object.fromEntries(searchIndex.map((record) => [record.entryId, record]));
}

export function buildSuggestions(
  searchIndex: SearchRecord[],
  query: string,
  translit: boolean,
  field: SearchField,
): string[] {
  const normalizedQuery = normalizeForSearch(query, translit);
  if (!normalizedQuery) {
    return searchIndex
      .slice(0, 8)
      .map((record) => getSearchRecordField(record, field))
      .filter(Boolean);
  }

  return searchIndex
    .filter((record) => matchesNormalizedQuery(query, getSearchRecordField(record, field), translit))
    .slice(0, 8)
    .map((record) => getSearchRecordField(record, field))
    .filter(Boolean);
}
