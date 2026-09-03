/**
 * RA9MANA DZ — Shared header/footer behavior for secondary pages
 * ------------------------------------------------------------
 * library.html, submit.html and admin.html reuse the exact same header,
 * mobile menu, toast and footer markup as index.html. This file mirrors
 * the relevant parts of js/main.js so behavior stays identical without
 * duplicating the homepage-only logic (products/categories rendering,
 * contact form, reveal-on-scroll of homepage sections).
 */
(() => {
  "use strict";

  function initHeader() {
    const header = document.getElementById("site-header");
    if (!header) return;
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const mobileMenu = document.getElementById("mobile-menu");
    const openBtn = document.getElementById("nav-toggle");
    const closeBtn = document.getElementById("mobile-menu-close");
    if (!mobileMenu || !openBtn || !closeBtn) return;

    function openMenu() {
      mobileMenu.classList.add("is-open");
      document.body.style.overflow = "hidden";
      openBtn.setAttribute("aria-expanded", "true");
      openBtn.setAttribute("aria-label", RA9MANA_I18N.t("nav.menuClose") || "Close menu");
    }
    function closeMenu() {
      mobileMenu.classList.remove("is-open");
      document.body.style.overflow = "";
      openBtn.setAttribute("aria-expanded", "false");
      openBtn.setAttribute("aria-label", RA9MANA_I18N.t("nav.menuOpen") || "Open menu");
    }
    openBtn.addEventListener("click", openMenu);
    closeBtn.addEventListener("click", closeMenu);
    mobileMenu.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));
  }

  function initFooterYear() {
    const el = document.getElementById("footer-year");
    if (el) el.textContent = new Date().getFullYear();
  }

  let toastTimer = null;
  window.RA9MANA_showToast = function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    const inner = toast.querySelector(".toast-inner");
    inner.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3200);
  };

  document.addEventListener("DOMContentLoaded", () => {
    initHeader();
    initFooterYear();
  });
})();
