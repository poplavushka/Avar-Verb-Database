import type { Entry, SearchField, SearchRecord, SearchState, SortOption } from "./types";

const LATIN_TO_CYRILLIC_LOOKALIKE_MAP: Record<string, string> = {
  A: "А",
  B: "В",
  C: "С",
  E: "Е",
  H: "Н",
  K: "К",
  M: "М",
  O: "О",
  P: "Р",
  T: "Т",
  X: "Х",
  Y: "У",
  I: "І",
  "1": "І",
  a: "а",
  c: "с",
  e: "е",
  o: "о",
  p: "р",
  x: "х",
  y: "у",
};

const CYRILLIC_TO_LATIN: Record<string, string> = {
  цӏцӏ: "c':",
  ціці: "c':",
  чӏчӏ: "č':",
  чічі: "č':",
  кӏкӏ: "k':",
  кікі: "k':",
  сс: "sː",
  лълъ: "ɬː",
  хх: "χː",
  цӏ: "c'",
  ці: "c'",
  чӏ: "č'",
  чі: "č'",
  цц: "cː",
  чч: "čː",
  кк: "kː",
  тӏ: "t'",
  ті: "t'",
  кӏ: "k'",
  кі: "k'",
  гӏ: "ʕ",
  гі: "ʕ",
  хӏ: "ħ",
  хі: "ħ",
  лӏ: "ƛ",
  лі: "ƛ",
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  гь: "h",
  гъ: "ʁ",
  д: "d",
  е: "e",
  ж: "ž",
  з: "z",
  и: "i",
  й: "j",
  я: "ja",
  ё: "jo",
  ю: "ju",
  къ: "q'",
  кь: "ƛ'",
  к: "k",
  лъ: "ɬ",
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
  хъ: "q",
  хь: "x",
  х: "χ",
  ц: "c",
  ч: "č",
  ш: "š",
  щ: "š:",
  ы: "y",
  э: "e",
  ӏ: "'",
  І: "'",
  і: "'",
  қ: "q",
  ғ: "gh",
  ҳ: "h",
  ӯ: "u",
};

function isCyrillicChar(char: string | undefined): boolean {
  return Boolean(char && /\p{Script=Cyrillic}/u.test(char));
}

function normalizeMixedScriptLookalikes(text: string): string {
  const characters = Array.from(text);

  return characters.map((char, index) => {
    const replacement = LATIN_TO_CYRILLIC_LOOKALIKE_MAP[char];
    if (!replacement) {
      return char;
    }

    const previous = characters[index - 1];
    const next = characters[index + 1];
    const surroundedByCyrillic =
      isCyrillicChar(previous) ||
      isCyrillicChar(next) ||
      (previous !== undefined &&
        next !== undefined &&
        LATIN_TO_CYRILLIC_LOOKALIKE_MAP[previous] &&
        LATIN_TO_CYRILLIC_LOOKALIKE_MAP[next]);

    return surroundedByCyrillic ? replacement : char;
  }).join("");
}

function transliterateCyrillic(text: string): string {
  const prepared = text.toLowerCase();
  let output = "";
  const transliterationKeys = Object.keys(CYRILLIC_TO_LATIN).sort(
    (left, right) => right.length - left.length,
  );

  for (let index = 0; index < prepared.length; index += 1) {
    const matchedKey = transliterationKeys.find((key) =>
      prepared.startsWith(key, index),
    );
    if (matchedKey) {
      output += CYRILLIC_TO_LATIN[matchedKey];
      index += matchedKey.length - 1;
      continue;
    }

    output += CYRILLIC_TO_LATIN[prepared[index]] ?? prepared[index];
  }

  return output;
}

function stripDiacritics(text: string): string {
  return text.normalize("NFD").replace(/[\u0300\u0301]/g, "").normalize("NFC");
}

function normalizeBase(text: string, translit: boolean): string {
  const normalized = normalizeMixedScriptLookalikes(
    stripDiacritics(text.normalize("NFKC")),
  ).toLowerCase();

  const base = translit
    ? stripDiacritics(transliterateCyrillic(normalized)).replace(/[’ʼ‘`]/g, "'")
    : normalized;
  const separatorPattern = translit
    ? /[~"“”«»„.,;!?()[\]{}<>/\\|+=_*&#%^@-]+/g
    : /[~`'"’ʼ"“”«»„.,;:!?()[\]{}<>/\\|+=_*&#%^@-]+/g;

  return base
    .replace(separatorPattern, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactForSearch(text: string): string {
  return text.replace(/\s+/g, "");
}

function isFieldScopedPrefixSearch(field: SearchField): boolean {
  return field !== "all";
}

function startsWithToken(text: string, query: string): boolean {
  return text.split(" ").some((token) => token.startsWith(query));
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
  field: SearchField = "all",
): boolean {
  const rank = getMatchRank(query, target, translit);
  if (rank === null) {
    return false;
  }

  return isFieldScopedPrefixSearch(field) ? rank <= 3 : true;
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

function getMatchRank(query: string, target: string, translit: boolean): number | null {
  const normalizedQuery = buildComparableForms(query, translit);
  if (!normalizedQuery.normalized) {
    return 0;
  }

  const normalizedTarget = buildComparableForms(target, translit);

  if (
    normalizedTarget.normalized === normalizedQuery.normalized ||
    normalizedTarget.compact === normalizedQuery.compact
  ) {
    return 0;
  }

  if (normalizedTarget.normalized.startsWith(normalizedQuery.normalized)) {
    return 1;
  }

  if (normalizedTarget.compact.startsWith(normalizedQuery.compact)) {
    return 2;
  }

  if (startsWithToken(normalizedTarget.normalized, normalizedQuery.normalized)) {
    return 3;
  }

  if (normalizedTarget.normalized.includes(normalizedQuery.normalized)) {
    return 4;
  }

  if (normalizedTarget.compact.includes(normalizedQuery.compact)) {
    return 5;
  }

  return null;
}

function compareBySearchRelevance(
  left: Entry,
  right: Entry,
  searchIndexById: Record<string, SearchRecord>,
  state: Pick<SearchState, "query" | "field" | "translit" | "useRegex">,
): number {
  if (!state.query.trim() || state.useRegex) {
    return 0;
  }

  const leftRecord = searchIndexById[left.id];
  const rightRecord = searchIndexById[right.id];
  if (!leftRecord || !rightRecord) {
    return 0;
  }

  const leftTarget = getEntryField(left, leftRecord, state.field);
  const rightTarget = getEntryField(right, rightRecord, state.field);
  const leftRank = getMatchRank(state.query, leftTarget, state.translit);
  const rightRank = getMatchRank(state.query, rightTarget, state.translit);

  const leftResolvedRank = leftRank ?? Number.POSITIVE_INFINITY;
  const rightResolvedRank = rightRank ?? Number.POSITIVE_INFINITY;
  if (leftResolvedRank !== rightResolvedRank) {
    return leftResolvedRank - rightResolvedRank;
  }

  const leftComparable = buildComparableForms(leftTarget, state.translit);
  const rightComparable = buildComparableForms(rightTarget, state.translit);
  if (leftComparable.compact.length !== rightComparable.compact.length) {
    return leftComparable.compact.length - rightComparable.compact.length;
  }

  return compareText(left.lemma.stem, right.lemma.stem);
}

export function sortEntries(
  entries: Entry[],
  sort: SortOption,
  searchIndexById?: Record<string, SearchRecord>,
  state?: Pick<SearchState, "query" | "field" | "translit" | "useRegex">,
): Entry[] {
  return [...entries].sort((left, right) => {
    if (searchIndexById && state) {
      const relevanceComparison = compareBySearchRelevance(left, right, searchIndexById, state);
      if (relevanceComparison !== 0) {
        return relevanceComparison;
      }
    }

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

    return matchesNormalizedQuery(state.query, rawTarget, state.translit, state.field);
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
    .map((record) => ({
      value: getSearchRecordField(record, field),
      rank: getMatchRank(query, getSearchRecordField(record, field), translit),
    }))
    .filter(
      (record) =>
        record.rank !== null &&
        (!isFieldScopedPrefixSearch(field) || (record.rank ?? Number.POSITIVE_INFINITY) <= 3),
    )
    .sort((left, right) => {
      if (left.rank !== right.rank) {
        return (left.rank ?? Number.POSITIVE_INFINITY) - (right.rank ?? Number.POSITIVE_INFINITY);
      }

      return left.value.localeCompare(right.value, "ru");
    })
    .slice(0, 8)
    .map((record) => record.value)
    .filter(Boolean);
}
