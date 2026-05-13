(function () {
  "use strict";

  const SUPABASE_URL    = window.CONFIG.SUPABASE_URL;
  const SUPABASE_KEY    = window.CONFIG.SUPABASE_KEY;
  const ETAPAS          = window.CONFIG.ETAPAS;
  const ETAPA_COLORS    = window.CONFIG.ETAPA_COLORS;

  const DECISION_COLORS = {
    "Admitido":       "#0a5038",
    "No interesado":  "#842029",
    "Oferta":         "#5a1282",
    "Seguimiento":    "#004892",
  };

  // ── State ──────────────────────────────────────────────
  let allProcesos = [];
  let currentEdit = null;

  // ── DOM refs ───────────────────────────────────────────
  const boardEl  = document.getElementById("board");
  const fSearch  = document.getElementById("f-search");
  const fPri     = document.getElementById("f-prioridad");
  const fDec     = document.getElementById("f-decision");
  const fPos     = document.getElementById("f-posicion");
  const metaEl   = document.getElementById("crm-meta");

  // ── Supabase helpers ───────────────────────────────────

  function headers(extra = {}) {
    return {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      ...extra,
    };
  }

  async function fetchProcesos() {
    const url = `${SUPABASE_URL}/rest/v1/procesos` +
      `?select=*,jugadores!jugador_id(nombre,apellido_paterno,apellido_materno,posicion_principal,calificacion)` +
      `&order=created_at.asc`;
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) throw new Error(`Supabase error ${res.status}`);
    return res.json();
  }

  async function fetchProcesoById(id) {
    const url = `${SUPABASE_URL}/rest/v1/procesos` +
      `?id=eq.${encodeURIComponent(id)}` +
      `&select=*,jugadores!jugador_id(nombre,apellido_paterno,apellido_materno,posicion_principal,calificacion)` +
      `&limit=1`;
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) return null;
    const rows = await res.json();
    return rows[0] || null;
  }

  async function patchProceso(id, data) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/procesos?id=eq.${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: headers({ "Content-Type": "application/json", Prefer: "return=minimal" }),
        body: JSON.stringify(data),
      }
    );
    return res.ok;
  }

  async function createProceso(jugadorId) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/procesos`, {
      method: "POST",
      headers: headers({ "Content-Type": "application/json", Prefer: "return=representation" }),
      body: JSON.stringify({ jugador_id: jugadorId, etapa: "Nuevo", decision: "Pendiente", prioridad: "B" }),
    });
    if (!res.ok) throw new Error(`Error ${res.status} al crear proceso`);
    const rows = await res.json();
    return rows[0];
  }

  async function deleteProceso(id) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/procesos?id=eq.${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: headers({ Prefer: "return=minimal" }),
      }
    );
    return res.ok;
  }

  async function searchJugadores(q) {
    const wildcard = `*${q}*`;
    const orParam = `(nombre.ilike.${wildcard},apellido_paterno.ilike.${wildcard},apellido_materno.ilike.${wildcard})`;
    const url = `${SUPABASE_URL}/rest/v1/jugadores` +
      `?or=${encodeURIComponent(orParam)}` +
      `&select=id,nombre,apellido_paterno,apellido_materno,posicion_principal` +
      `&limit=20&order=apellido_paterno.asc`;
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) return [];
    return res.json();
  }

  // ── Helpers ────────────────────────────────────────────

  function fullName(j) {
    return [j.nombre, j.apellido_paterno, j.apellido_materno].filter(Boolean).join(" ");
  }

  function stars(n) {
    const r = Math.min(5, Math.max(0, Math.round(n || 0)));
    return `<span class="card-stars">${"★".repeat(r)}<span class="stars-off">${"★".repeat(5 - r)}</span></span>`;
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function cssId(etapa) {
    return etapa.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  }

  // ── Stats ──────────────────────────────────────────────

  function updateStats(data) {
    document.getElementById("s-total").textContent = data.length;
    ETAPAS.forEach(e => {
      const el = document.getElementById(`s-${cssId(e)}`);
      if (el) el.textContent = data.filter(p => p.etapa === e).length;
    });
  }

  // ── Filters ────────────────────────────────────────────

  function applyFilters(data) {
    const q   = fSearch.value.trim().toLowerCase();
    const pri = fPri.value;
    const dec = fDec.value;
    const pos = fPos.value;
    return data.filter(p => {
      const jug = p.jugadores || {};
      if (q   && !fullName(jug).toLowerCase().includes(q))   return false;
      if (pri && p.prioridad !== pri)                         return false;
      if (dec && p.decision  !== dec)                         return false;
      if (pos && (jug.posicion_principal || "") !== pos)      return false;
      return true;
    });
  }

  // ── Board columns ──────────────────────────────────────

  function buildBoard() {
    boardEl.innerHTML = "";
    ETAPAS.forEach(etapa => {
      const color = ETAPA_COLORS[etapa] || "#6c757d";
      const col   = document.createElement("div");
      col.className = "col";

      col.innerHTML = `
        <div class="col-header" style="background:${color}">
          <span class="col-title">${esc(etapa)}</span>
          <span class="col-count" id="cnt-${cssId(etapa)}">0</span>
        </div>
        <div class="col-body" data-etapa="${esc(etapa)}"></div>
      `;

      const dropzone = col.querySelector(".col-body");

      dropzone.addEventListener("dragover", e => {
        e.preventDefault();
        dropzone.classList.add("drag-over");
      });
      dropzone.addEventListener("dragleave", e => {
        if (!dropzone.contains(e.relatedTarget)) dropzone.classList.remove("drag-over");
      });
      dropzone.addEventListener("drop", async e => {
        e.preventDefault();
        dropzone.classList.remove("drag-over");
        const id = e.dataTransfer.getData("text/proceso-id");
        if (!id) return;
        const p = allProcesos.find(x => x.id === id);
        if (!p || p.etapa === etapa) return;
        p.etapa = etapa;
        render();
        await patchProceso(id, { etapa });
      });

      boardEl.appendChild(col);
    });
  }

  // ── Card ───────────────────────────────────────────────

  function makeCard(p) {
    const jug  = p.jugadores || {};
    const name = fullName(jug);
    const card = document.createElement("div");
    card.className    = "kanban-card";
    card.dataset.id   = p.id;
    card.draggable    = true;

    const decColor = DECISION_COLORS[p.decision] || "#5a6a7a";

    card.innerHTML = `
      <div class="card-name">${esc(name)}</div>
      <div class="card-meta">
        ${stars(jug.calificacion)}
        ${jug.posicion_principal ? `<span class="card-pos">${esc(jug.posicion_principal)}</span>` : ""}
      </div>
      <div class="card-badges">
        <span class="badge-pri ${esc(p.prioridad || "B")}">${esc(p.prioridad || "B")}</span>
        <span class="card-decision" style="color:${decColor}">${esc(p.decision || "Pendiente")}</span>
      </div>
      ${p.siguiente_paso ? `<div class="card-next">${esc(p.siguiente_paso)}</div>` : ""}
    `;

    card.addEventListener("dragstart", e => {
      e.dataTransfer.setData("text/proceso-id", p.id);
      e.dataTransfer.effectAllowed = "move";
      setTimeout(() => card.classList.add("dragging"), 0);
    });
    card.addEventListener("dragend", () => card.classList.remove("dragging"));
    card.addEventListener("click",   () => openEditModal(p));

    return card;
  }

  // ── Render ─────────────────────────────────────────────

  function render() {
    const filtered = applyFilters(allProcesos);

    metaEl.textContent = filtered.length === allProcesos.length
      ? `${allProcesos.length} jugador${allProcesos.length !== 1 ? "es" : ""} en seguimiento`
      : `${filtered.length} de ${allProcesos.length} jugadores`;

    // Clear all columns
    boardEl.querySelectorAll(".col-body").forEach(dz => dz.innerHTML = "");
    ETAPAS.forEach(e => {
      const cnt = document.getElementById(`cnt-${cssId(e)}`);
      if (cnt) cnt.textContent = "0";
    });

    const counts = {};
    ETAPAS.forEach(e => counts[e] = 0);

    filtered.forEach(p => {
      const etapa = ETAPAS.includes(p.etapa) ? p.etapa : "Nuevo";
      const col = boardEl.querySelector(`.col-body[data-etapa="${etapa}"]`);
      if (!col) return;
      col.appendChild(makeCard(p));
      counts[etapa]++;
    });

    ETAPAS.forEach(e => {
      const cnt = document.getElementById(`cnt-${cssId(e)}`);
      if (cnt) cnt.textContent = counts[e];
      // Show empty hint when column has no cards
      const col = boardEl.querySelector(`.col-body[data-etapa="${e}"]`);
      if (col && counts[e] === 0) {
        col.innerHTML = `<div class="col-empty">Sin jugadores</div>`;
      }
    });

    updateStats(allProcesos);
    syncScrollWidth();
  }

  // ── Top scrollbar sync ────────────────────────────────

  let syncScrollWidth = () => {};

  function setupTopScroll() {
    const topScroll = document.getElementById("board-top-scroll");
    const topInner  = document.getElementById("board-top-inner");
    if (!topScroll || !topInner) return;

    syncScrollWidth = () => {
      topInner.style.width = boardEl.scrollWidth + "px";
    };

    let lock = false;
    topScroll.addEventListener("scroll", () => {
      if (lock) return; lock = true;
      boardEl.scrollLeft = topScroll.scrollLeft;
      lock = false;
    });
    boardEl.addEventListener("scroll", () => {
      if (lock) return; lock = true;
      topScroll.scrollLeft = boardEl.scrollLeft;
      lock = false;
    });
    window.addEventListener("resize", syncScrollWidth);
  }

  // ── Edit modal ─────────────────────────────────────────

  function openEditModal(p) {
    currentEdit = p;
    const jug = p.jugadores || {};
    document.getElementById("m-title").textContent    = fullName(jug);
    document.getElementById("m-etapa").value          = p.etapa     || "Nuevo";
    document.getElementById("m-decision").value       = p.decision  || "Pendiente";
    document.getElementById("m-prioridad").value      = p.prioridad || "B";
    document.getElementById("m-siguiente").value      = p.siguiente_paso  || "";
    document.getElementById("m-detalles").value       = p.detalles        || "";
    document.getElementById("m-scouting").value       = p.scouting_report || "";
    document.getElementById("m-save-msg").style.display = "none";
    document.getElementById("m-save").disabled        = false;
    document.getElementById("modal-edit").style.display = "flex";
  }

  function closeEditModal() {
    document.getElementById("modal-edit").style.display = "none";
    currentEdit = null;
  }

  // ── Add modal ──────────────────────────────────────────

  function openAddModal() {
    document.getElementById("add-search").value   = "";
    document.getElementById("add-results").innerHTML = `<p class="add-hint">Escribe al menos 2 caracteres para buscar.</p>`;
    document.getElementById("add-msg").textContent = "";
    document.getElementById("modal-add").style.display = "flex";
    setTimeout(() => document.getElementById("add-search").focus(), 50);
  }

  function closeAddModal() {
    document.getElementById("modal-add").style.display = "none";
  }

  function renderAddResults(jugadores) {
    const el = document.getElementById("add-results");
    if (jugadores.length === 0) {
      el.innerHTML = `<p class="add-hint">No se encontraron jugadores disponibles.</p>`;
      return;
    }
    el.innerHTML = jugadores.map(j => `
      <div class="add-result-item" data-id="${esc(j.id)}">
        <strong>${esc(fullName(j))}</strong>
        ${j.posicion_principal ? `<span class="card-pos">${esc(j.posicion_principal)}</span>` : ""}
      </div>
    `).join("");

    el.querySelectorAll(".add-result-item").forEach(item => {
      item.addEventListener("click", async () => {
        const msgEl = document.getElementById("add-msg");
        item.style.opacity       = "0.5";
        item.style.pointerEvents = "none";
        try {
          const created = await createProceso(item.dataset.id);
          const full    = await fetchProcesoById(created.id);
          if (full) allProcesos.push(full);
          msgEl.textContent  = "✓ Jugador agregado al kanban";
          msgEl.style.color  = "#0a5038";
          render();
          setTimeout(() => closeAddModal(), 900);
        } catch (err) {
          msgEl.textContent  = `✗ ${err.message}`;
          msgEl.style.color  = "#842029";
          item.style.opacity       = "";
          item.style.pointerEvents = "";
        }
      });
    });
  }

  // ── Init ───────────────────────────────────────────────

  async function init() {
    buildBoard();
    setupTopScroll();

    // Filter listeners
    fSearch.addEventListener("input",  render);
    fPri.addEventListener("change",    render);
    fDec.addEventListener("change",    render);
    fPos.addEventListener("change",    render);
    document.getElementById("btn-clear").addEventListener("click", () => {
      fSearch.value = "";
      fPri.value    = "";
      fDec.value    = "";
      fPos.value    = "";
      render();
    });

    // Add modal
    document.getElementById("btn-add").addEventListener("click",   openAddModal);
    document.getElementById("add-close").addEventListener("click", closeAddModal);
    document.getElementById("modal-add").addEventListener("click", e => {
      if (e.target === document.getElementById("modal-add")) closeAddModal();
    });

    let searchTimer;
    document.getElementById("add-search").addEventListener("input", () => {
      clearTimeout(searchTimer);
      const q = document.getElementById("add-search").value.trim();
      if (q.length < 2) {
        document.getElementById("add-results").innerHTML =
          `<p class="add-hint">Escribe al menos 2 caracteres para buscar.</p>`;
        return;
      }
      searchTimer = setTimeout(async () => {
        const results  = await searchJugadores(q);
        const existing = new Set(allProcesos.map(p => p.jugador_id));
        renderAddResults(results.filter(j => !existing.has(j.id)));
      }, 300);
    });

    // Edit modal
    document.getElementById("m-close").addEventListener("click",  closeEditModal);
    document.getElementById("m-cancel").addEventListener("click", closeEditModal);
    document.getElementById("modal-edit").addEventListener("click", e => {
      if (e.target === document.getElementById("modal-edit")) closeEditModal();
    });

    document.getElementById("m-save").addEventListener("click", async () => {
      if (!currentEdit) return;
      const btn = document.getElementById("m-save");
      const msg = document.getElementById("m-save-msg");
      btn.disabled = true;

      const data = {
        etapa:          document.getElementById("m-etapa").value    || null,
        decision:       document.getElementById("m-decision").value || null,
        prioridad:      document.getElementById("m-prioridad").value || null,
        siguiente_paso: document.getElementById("m-siguiente").value.trim()  || null,
        detalles:       document.getElementById("m-detalles").value.trim()   || null,
        scouting_report:document.getElementById("m-scouting").value.trim()   || null,
      };

      const ok = await patchProceso(currentEdit.id, data);
      if (ok) {
        Object.assign(currentEdit, data);
        msg.textContent    = "✓ Guardado";
        msg.className      = "save-msg ok";
        msg.style.display  = "inline";
        render();
        setTimeout(() => closeEditModal(), 900);
      } else {
        msg.textContent    = "✗ Error al guardar";
        msg.className      = "save-msg err";
        msg.style.display  = "inline";
        btn.disabled = false;
      }
    });

    document.getElementById("m-remove").addEventListener("click", async () => {
      if (!currentEdit) return;
      const name = fullName(currentEdit.jugadores || {});
      if (!confirm(`¿Quitar a ${name} del kanban?\n\nEsto elimina el registro de proceso pero no borra al jugador de Prospectos.`)) return;
      const ok = await deleteProceso(currentEdit.id);
      if (ok) {
        allProcesos = allProcesos.filter(p => p.id !== currentEdit.id);
        closeEditModal();
        render();
      } else {
        alert("Error al eliminar. Intenta de nuevo.");
      }
    });

    // Load data
    try {
      allProcesos = await fetchProcesos();
      render();
    } catch (err) {
      boardEl.innerHTML = `
        <div style="padding:60px;color:#842029;text-align:center;width:100%;">
          <div style="font-size:36px;margin-bottom:14px;">⚠️</div>
          <strong>Error al cargar procesos</strong><br>
          <small>${esc(err.message)}</small>
        </div>`;
    }
  }

  document.addEventListener("DOMContentLoaded", init);

})();
