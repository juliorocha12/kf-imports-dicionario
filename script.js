/* =========================================================
   Dicionario de Dados - KF Imports
   Tema, navegacao responsiva, busca em tempo real e
   visualizador do DER (Panzoom.js)
   ========================================================= */
(function () {
  "use strict";

  var root = document.documentElement;
  var body = document.body;

  /* ---------- Armazenamento seguro ---------- */
  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* ignora */ }
  }

  /* ---------- Tema claro/escuro ---------- */
  var themeBtn = document.getElementById("theme-toggle");
  var themeLabel = themeBtn.querySelector(".label");

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    themeBtn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    themeLabel.textContent = theme === "dark" ? "Modo claro" : "Modo escuro";
  }

  var savedTheme = safeGet("kf-theme");
  var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(savedTheme || (prefersDark ? "dark" : "light"));

  themeBtn.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    safeSet("kf-theme", next);
  });

  /* ---------- Sidebar responsiva ---------- */
  var menuBtn = document.getElementById("menu-toggle");
  var overlay = document.getElementById("overlay");
  var sidebar = document.getElementById("sidebar");

  function setNav(open) {
    body.classList.toggle("nav-open", open);
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }
  menuBtn.addEventListener("click", function () {
    setNav(!body.classList.contains("nav-open"));
  });
  overlay.addEventListener("click", function () { setNav(false); });
  sidebar.addEventListener("click", function (ev) {
    if (ev.target.closest("a")) { setNav(false); }
  });

  /* ---------- Normalizacao de texto (sem acentos, minusculo) ---------- */
  function normalize(str) {
    return String(str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  /* ---------- Busca em tempo real ---------- */
  var searchInput = document.getElementById("search-input");
  var statusEl = document.getElementById("search-status");
  var emptyEl = document.getElementById("no-results");
  var sections = Array.prototype.slice.call(document.querySelectorAll(".dict-section"));
  var links = {};
  Array.prototype.forEach.call(document.querySelectorAll("#table-links a"), function (a) {
    links[a.getAttribute("href").slice(1)] = a;
  });
  var totalTables = sections.length;
  var totalColumns = document.querySelectorAll(".dict-section tbody tr").length;

  function filterDictionary() {
    var q = normalize(searchInput.value);
    var visibleTables = 0;
    var visibleCols = 0;

    sections.forEach(function (sec) {
      var tableMatch = q === "" || normalize(sec.getAttribute("data-table")).indexOf(q) !== -1;
      var rows = sec.querySelectorAll("tbody tr");
      var shown = 0;

      Array.prototype.forEach.call(rows, function (row) {
        var match = tableMatch || row.getAttribute("data-col").indexOf(q) !== -1;
        row.hidden = !match;
        if (match) { shown += 1; }
      });

      sec.hidden = shown === 0;
      if (links[sec.id]) { links[sec.id].parentNode.hidden = shown === 0; }
      if (shown > 0) { visibleTables += 1; visibleCols += shown; }
    });

    emptyEl.hidden = visibleTables !== 0;
    if (q === "") {
      statusEl.textContent = totalTables + " tabelas e " + totalColumns + " atributos exibidos.";
    } else {
      statusEl.textContent = visibleTables + " de " + totalTables + " tabelas e " +
        visibleCols + " de " + totalColumns + " atributos correspondem a \"" + searchInput.value.trim() + "\".";
    }
  }

  searchInput.addEventListener("input", filterDictionary);
  searchInput.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") { searchInput.value = ""; filterDictionary(); }
  });
  filterDictionary();

  /* ---------- Destaque do link ativo na sidebar ---------- */
  if ("IntersectionObserver" in window) {
    var targets = Array.prototype.slice.call(document.querySelectorAll("main section[id]"));
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && links[entry.target.id]) {
          Object.keys(links).forEach(function (id) { links[id].removeAttribute("aria-current"); });
          links[entry.target.id].setAttribute("aria-current", "true");
        }
      });
    }, { rootMargin: "-170px 0px -65% 0px", threshold: 0 });
    targets.forEach(function (t) { observer.observe(t); });
  }

  /* ---------- Imagem do DER ausente (ajuda de diagnostico) ---------- */
  function warnMissing(img) {
    var msg = document.createElement("p");
    msg.className = "der-missing";
    msg.textContent = "Imagem do DER nao encontrada em assets/der.png. Confira o nome do arquivo " +
      "(o GitHub Pages diferencia maiusculas de minusculas) e a pasta assets/.";
    img.parentNode.insertBefore(msg, img);
    img.hidden = true;
  }
  Array.prototype.forEach.call(document.querySelectorAll("img[data-der]"), function (img) {
    img.addEventListener("error", function () { warnMissing(img); });
  });

  /* ---------- Modal do DER com Panzoom ---------- */
  var modal = document.getElementById("der-modal");
  var stage = document.getElementById("der-stage");
  var pzTarget = document.getElementById("der-pz");
  var btnIn = document.getElementById("pz-in");
  var btnOut = document.getElementById("pz-out");
  var btnReset = document.getElementById("pz-reset");
  var btnClose = document.getElementById("pz-close");
  var openers = document.querySelectorAll("[data-open-der]");
  var panzoom = null;
  var lastFocus = null;

  function initPanzoom() {
    if (panzoom || typeof window.Panzoom !== "function") { return; }
    panzoom = window.Panzoom(pzTarget, {
      maxScale: 12,
      minScale: 0.25,
      step: 0.35,
      canvas: true,
      cursor: "grab"
    });
    stage.addEventListener("wheel", function (ev) { panzoom.zoomWithWheel(ev); }, { passive: false });
  }

  function openModal() {
    lastFocus = document.activeElement;
    modal.hidden = false;
    body.classList.add("modal-open");
    initPanzoom();
    if (panzoom) { panzoom.reset({ animate: false }); }
    btnClose.focus();
  }

  function closeModal() {
    modal.hidden = true;
    body.classList.remove("modal-open");
    if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
  }

  Array.prototype.forEach.call(openers, function (el) {
    el.addEventListener("click", function (ev) { ev.preventDefault(); openModal(); });
  });

  btnIn.addEventListener("click", function () { if (panzoom) { panzoom.zoomIn(); } });
  btnOut.addEventListener("click", function () { if (panzoom) { panzoom.zoomOut(); } });
  btnReset.addEventListener("click", function () { if (panzoom) { panzoom.reset(); } });
  btnClose.addEventListener("click", closeModal);

  document.addEventListener("keydown", function (ev) {
    if (modal.hidden) { return; }
    if (ev.key === "Escape") { closeModal(); }
    else if (ev.key === "+" || ev.key === "=") { if (panzoom) { panzoom.zoomIn(); } }
    else if (ev.key === "-") { if (panzoom) { panzoom.zoomOut(); } }
    else if (ev.key === "0") { if (panzoom) { panzoom.reset(); } }
  });
})();
