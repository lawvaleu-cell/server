(() => {
  "use strict";

  /* ---------------------------------------------------------
     Render categories (Ecosystem section)
  --------------------------------------------------------- */
  function renderCategories(lang) {
    const grid = document.getElementById("ecosystem-grid");
    if (!grid) return;
    grid.innerHTML = "";

    RA9MANA_CATEGORIES.forEach((cat, i) => {
      const title = RA9MANA_I18N.t(cat.titleKey) || "";
      const desc = RA9MANA_I18N.t(cat.descKey) || "";
      const discoverLabel = RA9MANA_I18N.t("ecosystem.discover") || "Discover";

      const card = document.createElement("article");
      card.className = "eco-card reveal";
      card.style.setProperty("--i", i);
      card.innerHTML = `
        <div class="eco-icon"><svg><use href="assets/icons/icons.svg#icon-${cat.icon}"></use></svg></div>
        <h3>${title}</h3>
        <p>${desc}</p>
        <a class="eco-link" href="#products" data-scroll-to-product="${cat.id}">
          <span>${discoverLabel}</span>
          <svg><use href="assets/icons/icons.svg#icon-arrow"></use></svg>
        </a>
      `;
      grid.appendChild(card);
    });

    observeReveals();
  }

  /* ---------------------------------------------------------
     Render products (Products section)
  --------------------------------------------------------- */
  function renderProducts(lang) {
    const grid = document.getElementById("products-grid");
    if (!grid) return;
    grid.innerHTML = "";

    const catLabelKey = {
      medical: "ecosystem.categoryMedical",
      education: "ecosystem.categoryEducation",
      restaurant: "ecosystem.categoryRestaurant",
      business: "ecosystem.categoryBusiness"
    };

    RA9MANA_PRODUCTS.forEach((product, i) => {
      const name = product.name[lang] || product.name.fr;
      const desc = product.description[lang] || product.description.fr;
      const benefit = product.benefit[lang] || product.benefit.fr;
      const catLabel = RA9MANA_I18N.t(catLabelKey[product.category]) || product.category;
      const isSoon = product.status === "soon";
      const openLabel = isSoon
        ? (RA9MANA_I18N.t("products.comingSoonBadge") || "Coming soon")
        : (RA9MANA_I18N.t("products.openApp") || "Discover");
      const keyBenefitLabel = RA9MANA_I18N.t("products.keyBenefit") || "Key benefit";

      const card = document.createElement("article");
      card.className = "product-card reveal";
      card.style.setProperty("--i", i);
      card.dataset.productId = product.id;
      card.dataset.category = product.category;
      card.innerHTML = `
        <div class="product-media">
          <img src="${product.image}" alt="${name}" loading="lazy" width="480" height="320">
          <span class="product-badge ${isSoon ? "soon" : ""}">${isSoon ? openLabel : catLabel}</span>
        </div>
        <div class="product-body">
          <div class="product-cat">${catLabel}</div>
          <h3>${name}</h3>
          <p>${desc}</p>
          <div class="product-benefit">
            <svg><use href="assets/icons/icons.svg#icon-check"></use></svg>
            <div><b>${keyBenefitLabel}</b>${benefit}</div>
          </div>
          <div class="product-foot">
            <button class="btn btn-primary btn-sm" type="button" data-product-action="${product.id}">
              <span>${openLabel}</span>
              <svg><use href="assets/icons/icons.svg#icon-arrow"></use></svg>
            </button>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });

    observeReveals();
  }

  function handleProductAction(id) {
    const product = RA9MANA_PRODUCTS.find((p) => p.id === id);
    if (!product) return;
    if (product.status === "soon" || !product.url || product.url === "#") {
      showToast(RA9MANA_I18N.t("toast.comingSoon") || "Coming soon.");
      return;
    }
    window.open(product.url, "_blank", "noopener");
  }

  /* ---------------------------------------------------------
     Toast
  --------------------------------------------------------- */
  let toastTimer = null;
  function showToast(message) {
    const toast = document.getElementById("toast");
    const inner = toast.querySelector(".toast-inner");
    inner.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3200);
  }

  /* ---------------------------------------------------------
     Reveal-on-scroll
  --------------------------------------------------------- */
  let observer = null;
  function observeReveals() {
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
      return;
    }
    if (!observer) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
      );
    }
    document.querySelectorAll(".reveal:not(.is-visible)").forEach((el) => observer.observe(el));
  }

  /* ---------------------------------------------------------
     Header scroll state + mobile menu
  --------------------------------------------------------- */
  function initHeader() {
    const header = document.getElementById("site-header");
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const mobileMenu = document.getElementById("mobile-menu");
    const openBtn = document.getElementById("nav-toggle");
    const closeBtn = document.getElementById("mobile-menu-close");

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

  /* ---------------------------------------------------------
     Contact form -> mailto (static site, no backend)
  --------------------------------------------------------- */
  function initContactForm() {
    const form = document.getElementById("contact-form");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = data.get("name") || "";
      const email = data.get("email") || "";
      const sector = data.get("sector") || "";
      const message = data.get("message") || "";

      const subject = encodeURIComponent(`RA9MANA DZ — ${name || "Nouveau contact"}`);
      const bodyLines = [
        `Nom: ${name}`,
        `E-mail: ${email}`,
        `Secteur: ${sector}`,
        "",
        message
      ];
      const body = encodeURIComponent(bodyLines.join("\n"));
      window.location.href = `mailto:contact@ra9mana.dz?subject=${subject}&body=${body}`;
    });
  }

  /* ---------------------------------------------------------
     Click delegation for dynamic product/category actions
  --------------------------------------------------------- */
  function initDelegation() {
    document.addEventListener("click", (e) => {
      const actionBtn = e.target.closest("[data-product-action]");
      if (actionBtn) {
        handleProductAction(actionBtn.getAttribute("data-product-action"));
        return;
      }
      const catLink = e.target.closest("[data-scroll-to-product]");
      if (catLink) {
        e.preventDefault();
        const catId = catLink.getAttribute("data-scroll-to-product");
        const productsSection = document.getElementById("products");
        productsSection.scrollIntoView({ behavior: "smooth" });
        setTimeout(() => {
          const card = document.querySelector(`.product-card[data-category="${catId}"]`);
          if (card) {
            card.style.outline = "2px solid var(--c-brand)";
            card.style.outlineOffset = "4px";
            setTimeout(() => (card.style.outline = ""), 1600);
          }
        }, 500);
      }
    });
  }

  /* ---------------------------------------------------------
     Footer year
  --------------------------------------------------------- */
  function initFooterYear() {
    const el = document.getElementById("footer-year");
    if (el) el.textContent = new Date().getFullYear();
  }

  /* ---------------------------------------------------------
     Boot
  --------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", async () => {
    initHeader();
    initContactForm();
    initDelegation();
    initFooterYear();

    await RA9MANA_I18N.init();
    renderCategories(RA9MANA_I18N.getLang());
    renderProducts(RA9MANA_I18N.getLang());
    observeReveals();

    document.addEventListener("ra9mana:langchange", (e) => {
      renderCategories(e.detail.lang);
      renderProducts(e.detail.lang);
    });
  });
})();
