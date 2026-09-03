(() => {
  "use strict";

  const fileState = { pdf: null, cover: null, contributorPhoto: null };
  // In-memory map id -> File objects, since File objects cannot be
  // persisted in localStorage. Drafts metadata lives in localStorage
  // (via RA9MANA_LIBRARY.getDrafts/addDraft) so the pending list survives
  // reloads; the actual files only survive for the current browser
  // session, and are re-attached to the export the moment they're added.
  const fileRegistry = {};

  /* ---------------------------------------------------------
     Tabs
  --------------------------------------------------------- */
  function initTabs() {
    const tabs = document.querySelectorAll(".admin-tab");
    const panels = { add: document.getElementById("panel-add"), pending: document.getElementById("panel-pending"), export: document.getElementById("panel-export") };
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("is-active"));
        Object.values(panels).forEach((p) => p.classList.remove("is-active"));
        tab.classList.add("is-active");
        panels[tab.getAttribute("data-tab")].classList.add("is-active");
      });
    });
  }

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
      renderPending();
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const { valid, firstInvalid } = RA9MANA_REF_FORM.validate(form, fileState, { requirePdf: true });
      if (!valid) {
        if (firstInvalid && firstInvalid.scrollIntoView) firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      const status = document.getElementById("a-status").value || "published";
      const entry = RA9MANA_REF_FORM.buildEntry(form, fileState, { status });
      fileRegistry[entry.id] = entry._files;
      const stored = { ...entry };
      delete stored._files;
      // Keep a lightweight note of which files are attached (names only —
      // the File blobs themselves stay in fileRegistry, not localStorage).
      stored._fileNames = {
        pdf: entry._files.pdf ? entry._files.pdf.name : "",
        cover: entry._files.cover ? entry._files.cover.name : "",
        contributorPhoto: entry._files.contributorPhoto ? entry._files.contributorPhoto.name : ""
      };
      RA9MANA_LIBRARY.addDraft(stored);

      form.reset();
      resetDropzones();
      document.getElementById("a-status").value = "published";

      document.getElementById("admin-form-success").classList.add("is-visible");
      setTimeout(() => document.getElementById("admin-form-success").classList.remove("is-visible"), 4000);

      renderPending();
      if (window.RA9MANA_showToast) window.RA9MANA_showToast(RA9MANA_I18N.t("admin.addSuccess.toast") || "Added.");
    });
  }

  /* ---------------------------------------------------------
     Pending table
  --------------------------------------------------------- */
  function renderPending() {
    const drafts = RA9MANA_LIBRARY.getDrafts();
    const tbody = document.getElementById("pending-tbody");
    const empty = document.getElementById("pending-empty");
    const table = document.getElementById("pending-table");
    const badge = document.getElementById("pending-count-badge");
    badge.textContent = drafts.length ? `(${drafts.length})` : "";

    if (!drafts.length) {
      table.style.display = "none";
      empty.style.display = "block";
      return;
    }
    table.style.display = "table";
    empty.style.display = "none";

    const lang = RA9MANA_I18N.getLang();
    tbody.innerHTML = drafts.map((d) => {
      const typeLabel = RA9MANA_LIBRARY.typeLabelFor(d.type, lang);
      const statusKey = { published: "admin.statusPublished", draft: "admin.statusDraft", pending: "admin.statusPendingReview", rejected: "admin.statusRejected" }[d.status] || d.status;
      return `
        <tr>
          <td>${RA9MANA_LIBRARY.esc(d.title)}</td>
          <td>${RA9MANA_LIBRARY.esc(typeLabel)}</td>
          <td>${RA9MANA_LIBRARY.esc(d.year || "")}</td>
          <td><span class="admin-status-pill ${RA9MANA_LIBRARY.esc(d.status)}">${RA9MANA_LIBRARY.esc(RA9MANA_I18N.t(statusKey) || d.status)}</span></td>
          <td class="admin-row-actions">
            <button type="button" data-remove="${RA9MANA_LIBRARY.esc(d.id)}" title="${RA9MANA_LIBRARY.esc(RA9MANA_I18N.t("admin.removeEntry") || "Remove")}">
              <svg><use href="assets/icons/icons.svg#icon-trash"></use></svg>
            </button>
          </td>
        </tr>`;
    }).join("");

    tbody.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-remove");
        RA9MANA_LIBRARY.removeDraft(id);
        delete fileRegistry[id];
        renderPending();
      });
    });
  }

  /* ---------------------------------------------------------
     Export
  --------------------------------------------------------- */
  async function buildExportZip() {
    const existing = await RA9MANA_LIBRARY.loadAll();
    const drafts = RA9MANA_LIBRARY.getDrafts();

    const merged = existing.slice();
    drafts.forEach((d) => {
      const clean = { ...d };
      delete clean._fileNames;
      const idx = merged.findIndex((m) => m.id === clean.id);
      if (idx >= 0) merged[idx] = clean; else merged.push(clean);
    });

    const zip = new JSZip();
    const booksFolder = zip.folder("books");
    const coversFolder = zip.folder("covers");
    const dataFolder = zip.folder("data");

    drafts.forEach((d) => {
      const files = fileRegistry[d.id];
      if (!files) return;
      if (files.pdf) booksFolder.file(files.pdf.name, files.pdf.file);
      if (files.cover) coversFolder.file(files.cover.name, files.cover.file);
      if (files.contributorPhoto) coversFolder.file(files.contributorPhoto.name, files.contributorPhoto.file);
    });

    dataFolder.file("library.json", JSON.stringify(merged, null, 2));

    const readme = RA9MANA_I18N.t("admin.exportReadme") ||
      "Copy the data/, books/ and covers/ folders into the project root (replacing data/library.json), then run: git add . && git commit -m \"Add new library references\" && git push";
    zip.file("README.txt", readme);

    return zip.generateAsync({ type: "blob" });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function initExport() {
    document.getElementById("export-btn").addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      const drafts = RA9MANA_LIBRARY.getDrafts();
      const missingFiles = drafts.some((d) => !fileRegistry[d.id]);
      if (drafts.length && missingFiles) {
        if (window.RA9MANA_showToast) {
          window.RA9MANA_showToast(RA9MANA_I18N.t("admin.exportFilesLostWarning") || "Some files were only kept in memory for this session — re-add entries whose files are missing before exporting.");
        }
      }
      btn.disabled = true;
      try {
        const blob = await buildExportZip();
        downloadBlob(blob, "ra9mana-library-export.zip");
        if (window.RA9MANA_showToast) window.RA9MANA_showToast(RA9MANA_I18N.t("admin.exportReady") || "Export ready.");
      } catch (err) {
        if (window.RA9MANA_showToast) window.RA9MANA_showToast(RA9MANA_I18N.t("admin.exportFailed") || "Export failed.");
      } finally {
        btn.disabled = false;
      }
    });

    document.getElementById("copy-git-commands").addEventListener("click", async () => {
      const commands = 'git add .\ngit commit -m "Add new library references"\ngit push';
      try {
        await navigator.clipboard.writeText(commands);
        if (window.RA9MANA_showToast) window.RA9MANA_showToast(RA9MANA_I18N.t("admin.copied") || "Copied.");
      } catch (err) { /* clipboard unavailable */ }
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    initTabs();
    await RA9MANA_I18N.init();
    initForm();
    initExport();
    renderPending();
  });
})();
