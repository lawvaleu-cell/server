/**
 * RA9MANA DZ — Legal Library: shared engine
 * ------------------------------------------------------------
 * Used by library.html, submit.html and admin.html. Handles:
 *  - loading the reference dataset (data/library.json, falling back to
 *    the embedded copy in js/library-data.js when fetch is unavailable,
 *    e.g. when the site is opened as a local file)
 *  - safe (XSS-free) HTML escaping for all dynamically injected content
 *  - search / filter helpers shared between the library and the admin
 *  - small validation + formatting helpers reused by the submit and
 *    admin forms
 */

const RA9MANA_LIBRARY = (() => {
  const DATA_URL = "data/library.json";
  const DRAFTS_KEY = "ra9mana-library-admin-drafts";

  /* ---------------------------------------------------------
     Escaping (never trust reference content in the DOM)
  --------------------------------------------------------- */
  function esc(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* ---------------------------------------------------------
     Data loading
  --------------------------------------------------------- */
  async function loadAll() {
    try {
      if (location.protocol !== "file:") {
        const res = await fetch(DATA_URL, { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json)) return sanitizeList(json);
        }
      }
    } catch (e) {
      /* fall through to embedded fallback */
    }
    const fallback = typeof RA9MANA_LIBRARY_FALLBACK !== "undefined" ? RA9MANA_LIBRARY_FALLBACK : [];
    return sanitizeList(fallback);
  }

  function sanitizeList(list) {
    return list.filter((r) => r && typeof r === "object" && r.id && r.title);
  }

  async function loadPublished() {
    const all = await loadAll();
    return all.filter((r) => r.status === "published");
  }

  /* ---------------------------------------------------------
     Search / filter
  --------------------------------------------------------- */
  function matchesQuery(ref, query) {
    if (!query) return true;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const haystack = [
      ref.title, ref.author, ref.description, ref.category, ref.typeLabel,
      Array.isArray(ref.keywords) ? ref.keywords.join(" ") : ""
    ].join(" ").toLowerCase();
    return haystack.includes(q);
  }

  function matchesFilters(ref, filters) {
    if (filters.type && ref.type !== filters.type) return false;
    if (filters.category && ref.category !== filters.category) return false;
    if (filters.author && ref.author !== filters.author) return false;
    if (filters.year && String(ref.year) !== String(filters.year)) return false;
    if (filters.language && ref.language !== filters.language) return false;
    if (filters.university && ref.university !== filters.university) return false;
    if (filters.country && ref.country !== filters.country) return false;
    return true;
  }

  function filterAndSearch(list, query, filters) {
    return list.filter((r) => matchesQuery(r, query) && matchesFilters(r, filters || {}));
  }

  function sortList(list, sortKey) {
    const arr = list.slice();
    switch (sortKey) {
      case "oldest":
        return arr.sort((a, b) => (a.year || 0) - (b.year || 0) || String(a.createdAt).localeCompare(String(b.createdAt)));
      case "titleAsc":
        return arr.sort((a, b) => String(a.title).localeCompare(String(b.title)));
      case "titleDesc":
        return arr.sort((a, b) => String(b.title).localeCompare(String(a.title)));
      case "newest":
      default:
        return arr.sort((a, b) => (b.year || 0) - (a.year || 0) || String(b.createdAt).localeCompare(String(a.createdAt)));
    }
  }

  // Build the distinct-value options for a field, used to populate
  // filter dropdowns dynamically from whatever data actually exists —
  // so the filters stay accurate as new references are added, with no
  // hardcoded list to maintain.
  function distinctValues(list, field) {
    const set = new Set();
    list.forEach((r) => { if (r[field]) set.add(r[field]); });
    return Array.from(set).sort((a, b) => String(a).localeCompare(String(b), "fr"));
  }

  /* ---------------------------------------------------------
     Formatting
  --------------------------------------------------------- */
  function typeLabelFor(typeId, lang) {
    const t = RA9MANA_LIBRARY_TYPES.find((x) => x.id === typeId);
    if (!t) return typeId || "";
    return RA9MANA_I18N.t(t.labelKey) || typeId;
  }

  function languageLabelFor(langId) {
    const l = RA9MANA_LIBRARY_LANGUAGES.find((x) => x.id === langId);
    if (!l) return langId || "";
    return RA9MANA_I18N.t(l.labelKey) || langId;
  }

  /* ---------------------------------------------------------
     Slug / id generation (used by submit + admin)
  --------------------------------------------------------- */
  function slugify(str) {
    return String(str || "")
      .toLowerCase()
      .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "reference";
  }

  function generateId(title) {
    const base = slugify(title);
    const suffix = Math.random().toString(36).slice(2, 6);
    return `${base}-${suffix}`;
  }

  /* ---------------------------------------------------------
     File validation (used by submit + admin)
  --------------------------------------------------------- */
  const PDF_MAX_BYTES = 25 * 1024 * 1024; // 25MB
  const IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5MB
  const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

  function validatePdf(file) {
    if (!file) return "required";
    if (file.type && file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) return "invalidType";
    if (file.size > PDF_MAX_BYTES) return "fileTooLarge";
    return null;
  }

  function validateImage(file) {
    if (!file) return null; // optional
    if (file.type && !IMAGE_TYPES.includes(file.type)) return "invalidType";
    if (file.size > IMAGE_MAX_BYTES) return "fileTooLarge";
    return null;
  }

  function fileExt(file) {
    const m = /\.([a-z0-9]+)$/i.exec(file.name || "");
    return m ? m[1].toLowerCase() : "";
  }

  /* ---------------------------------------------------------
     Local admin drafts (localStorage) — session convenience only,
     never sent anywhere.
  --------------------------------------------------------- */
  function getDrafts() {
    try {
      const raw = localStorage.getItem(DRAFTS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  }

  function saveDrafts(list) {
    try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
  }

  function addDraft(entry) {
    const list = getDrafts();
    list.push(entry);
    saveDrafts(list);
    return list;
  }

  function removeDraft(id) {
    const list = getDrafts().filter((d) => d.id !== id);
    saveDrafts(list);
    return list;
  }

  function clearDrafts() { saveDrafts([]); }

  return {
    esc, loadAll, loadPublished, matchesQuery, matchesFilters, filterAndSearch,
    sortList, distinctValues, typeLabelFor, languageLabelFor,
    slugify, generateId, validatePdf, validateImage, fileExt,
    getDrafts, saveDrafts, addDraft, removeDraft, clearDrafts,
    PDF_MAX_BYTES, IMAGE_MAX_BYTES
  };
})();
