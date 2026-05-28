export type FilterDefinition = {
  type: "value-list" | "boolean";
  values?: string[];
  entryCount?: number;
};

export type DatasetMeta = {
  generatedAt: string;
  inputCsv: string;
  rowCount: number;
  entryCount: number;
  definitionCount: number;
  contextCount: number;
  grouping: {
    strategy: string;
    sourceBackedEntries: number;
    fallbackEntries: number;
  };
  schemaVersion: number;
};

export type Dataset = {
  meta: DatasetMeta;
  filters: Record<string, FilterDefinition>;
  searchIndex: SearchRecord[];
  entries: Entry[];
};

export type SearchRecord = {
  entryId: string;
  stem: string;
  infinitive: string;
  stem0: string;
  stem1: string;
  stem2: string;
  definitionCount: number;
  searchText: string;
  searchTextNormalized: string;
};

export type Entry = {
  id: string;
  lemma: {
    stem: string;
    infinitive: string;
    source: string;
  };
  grammar: {
    themeVowel: string;
    verbClass: string;
    stems: {
      stem0: string;
      stem1: string;
      stem2: string;
      stemType: string;
      stemNotes: string;
    };
    accentParadigm: string;
    phonology: {
      structure: string;
      structureUnaccented: string;
    };
    principalParts: {
      presence: string;
      future: string;
      aorist: string;
      imperative: string;
      masdar: string;
      principlePartsRaw: string;
      unaccentedPrinciplePartsRaw: string;
    };
    agreementSlot: string;
  };
  derivation: {
    verbFormation: string;
    verbFormationStem: string;
    posVerbFormationStem: string;
    formationStemDoesNotMatch: string;
    variation: string;
    flags: Record<string, string>;
  };
  references: {
    reference: string;
    notes: string;
    comments: string;
    done: string;
  };
  summary: {
    transitivityValues: string[];
    labilityValues: string[];
  };
  definitions: Definition[];
  derivedFrom: DerivationLink[];
  outgoingDerivatives: DerivationLink[];
};

export type Definition = {
  id: string;
  idDefinition: string;
  rowNumber: number;
  definition: string;
  meaningRu: string;
  exampleImperative: string;
  transitivity: string;
  lability: string;
  lightVerb: string;
  frameSlots: Record<string, string>;
  contexts: ExampleContext[];
};

export type ExampleContext = {
  slot: number;
  text: string;
  translationRu: string;
  exampleSource: string;
};

export type DerivationLink = {
  entryId: string;
  stem: string;
  infinitive: string;
  source: string;
  formationType?: string;
  formationStem?: string;
  matchStem?: string;
  sourcePos?: string;
};

export type SortOption =
  | "alphabetical"
  | "verbClass"
  | "valency"
  | "derivation"
  | "completeness";

export type SearchField = "all" | "infinitive" | "stem" | "stem0" | "stem1" | "stem2";

export type SearchState = {
  query: string;
  field: SearchField;
  useRegex: boolean;
  translit: boolean;
  verbClass: string;
  verbFormation: string;
  transitivity: string;
  lability: string;
  onlyBookmarks: boolean;
  onlyDerived: boolean;
  onlyWithChildren: boolean;
  onlyCausative: boolean;
  sort: SortOption;
  page: number;
};
