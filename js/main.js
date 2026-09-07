(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Header */
  const header = $("[data-header]");
  if (header) {
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* Mobile nav */
  const toggle = $("[data-nav-toggle]");
  const nav = $("[data-nav]");
  if (toggle && nav) {
    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
      document.body.classList.toggle("nav-open", open);
    };
    toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
    nav.addEventListener("click", (e) => {
      if (e.target.closest("a")) setOpen(false);
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });
  }

  /* Current nav */
  const path = location.pathname.replace(/\\/g, "/");
  $$(".nav a[href]").forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || href.startsWith("http") || href.startsWith("#")) return;
    const file = href.split("/").pop();
    const current = path.endsWith("/" + file) || path.endsWith(file) ||
      (file === "index.html" && (path.endsWith("/") || path.endsWith("/index.html")));
    const section = href.replace(".html", "").replace("../", "").replace("./", "");
    if (path.includes(section) && section && section !== "index") {
      link.setAttribute("aria-current", "page");
    } else if (current) {
      link.setAttribute("aria-current", "page");
    }
  });

  /* Reveal */
  if (!reduced) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    $$(".reveal").forEach((el) => io.observe(el));
  } else {
    $$(".reveal").forEach((el) => el.classList.add("is-in"));
  }

  /* Analytics stubs — wire to your analytics later */
  const track = (name, detail = {}) => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: name, ...detail });
  };

  $$("[data-track]").forEach((el) => {
    el.addEventListener("click", () => track(el.dataset.track, { label: el.textContent.trim() }));
  });

  /* Need selector */
  $$(".need").forEach((label) => {
    const input = $("input", label);
    if (!input) return;
    const sync = () => label.classList.toggle("is-selected", input.checked);
    input.addEventListener("change", () => $$(".need").forEach((n) => n.classList.toggle("is-selected", $("input", n)?.checked)));
    sync();
  });

  /* Contact form */
  const form = $("[data-contact-form]");
  if (form) {
    const fields = $$("[required]", form);
    const showError = (field, on) => {
      field.classList.toggle("is-invalid", on);
      const err = form.querySelector(`[data-error-for="${field.id}"]`);
      if (err) err.style.display = on ? "block" : "none";
    };

    form.addEventListener("focusin", () => track("contact_form_started"));

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let valid = true;
      fields.forEach((field) => {
        const empty = !String(field.value || "").trim();
        const badEmail = field.type === "email" && field.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value);
        const invalid = empty || badEmail;
        showError(field, invalid);
        if (invalid) valid = false;
      });
      const need = form.querySelector('input[name="need"]:checked');
      const needErr = form.querySelector('[data-error-for="need"]');
      if (needErr) needErr.style.display = need ? "none" : "block";
      if (!need) valid = false;
      if (!valid) {
        form.querySelector(".is-invalid, .need")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
        return;
      }
      track("contact_form_submitted", { need: need.value });
      form.classList.add("is-sent");
      form.querySelector(".form-success")?.focus();
    });
  }

  /* Journey visualization */
  const canvas = $("#journeyCanvas");
  if (canvas) {
    const steps = ["Problem", "Data", "Intelligence", "Software", "Automation", "Growth"];
    const stepEls = $$("[data-journey-step]");
    const ctx = canvas.getContext("2d");
    let active = 0;
    let mouse = { x: 0.5, y: 0.5 };
    let t = 0;
    let nodes = [];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layout(rect.width, rect.height);
    };

    const layout = (w, h) => {
      nodes = steps.map((label, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        return {
          label,
          x: w * (0.18 + col * 0.32),
          y: h * (0.28 + row * 0.46),
        };
      });
    };

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      const parallax = reduced ? 0 : 8;
      const ox = (mouse.x - 0.5) * parallax;
      const oy = (mouse.y - 0.5) * parallax;

      ctx.lineWidth = 1;
      nodes.forEach((a, i) => {
        const next = nodes[i + 1];
        if (!next) return;
        const on = i < active;
        ctx.strokeStyle = on ? "rgba(34,240,255,0.85)" : "rgba(79,124,255,0.22)";
        ctx.beginPath();
        ctx.moveTo(a.x + ox, a.y + oy);
        const mx = (a.x + next.x) / 2 + ox;
        const my = (a.y + next.y) / 2 + oy + Math.sin(t / 40 + i) * (reduced ? 0 : 6);
        ctx.quadraticCurveTo(mx, my, next.x + ox, next.y + oy);
        ctx.stroke();
      });

      nodes.forEach((n, i) => {
        const on = i === active;
        const passed = i < active;
        ctx.beginPath();
        ctx.fillStyle = on ? "#22f0ff" : passed ? "rgba(79,124,255,0.7)" : "rgba(244,248,255,0.14)";
        ctx.arc(n.x + ox, n.y + oy, on ? 6 : 4.5, 0, Math.PI * 2);
        ctx.fill();
        if (on && !reduced) {
          ctx.beginPath();
          ctx.strokeStyle = "rgba(34,240,255,0.4)";
          ctx.arc(n.x + ox, n.y + oy, 14 + Math.sin(t / 12) * 2, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = on ? "#22f0ff" : "rgba(186,210,255,0.7)";
        ctx.font = "600 11px 'Plus Jakarta Sans', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(n.label, n.x + ox, n.y + oy + 24);
      });

      t += 1;
      if (!reduced) requestAnimationFrame(draw);
    };

    const setActive = (i) => {
      active = i;
      stepEls.forEach((el, idx) => el.classList.toggle("is-active", idx === i));
      if (reduced) draw();
    };

    stepEls.forEach((el, i) => {
      el.addEventListener("mouseenter", () => setActive(i));
      el.addEventListener("focus", () => setActive(i));
    });

    canvas.addEventListener("mousemove", (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) / r.width;
      mouse.y = (e.clientY - r.top) / r.height;
    });

    window.addEventListener("resize", resize);
    resize();
    setActive(0);
    if (!reduced) {
      requestAnimationFrame(draw);
      setInterval(() => setActive((active + 1) % steps.length), 2200);
    } else {
      draw();
    }
  }
})();
