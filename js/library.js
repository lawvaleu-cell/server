(() => {
  "use strict";

  let ALL = [];         // all published references
  let VISIBLE = [];     // after search+filter+sort
  let renderCount = 0;
  const PAGE_SIZE = 9;

  const state = {
    query: "",
    sort: "newest",
    filters: { type: "", category: "", author: "", year: "", language: "", university: "", country: "" }
  };

  const els = {};

  function cacheEls() {
    els.grid = document.getElementById("reference-grid");
    els.search = document.getElementById("library-search-input");
    els.sort = document.getElementById("library-sort-select");
    els.resultsMeta = document.getElementById("library-results-meta");
    els.loadMoreWrap = document.getElementById("load-more-wrap");
    els.loadMoreBtn = document.getElementById("load-more-btn");
    els.filterType = document.getElementById("filter-type-chips");
    els.filterCategory = document.getElementById("filter-category");
    els.filterAuthor = document.getElementById("filter-author");
    els.filterYear = document.getElementById("filter-year");
    els.filterLanguage = document.getElementById("filter-language");
    els.filterUniversity = document.getElementById("filter-university");
    els.filterCountry = document.getElementById("filter-country");
    els.filterClear = document.getElementById("filter-clear");
    els.filterPanel = document.getElementById("library-filters");
    els.filterToggle = document.getElementById("library-filter-toggle");
    els.filterClose = document.getElementById("library-filters-close-btn");
    els.modalBackdrop = document.getElementById("ref-modal-backdrop");
    els.modalBody = document.getElementById("ref-modal-content");
  }

  /* ---------------------------------------------------------
     Filter panel population (dynamic — driven entirely by data)
  --------------------------------------------------------- */
  function populateFilters(list, lang) {
    // Type chips: only show types actually present in the data.
    const presentTypes = new Set(list.map((r) => r.type));
    const allLabel = RA9MANA_I18N.t("library.filters.allTypes") || "All";
    let chipsHtml = `<button type="button" class="filter-chip is-active" data-type="">${RA9MANA_LIBRARY.esc(allLabel)}</button>`;
    RA9MANA_LIBRARY_TYPES.forEach((t) => {
      if (!presentTypes.has(t.id)) return;
      const label = RA9MANA_I18N.t(t.labelKey) || t.id;
      chipsHtml += `<button type="button" class="filter-chip" data-type="${t.id}">${RA9MANA_LIBRARY.esc(label)}</button>`;
    });
    els.filterType.innerHTML = chipsHtml;

    fillSelect(els.filterCategory, RA9MANA_LIBRARY.distinctValues(list, "category"), "library.filters.allCategories");
    fillSelect(els.filterAuthor, RA9MANA_LIBRARY.distinctValues(list, "author"), "library.filters.allAuthors");
    fillSelect(els.filterYear, RA9MANA_LIBRARY.distinctValues(list, "year").sort((a, b) => b - a), "library.filters.allYears");
    fillSelect(els.filterUniversity, RA9MANA_LIBRARY.distinctValues(list, "university"), "library.filters.allUniversities");
    fillSelect(els.filterCountry, RA9MANA_LIBRARY.distinctValues(list, "country"), "library.filters.allCountries");

    const langAllLabel = RA9MANA_I18N.t("library.filters.allLanguages") || "All";
    let langHtml = `<option value="">${RA9MANA_LIBRARY.esc(langAllLabel)}</option>`;
    RA9MANA_LIBRARY_LANGUAGES.forEach((l) => {
      if (!list.some((r) => r.language === l.id)) return;
      langHtml += `<option value="${l.id}">${RA9MANA_LIBRARY.esc(RA9MANA_I18N.t(l.labelKey) || l.id)}</option>`;
    });
    els.filterLanguage.innerHTML = langHtml;
  }

  function fillSelect(select, values, allKey) {
    const allLabel = RA9MANA_I18N.t(allKey) || "All";
    let html = `<option value="">${RA9MANA_LIBRARY.esc(allLabel)}</option>`;
    values.forEach((v) => { html += `<option value="${RA9MANA_LIBRARY.esc(v)}">${RA9MANA_LIBRARY.esc(v)}</option>`; });
    select.innerHTML = html;
  }

  /* ---------------------------------------------------------
     Compute + render
  --------------------------------------------------------- */
  function recompute() {
    let list = RA9MANA_LIBRARY.filterAndSearch(ALL, state.query, state.filters);
    list = RA9MANA_LIBRARY.sortList(list, state.sort);
    VISIBLE = list;
    renderCount = 0;
    renderGrid(true);
  }

  function cardHtml(ref, lang) {
    const typeLabel = RA9MANA_LIBRARY.typeLabelFor(ref.type, lang);
    const langLabel = RA9MANA_LIBRARY.languageLabelFor(ref.language);
    const cover = ref.cover
      ? `<img src="${RA9MANA_LIBRARY.esc(ref.cover)}" alt="" loading="lazy">`
      : `<span class="ref-cover-fallback">${RA9MANA_LIBRARY.esc((ref.title || "?").trim().charAt(0))}</span>`;
    const readLabel = RA9MANA_I18N.t("library.card.read") || "Read";
    const noFileLabel = RA9MANA_I18N.t("library.card.noFile") || "";
    return `
      <article class="ref-card reveal" data-ref-id="${RA9MANA_LIBRARY.esc(ref.id)}" role="button" tabindex="0">
        <div class="ref-cover">
          ${cover}
          <span class="ref-type-badge">${RA9MANA_LIBRARY.esc(typeLabel)}</span>
        </div>
        <div class="ref-body">
          <div class="ref-meta-line"><span>${ref.year || ""}</span>${ref.category ? `<span>&middot; ${RA9MANA_LIBRARY.esc(ref.category)}</span>` : ""}</div>
          <h3 class="ref-title">${RA9MANA_LIBRARY.esc(ref.title)}</h3>
          <p class="ref-author">${RA9MANA_LIBRARY.esc(ref.author || "")}</p>
          <p class="ref-desc">${RA9MANA_LIBRARY.esc(ref.description || "")}</p>
          <div class="ref-foot">
            <span class="ref-lang">${RA9MANA_LIBRARY.esc(langLabel)}</span>
            <div class="ref-foot-actions">
              <span class="ref-icon-btn" title="${RA9MANA_LIBRARY.esc(ref.pdf ? readLabel : noFileLabel)}" ${ref.pdf ? "" : "aria-disabled=\"true\""}>
                <svg><use href="assets/icons/icons.svg#icon-${ref.pdf ? "eye" : "book"}"></use></svg>
              </span>
            </div>
          </div>
        </div>
      </article>`;
  }

  function renderGrid(reset) {
    const lang = RA9MANA_I18N.getLang();
    if (reset) els.grid.innerHTML = "";

    if (VISIBLE.length === 0) {
      const title = RA9MANA_I18N.t("library.empty.title") || "No results";
      const desc = RA9MANA_I18N.t("library.empty.desc") || "";
      els.grid.innerHTML = `
        <div class="library-state">
          <svg><use href="assets/icons/icons.svg#icon-search"></use></svg>
          <h3>${RA9MANA_LIBRARY.esc(title)}</h3>
          <p>${RA9MANA_LIBRARY.esc(desc)}</p>
        </div>`;
      els.loadMoreWrap.style.display = "none";
      updateResultsMeta(0, 0);
      return;
    }

    const slice = VISIBLE.slice(renderCount, renderCount + PAGE_SIZE);
    slice.forEach((ref) => {
      els.grid.insertAdjacentHTML("beforeend", cardHtml(ref, lang));
    });
    renderCount += slice.length;

    els.loadMoreWrap.style.display = renderCount < VISIBLE.length ? "flex" : "none";
    updateResultsMeta(VISIBLE.length, ALL.length);
    observeReveals();
  }

  function updateResultsMeta(shown, total) {
    const template = RA9MANA_I18N.t("library.results.count") || "{count} references";
    els.resultsMeta.innerHTML = `<b>${shown}</b> ${RA9MANA_LIBRARY.esc(template.replace("{count}", "").trim())}`;
  }

  /* ---------------------------------------------------------
     Reveal-on-scroll (reuses main.js visual pattern locally)
  --------------------------------------------------------- */
  let observer = null;
  function observeReveals() {
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
      return;
    }
    if (!observer) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
        });
      }, { threshold: 0.1, rootMargin: "0px 0px -30px 0px" });
    }
    document.querySelectorAll(".reveal:not(.is-visible)").forEach((el) => observer.observe(el));
  }

  /* ---------------------------------------------------------
     Detail modal
  --------------------------------------------------------- */
  function contributorBlock(ref) {
    const c = ref.contributor || {};
    const showAny = c.showName || c.showPhoto || c.showBio || c.showLinks;
    if (!showAny) return "";
    const name = c.showName && c.name ? c.name : (RA9MANA_I18N.t("library.detail.contributorAnon") || "");
    const photo = c.showPhoto && c.photo
      ? `<img class="ref-contributor-photo" src="${RA9MANA_LIBRARY.esc(c.photo)}" alt="">`
      : `<span class="ref-contributor-photo-fallback">${RA9MANA_LIBRARY.esc((name || "?").charAt(0))}</span>`;
    const bio = c.showBio && c.bio ? `<div class="ref-contributor-bio">${RA9MANA_LIBRARY.esc(c.bio)}</div>` : "";
    let links = "";
    if (c.showLinks && c.links) {
      const map = [
        ["website", "website"], ["linkedin", "linkedin"], ["facebook", "facebook"],
        ["instagram", "instagram"], ["x", "x-social"], ["github", "github"]
      ];
      map.forEach(([key, icon]) => {
        if (c.links[key]) {
          links += `<a href="${RA9MANA_LIBRARY.esc(c.links[key])}" target="_blank" rel="noopener noreferrer"><svg><use href="assets/icons/icons.svg#icon-${icon}"></use></svg></a>`;
        }
      });
    }
    return `
      <div class="ref-contributor">
        ${photo}
        <div>
          ${name ? `<div class="ref-contributor-name">${RA9MANA_LIBRARY.esc(name)}</div>` : ""}
          ${bio}
          ${links ? `<div class="ref-contributor-links">${links}</div>` : ""}
        </div>
      </div>`;
  }

  function openModal(ref) {
    const lang = RA9MANA_I18N.getLang();
    const typeLabel = RA9MANA_LIBRARY.typeLabelFor(ref.type, lang);
    const langLabel = RA9MANA_LIBRARY.languageLabelFor(ref.language);
    const cover = ref.cover
      ? `<img src="${RA9MANA_LIBRARY.esc(ref.cover)}" alt="">`
      : `<span class="ref-modal-hero-fallback">${RA9MANA_LIBRARY.esc((ref.title || "?").charAt(0))}</span>`;

    const facts = [
      [RA9MANA_I18N.t("library.detail.year"), ref.year],
      [RA9MANA_I18N.t("library.detail.language"), langLabel],
      [RA9MANA_I18N.t("library.detail.category"), ref.category],
      [RA9MANA_I18N.t("library.detail.university"), ref.university],
      [RA9MANA_I18N.t("library.detail.country"), ref.country],
      [RA9MANA_I18N.t("library.detail.addedOn"), ref.createdAt]
    ].filter(([, v]) => v);

    const keywords = Array.isArray(ref.keywords) && ref.keywords.length
      ? `<div class="ref-keywords">${ref.keywords.map((k) => `<span class="ref-keyword">${RA9MANA_LIBRARY.esc(k)}</span>`).join("")}</div>`
      : "";

    const readLabel = RA9MANA_I18N.t("library.detail.readReference") || "Read";
    const noFileLabel = RA9MANA_I18N.t("library.detail.noFile") || "";
    const sourceLine = ref.source ? `<p class="field-hint" style="margin-bottom:var(--space-2)">${RA9MANA_I18N.t("library.detail.source")}: ${RA9MANA_LIBRARY.esc(ref.source)}</p>` : "";

    els.modalBody.innerHTML = `
      <button type="button" class="ref-modal-close" data-close-modal aria-label="${RA9MANA_LIBRARY.esc(RA9MANA_I18N.t("library.detail.close") || "Close")}">
        <svg><use href="assets/icons/icons.svg#icon-close"></use></svg>
      </button>
      <div class="ref-modal-hero">${cover}</div>
      <div class="ref-modal-body">
        <span class="ref-modal-badge">${RA9MANA_LIBRARY.esc(typeLabel)}</span>
        <h2>${RA9MANA_LIBRARY.esc(ref.title)}</h2>
        <p class="ref-author">${RA9MANA_LIBRARY.esc(ref.author || "")}</p>
        <div class="ref-modal-facts">
          ${facts.map(([k, v]) => `<div class="ref-fact"><span>${RA9MANA_LIBRARY.esc(k)}</span><b>${RA9MANA_LIBRARY.esc(v)}</b></div>`).join("")}
        </div>
        <p class="ref-modal-desc">${RA9MANA_LIBRARY.esc(ref.description || "")}</p>
        ${keywords}
        ${sourceLine}
        <div class="ref-modal-actions">
          ${ref.pdf
            ? `<button type="button" class="btn btn-primary btn-sm" id="ref-toggle-pdf"><span>${RA9MANA_LIBRARY.esc(readLabel)}</span><svg><use href="assets/icons/icons.svg#icon-eye"></use></svg></button>`
            : `<span class="btn btn-ghost btn-sm" aria-disabled="true" style="opacity:.6">${RA9MANA_LIBRARY.esc(noFileLabel)}</span>`}
        </div>
        <div class="ref-pdf-viewer" id="ref-pdf-viewer" style="display:none">
          <iframe src="" title="PDF" loading="lazy"></iframe>
        </div>
        ${contributorBlock(ref)}
      </div>
    `;

    const toggleBtn = document.getElementById("ref-toggle-pdf");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        const viewer = document.getElementById("ref-pdf-viewer");
        const iframe = viewer.querySelector("iframe");
        const isHidden = viewer.style.display === "none";
        viewer.style.display = isHidden ? "block" : "none";
        if (isHidden) iframe.src = ref.pdf;
        else iframe.src = "";
      });
    }

    els.modalBackdrop.classList.add("is-open");
    document.body.classList.add("modal-open");
    const url = new URL(window.location.href);
    url.searchParams.set("ref", ref.id);
    history.pushState({ refModal: ref.id }, "", url);
  }

  function closeModal(skipHistory) {
    els.modalBackdrop.classList.remove("is-open");
    document.body.classList.remove("modal-open");
    els.modalBody.innerHTML = "";
    if (!skipHistory) {
      const url = new URL(window.location.href);
      url.searchParams.delete("ref");
      history.pushState({}, "", url);
    }
  }

  function openFromQueryString() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("ref");
    if (!id) return;
    const ref = ALL.find((r) => r.id === id);
    if (ref) openModal(ref);
  }

  /* ---------------------------------------------------------
     Events
  --------------------------------------------------------- */
  let searchDebounce = null;
  function bindEvents() {
    els.search.addEventListener("input", () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => { state.query = els.search.value; recompute(); }, 220);
    });

    els.sort.addEventListener("change", () => { state.sort = els.sort.value; recompute(); });

    [["category", els.filterCategory], ["author", els.filterAuthor], ["year", els.filterYear],
     ["language", els.filterLanguage], ["university", els.filterUniversity], ["country", els.filterCountry]]
      .forEach(([key, el]) => {
        el.addEventListener("change", () => { state.filters[key] = el.value; recompute(); });
      });

    els.filterType.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-type]");
      if (!btn) return;
      els.filterType.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("is-active"));
      btn.classList.add("is-active");
      state.filters.type = btn.getAttribute("data-type");
      recompute();
    });

    els.filterClear.addEventListener("click", () => {
      state.query = ""; els.search.value = "";
      state.filters = { type: "", category: "", author: "", year: "", language: "", university: "", country: "" };
      [els.filterCategory, els.filterAuthor, els.filterYear, els.filterLanguage, els.filterUniversity, els.filterCountry].forEach((el) => (el.value = ""));
      els.filterType.querySelectorAll(".filter-chip").forEach((c) => c.classList.toggle("is-active", c.getAttribute("data-type") === ""));
      recompute();
    });

    els.loadMoreBtn.addEventListener("click", () => renderGrid(false));

    els.grid.addEventListener("click", (e) => {
      const card = e.target.closest("[data-ref-id]");
      if (!card) return;
      const ref = ALL.find((r) => r.id === card.getAttribute("data-ref-id"));
      if (ref) openModal(ref);
    });
    els.grid.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const card = e.target.closest("[data-ref-id]");
      if (!card) return;
      e.preventDefault();
      const ref = ALL.find((r) => r.id === card.getAttribute("data-ref-id"));
      if (ref) openModal(ref);
    });

    els.modalBackdrop.addEventListener("click", (e) => {
      if (e.target === els.modalBackdrop || e.target.closest("[data-close-modal]")) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && els.modalBackdrop.classList.contains("is-open")) closeModal();
    });
    window.addEventListener("popstate", () => {
      const params = new URLSearchParams(window.location.search);
      if (!params.get("ref")) closeModal(true);
      else openFromQueryString();
    });

    if (els.filterToggle) {
      els.filterToggle.addEventListener("click", () => els.filterPanel.classList.add("is-open"));
    }
    if (els.filterClose) {
      els.filterClose.addEventListener("click", () => els.filterPanel.classList.remove("is-open"));
    }

    document.addEventListener("ra9mana:langchange", () => {
      populateFilters(ALL, RA9MANA_I18N.getLang());
      recompute();
    });
  }

  /* ---------------------------------------------------------
     Boot
  --------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", async () => {
    cacheEls();
    bindEvents();
    await RA9MANA_I18N.init();

    ALL = await RA9MANA_LIBRARY.loadPublished();
    populateFilters(ALL, RA9MANA_I18N.getLang());
    recompute();
    openFromQueryString();

    document.addEventListener("ra9mana:langchange", () => {
      // re-render current view with new language strings
      renderCount = 0;
      renderGrid(true);
    });
  });
})();
