(() => {
  "use strict";

  /**
   * ⚙️ SITE OWNER CONFIG
   * ------------------------------------------------------------
   * Same backend endpoint used by the public "Contribute" form
   * (js/submit.js). No token or secret of any kind belongs here or
   * anywhere else in this file.
   */
  const SUBMIT_ENDPOINT = "https://server-5xab.onrender.com/api/submit-reference";

  const fileState = { pdf: null, cover: null, contributorPhoto: null };

  /* ---------------------------------------------------------
     Dropzones
  --------------------------------------------------------- */
  function wirePreviewDropzone(dropzoneId, inputId, filenameId, previewId, key) {
    const dropzone = document.getElementById(dropzoneId);
    const input = document.getElementById(inputId);
    const filenameEl = document.getElementById(filenameId);
    const previewEl = previewId ? document.getElementById(previewId) : null;

    RA9MANA_REF_FORM.wireDropzone(dropzone, input, (file) => {
      fileState[key] = file;
      filenameEl.textContent = file.name;
      const wrap = dropzone.closest(".form-field");
      if (wrap) wrap.classList.remove("has-error");
      if (previewEl && file.type && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => { previewEl.src = reader.result; previewEl.style.display = "block"; };
        reader.readAsDataURL(file);
      }
    });
  }

  function resetDropzones() {
    ["a-cover-filename", "a-pdf-filename", "a-photo-filename"].forEach((id) => { document.getElementById(id).textContent = ""; });
    ["a-cover-preview", "a-photo-preview"].forEach((id) => { const el = document.getElementById(id); el.style.display = "none"; el.src = ""; });
    fileState.pdf = null; fileState.cover = null; fileState.contributorPhoto = null;
  }

  /**
   * Builds the multipart/form-data payload sent to the backend.
   * Keeps the exact `name` attributes already used by the admin form
   * fields (same field set as submit.html, plus the admin-only
   * `status` select), then appends the three files under the same
   * keys the front-end already tracks them by (pdf, cover,
   * contributorPhoto) — mirrors js/submit.js so both forms stay in
   * sync with the backend's expected payload.
   */
  function buildFormData(form, fileState) {
    const fd = new FormData(form);
    if (fileState.pdf) fd.append("pdf", fileState.pdf, fileState.pdf.name);
    if (fileState.cover) fd.append("cover", fileState.cover, fileState.cover.name);
    if (fileState.contributorPhoto) fd.append("contributorPhoto", fileState.contributorPhoto, fileState.contributorPhoto.name);
    return fd;
  }

  /* ---------------------------------------------------------
     Add reference form
  --------------------------------------------------------- */
  function initForm() {
    const form = document.getElementById("admin-form");
    RA9MANA_REF_FORM.populateTypeSelect(document.getElementById("a-type"));
    RA9MANA_REF_FORM.populateLanguageSelect(document.getElementById("a-language"));

    wirePreviewDropzone("a-cover-dropzone", "a-cover-input", "a-cover-filename", "a-cover-preview", "cover");
    wirePreviewDropzone("a-pdf-dropzone", "a-pdf-input", "a-pdf-filename", null, "pdf");
    wirePreviewDropzone("a-photo-dropzone", "a-photo-input", "a-photo-filename", "a-photo-preview", "contributorPhoto");

    document.getElementById("admin-reset-btn").addEventListener("click", () => {
      setTimeout(resetDropzones, 0);
    });

    document.addEventListener("ra9mana:langchange", () => {
      const typeSel = document.getElementById("a-type");
      const langSel = document.getElementById("a-language");
      const typeVal = typeSel.value, langVal = langSel.value;
      RA9MANA_REF_FORM.populateTypeSelect(typeSel);
      RA9MANA_REF_FORM.populateLanguageSelect(langSel);
      typeSel.value = typeVal; langSel.value = langVal;
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const { valid, firstInvalid } = RA9MANA_REF_FORM.validate(form, fileState, { requirePdf: true });
      if (!valid) {
        if (firstInvalid && firstInvalid.scrollIntoView) firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      const submitBtn = form.querySelector("button[type=submit]");
      submitBtn.disabled = true;

      try {
        const fd = buildFormData(form, fileState);

        const res = await fetch(SUBMIT_ENDPOINT, {
          method: "POST",
          body: fd
        });

        let payload = null;
        try { payload = await res.json(); } catch (parseErr) { payload = null; }

        if (!res.ok || (payload && payload.success === false)) {
          const serverMsg = payload && (payload.message || payload.error);
          throw new Error(serverMsg || `HTTP ${res.status}`);
        }

        document.getElementById("admin-form-success").classList.add("is-visible");
        setTimeout(() => document.getElementById("admin-form-success").classList.remove("is-visible"), 4000);

        if (window.RA9MANA_showToast) window.RA9MANA_showToast(RA9MANA_I18N.t("admin.addSuccess.toast") || "Reference submitted.");

        form.reset();
        resetDropzones();
        document.getElementById("a-status").value = "published";
      } catch (err) {
        if (window.RA9MANA_showToast) {
          window.RA9MANA_showToast(RA9MANA_I18N.t("submit.errors.submitFailed") || "Something went wrong. Please try again.");
        }
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    await RA9MANA_I18N.init();
    initForm();
  });
})();
