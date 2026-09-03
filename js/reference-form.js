/**
 * RA9MANA DZ — Legal Library: shared reference form logic
 * ------------------------------------------------------------
 * Used by both submit.html (public contribution) and admin.html
 * (local admin "add reference" tab) since the two forms share almost
 * every field. Keeps validation and data-building in one place so
 * the two pages can never drift apart.
 */
const RA9MANA_REF_FORM = (() => {

  function populateTypeSelect(select) {
    const lang = RA9MANA_I18N.getLang();
    select.innerHTML = `<option value="">${RA9MANA_LIBRARY.esc(RA9MANA_I18N.t("submit.fields.typePlaceholder") || "")}</option>` +
      RA9MANA_LIBRARY_TYPES.map((t) => `<option value="${t.id}">${RA9MANA_LIBRARY.esc(RA9MANA_I18N.t(t.labelKey) || t.id)}</option>`).join("");
  }

  function populateLanguageSelect(select) {
    select.innerHTML = `<option value="">${RA9MANA_LIBRARY.esc(RA9MANA_I18N.t("submit.fields.languagePlaceholder") || "")}</option>` +
      RA9MANA_LIBRARY_LANGUAGES.map((l) => `<option value="${l.id}">${RA9MANA_LIBRARY.esc(RA9MANA_I18N.t(l.labelKey) || l.id)}</option>`).join("");
  }

  function showError(fieldWrap, message) {
    fieldWrap.classList.add("has-error");
    const err = fieldWrap.querySelector(".field-error");
    if (err) err.textContent = message;
  }

  function clearError(fieldWrap) {
    fieldWrap.classList.remove("has-error");
  }

  function clearAllErrors(form) {
    form.querySelectorAll(".form-field.has-error").forEach((f) => clearError(f));
  }

  /**
   * Validates the shared fields. `fileState` = { pdf: File|null, cover: File|null, contributorPhoto: File|null }
   * Returns { valid: boolean, firstInvalid: Element|null }
   */
  function validate(form, fileState, { requirePdf = true } = {}) {
    clearAllErrors(form);
    let valid = true;
    let firstInvalid = null;

    function required(name) {
      const el = form.elements[name];
      const wrap = el.closest(".form-field");
      if (!el.value || !el.value.trim()) {
        showError(wrap, RA9MANA_I18N.t("submit.errors.required") || "Required field");
        valid = false;
        if (!firstInvalid) firstInvalid = el;
      }
    }

    ["title", "author", "type", "category", "year", "language", "description"].forEach(required);

    const yearEl = form.elements["year"];
    if (yearEl.value) {
      const y = Number(yearEl.value);
      const wrap = yearEl.closest(".form-field");
      if (!Number.isInteger(y) || y < 1900 || y > 2100) {
        showError(wrap, RA9MANA_I18N.t("submit.errors.invalidYear") || "Invalid year");
        valid = false;
        if (!firstInvalid) firstInvalid = yearEl;
      }
    }

    if (requirePdf) {
      const pdfWrap = document.getElementById("field-pdf");
      const err = RA9MANA_LIBRARY.validatePdf(fileState.pdf);
      if (err) {
        showError(pdfWrap, RA9MANA_I18N.t(`submit.errors.${err}`) || "Invalid file");
        valid = false;
        if (!firstInvalid) firstInvalid = pdfWrap;
      }
    }

    const coverErr = RA9MANA_LIBRARY.validateImage(fileState.cover);
    if (coverErr) {
      const wrap = document.getElementById("field-cover");
      showError(wrap, RA9MANA_I18N.t(`submit.errors.${coverErr}`) || "Invalid file");
      valid = false;
      if (!firstInvalid) firstInvalid = wrap;
    }

    const photoErr = RA9MANA_LIBRARY.validateImage(fileState.contributorPhoto);
    if (photoErr) {
      const wrap = document.getElementById("field-contributor-photo");
      if (wrap) {
        showError(wrap, RA9MANA_I18N.t(`submit.errors.${photoErr}`) || "Invalid file");
        valid = false;
        if (!firstInvalid) firstInvalid = wrap;
      }
    }

    return { valid, firstInvalid };
  }

  function splitKeywords(raw) {
    return String(raw || "")
      .split(/[,،\n]/)
      .map((k) => k.trim())
      .filter(Boolean)
      .slice(0, 20);
  }

  /**
   * Builds a schema-compliant entry object from the form + collected files.
   * File paths are relative paths the admin/contributor will place under
   * /books and /covers once they copy the exported package into the project.
   */
  function buildEntry(form, fileState, { status = "published" } = {}) {
    const fd = new FormData(form);
    const title = (fd.get("title") || "").trim();
    const id = RA9MANA_LIBRARY.generateId(title);
    const typeId = fd.get("type") || "";
    const typeCfg = RA9MANA_LIBRARY_TYPES.find((t) => t.id === typeId);
    const typeLabel = typeCfg ? (RA9MANA_I18N.t(typeCfg.labelKey) || typeId) : typeId;

    const pdfName = fileState.pdf ? `${id}.${RA9MANA_LIBRARY.fileExt(fileState.pdf) || "pdf"}` : "";
    const coverName = fileState.cover ? `${id}.${RA9MANA_LIBRARY.fileExt(fileState.cover) || "jpg"}` : "";
    const photoName = fileState.contributorPhoto ? `${id}-contributor.${RA9MANA_LIBRARY.fileExt(fileState.contributorPhoto) || "jpg"}` : "";

    return {
      id,
      title,
      author: (fd.get("author") || "").trim(),
      type: typeId,
      typeLabel,
      category: (fd.get("category") || "").trim(),
      year: Number(fd.get("year")) || null,
      language: fd.get("language") || "",
      university: (fd.get("university") || "").trim(),
      country: (fd.get("country") || "").trim(),
      description: (fd.get("description") || "").trim(),
      keywords: splitKeywords(fd.get("keywords")),
      cover: coverName ? `covers/${coverName}` : "",
      pdf: pdfName ? `books/${pdfName}` : "",
      source: (fd.get("source") || "").trim(),
      externalLink: (fd.get("externalLink") || "").trim(),
      notes: (fd.get("notes") || "").trim(),
      contributor: {
        name: (fd.get("contributorName") || "").trim(),
        bio: (fd.get("contributorBio") || "").trim(),
        photo: photoName ? `covers/${photoName}` : "",
        showName: fd.get("showName") === "on",
        showPhoto: fd.get("showPhoto") === "on",
        showBio: fd.get("showBio") === "on",
        showLinks: fd.get("showLinks") === "on",
        links: {
          website: (fd.get("linkWebsite") || "").trim(),
          linkedin: (fd.get("linkLinkedin") || "").trim(),
          facebook: (fd.get("linkFacebook") || "").trim(),
          instagram: (fd.get("linkInstagram") || "").trim(),
          x: (fd.get("linkX") || "").trim(),
          github: (fd.get("linkGithub") || "").trim()
        }
      },
      status,
      createdAt: new Date().toISOString().slice(0, 10),
      _files: {
        pdf: fileState.pdf ? { file: fileState.pdf, name: pdfName } : null,
        cover: fileState.cover ? { file: fileState.cover, name: coverName } : null,
        contributorPhoto: fileState.contributorPhoto ? { file: fileState.contributorPhoto, name: photoName } : null
      }
    };
  }

  /**
   * Wires a dropzone element: click-to-browse, drag & drop, and change
   * event, calling onFile(file) whenever a file is chosen/dropped.
   */
  function wireDropzone(dropzone, input, onFile) {
    dropzone.addEventListener("click", () => input.click());
    dropzone.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
    input.addEventListener("change", () => { if (input.files[0]) onFile(input.files[0]); });
    ["dragenter", "dragover"].forEach((evt) => dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add("is-dragover"); }));
    ["dragleave", "drop"].forEach((evt) => dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove("is-dragover"); }));
    dropzone.addEventListener("drop", (e) => {
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) { onFile(file); try { input.files = e.dataTransfer.files; } catch (err) { /* ignore */ } }
    });
  }

  return { populateTypeSelect, populateLanguageSelect, validate, buildEntry, wireDropzone, splitKeywords, showError, clearAllErrors };
})();
