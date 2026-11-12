(() => {
  const STORAGE_KEY = "homeshield-lang";
  const FORM_ENDPOINT = "https://api.web3forms.com/submit";
  const ACCESS_KEY = "89aade33-5357-4d01-8614-1d0e744ac1e7";
  const TIMEOUT_MS = 15000;

  const TITLES = {
    en: "HomeShield | Honest Home Care in Central Florida",
    pt: "HomeShield | Cuidado honesto com a sua casa na Flórida Central",
  };
  const DESCRIPTIONS = {
    en: "Honest, documented home care in Central Florida. Free multi-hour inspections, hourly pricing, an in-house crew, and a 100% work guarantee. Windermere, Winter Garden, Kissimmee & Orlando.",
    pt: "Cuidado honesto e documentado com a sua casa na Flórida Central. Inspeção gratuita de várias horas, cobrança por hora, equipe própria e garantia de 100% no trabalho. Windermere, Winter Garden, Kissimmee e Orlando.",
  };
  const METHOD_LABELS = {
    en: { call: "Call", text: "Text", email: "Email" },
    pt: { call: "Ligação", text: "Mensagem", email: "E-mail" },
  };
  const MESSAGES = {
    en: {
      success: "Thank you. We’ve received your note and will be in touch shortly.",
      error: "Sorry, we couldn’t send your message. Please try again, or call or text [PHONE].",
      timeout: "The request timed out. Please try again, or call or text [PHONE].",
    },
    pt: {
      success: "Obrigado. Recebemos a sua mensagem e em breve entraremos em contato.",
      error: "Não foi possível enviar a sua mensagem. Tente de novo, ou ligue / envie mensagem para [PHONE].",
      timeout: "A solicitação expirou. Tente de novo, ou ligue / envie mensagem para [PHONE].",
    },
  };

  const body = document.body;
  const btnEn = document.getElementById("btn-en");
  const btnPt = document.getElementById("btn-pt");
  const menuBtn = document.getElementById("menuBtn");
  const header = document.querySelector("header.site");
  const methodSelect = document.getElementById("contact-method");
  const languageSelect = document.getElementById("preferred-language");
  const form = document.getElementById("contact-form");
  const statusEl = document.getElementById("form-status");
  const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
  const metaDesc = document.querySelector('meta[name="description"]');
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDesc = document.querySelector('meta[property="og:description"]');
  const ogLocale = document.querySelector('meta[property="og:locale"]');

  function currentLang() {
    return body.classList.contains("lang-pt") ? "pt" : "en";
  }

  function highlightPlaceholders(text) {
    return text.replace(/\[PHONE\]/g, '<span class="ph">[PHONE]</span>');
  }

  function refreshMethodOptions(lang) {
    if (!methodSelect) return;
    const previous = methodSelect.value || "call";
    const labels = METHOD_LABELS[lang];
    methodSelect.innerHTML = "";
    ["call", "text", "email"].forEach((value) => {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = labels[value];
      methodSelect.appendChild(opt);
    });
    methodSelect.value = previous;
  }

  function setLang(lang, { persist = true } = {}) {
    const next = lang === "pt" ? "pt" : "en";
    body.classList.remove("lang-en", "lang-pt");
    body.classList.add(next === "pt" ? "lang-pt" : "lang-en");
    document.documentElement.lang = next === "pt" ? "pt-BR" : "en";
    if (btnEn) btnEn.setAttribute("aria-pressed", next === "en" ? "true" : "false");
    if (btnPt) btnPt.setAttribute("aria-pressed", next === "pt" ? "true" : "false");
    document.title = TITLES[next];
    if (metaDesc) metaDesc.setAttribute("content", DESCRIPTIONS[next]);
    if (ogTitle) ogTitle.setAttribute("content", TITLES[next]);
    if (ogDesc) ogDesc.setAttribute("content", DESCRIPTIONS[next]);
    if (ogLocale) ogLocale.setAttribute("content", next === "pt" ? "pt_BR" : "en_US");
    refreshMethodOptions(next);
    if (languageSelect && !languageSelect.dataset.touched) {
      languageSelect.value = next;
    }
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, next); } catch (_) {}
    }
  }

  function closeMenu() {
    if (!header || !menuBtn) return;
    header.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
  }

  function toggleMenu() {
    if (!header || !menuBtn) return;
    const open = header.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function showStatus(kind, key) {
    if (!statusEl) return;
    const lang = currentLang();
    statusEl.classList.remove("ok", "err");
    statusEl.classList.add(kind === "success" ? "ok" : "err");
    statusEl.innerHTML = highlightPlaceholders(MESSAGES[lang][key]);
  }

  function setSubmitting(isSubmitting) {
    if (!submitBtn) return;
    submitBtn.disabled = isSubmitting;
  }

  if (btnEn) btnEn.addEventListener("click", () => setLang("en"));
  if (btnPt) btnPt.addEventListener("click", () => setLang("pt"));

  if (menuBtn) {
    menuBtn.addEventListener("click", toggleMenu);
  }
  document.querySelectorAll("nav.links a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  if (languageSelect) {
    languageSelect.addEventListener("change", () => {
      languageSelect.dataset.touched = "true";
    });
  }

  let saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch (_) {}
  setLang(saved === "pt" || saved === "en" ? saved : "en", { persist: false });

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const honeypot = form.querySelector('[name="botcheck"]');
      if (honeypot && ((honeypot.type === "checkbox" && honeypot.checked) || (honeypot.type !== "checkbox" && honeypot.value))) {
        showStatus("success", "success");
        form.reset();
        return;
      }

      const payload = {
        access_key: ACCESS_KEY,
        subject: "New HomeShield inquiry",
        from_name: "HomeShield Website",
        name: form.name.value.trim(),
        phone: form.phone.value.trim(),
        email: form.email.value.trim(),
        city: form.city.value.trim(),
        message: form.message.value.trim(),
        language: languageSelect ? languageSelect.value : currentLang(),
        contact_method: methodSelect ? methodSelect.value : "",
        botcheck: "",
      };

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      setSubmitting(true);
      if (statusEl) {
        statusEl.classList.remove("ok", "err");
        statusEl.textContent = "";
      }

      try {
        const response = await fetch(FORM_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) {
          throw new Error("submit-failed");
        }
        showStatus("success", "success");
        form.reset();
        if (languageSelect) {
          delete languageSelect.dataset.touched;
          languageSelect.value = currentLang();
        }
        refreshMethodOptions(currentLang());
      } catch (err) {
        showStatus("error", err && err.name === "AbortError" ? "timeout" : "error");
      } finally {
        clearTimeout(timer);
        setSubmitting(false);
      }
    });
  }
})();
