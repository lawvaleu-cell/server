(() => {
  "use strict";

  /**
   * ⚙️ SITE OWNER CONFIG
   * ------------------------------------------------------------
   * Backend endpoint that receives reference submissions. No token
   * or secret of any kind belongs here or anywhere else in this file.
   */
  const SUBMIT_ENDPOINT = "https://server-5xab.onrender.com/api/submit-reference";

  const fileState = { pdf: null, cover: null, contributorPhoto: null };

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

  /**
   * Builds the multipart/form-data payload sent to the backend.
   * Keeps the exact `name` attributes already used by the HTML form
   * fields (title, author, type, category, year, language, country,
   * university, description, keywords, source, externalLink, notes,
   * contributorName, contributorEmail, contributorBio, linkWebsite,
   * linkLinkedin, linkFacebook, linkInstagram, linkX, linkGithub,
   * showName, showPhoto, showBio, showLinks), then appends the three
   * files under the same keys the front-end already tracks them by
   * (pdf, cover, contributorPhoto).
   *
   * NOTE: the exact field names the Render backend expects were not
   * available to verify against. This uses the site's own existing
   * field names as the safest default — confirm they match the
   * backend's parser, and adjust the `fd.append(...)` keys below for
   * the three files if it expects different ones.
   */
  function buildFormData(form, fileState) {
    const fd = new FormData(form);
    if (fileState.pdf) fd.append("pdf", fileState.pdf, fileState.pdf.name);
    if (fileState.cover) fd.append("cover", fileState.cover, fileState.cover.name);
    if (fileState.contributorPhoto) fd.append("contributorPhoto", fileState.contributorPhoto, fileState.contributorPhoto.name);
    return fd;
  }

  function resetFormState(form) {
    form.reset();
    fileState.pdf = null;
    fileState.cover = null;
    fileState.contributorPhoto = null;
    ["cover-filename", "pdf-filename", "photo-filename"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = "";
    });
    ["cover-preview", "photo-preview"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) { el.style.display = "none"; el.src = ""; }
    });
  }

  function initForm() {
    const form = document.getElementById("submit-form");
    if (!form) return;

    RA9MANA_REF_FORM.populateTypeSelect(document.getElementById("s-type"));
    RA9MANA_REF_FORM.populateLanguageSelect(document.getElementById("s-language"));

    wirePreviewDropzone("cover-dropzone", "cover-input", "cover-filename", "cover-preview", "cover");
    wirePreviewDropzone("pdf-dropzone", "pdf-input", "pdf-filename", null, "pdf");
    wirePreviewDropzone("photo-dropzone", "photo-input", "photo-filename", "photo-preview", "contributorPhoto");

    document.addEventListener("ra9mana:langchange", () => {
      const typeSel = document.getElementById("s-type");
      const langSel = document.getElementById("s-language");
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

        document.getElementById("form-success").classList.add("is-visible");
        document.getElementById("form-success").scrollIntoView({ behavior: "smooth", block: "center" });

        if (window.RA9MANA_showToast) {
          window.RA9MANA_showToast(RA9MANA_I18N.t("submit.success.toast") || "Reference submitted successfully");
        }

        resetFormState(form);
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
