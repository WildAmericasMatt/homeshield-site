(() => {
  "use strict";

  const MODE_KEY = "homeshield-review";
  const STORE_PREFIX = "homeshield-review-notes:";
  const WELCOME_KEY = "homeshield-review-welcome";
  const FORM_ENDPOINT = "https://api.web3forms.com/submit";
  const ACCESS_KEY = "89aade33-5357-4d01-8614-1d0e744ac1e7";
  const TIMEOUT_MS = 15000;

  const I18N = {
    en: {
      add: "Add comment",
      show: "Show comments",
      hide: "Hide comments",
      list: "List",
      export: "Export",
      exit: "Exit review",
      notes: "Comments",
      close: "Close",
      save: "Save",
      edit: "Edit",
      resolve: "Resolve",
      reopen: "Reopen",
      remove: "Delete",
      retry: "Retry send",
      placeholder: "Write a comment…",
      empty: "No comments yet. Turn on Add comment, then tap the page.",
      draft: "Draft",
      open: "Open",
      resolved: "Resolved",
      pending: "Sending…",
      savedSent: "Saved · Sent",
      savedLocal: "Saved locally · Couldn’t send",
      saving: "Saving…",
      welcomeTitle: "Hello, Michelle",
      welcomeBody: "Matt and HomeShield are ready for any questions. Leave comment bubbles on the page to mark anything you’d like to change.",
      welcomePlaceholder: "Have a question? Write it here (optional)",
      welcomeSend: "Send",
      welcomeClose: "Close",
      welcomeSent: "Thank you. We received your question and will be in touch shortly.",
      welcomeError: "We couldn’t send that. Please try again.",
      welcomeSending: "Sending…",
      welcomeEmpty: "Write a question, or close this window.",
      welcomeBtn: "Questions",
    },
    pt: {
      add: "Adicionar comentário",
      show: "Mostrar comentários",
      hide: "Ocultar comentários",
      list: "Lista",
      export: "Exportar",
      exit: "Sair da revisão",
      notes: "Comentários",
      close: "Fechar",
      save: "Salvar",
      edit: "Editar",
      resolve: "Resolver",
      reopen: "Reabrir",
      remove: "Excluir",
      retry: "Tentar de novo",
      placeholder: "Escreva um comentário…",
      empty: "Ainda não há comentários. Ative Adicionar comentário e toque na página.",
      draft: "Rascunho",
      open: "Aberto",
      resolved: "Resolvido",
      pending: "Enviando…",
      savedSent: "Salvo · Enviado",
      savedLocal: "Salvo neste aparelho · Não foi possível enviar",
      saving: "Salvando…",
      welcomeTitle: "Olá, Michelle",
      welcomeBody: "O Matt e a HomeShield estão prontos para qualquer pergunta. Deixe bolhas de comentário na página para marcar o que quiser mudar.",
      welcomePlaceholder: "Tem alguma pergunta? Escreva aqui (opcional)",
      welcomeSend: "Enviar",
      welcomeClose: "Fechar",
      welcomeSent: "Obrigado. Recebemos a sua pergunta e em breve entraremos em contato.",
      welcomeError: "Não foi possível enviar. Tente de novo.",
      welcomeSending: "Enviando…",
      welcomeEmpty: "Escreva uma pergunta, ou feche esta janela.",
      welcomeBtn: "Perguntas",
    },
  };

  function currentLang() {
    return document.body.classList.contains("lang-pt") ? "pt" : "en";
  }

  function t(key) {
    const pack = I18N[currentLang()] || I18N.en;
    return pack[key] || I18N.en[key] || key;
  }

  function storeKey() {
    return STORE_PREFIX + location.pathname;
  }

  function loadStore() {
    try {
      const raw = localStorage.getItem(storeKey());
      if (!raw) return { v: 1, notes: [], nextNumber: 1 };
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.notes)) return { v: 1, notes: [], nextNumber: 1 };
      return data;
    } catch (_) {
      return { v: 1, notes: [], nextNumber: 1 };
    }
  }

  function saveStore() {
    try {
      localStorage.setItem(storeKey(), JSON.stringify({ v: 1, notes, nextNumber }));
    } catch (_) {}
  }

  let notes = [];
  let nextNumber = 1;
  let addMode = false;
  let commentsVisible = true;
  let listOpen = false;
  let openId = null;
  let pointerStart = null;

  const root = document.createElement("div");
  root.className = "hs-review-root";
  root.id = "hs-review-root";

  const toolbar = document.createElement("div");
  toolbar.className = "hs-review-toolbar hs-review-ui";
  toolbar.id = "hs-review-toolbar";
  toolbar.setAttribute("role", "toolbar");
  toolbar.innerHTML = `
    <button type="button" id="hs-review-btn-add" aria-pressed="false">
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      <span class="hs-review-full t-en">Add comment</span><span class="hs-review-short t-en">Comment</span>
      <span class="hs-review-full t-pt">Adicionar comentário</span><span class="hs-review-short t-pt">Comentar</span>
    </button>
    <button type="button" id="hs-review-btn-visibility" aria-pressed="true">
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M1.5 8s2.5-5 6.5-5 6.5 5 6.5 5-2.5 5-6.5 5-6.5-5-6.5-5z" stroke="currentColor" stroke-width="1.6"/><circle cx="8" cy="8" r="2.2" stroke="currentColor" stroke-width="1.6"/></svg>
      <span class="hs-vis-hide"><span class="hs-review-full t-en">Hide comments</span><span class="hs-review-short t-en">Hide</span><span class="hs-review-full t-pt">Ocultar comentários</span><span class="hs-review-short t-pt">Ocultar</span></span>
      <span class="hs-vis-show" hidden><span class="hs-review-full t-en">Show comments</span><span class="hs-review-short t-en">Show</span><span class="hs-review-full t-pt">Mostrar comentários</span><span class="hs-review-short t-pt">Mostrar</span></span>
    </button>
    <button type="button" id="hs-review-btn-list" aria-pressed="false">
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 4h10M3 8h10M3 12h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
      <span class="t-en">List</span><span class="t-pt">Lista</span>
      <span class="hs-review-count" id="hs-review-count">0</span>
    </button>
    <button type="button" id="hs-review-btn-export">
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 3v7M5 7l3 3 3-3M3 13h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span class="t-en">Export</span><span class="t-pt">Exportar</span>
    </button>
    <button type="button" id="hs-review-btn-welcome" aria-haspopup="dialog" aria-controls="hs-review-welcome">
      <span class="hs-review-welcome-q" aria-hidden="true">?</span>
      <span class="hs-review-full t-pt">Perguntas</span>
      <span class="hs-review-full t-en">Questions</span>
    </button>
    <button type="button" id="hs-review-btn-exit" class="hs-review-exit">
      <span class="hs-review-full t-en">Exit review</span><span class="hs-review-short t-en">Exit</span>
      <span class="hs-review-full t-pt">Sair da revisão</span><span class="hs-review-short t-pt">Sair</span>
    </button>
  `;

  const pinsLayer = document.createElement("div");
  pinsLayer.className = "hs-review-pins";
  pinsLayer.id = "hs-review-pins";

  const composer = document.createElement("div");
  composer.className = "hs-review-composer hs-review-ui";
  composer.id = "hs-review-composer";
  composer.setAttribute("role", "dialog");
  composer.setAttribute("aria-labelledby", "hs-review-composer-title");
  composer.hidden = true;
  composer.innerHTML = `
    <div class="hs-review-meta">
      <strong id="hs-review-composer-title"></strong>
      <span id="hs-review-composer-section"></span>
    </div>
    <textarea id="hs-review-text" rows="4"></textarea>
    <div class="hs-review-actions">
      <button type="button" class="primary" id="hs-review-save"><span class="t-en">Save</span><span class="t-pt">Salvar</span></button>
      <button type="button" id="hs-review-resolve"><span class="t-en">Resolve</span><span class="t-pt">Resolver</span></button>
      <button type="button" id="hs-review-reopen" hidden><span class="t-en">Reopen</span><span class="t-pt">Reabrir</span></button>
      <button type="button" class="danger" id="hs-review-delete"><span class="t-en">Delete</span><span class="t-pt">Excluir</span></button>
    </div>
    <div class="hs-review-status" id="hs-review-status" role="status" aria-live="polite"></div>
  `;

  const list = document.createElement("aside");
  list.className = "hs-review-list hs-review-ui";
  list.id = "hs-review-list";
  list.setAttribute("role", "complementary");
  list.hidden = true;
  list.innerHTML = `
    <header>
      <h2><span class="t-en">Comments</span><span class="t-pt">Comentários</span></h2>
      <button type="button" id="hs-review-list-close"><span class="hs-review-sr t-en">Close</span><span class="hs-review-sr t-pt">Fechar</span>&times;</button>
    </header>
    <ul id="hs-review-list-items"></ul>
  `;

  const welcome = document.createElement("div");
  welcome.className = "hs-review-welcome hs-review-ui";
  welcome.id = "hs-review-welcome";
  welcome.setAttribute("role", "dialog");
  welcome.setAttribute("aria-modal", "true");
  welcome.setAttribute("aria-labelledby", "hs-review-welcome-title");
  welcome.setAttribute("aria-describedby", "hs-review-welcome-body");
  welcome.hidden = true;
  welcome.innerHTML = `
    <div class="hs-review-welcome-card">
      <h2 id="hs-review-welcome-title">
        <span class="t-pt">Olá, Michelle</span>
        <span class="t-en">Hello, Michelle</span>
      </h2>
      <p id="hs-review-welcome-body">
        <span class="t-pt">O Matt e a HomeShield estão prontos para qualquer pergunta. Deixe bolhas de comentário na página para marcar o que quiser mudar.</span>
        <span class="t-en">Matt and HomeShield are ready for any questions. Leave comment bubbles on the page to mark anything you’d like to change.</span>
      </p>
      <label class="hs-review-welcome-label" for="hs-review-welcome-text">
        <span class="t-pt">Tem alguma pergunta? Escreva aqui (opcional)</span>
        <span class="t-en">Have a question? Write it here (optional)</span>
      </label>
      <textarea id="hs-review-welcome-text" rows="4"></textarea>
      <div class="hs-review-actions">
        <button type="button" class="primary" id="hs-review-welcome-send">
          <span class="t-pt">Enviar</span>
          <span class="t-en">Send</span>
        </button>
        <button type="button" id="hs-review-welcome-close">
          <span class="t-pt">Fechar</span>
          <span class="t-en">Close</span>
        </button>
      </div>
      <div class="hs-review-status" id="hs-review-welcome-status" role="status" aria-live="polite"></div>
    </div>
  `;

  root.append(toolbar, pinsLayer, composer, list, welcome);

  const els = {
    add: toolbar.querySelector("#hs-review-btn-add"),
    vis: toolbar.querySelector("#hs-review-btn-visibility"),
    listBtn: toolbar.querySelector("#hs-review-btn-list"),
    exportBtn: toolbar.querySelector("#hs-review-btn-export"),
    exit: toolbar.querySelector("#hs-review-btn-exit"),
    welcomeBtn: toolbar.querySelector("#hs-review-btn-welcome"),
    welcomeText: welcome.querySelector("#hs-review-welcome-text"),
    welcomeSend: welcome.querySelector("#hs-review-welcome-send"),
    welcomeClose: welcome.querySelector("#hs-review-welcome-close"),
    welcomeStatus: welcome.querySelector("#hs-review-welcome-status"),
    count: toolbar.querySelector("#hs-review-count"),
    visHide: toolbar.querySelector(".hs-vis-hide"),
    visShow: toolbar.querySelector(".hs-vis-show"),
    text: composer.querySelector("#hs-review-text"),
    save: composer.querySelector("#hs-review-save"),
    resolve: composer.querySelector("#hs-review-resolve"),
    reopen: composer.querySelector("#hs-review-reopen"),
    remove: composer.querySelector("#hs-review-delete"),
    status: composer.querySelector("#hs-review-status"),
    title: composer.querySelector("#hs-review-composer-title"),
    section: composer.querySelector("#hs-review-composer-section"),
    listItems: list.querySelector("#hs-review-list-items"),
    listClose: list.querySelector("#hs-review-list-close"),
  };

  function cssPath(el) {
    if (!el || el === document.documentElement) return "body";
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== document.body) {
      if (node.id) {
        parts.unshift("#" + CSS.escape(node.id));
        break;
      }
      let sel = node.tagName.toLowerCase();
      const cls = (node.className && typeof node.className === "string")
        ? node.className.trim().split(/\s+/).filter((c) => c && !c.startsWith("hs-review"))
        : [];
      if (cls.length) sel += "." + cls.slice(0, 2).map((c) => CSS.escape(c)).join(".");
      const parent = node.parentElement;
      if (parent) {
        const same = Array.from(parent.children).filter((c) => c.tagName === node.tagName);
        if (same.length > 1) sel += ":nth-of-type(" + (same.indexOf(node) + 1) + ")";
      }
      parts.unshift(sel);
      node = parent;
    }
    return parts.join(" > ") || "body";
  }

  function nearestSection(fromEl, clientX, clientY) {
    const stack = (typeof clientX === "number" && typeof document.elementsFromPoint === "function")
      ? document.elementsFromPoint(clientX, clientY)
      : (fromEl ? [fromEl] : []);
    for (const el of stack) {
      if (isReviewUi(el)) continue;
      const section = el.closest && el.closest("section");
      if (section) return section;
    }
    if (typeof clientX === "number") {
      const sections = document.querySelectorAll("main section, body > section, section");
      for (const section of sections) {
        const r = section.getBoundingClientRect();
        if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
          return section;
        }
      }
    }
    for (const el of stack) {
      if (isReviewUi(el)) continue;
      const wrap = el.closest && el.closest("header, footer, main, [id]");
      if (wrap && wrap !== document.body) return wrap;
    }
    if (fromEl && fromEl.closest) {
      return fromEl.closest("section, header, footer, main, [id]") ||
        document.querySelector("main section, section, main") ||
        document.body;
    }
    return document.querySelector("main section, section, main, header, footer") || document.body;
  }

  function sectionSelector(el) {
    if (el && el.id) return "#" + CSS.escape(el.id);
    return cssPath(el);
  }

  function resolveAnchor(selector) {
    if (!selector) return null;
    try {
      return document.querySelector(selector);
    } catch (_) {
      return null;
    }
  }

  function sectionLabel(el, selector) {
    if (!el) return selector || "";
    if (el.id) return el.id;
    const heading = el.querySelector("h1, h2, h3");
    if (heading) {
      const visible = heading.offsetParent !== null ? heading : el.querySelector("h1:not([hidden]), h2, h3");
      const text = (visible || heading).textContent.trim().replace(/\s+/g, " ");
      if (text) return text.slice(0, 80);
    }
    const label = el.getAttribute("aria-label");
    if (label) return label;
    return selector || el.tagName.toLowerCase();
  }

  function findNote(id) {
    return notes.find((n) => n.id === id);
  }

  function setAddMode(on) {
    addMode = !!on;
    els.add.setAttribute("aria-pressed", addMode ? "true" : "false");
    document.body.classList.toggle("hs-review-adding", addMode);
  }

  function setCommentsVisible(on) {
    commentsVisible = !!on;
    els.vis.setAttribute("aria-pressed", commentsVisible ? "true" : "false");
    document.body.classList.toggle("hs-review-comments-hidden", !commentsVisible);
    pinsLayer.classList.toggle("is-hidden", !commentsVisible);
    els.visHide.hidden = !commentsVisible;
    els.visShow.hidden = commentsVisible;
    if (!commentsVisible) closeComposer();
  }

  function setListOpen(on) {
    listOpen = !!on;
    list.hidden = !listOpen;
    els.listBtn.setAttribute("aria-pressed", listOpen ? "true" : "false");
    if (listOpen) renderList();
  }

  function renderList() {
    const items = els.listItems;
    items.innerHTML = "";
    if (!notes.length) {
      const empty = document.createElement("p");
      empty.className = "hs-review-empty";
      empty.innerHTML = '<span class="t-en">' + I18N.en.empty + '</span><span class="t-pt">' + I18N.pt.empty + "</span>";
      items.appendChild(empty);
      return;
    }
    const sorted = notes.slice().sort((a, b) => a.number - b.number);
    for (const note of sorted) {
      const li = document.createElement("li");
      if (note.status === "resolved") li.classList.add("is-resolved");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "item" + (note.id === openId ? " is-open" : "");
      btn.dataset.id = note.id;
      const excerpt = (note.text || t("draft")).trim() || t("draft");
      const statusLabel = note.status === "resolved" ? t("resolved") : (note.status === "draft" ? t("draft") : t("open"));
      btn.innerHTML = '<span class="num">' + note.number + '</span><span class="excerpt"></span><span class="where"></span>';
      btn.querySelector(".excerpt").textContent = excerpt.length > 90 ? excerpt.slice(0, 87) + "…" : excerpt;
      btn.querySelector(".where").textContent = (note.sectionLabel || note.section || "") + " · " + statusLabel;
      btn.addEventListener("click", () => focusNote(note.id, true));
      li.appendChild(btn);
      items.appendChild(li);
    }
  }

  function placePins() {
    for (const pin of pinsLayer.querySelectorAll(".hs-review-pin")) {
      const note = findNote(pin.dataset.id);
      if (!note) continue;
      const el = resolveAnchor(note.section);
      if (!el) {
        pin.style.visibility = "hidden";
        continue;
      }
      const r = el.getBoundingClientRect();
      pin.style.visibility = "visible";
      pin.style.left = r.left + note.x * r.width + "px";
      pin.style.top = r.top + note.y * r.height + "px";
    }
    if (openId && !composer.hidden) placeComposer();
  }

  function placeComposer() {
    if (window.matchMedia("(max-width: 640px)").matches) return;
    const pin = pinsLayer.querySelector('.hs-review-pin[data-id="' + openId + '"]');
    if (!pin) return;
    const pr = pin.getBoundingClientRect();
    const w = composer.offsetWidth || 320;
    const h = composer.offsetHeight || 220;
    let left = pr.right + 12;
    let top = pr.top;
    if (left + w > window.innerWidth - 8) left = pr.left - w - 12;
    if (left < 8) left = 8;
    if (top + h > window.innerHeight - 8) top = Math.max(8, window.innerHeight - h - 8);
    if (top < 8) top = 8;
    composer.style.left = left + "px";
    composer.style.top = top + "px";
  }

  function renderPins() {
    pinsLayer.innerHTML = "";
    for (const note of notes) {
      const pin = document.createElement("button");
      pin.type = "button";
      pin.className = "hs-review-pin hs-review-ui";
      pin.dataset.id = note.id;
      pin.dataset.number = String(note.number);
      pin.dataset.section = note.section || "";
      pin.setAttribute("aria-label", t("notes") + " #" + note.number);
      if (note.status === "resolved") pin.classList.add("is-resolved");
      if (note.status === "draft") pin.classList.add("is-draft");
      if (note.sendState === "error") pin.classList.add("is-error");
      if (note.id === openId) pin.classList.add("is-open");
      pin.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        focusNote(note.id, false);
      });
      pinsLayer.appendChild(pin);
    }
    els.count.textContent = String(notes.length);
    placePins();
    if (listOpen) renderList();
  }

  function showStatus(kind, message, withRetry) {
    els.status.className = "hs-review-status" + (kind ? " is-" + kind : "");
    els.status.textContent = message || "";
    if (withRetry) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.id = "hs-review-retry";
      btn.innerHTML = '<span class="t-en">' + I18N.en.retry + '</span><span class="t-pt">' + I18N.pt.retry + "</span>";
      btn.addEventListener("click", () => {
        const note = findNote(openId);
        if (note) sendNote(note, note.status === "resolved" ? "resolve" : (note.sentAt ? "update" : "create"));
      });
      els.status.appendChild(btn);
    }
  }

  function refreshComposer() {
    const note = findNote(openId);
    if (!note) {
      composer.hidden = true;
      return;
    }
    composer.hidden = false;
    els.title.textContent = "#" + note.number;
    els.section.textContent = note.sectionLabel || note.section || "";
    els.text.value = note.text || "";
    els.text.placeholder = t("placeholder");
    const resolved = note.status === "resolved";
    els.resolve.hidden = resolved;
    els.reopen.hidden = !resolved;
    els.text.readOnly = resolved;
    if (note.sendState === "pending") showStatus("pending", t("pending"));
    else if (note.sendState === "sent") showStatus("ok", t("savedSent"));
    else if (note.sendState === "error") showStatus("err", t("savedLocal"), true);
    else showStatus("", "");
    placeComposer();
    els.text.focus();
  }

  function closeComposer() {
    openId = null;
    composer.hidden = true;
    pinsLayer.querySelectorAll(".hs-review-pin.is-open").forEach((p) => p.classList.remove("is-open"));
    if (listOpen) renderList();
  }

  function focusNote(id, scrollTo) {
    const note = findNote(id);
    if (!note) return;
    openId = id;
    if (!commentsVisible) setCommentsVisible(true);
    renderPins();
    refreshComposer();
    if (scrollTo) {
      const el = resolveAnchor(note.section);
      if (el) {
        const r = el.getBoundingClientRect();
        const y = r.top + window.scrollY + note.y * r.height - window.innerHeight / 3;
        window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
        requestAnimationFrame(placePins);
        setTimeout(placePins, 350);
      }
    }
  }

  function newId() {
    return "n_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  function addNoteAt(clientX, clientY, fromEl) {
    const hit = document.elementFromPoint(clientX, clientY) || fromEl;
    const section = nearestSection(hit, clientX, clientY);
    const rect = section.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    const selector = sectionSelector(section);
    const note = {
      id: newId(),
      number: nextNumber++,
      text: "",
      section: selector,
      sectionLabel: sectionLabel(section, selector),
      x,
      y,
      lang: currentLang(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "draft",
      sendState: "idle",
    };
    notes.push(note);
    saveStore();
    setAddMode(false);
    focusNote(note.id, false);
  }

  async function sendNote(note, action) {
    note.sendState = "pending";
    note.updatedAt = new Date().toISOString();
    saveStore();
    if (openId === note.id) showStatus("pending", t("pending"));
    renderPins();

    const subject = "HomeShield site note #" + note.number + (
      action === "resolve" ? " (resolved)" : action === "update" ? " (updated)" : ""
    );
    const payload = {
      access_key: ACCESS_KEY,
      subject,
      from_name: "HomeShield Review",
      name: "HomeShield Review",
      message: note.text || "",
      note: note.text || "",
      section: note.sectionLabel || note.section || "",
      language: note.lang || currentLang(),
      timestamp: note.updatedAt,
      status: note.status,
      note_number: String(note.number),
      action,
      page: location.pathname,
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
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
      if (!response.ok || data.success === false) throw new Error("submit-failed");
      note.sendState = "sent";
      note.sentAt = new Date().toISOString();
      note.sendError = "";
      saveStore();
      if (openId === note.id) showStatus("ok", t("savedSent"));
      renderPins();
    } catch (_) {
      note.sendState = "error";
      note.sendError = "failed";
      saveStore();
      if (openId === note.id) showStatus("err", t("savedLocal"), true);
      renderPins();
    } finally {
      clearTimeout(timer);
    }
  }

  function persistNoteText(note) {
    note.text = els.text.value.trim();
    note.lang = currentLang();
    note.updatedAt = new Date().toISOString();
    if (note.status === "draft") note.status = "open";
    saveStore();
  }

  async function onSave() {
    const note = findNote(openId);
    if (!note) return;
    persistNoteText(note);
    const action = note.sentAt ? "update" : "create";
    if (openId === note.id) showStatus("pending", t("saving"));
    renderPins();
    await sendNote(note, action);
  }

  async function onResolve() {
    const note = findNote(openId);
    if (!note) return;
    persistNoteText(note);
    note.status = "resolved";
    saveStore();
    refreshComposer();
    renderPins();
    await sendNote(note, "resolve");
  }

  async function onReopen() {
    const note = findNote(openId);
    if (!note) return;
    persistNoteText(note);
    note.status = "open";
    saveStore();
    refreshComposer();
    renderPins();
    await sendNote(note, "update");
  }

  function onDelete() {
    const id = openId;
    if (!id) return;
    notes = notes.filter((n) => n.id !== id);
    saveStore();
    closeComposer();
    renderPins();
  }

  function onExport() {
    const payload = {
      exportedAt: new Date().toISOString(),
      page: location.pathname,
      language: currentLang(),
      notes: notes,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "homeshield-review-notes.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exitReview() {
    try { localStorage.removeItem(MODE_KEY); } catch (_) {}
    const url = new URL(location.href);
    if (url.searchParams.has("review")) {
      url.searchParams.delete("review");
      const search = url.searchParams.toString();
      history.replaceState(null, "", url.pathname + (search ? "?" + search : "") + url.hash);
    }
    setAddMode(false);
    document.body.classList.remove("hs-review-adding", "hs-review-comments-hidden");
    window.removeEventListener("scroll", placePins);
    window.removeEventListener("resize", placePins);
    root.remove();
  }

  function isReviewUi(target) {
    return !!(target && target.closest && target.closest(".hs-review-ui, .hs-review-root, .hs-review-pin, .hs-review-toolbar, .hs-review-composer, .hs-review-list"));
  }

  function onPointerDown(event) {
    if (!addMode) return;
    if (isReviewUi(event.target)) return;
    pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId, target: event.target };
  }

  function onPointerUp(event) {
    if (!addMode || !pointerStart || event.pointerId !== pointerStart.id) return;
    const start = pointerStart;
    pointerStart = null;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12) return;
    if (isReviewUi(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    addNoteAt(event.clientX, event.clientY, start.target);
  }

  function onClickCapture(event) {
    if (!addMode) return;
    if (isReviewUi(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
  }

  function onKeydown(event) {
    if (event.key === "Escape") {
      if (!welcome.hidden) {
        closeWelcome();
        event.preventDefault();
        return;
      }
      if (openId) {
        closeComposer();
        event.preventDefault();
        return;
      }
      if (listOpen) {
        setListOpen(false);
        event.preventDefault();
        return;
      }
      if (addMode) {
        setAddMode(false);
        event.preventDefault();
      }
    }
  }

  function welcomeSeen() {
    try {
      return localStorage.getItem(WELCOME_KEY) === "1";
    } catch (_) {
      return false;
    }
  }

  function markWelcomeSeen() {
    try {
      localStorage.setItem(WELCOME_KEY, "1");
    } catch (_) {}
  }

  function showWelcomeStatus(kind, message) {
    els.welcomeStatus.className = "hs-review-status" + (kind ? " is-" + kind : "");
    els.welcomeStatus.textContent = message || "";
  }

  function refreshWelcomeCopy() {
    els.welcomeText.placeholder = t("welcomePlaceholder");
    els.welcomeBtn.setAttribute("aria-label", t("welcomeBtn"));
  }

  function openWelcome() {
    welcome.hidden = false;
    els.welcomeBtn.setAttribute("aria-pressed", "true");
    refreshWelcomeCopy();
    if (!els.welcomeStatus.textContent) showWelcomeStatus("", "");
    const focusTarget = els.welcomeText;
    requestAnimationFrame(() => {
      focusTarget.focus();
    });
  }

  function closeWelcome() {
    welcome.hidden = true;
    els.welcomeBtn.setAttribute("aria-pressed", "false");
    markWelcomeSeen();
    if (document.activeElement && welcome.contains(document.activeElement)) {
      els.welcomeBtn.focus();
    }
  }

  async function sendWelcomeQuestion() {
    const text = els.welcomeText.value.trim();
    if (!text) {
      showWelcomeStatus("err", t("welcomeEmpty"));
      els.welcomeText.focus();
      return;
    }
    els.welcomeSend.disabled = true;
    showWelcomeStatus("pending", t("welcomeSending"));
    const payload = {
      access_key: ACCESS_KEY,
      subject: "HomeShield question from Michelle",
      from_name: "HomeShield Review",
      name: "Michelle",
      message: text,
      language: currentLang(),
      timestamp: new Date().toISOString(),
      page: location.pathname,
    };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
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
      if (!response.ok || data.success === false) throw new Error("submit-failed");
      els.welcomeText.value = "";
      showWelcomeStatus("ok", t("welcomeSent"));
      markWelcomeSeen();
    } catch (_) {
      showWelcomeStatus("err", t("welcomeError"));
    } finally {
      clearTimeout(timer);
      els.welcomeSend.disabled = false;
    }
  }

  function bind() {
    els.add.addEventListener("click", () => setAddMode(!addMode));
    els.welcomeBtn.addEventListener("click", () => {
      if (welcome.hidden) openWelcome();
      else closeWelcome();
    });
    els.welcomeClose.addEventListener("click", closeWelcome);
    els.welcomeSend.addEventListener("click", sendWelcomeQuestion);
    welcome.addEventListener("click", (event) => {
      if (event.target === welcome) closeWelcome();
    });
    els.vis.addEventListener("click", () => setCommentsVisible(!commentsVisible));
    els.listBtn.addEventListener("click", () => setListOpen(!listOpen));
    els.listClose.addEventListener("click", () => setListOpen(false));
    els.exportBtn.addEventListener("click", onExport);
    els.exit.addEventListener("click", exitReview);
    els.save.addEventListener("click", onSave);
    els.resolve.addEventListener("click", onResolve);
    els.reopen.addEventListener("click", onReopen);
    els.remove.addEventListener("click", onDelete);

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("pointerup", onPointerUp, true);
    document.addEventListener("click", onClickCapture, true);
    document.addEventListener("keydown", onKeydown);
    window.addEventListener("scroll", placePins, { passive: true });
    window.addEventListener("resize", placePins);
    window.addEventListener("orientationchange", () => setTimeout(placePins, 200));
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => placePins());
      ro.observe(document.documentElement);
      document.querySelectorAll("section, header, footer, main").forEach((el) => ro.observe(el));
    }

    const mo = new MutationObserver(() => {
      refreshWelcomeCopy();
      if (!welcome.hidden && els.welcomeStatus.classList.contains("is-ok")) {
        showWelcomeStatus("ok", t("welcomeSent"));
      } else if (!welcome.hidden && els.welcomeStatus.classList.contains("is-err")) {
        const empty = els.welcomeText.value.trim() === "" && els.welcomeStatus.textContent;
        showWelcomeStatus("err", empty && !els.welcomeSend.disabled ? t("welcomeEmpty") : t("welcomeError"));
      } else if (!welcome.hidden && els.welcomeStatus.classList.contains("is-pending")) {
        showWelcomeStatus("pending", t("welcomeSending"));
      }
      if (openId) {
        els.text.placeholder = t("placeholder");
        const note = findNote(openId);
        if (note) {
          if (note.sendState === "sent") showStatus("ok", t("savedSent"));
          else if (note.sendState === "error") showStatus("err", t("savedLocal"), true);
        }
      }
      if (listOpen) renderList();
      pinsLayer.querySelectorAll(".hs-review-pin").forEach((pin) => {
        pin.setAttribute("aria-label", t("notes") + " #" + pin.dataset.number);
      });
    });
    mo.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  }

  function init() {
    try {
      if (new URLSearchParams(location.search).get("review") === "1") {
        localStorage.setItem(MODE_KEY, "1");
      }
    } catch (_) {}
    const stored = loadStore();
    notes = stored.notes || [];
    nextNumber = stored.nextNumber || (notes.reduce((m, n) => Math.max(m, n.number || 0), 0) + 1);
    document.body.appendChild(root);
    bind();
    setCommentsVisible(true);
    renderPins();
    refreshWelcomeCopy();
    if (!welcomeSeen()) openWelcome();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
