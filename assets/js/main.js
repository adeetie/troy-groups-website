(() => {
  const $ = (s, r = document) => r.querySelector(s);

  function ready(fn) {
    document.readyState !== "loading"
      ? fn()
      : document.addEventListener("DOMContentLoaded", fn);
  }

  function placePanel() {
    const h = document.querySelector(".tgx-scope .tgx-header");
    const y = h ? h.getBoundingClientRect().bottom + window.scrollY : 110;
    document.documentElement.style.setProperty("--tgx-header-bottom", `${y}px`);
  }

  async function includePart(selector, url) {
    const host = $(selector);
    if (!host) return false;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return false;
      host.innerHTML = await res.text();
      return true;
    } catch {
      return false;
    }
  }

  function bindMenu() {
    const panel = $("#mega-allpages");
    if (!panel) return;

    // Support multiple toggles: the original #allpagesToggle and any inline arrows we add
    const toggles = Array.from(document.querySelectorAll('#allpagesToggle, .nav-mega-toggle'));
    if (!toggles.length) return;

    function openPanel(yes) {
      const on = !!yes;
      panel.classList.toggle("is-open", on);
      toggles.forEach(t => {
        t.classList.toggle("is-current", on);
        t.setAttribute("aria-expanded", String(on));
      });
    }

    toggles.forEach((toggle) => {
      if (toggle.dataset.bound === "1") return;
      toggle.dataset.bound = "1";
      toggle.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        openPanel(!panel.classList.contains("is-open"));
      });
    });

    document.addEventListener("click", (e) => {
      if (!panel.classList.contains("is-open")) return;
      if (
        !panel.contains(e.target) &&
        !toggles.some(t => t === e.target || t.contains(e.target))
      ) {
        openPanel(false);
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") openPanel(false);
    });

    window.addEventListener("scroll", () => {
      placePanel();
      if (panel.classList.contains("is-open")) {
        openPanel(false);
      }
    }, { passive: true });

    window.addEventListener("resize", placePanel);
  }

  // Normalize arrow glyph behavior on buttons/links so NE arrow ↗ turns to → on hover/focus
  function normalizeArrows(root = document) {
    const nodes = root.querySelectorAll('a, button');
    nodes.forEach((el) => {
      if (el.dataset.arrowNormalized === '1') return;

      // Find the last meaningful node (skip trailing whitespace)
      let last = el.lastChild;
      while (last && last.nodeType === Node.TEXT_NODE && (last.nodeValue || '').trim() === '') {
        last = last.previousSibling;
      }

      const bindListeners = (targetSpan) => {
        // Mark classes for optional CSS hooks
        el.classList.add('has-arrow');
        targetSpan.classList.add('tgx-arrow');
        const toRight = () => (targetSpan.textContent = '\u2192');
        const toNE = () => (targetSpan.textContent = '\u2197');
        // Be generous with events to avoid edge-cases
        el.addEventListener('mouseenter', toRight);
        el.addEventListener('mouseover', toRight);
        el.addEventListener('pointerenter', toRight);
        el.addEventListener('focus', toRight);
        el.addEventListener('mouseleave', toNE);
        el.addEventListener('mouseout', toNE);
        el.addEventListener('pointerleave', toNE);
        el.addEventListener('blur', toNE);
        el.dataset.arrowNormalized = '1';
      };

      // Case 1: trailing text node ending with ↗
      if (last && last.nodeType === Node.TEXT_NODE) {
        const txt = last.nodeValue || '';
        if (/\u2197\s*$/.test(txt)) { // ↗
          last.nodeValue = txt.replace(/\s*\u2197\s*$/, '').replace(/\s+$/, '');
          el.appendChild(document.createTextNode(' '));
          const sp = document.createElement('span');
          sp.setAttribute('aria-hidden', 'true');
          sp.textContent = '\u2197';
          el.appendChild(sp);
          bindListeners(sp);
          return;
        }
      }

      // Case 2: trailing span element containing ↗ (e.g., <span aria-hidden>↗</span>)
      if (last && last.nodeType === Node.ELEMENT_NODE && last.nodeName === 'SPAN') {
        const span = last;
        const content = (span.textContent || '').trim();
        if (content === '\u2197') {
          bindListeners(span);
          return;
        }
      }
    });
  }

  // Ensure the megamenu panel exists on pages that don't include the markup
  async function ensureMegaPanel() {
    if (document.querySelector('#mega-allpages')) return true;

    // Build panel markup inline (mirrors index.html structure/classes)
    const panel = document.createElement('div');
    panel.id = 'mega-allpages';
    panel.className = 'tgx-megamenu';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'All pages menu');
    panel.innerHTML = `
      <div class="fc-card">
        <div class="fc-outline"></div>
        <div class="fc-columns">
          <div class="fc-col fc-col--a">
            <div class="fc-h"><a href="services.html" data-link="services">Services</a></div>
            <a class="fc-strong" href="clients.html" data-link="clients">Our Client</a>
            <a class="fc-strong" href="our-active-businesses.html" data-link="our-active-businesses">Our Active Businesses</a>
            <a class="fc-strong" href="our-strategies.html" data-link="our-strategies">Our strategies</a>
            <a class="fc-strong" href="our-opportunities.html" data-link="our-opportunities">Our Opportunities</a>
          </div>
          <div class="fc-col fc-col--b">
            <div class="fc-h">Important link</div>
            <a class="fc-link" href="privacy-policy.html" data-link="privacy-policy">Privacy &amp; Policy</a>
            <a class="fc-link" href="terms.html" data-link="terms">Terms and Conditions</a>
          </div>
          <div class="fc-col fc-col--c">
            <div class="fc-h">Resources</div>
            <a class="fc-link" href="blog.html" data-link="blog">Blog</a>
            <a class="fc-link" href="events.html" data-link="events">Events</a>
          </div>
        </div>
        <div class="fc-social-label">Reach out on us:</div>
        <div class="fc-social">
          <a class="fc-ico1" href="#" aria-label="Facebook">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="#0F172A"><path d="M13 22v-9h3l1-4h-4V7.5c0-1.1.3-1.8 1.9-1.8H17V2.2C16.4 2.1 15.2 2 13.8 2 10.9 2 9 3.7 9 6.9V9H6v4h3v9h4z"/></svg>
          </a>
          <a class="fc-ico2" href="#" aria-label="Instagram">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" ry="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/></svg>
          </a>
          <a class="fc-ico3" href="#" aria-label="LinkedIn">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="#0F172A"><path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM0 8h5v16H0zM8 8h4.8v2.2h.1c.7-1.3 2.3-2.7 4.8-2.7 5.1 0 6.1 3.4 6.1 7.8V24h-5v-6.7c0-1.6 0-3.7-2.3-3.7s-2.6 1.8-2.6 3.6V24H8z"/></svg>
          </a>
        </div>
        <img class="fc-img fc-img1" src="assets/images/all_pages_img_1.png" alt="Troy Groups collage 1">
        <img class="fc-img fc-img2" src="assets/images/all_pages_img_2.png" alt="Troy Groups collage 2">
        <img class="fc-img fc-img3" src="assets/images/all_pages_img_3.png" alt="Troy Groups collage 3">
        <img class="fc-img fc-img4" src="assets/images/all_pages_img_4.png" alt="Troy Groups collage 4">
      </div>`;

    const scope = document.querySelector('.tgx-scope') || document.body;
    scope.appendChild(panel);
    placePanel();
    return true;
  }

  // Add an inline chevron toggle next to the current nav link on any page
  function addInlineMegaToggle() {
    const isIndex = /(?:^|\/)index\.html?$/.test(location.pathname) || location.pathname === '/' || location.pathname === '';
    const standalone = document.querySelector('#allpagesToggle');
    // If we're on the homepage and a primary toggle already exists, skip inline toggle
    if (isIndex && standalone) return;
    
    // Skip inline chevron on specific dedicated pages
    const file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const skipPages = new Set([
      'about.html',
      'contact.html',
      'login.html',
      'signup.html',
      'schedule.html',
      'thankyou-message.html',
      'thankyou-meeting.html'
    ]);
    if (skipPages.has(file)) return;
    const nav = document.querySelector('.tgx-scope .tgx-nav');
    const panel = document.querySelector('#mega-allpages');
    if (!nav || !panel) return;

  // Determine current page filename (already computed as `file` above)

  // Find matching nav link
  const links = Array.from(nav.querySelectorAll('a.tgx-navlink[href]'));
    let current = links.find(a => a.getAttribute('href')?.endsWith(file));
    // Fallback: if homepage path is '/', match index link
    if (!current && (file === 'index.html' || location.pathname === '/')) {
      current = links.find(a => /index\.html$/.test(a.getAttribute('href')||''));
    }
  // Fallback: if the current page isn't represented in the top nav,
  // attach the chevron to the first available nav link so the menu is still reachable
  if (!current) {
    current = links[0] || null;
  }
  if (!current) return;
    if (current.dataset.inlineMega === '1') return; // already processed
    current.dataset.inlineMega = '1';

    // Wrap the link so the arrow sits right next to it without adding nav gap
    const wrap = document.createElement('span');
    wrap.className = 'tgx-linkwrap';
    const parent = current.parentNode;
    parent.insertBefore(wrap, current);
    wrap.appendChild(current);

    // Create inline toggle button
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tgx-navlink nav__toggle nav__toggle--inline nav-mega-toggle';
    btn.setAttribute('aria-controls', 'mega-allpages');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Open menu');
  const chev = document.createElement('span');
  chev.className = 'tgx-chev';
  chev.setAttribute('aria-hidden', 'true');
  // Hollow chevron (stroke only)
  chev.innerHTML = '<svg class="tgx-chevsvg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>';
  btn.appendChild(chev);
    wrap.appendChild(btn);

    // Successfully added inline toggle; on dedicated pages hide the standalone toggle if present
    if (!isIndex && standalone) {
      standalone.style.display = 'none';
    }
  }

  // Initialize mobile menu
  function initMobileMenu() {
    const hamburger = document.querySelector('.tgx-hamburger');
    const mobileMenu = document.querySelector('.tgx-mobile-menu');
    const accordionToggle = document.querySelector('.tgx-mobile-accordion-toggle');
    const accordionContent = document.querySelector('.tgx-mobile-accordion-content');

    if (!hamburger || !mobileMenu) return;

    // Toggle mobile menu
    hamburger.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.contains('is-open');
      mobileMenu.classList.toggle('is-open');
      hamburger.classList.toggle('is-open');
      hamburger.setAttribute('aria-expanded', !isOpen);
      document.body.style.overflow = isOpen ? '' : 'hidden';
    });

    // Toggle accordion
    if (accordionToggle && accordionContent) {
      accordionToggle.addEventListener('click', () => {
        const isOpen = accordionContent.classList.contains('is-open');
        accordionContent.classList.toggle('is-open');
        accordionToggle.classList.toggle('is-open');
        accordionToggle.setAttribute('aria-expanded', !isOpen);
      });
    }

    // Close menu when clicking on links
    const mobileLinks = mobileMenu.querySelectorAll('a');
    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('is-open');
        hamburger.classList.remove('is-open');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  ready(async () => {
    const didHeader = await includePart(
      "#site-header",
      "Components/header.html",
    );
    const didFooter = await includePart(
      "#site-footer",
      "Components/footer.html",
    );
    const didCta = await includePart("#cta-connect", "Components/cta-connect.html");

  await ensureMegaPanel();
  addInlineMegaToggle();
  bindMenu();
  normalizeArrows();

    // Initialize mobile menu
    initMobileMenu();

    // Build CTA arrows (single style, gated to avoid reinit)
  function initCtaArrows(root = document) {
      // Dedupe: ensure only one rail per title
      root.querySelectorAll('.tgc-cta__title').forEach((title) => {
        const rails = title.querySelectorAll('.tgc-cta__rail');
        rails.forEach((r, i) => { if (i > 0) r.remove(); });
      });

      const rails = root.querySelectorAll('.tgc-cta__rail');
      rails.forEach((rail) => {
        if (rail.dataset.arrowsBuilt === '1') return; // prevent duplicates/restarts
        // Always rebuild to ensure consistency
        rail.innerHTML = '';
    // Base timings should match CSS
    const duration = 11; // seconds, slower per spec
    // Ensure the rail spans exactly the label width (from 'S' to 'g')
    let measuredWidth = null;
    try {
      const title = rail.closest('.tgc-cta__title');
      const label = title ? title.querySelector('.tgc-cta__label') : null;
      if (label) {
        measuredWidth = Math.ceil(label.getBoundingClientRect().width);
        if (measuredWidth && Number.isFinite(measuredWidth)) rail.style.width = `${measuredWidth}px`;
        // Bind a ResizeObserver once per title to keep in sync with text width
        if (title && !title.dataset.ctaResizeBound) {
          title.dataset.ctaResizeBound = '1';
          const ro = new ResizeObserver(() => {
            try {
              const w2 = Math.ceil(label.getBoundingClientRect().width);
              if (w2 && Number.isFinite(w2)) {
                rail.style.width = `${w2}px`;
                // Mark for rebuild and rebuild only within this title scope
                const localRails = title.querySelectorAll('.tgc-cta__rail');
                localRails.forEach(r => r.dataset.arrowsBuilt = '0');
                initCtaArrows(title);
              }
            } catch {}
          });
          ro.observe(label);
        }
      }
    } catch {}

    // Determine arrow count from physical gap for even spacing and shorter tail
    const GAP_PX = 120; // spacing between arrows (controls tail density)
    const w = measuredWidth || rail.offsetWidth || 800;
    const count = Math.max(8, Math.ceil(w / GAP_PX) + 2);
        for (let i = 0; i < count; i++) {
          const el = document.createElement('span');
          // Use a single arrow style class; ghost modifier retained for clarity
          el.className = 'tgc-cta__arrow tgc-cta__arrow--ghost';
          // Phase each arrow evenly across the animation period to avoid any tight pair.
          // We use explicit delay in seconds so CSS can read it via --delay.
          const delaySeconds = -(i * (duration / count));
          el.style.setProperty('--delay', `${delaySeconds}s`);
          el.style.setProperty('--i', String(i)); // fallback path if CSS var not supported
          rail.appendChild(el);
        }
        rail.dataset.arrowsBuilt = '1';
      });
    }

    // cta-connect.css is now the single source of truth; no runtime override injection needed

    // Initialize arrows for current DOM
    // Run after a frame so sizes are available
    requestAnimationFrame(() => requestAnimationFrame(() => initCtaArrows()));
    if (didCta) {
      const host = document.querySelector('#cta-connect');
      host && requestAnimationFrame(() => requestAnimationFrame(() => initCtaArrows(host)));
    }

    // Re-measure and rebuild on resize to keep arrows aligned to text width
    window.addEventListener('resize', () => {
      try {
        // Reset build flag so widths and arrows are recomputed
        document.querySelectorAll('.tgc-cta__rail').forEach(r => { r.dataset.arrowsBuilt = '0'; });
        initCtaArrows();
      } catch {}
    }, { passive: true });

    let tries = 0,
      max = 10;
    const t = setInterval(() => {
      ensureMegaPanel().then(() => {
        addInlineMegaToggle();
        bindMenu();
      });
      try { normalizeArrows(); } catch {}
      // Re-check CTA arrows after dynamic inserts, but gated per-rail to avoid duplicates
      try {
        initCtaArrows();
      } catch {}
      tries++;
      if (tries >= max || document.querySelector("#allpagesToggle"))
        clearInterval(t);
    }, 150);

    // HOW WE WORKS: highlight current step on scroll
    function initHowWeWorks() {
      const section = document.querySelector('.howwe');
      if (!section || section.dataset.howweBound === '1') return;
      section.dataset.howweBound = '1';

      const rows = Array.from(section.querySelectorAll('.howwe__row'));
      if (!rows.length) return;

      const setActive = (el) => {
        rows.forEach(r => r.classList.toggle('is-active', r === el));
      };
      // default to first
      setActive(rows[0]);

      const io = new IntersectionObserver((entries) => {
        // pick the entry with largest intersection ratio
        let best = null;
        let bestRatio = 0;
        entries.forEach((e) => {
          if (e.intersectionRatio > bestRatio) {
            bestRatio = e.intersectionRatio;
            best = e.target;
          }
        });
        if (best) setActive(best);
      }, { root: null, threshold: [0.2, 0.4, 0.55, 0.7, 0.9] });

      rows.forEach(r => io.observe(r));
      // Also update on hash/resize as a safety
      window.addEventListener('resize', () => {
        // trigger recalculation by toggling active to the most centered element
        let centerY = window.innerHeight / 2;
        let closest = rows[0];
        let delta = Infinity;
        rows.forEach(r => {
          const rect = r.getBoundingClientRect();
          const mid = rect.top + rect.height / 2;
          const d = Math.abs(mid - centerY);
          if (d < delta) { delta = d; closest = r; }
        });
        setActive(closest);
      });
    }

    initHowWeWorks();

    // Initialize case accordion functionality
    function initCaseAccordion() {
      document.querySelectorAll('.case__toggle').forEach((btn) => {
        if (btn.dataset.caseBound === '1') return;
        btn.dataset.caseBound = '1';

        const toggle = (e) => {
          if (e) e.preventDefault();
          const caseEl = btn.closest('.case');
          if (!caseEl) return;
          const list = caseEl.parentElement;
          const single = list?.dataset.accordion === 'single';

          if (single && list) {
            list.querySelectorAll('.case.is-open').forEach((c) => {
              if (c !== caseEl) {
                c.classList.remove('is-open');
                const body = c.querySelector('.case__body');
                if (body) body.hidden = true;
                const b = c.querySelector('.case__toggle');
                if (b) {
                  b.setAttribute('aria-expanded', 'false');
                  b.setAttribute('aria-label', 'Expand');
                }
              }
            });
          }

          const nowOpen = !caseEl.classList.contains('is-open');
          caseEl.classList.toggle('is-open', nowOpen);
          const body = caseEl.querySelector('.case__body');
          if (body) body.hidden = !nowOpen;
          btn.setAttribute('aria-expanded', String(nowOpen));
          btn.setAttribute('aria-label', nowOpen ? 'Collapse' : 'Expand');
        };

        btn.addEventListener('click', toggle);
        btn.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        });
      });
    }

    initCaseAccordion();
    
    // Also initialize with a delay to ensure DOM is fully loaded
    setTimeout(initCaseAccordion, 100);
  });
})();

document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".faq-q").forEach((btn) => {
    if (btn.dataset.faqBound === "1") return;
    btn.dataset.faqBound = "1";

    const toggle = (e) => {
      if (e) e.preventDefault();
      const item = btn.closest(".faq-item");
      if (!item) return;
      const list = item.parentElement;
      const single = list?.dataset.accordion === "single";

      if (single && list) {
        list.querySelectorAll(".faq-item.is-open").forEach((i) => {
          if (i !== item) {
            i.classList.remove("is-open");
            const b = i.querySelector(".faq-q");
            b && b.setAttribute("aria-expanded", "false");
          }
        });
      }

      const nowOpen = !item.classList.contains("is-open");
      item.classList.toggle("is-open", nowOpen);
      btn.setAttribute("aria-expanded", String(nowOpen));
    };

    btn.addEventListener("click", toggle);
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });
  });

  const mobileMenu = document.getElementById("mobile-menu");
  const menuToggle = document.querySelector(".mobile-header__menu");

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener("click", () => {
      const isOpen = mobileMenu.hidden === false;
      mobileMenu.hidden = isOpen;
      menuToggle.setAttribute("aria-expanded", String(!isOpen));
    });

    const sublistToggles = mobileMenu.querySelectorAll(".mobile-menu__toggle");
    sublistToggles.forEach((toggle) => {
      toggle.addEventListener("click", () => {
        const isExpanded = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!isExpanded));
        const sublist = toggle.nextElementSibling;
        if (sublist) {
          sublist.hidden = isExpanded;
        }
      });
    });
  }
});

/* Locked Hero Scaling */
/* Hero V2 - No JS needed with viewport units! */
