(function () {
  "use strict";

  const SUPABASE_URL = window.CONFIG.SUPABASE_URL;
  const SUPABASE_KEY = window.CONFIG.SUPABASE_KEY;

  // ── DOM refs ──────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const loadingEl = $("t-loading");
  const tableEl   = $("t-table");
  const emptyEl   = $("t-empty");
  const tbody     = $("t-tbody");
  const totalEl   = $("t-total");

  // ── State ─────────────────────────────────────────────
  let allData      = [];
  let filtroActivo = "todos";

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // ── Supabase helpers ──────────────────────────────────
  async function fetchTryout() {
    const etapa = encodeURIComponent("Tryout / Visita");
    const url = `${SUPABASE_URL}/rest/v1/procesos` +
      `?select=*,jugadores(id,nombre,posicion,estado,favorito)` +
      `&etapa=eq.${etapa}`;
    const res = await fetch(url, {
      headers: {
        "apikey":        SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      }
    });
    if (!res.ok) throw new Error(`Supabase error ${res.status}`);
    return res.json();
  }

  async function patchProceso(id, data) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/procesos?id=eq.${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: {
          "apikey":        SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type":  "application/json",
          "Prefer":        "return=minimal",
        },
        body: JSON.stringify(data),
      }
    );
    return res.ok;
  }

  async function patchJugador(id, data) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/jugadores?id=eq.${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: {
          "apikey":        SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type":  "application/json",
          "Prefer":        "return=minimal",
        },
        body: JSON.stringify(data),
      }
    );
    return res.ok;
  }

  // ── Build row HTML ────────────────────────────────────
  function buildRow(p, n) {
    const j = Array.isArray(p.jugadores) ? (p.jugadores[0] || {}) : (p.jugadores || {});
    const confirmado = (p.confirmado_tryout || "Pendiente").toLowerCase();    const prioridad  = p.prioridad || "";
    const favorito   = !!j.favorito;

    const etapasOpts = window.CONFIG.ETAPAS.map(e =>
      `<option value="${esc(e)}" ${p.etapa === e ? "selected" : ""}>${esc(e)}</option>`
    ).join("");

    const decisionOpts = [["", "— Sin decisión —"], ...window.CONFIG.DECISIONES.map(d => [d, d])].map(([val, label]) =>
      `<option value="${esc(val)}" ${(p.decision || "") === val ? "selected" : ""}>${esc(label)}</option>`
    ).join("");

    return `
      <tr data-pid="${esc(p.id)}" data-jid="${esc(j.id || "")}">
        <td>${n}</td>
        <td><a class="prospecto-link" href="perfil.html?id=${esc(j.id)}">${esc(j.nombre || "—")}</a></td>
        <td>${esc(j.estado || "—")}</td>
        <td>${esc(j.posicion || "—")}</td>
        <td>
          <div class="confirm-btns">
            <button class="confirm-btn btn-si   ${confirmado === "si"        ? "active" : ""}" data-val="si">Sí</button>
            <button class="confirm-btn btn-no   ${confirmado === "no"        ? "active" : ""}" data-val="no">No</button>
            <button class="confirm-btn btn-pend ${confirmado === "pendiente" ? "active" : ""}" data-val="pendiente">Pendiente</button>
          </div>
        </td>
        <td class="menu-cell">
          <button class="row-menu-btn" title="Opciones">⋯</button>
        </td>
      </tr>
      <tr class="panel-row" data-panel-pid="${esc(p.id)}">
        <td colspan="6">
          <div class="row-panel">

            <div class="panel-section">
              <label class="panel-label">Notas del tryout</label>
              <textarea class="panel-textarea" rows="3" placeholder="Observaciones del tryout...">${esc(p.notas_tryout || "")}</textarea>
              <div class="panel-notas-footer">
                <button class="panel-save-notas">Guardar</button>
              </div>
            </div>

            <div class="panel-section">
              <label class="panel-label">Etapa</label>
              <select class="panel-select panel-etapa">${etapasOpts}</select>
            </div>

            <div class="panel-section">
              <label class="panel-label">Decisión</label>
              <select class="panel-select panel-decision">${decisionOpts}</select>
            </div>

            <div class="panel-section">
              <label class="panel-label">Favorito</label>
              <button class="panel-fav-btn ${favorito ? "fav-active" : ""}">${favorito ? "★ En favoritos" : "☆ Agregar a favoritos"}</button>
            </div>

            <div class="panel-section">
              <label class="panel-label">Prioridad</label>
              <div class="prioridad-btns">
                <button class="prio-btn ${prioridad === "A" ? "prio-active" : ""}" data-val="A">A</button>
                <button class="prio-btn ${prioridad === "B" ? "prio-active" : ""}" data-val="B">B</button>
                <button class="prio-btn ${prioridad === "C" ? "prio-active" : ""}" data-val="C">C</button>
              </div>
            </div>

            <div class="panel-section panel-disabled">
              <label class="panel-label">Métricas</label>
              <p class="coming-soon">Próximamente</p>
            </div>

            <div class="panel-section" style="grid-column: 1 / -1;">
              <button class="panel-eliminar">Eliminar del Tryout</button>
            </div>

          </div>
        </td>
      </tr>`;
  }

  // ── Update total counter ──────────────────────────────
  function updateTotal() {
    const n = tbody.querySelectorAll("tr[data-pid]").length;
    totalEl.textContent = `${n} prospecto${n !== 1 ? "s" : ""}`;
    if (n === 0) {
      tableEl.style.display = "none";
      emptyEl.style.display = "";
    }
  }

  // ── Attach listeners per row ──────────────────────────
  function attachRowListeners() {
    tbody.querySelectorAll("tr[data-pid]").forEach(tr => {
      const pid = tr.dataset.pid;
      const jid = tr.dataset.jid;
      const panelRow = tbody.querySelector(`tr.panel-row[data-panel-pid="${pid}"]`);
      const panel    = panelRow.querySelector(".row-panel");
      const menuBtn  = tr.querySelector(".row-menu-btn");

      // Confirmado buttons
      tr.querySelectorAll(".confirm-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          const val = btn.dataset.val;
          const ok = await patchProceso(pid, { confirmado_tryout: val });
          if (!ok) return;
          tr.querySelectorAll(".confirm-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
        });
      });

      // Menu open/close
      menuBtn.addEventListener("click", e => {
        e.stopPropagation();
        const isOpen = panelRow.classList.contains("open");
        closeAllPanels();
        if (!isOpen) {
          panelRow.classList.add("open");
          menuBtn.classList.add("open");
        }
      });

      panel.addEventListener("click", e => e.stopPropagation());

      // Save notas
      const saveNotasBtn = panelRow.querySelector(".panel-save-notas");
      saveNotasBtn.addEventListener("click", async () => {
        const textarea = panelRow.querySelector(".panel-textarea");
        saveNotasBtn.disabled = true;
        saveNotasBtn.textContent = "Guardando...";
        const ok = await patchProceso(pid, { notas_tryout: textarea.value.trim() || null });
        saveNotasBtn.disabled = false;
        saveNotasBtn.textContent = ok ? "✓ Guardado" : "✗ Error";
        setTimeout(() => { saveNotasBtn.textContent = "Guardar"; }, 2000);
      });

      // Etapa select (auto-save)
      panelRow.querySelector(".panel-etapa").addEventListener("change", async e => {
        await patchProceso(pid, { etapa: e.target.value });
      });

      // Decisión select (auto-save)
      panelRow.querySelector(".panel-decision").addEventListener("change", async e => {
        await patchProceso(pid, { decision: e.target.value || null });
      });

      // Favorito toggle
      const favBtn = panelRow.querySelector(".panel-fav-btn");
      favBtn.addEventListener("click", async () => {
        const newVal = !favBtn.classList.contains("fav-active");
        const ok = await patchJugador(jid, { favorito: newVal });
        if (!ok) return;
        favBtn.classList.toggle("fav-active", newVal);
        favBtn.textContent = newVal ? "★ En favoritos" : "☆ Agregar a favoritos";
      });

      // Prioridad buttons
      panelRow.querySelectorAll(".prio-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          const val = btn.dataset.val;
          const ok = await patchProceso(pid, { prioridad: val });
          if (!ok) return;
          panelRow.querySelectorAll(".prio-btn").forEach(b => b.classList.remove("prio-active"));
          btn.classList.add("prio-active");
        });
      });

      // Eliminar del Tryout
      panelRow.querySelector(".panel-eliminar").addEventListener("click", async () => {
        const nombre = tr.querySelector(".prospecto-link")?.textContent || "este prospecto";
        if (!confirm(`¿Eliminar a ${nombre} del Tryout?\nSe cambiará su etapa a "Evaluado".`)) return;
        const ok = await patchProceso(pid, { etapa: "Evaluado" });
        if (ok) {
          tr.remove();
          panelRow.remove();
          updateTotal();
        } else {
          alert("Error al eliminar. Intenta de nuevo.");
        }
      });
    });
  }

  // ── Apply filter ─────────────────────────────────────
  function applyFiltro() {
    const filtered = filtroActivo === "todos"
      ? allData
      : allData.filter(p => (p.confirmado_tryout || "Pendiente").toLowerCase() === filtroActivo);
    render(filtered);
  }

  // ── Close all open panels ─────────────────────────────
  function closeAllPanels() {
    document.querySelectorAll(".panel-row.open").forEach(p => p.classList.remove("open"));
    document.querySelectorAll(".row-menu-btn.open").forEach(b => b.classList.remove("open"));
  }

  document.addEventListener("click", closeAllPanels);

  // ── Render ────────────────────────────────────────────
  function render(data) {
    data.sort((a, b) => {
      const na = (Array.isArray(a.jugadores) ? a.jugadores[0] : a.jugadores)?.nombre || "";
      const nb = (Array.isArray(b.jugadores) ? b.jugadores[0] : b.jugadores)?.nombre || "";
      return na.localeCompare(nb, "es");
    });

    loadingEl.style.display = "none";

    if (data.length === 0) {
      emptyEl.style.display = "";
      tableEl.style.display = "none";
      totalEl.textContent = "0 prospectos";
      return;
    }

    tableEl.style.display = "";
    emptyEl.style.display = "none";
    totalEl.textContent = `${data.length} prospecto${data.length !== 1 ? "s" : ""}`;

    tbody.innerHTML = data.map((p, i) => buildRow(p, i + 1)).join("");
    attachRowListeners();
  }

  // ── Filter pill listeners ─────────────────────────────
  document.querySelectorAll(".filter-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      filtroActivo = btn.dataset.filtro;
      document.querySelectorAll(".filter-pill").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      applyFiltro();
    });
  });

  // ── Expose state for exportarPDF ──────────────────────
  window._tryoutExport = function () { return { allData, filtroActivo }; };

  // ── Init ──────────────────────────────────────────────
  (async function init() {
    try {
      allData = await fetchTryout();
      applyFiltro();
    } catch (err) {
      loadingEl.innerHTML = `
        <div style="font-size:36px;margin-bottom:12px;">⚠️</div>
        <p style="color:#842029;">Error al cargar los datos. Verifica tu conexión.<br>
        <small>${esc(err.message)}</small></p>`;
    }
  })();

})();

// ── Exportar PDF ──────────────────────────────────────
function exportarPDF() {
  const { allData, filtroActivo } = window._tryoutExport();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });

  const pageW  = doc.internal.pageSize.getWidth();
  const margin = 36;
  const today  = new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });
  const dateStr = new Date().toISOString().slice(0, 10);

  // ── Encabezado ──
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 72, 146);
  doc.text("Tryout / Visita", margin, 40);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90, 106, 122);
  doc.text(today, pageW - margin, 40, { align: "right" });

  let tableY = 62;
  if (filtroActivo !== "todos") {
    const label = filtroActivo === "si" ? "Sí" : filtroActivo === "no" ? "No" : "Pendiente";
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(90, 106, 122);
    doc.text(`Filtro: Confirmado — ${label}`, margin, 58);
    tableY = 76;
  }

  // ── Recolectar datos desde allData filtrado ──
  const tbodyEl = document.getElementById("t-tbody");
  const datos = filtroActivo === "todos"
    ? allData
    : allData.filter(p => (p.confirmado_tryout || "Pendiente").toLowerCase() === filtroActivo);

  datos.sort((a, b) => {
    const na = (Array.isArray(a.jugadores) ? a.jugadores[0] : a.jugadores)?.nombre || "";
    const nb = (Array.isArray(b.jugadores) ? b.jugadores[0] : b.jugadores)?.nombre || "";
    return na.localeCompare(nb, "es");
  });

  const filas = datos.map(p => {
    const j          = Array.isArray(p.jugadores) ? (p.jugadores[0] || {}) : (p.jugadores || {});
    const nombre     = j.nombre   || "—";
    const estado     = j.estado   || "—";
    const posicion   = j.posicion || "—";
    const cv         = p.confirmado_tryout || "pendiente";
    const confirmado = cv === "si" ? "Sí" : cv === "no" ? "No" : "Pendiente";
    const panelRow   = tbodyEl?.querySelector(`tr.panel-row[data-panel-pid="${p.id}"]`);
    const notas      = panelRow?.querySelector(".panel-textarea")?.value.trim() || "";
    return { nombre, estado, posicion, confirmado, notas };
  });

  // ── Tabla ──
  const cols = [
    { label: "Nombre",           w: 160 },
    { label: "Estado",           w: 80  },
    { label: "Posición",         w: 70  },
    { label: "Confirmado",       w: 80  },
    { label: "Notas del tryout", w: 0   },
  ];
  const usedW = cols.slice(0, -1).reduce((s, c) => s + c.w, 0);
  cols[4].w = pageW - margin * 2 - usedW;

  const rowH      = 22;
  const headerH   = 26;
  let   y         = tableY;
  const maxNotasW = cols[4].w - 8;

  // Header row
  doc.setFillColor(0, 72, 146);
  doc.rect(margin, y, pageW - margin * 2, headerH, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  let x = margin;
  cols.forEach(col => {
    doc.text(col.label, x + 6, y + 17);
    x += col.w;
  });
  y += headerH;

  // Data rows
  doc.setFont("helvetica", "normal");
  filas.forEach((row, i) => {
    if (i % 2 === 1) {
      doc.setFillColor(245, 248, 251);
      doc.rect(margin, y, pageW - margin * 2, rowH, "F");
    }
    doc.setTextColor(26, 42, 58);
    doc.setFontSize(9);

    const notas = doc.splitTextToSize(row.notas || "—", maxNotasW)[0] || "—";
    const vals  = [row.nombre, row.estado, row.posicion, row.confirmado, notas];

    x = margin;
    cols.forEach((col, ci) => {
      let val = vals[ci];
      const maxW = col.w - 8;
      if (doc.getTextWidth(val) > maxW) {
        while (val.length > 0 && doc.getTextWidth(val + "…") > maxW) {
          val = val.slice(0, -1);
        }
        val = val + "…";
      }
      doc.text(val, x + 6, y + 15);
      x += col.w;
    });

    doc.setDrawColor(220, 228, 236);
    doc.line(margin, y + rowH, margin + (pageW - margin * 2), y + rowH);
    y += rowH;
  });

  // outer border
  doc.setDrawColor(0, 72, 146);
  doc.rect(margin, tableY, pageW - margin * 2, headerH + filas.length * rowH);

  doc.save(`tryout-${dateStr}.pdf`);
}
