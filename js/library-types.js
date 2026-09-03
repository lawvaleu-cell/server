/**
 * RA9MANA DZ — Legal Library: reference types configuration
 * ------------------------------------------------------------
 * Single source of truth for the list of reference "types" used across
 * the library (filters, submission form, admin, badges). Extend this
 * array to add a new type — the whole library (filters, form, badges)
 * picks it up automatically without touching any other file.
 *
 * `labelKey` points to a translation key present in every locale file
 * under `libraryTypes.<id>`.
 */
const RA9MANA_LIBRARY_TYPES = [
  { id: "academic_research",   labelKey: "libraryTypes.academic_research" },
  { id: "master_thesis",       labelKey: "libraryTypes.master_thesis" },
  { id: "magister_thesis",     labelKey: "libraryTypes.magister_thesis" },
  { id: "phd_thesis",          labelKey: "libraryTypes.phd_thesis" },
  { id: "book",                labelKey: "libraryTypes.book" },
  { id: "personal_book",       labelKey: "libraryTypes.personal_book" },
  { id: "scientific_article",  labelKey: "libraryTypes.scientific_article" },
  { id: "legal_article",       labelKey: "libraryTypes.legal_article" },
  { id: "study",                labelKey: "libraryTypes.study" },
  { id: "university_research", labelKey: "libraryTypes.university_research" },
  { id: "lecture",             labelKey: "libraryTypes.lecture" },
  { id: "study_note",          labelKey: "libraryTypes.study_note" },
  { id: "law",                 labelKey: "libraryTypes.law" },
  { id: "order",               labelKey: "libraryTypes.order" },
  { id: "decree",              labelKey: "libraryTypes.decree" },
  { id: "presidential_decree", labelKey: "libraryTypes.presidential_decree" },
  { id: "executive_decree",    labelKey: "libraryTypes.executive_decree" },
  { id: "decision",            labelKey: "libraryTypes.decision" },
  { id: "publication",         labelKey: "libraryTypes.publication" },
  { id: "agreement",           labelKey: "libraryTypes.agreement" },
  { id: "treaty",              labelKey: "libraryTypes.treaty" },
  { id: "case_law",            labelKey: "libraryTypes.case_law" },
  { id: "court_judgment",      labelKey: "libraryTypes.court_judgment" },
  { id: "court_decision",      labelKey: "libraryTypes.court_decision" },
  { id: "official_document",   labelKey: "libraryTypes.official_document" },
  { id: "report",              labelKey: "libraryTypes.report" },
  { id: "guide",                labelKey: "libraryTypes.guide" },
  { id: "other",               labelKey: "libraryTypes.other" }
];

// Languages a reference can be written in.
const RA9MANA_LIBRARY_LANGUAGES = [
  { id: "ar",    labelKey: "library.langAr" },
  { id: "fr",    labelKey: "library.langFr" },
  { id: "en",    labelKey: "library.langEn" },
  { id: "other", labelKey: "library.langOther" }
];

// Workflow status of a reference. Only "published" is ever shown to the
// public on the static site — the others exist so the data model can
// support a real moderation workflow later without being rebuilt.
const RA9MANA_LIBRARY_STATUSES = ["draft", "pending", "published", "rejected"];

if (typeof module !== "undefined" && module.exports) {
  module.exports = { RA9MANA_LIBRARY_TYPES, RA9MANA_LIBRARY_LANGUAGES, RA9MANA_LIBRARY_STATUSES };
}
