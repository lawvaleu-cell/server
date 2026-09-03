/**
 * RA9MANA DZ — i18n engine
 * ------------------------------------------------------------
 * Genuine multi-language support: every visible string, the document
 * direction, the <html lang>, and page metadata are all driven from
 * the JSON files in /locales. No text is hard-coded per language in
 * the markup — elements simply declare which translation key they
 * need via data-i18n attributes.
 */

const RA9MANA_I18N = (() => {
  const SUPPORTED = ["fr", "en", "ar"];
  const DIR = { fr: "ltr", en: "ltr", ar: "rtl" };
  const STORAGE_KEY = "ra9mana-lang";
  const DEFAULT_LANG = "fr";

  let current = { lang: DEFAULT_LANG, dict: null };

  function resolveKey(dict, key) {
    return key.split(".").reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : null), dict);
  }

  function getLocale(lang) {
    const dict = typeof RA9MANA_LOCALES !== "undefined" ? RA9MANA_LOCALES[lang] : null;
    if (!dict) throw new Error(`Unable to load locale: ${lang}`);
    return dict;
  }

  function applyTranslations(dict) {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const value = resolveKey(dict, el.getAttribute("data-i18n"));
      if (value !== null) el.textContent = value;
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const value = resolveKey(dict, el.getAttribute("data-i18n-placeholder"));
      if (value !== null) el.setAttribute("placeholder", value);
    });

    document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      const value = resolveKey(dict, el.getAttribute("data-i18n-aria"));
      if (value !== null) el.setAttribute("aria-label", value);
    });

    // meta tags: title, description, og:*
    if (dict.meta) {
      if (dict.meta.title) document.title = dict.meta.title;
      setMeta('meta[name="description"]', dict.meta.description);
      setMeta('meta[property="og:title"]', dict.meta.ogTitle);
      setMeta('meta[property="og:description"]', dict.meta.ogDescription);
    }
  }

  function setMeta(selector, content) {
    if (!content) return;
    const el = document.querySelector(selector);
    if (el) el.setAttribute("content", content);
  }

  function updateLangButtons(lang) {
    document.querySelectorAll("[data-lang-btn]").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.getAttribute("data-lang-btn") === lang));
    });
  }

  async function setLanguage(lang, { silent } = {}) {
    if (!SUPPORTED.includes(lang)) lang = DEFAULT_LANG;
    const dict = getLocale(lang);
    current = { lang, dict };

    document.documentElement.setAttribute("lang", lang === "ar" ? "ar" : lang);
    document.documentElement.setAttribute("dir", DIR[lang]);
    document.body.classList.toggle("is-rtl", DIR[lang] === "rtl");

    applyTranslations(dict);
    updateLangButtons(lang);

    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* storage unavailable */ }

    if (!silent) {
      document.dispatchEvent(new CustomEvent("ra9mana:langchange", { detail: { lang, dict } }));
    }
  }

  function getSavedLang() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && SUPPORTED.includes(saved)) return saved;
    } catch (e) { /* storage unavailable */ }
    return null;
  }

  function init() {
    const saved = getSavedLang();
    const browser = (navigator.language || "").slice(0, 2);
    const initial = saved || (SUPPORTED.includes(browser) ? browser : DEFAULT_LANG);

    document.querySelectorAll("[data-lang-btn]").forEach((btn) => {
      btn.addEventListener("click", () => setLanguage(btn.getAttribute("data-lang-btn")));
    });

    return setLanguage(initial, { silent: false });
  }

  function t(key) {
    return current.dict ? resolveKey(current.dict, key) : null;
  }

  function getLang() { return current.lang; }

  return { init, setLanguage, t, getLang, SUPPORTED };
})();
