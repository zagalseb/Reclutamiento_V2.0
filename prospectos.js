(function () {
  "use strict";

  const SUPABASE_URL = window.CONFIG.SUPABASE_URL;
  const SUPABASE_KEY = window.CONFIG.SUPABASE_KEY;
  const TABLE = "jugadores";

  const CRM_CLASSES = {
    "Nuevo":           "crm-nuevo",
    "Evaluando":       "crm-evaluando",
    "Contactado":      "crm-contactado",
    "Interesado":      "crm-interesado",
    "Tryout / Visita": "crm-tryout",
    "Oferta":          "crm-oferta",
    "Admitido":        "crm-admitido",
    "No interesado":   "crm-no-interesado",
  };

  // ── State ──────────────────────────────────────────
  let allJugadores = [];
  let filtered     = [];
  let currentPage  = 1;
  let perPage      = 10; // number | "all"

  // ── DOM refs ───────────────────────────────────────
  const loading   = document.getElementById("loading");
  const table     = document.getElementById("p-table");
  const tbody     = document.getElementById("p-tbody");
  const emptyEl   = document.getElementById("empty");
  const totalEl   = document.getElementById("p-total");
  const pagination= document.getElementById("pagination");
  const toggleGrp = document.getElementById("per-page-toggle");

  const fPosicion = document.getElementById("f-posicion");
  const fClase    = document.getElementById("f-clase");
  const fEstado   = document.getElementById("f-estado");
  const fBuscar   = document.getElementById("f-buscar");
  const btnLimpiar= document.getElementById("btn-limpiar");

  // ── Supabase fetch ─────────────────────────────────
  async function fetchAll() {
    const pageSize = 1000;
    let from = 0;
    let rows  = [];

    while (true) {
      const url = `${SUPABASE_URL}/rest/v1/${TABLE}` +
        `?select=id,nombre,posicion,estado,altura,peso,cuarenta_yardas,calificacion,favorito,procesos(etapa)` +
        `&order=nombre.asc` +
        `&offset=${from}&limit=${pageSize}`;

      const res = await fetch(url, {
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
        }
      });

      if (!res.ok) throw new Error(`Supabase error ${res.status}`);
      const chunk = await res.json();
      rows = rows.concat(chunk);
      if (chunk.length < pageSize) break;
      from += pageSize;
    }

    return rows;
  }

  // ── Helpers ────────────────────────────────────────
  function fullName(j) {
    return j.nombre || "";
  }

  function stars(n) {
    const rating = Math.min(5, Math.max(0, Math.round(n || 0)));
    return (
      `<span class="stars">${"★".repeat(rating)}</span>` +
      `<span class="stars stars-empty">${"☆".repeat(5 - rating)}</span>`
    );
  }

  function crmBadge(j) {
    const etapa = j.procesos?.[0]?.etapa || "";
    if (!etapa) return "—";
    const cls = CRM_CLASSES[etapa] || "crm-nuevo";
    return `<span class="crm-badge ${cls}">${esc(etapa)}</span>`;
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // ── Filter ─────────────────────────────────────────
  function applyFilters() {
    const pos    = fPosicion.value.trim().toLowerCase();
    const clase  = fClase.value.trim();
    const estado = fEstado.value.trim().toLowerCase();
    const q      = fBuscar.value.trim().toLowerCase();

    const etapasSeleccionadas     = getChecked("dd-etapa-panel");
    const decisionesSeleccionadas = getChecked("dd-decision-panel");

    filtered = allJugadores.filter(j => {
      if (pos   && (j.posicion || "").toLowerCase() !== pos)   return false;
      if (clase  && String(j.clase || "") !== clase)                      return false;
      if (estado && (j.estado || "").toLowerCase() !== estado)            return false;
      if (q     && !fullName(j).toLowerCase().includes(q))               return false;
      if (etapasSeleccionadas.length > 0) {
        const etapa = j.procesos?.[0]?.etapa || "";
        if (!etapasSeleccionadas.includes(etapa)) return false;
      }
      if (decisionesSeleccionadas.length > 0) {
        const dec = j.procesos?.[0]?.decision || "";
        if (!decisionesSeleccionadas.includes(dec)) return false;
      }
      return true;
    });

    const ETAPA_ORDER = window.CONFIG.ETAPAS;
    filtered.sort((a, b) => {
      const ea = a.procesos?.[0]?.etapa || "Nuevo";
      const eb = b.procesos?.[0]?.etapa || "Nuevo";
      if (ea === "No interesado" && eb !== "No interesado") return 1;
      if (eb === "No interesado" && ea !== "No interesado") return -1;
      if (ea === "Nuevo" && eb !== "Nuevo") return -1;
      if (eb === "Nuevo" && ea !== "Nuevo") return 1;
      return ETAPA_ORDER.indexOf(ea) - ETAPA_ORDER.indexOf(eb);
    });

    currentPage = 1;
    render();
  }

  // ── Render table ───────────────────────────────────
  function render() {
    const total = filtered.length;
    totalEl.textContent = `${total} prospecto${total !== 1 ? "s" : ""} encontrado${total !== 1 ? "s" : ""}`;

    if (total === 0) {
      table.style.display   = "none";
      emptyEl.style.display = "";
      pagination.innerHTML  = "";
      return;
    }

    table.style.display   = "";
    emptyEl.style.display = "none";

    const isAll = perPage === "all";
    const pageSize   = isAll ? total : perPage;
    const totalPages = isAll ? 1 : Math.ceil(total / pageSize);
    if (currentPage > totalPages) currentPage = totalPages;

    const start = isAll ? 0 : (currentPage - 1) * pageSize;
    const slice = filtered.slice(start, isAll ? total : start + pageSize);

    tbody.innerHTML = slice.map((j, i) => {
      const n = start + i + 1;
      return `
        <tr data-id="${esc(j.id)}">
          <td>${n}</td>
          <td><strong>${esc(fullName(j))}</strong></td>
          <td>${esc(j.posicion || "—")}</td>
          <td>${esc(j.estado || "—")}</td>
          <td>${j.altura ? esc(j.altura) + " m" : "—"}</td>
          <td>${j.peso ? esc(j.peso) + " kg" : "—"}</td>
          <td>${j.cuarenta_yardas ? esc(j.cuarenta_yardas) + "s" : "—"}</td>
          <td>${stars(j.calificacion)}</td>
          <td>${crmBadge(j)}</td>
        </tr>`;
    }).join("");

    // Row click → profile
    tbody.querySelectorAll("tr").forEach(row => {
      row.addEventListener("click", () => {
        window.location.href = `perfil.html?id=${encodeURIComponent(row.dataset.id)}`;
      });
    });

    renderPagination(totalPages);
  }

  // ── Pagination ─────────────────────────────────────
  function renderPagination(totalPages) {
    if (totalPages <= 1) {
      pagination.innerHTML = "";
      return;
    }

    const cp = currentPage;
    let html = "";

    html += `<button ${cp === 1 ? "disabled" : ""} data-p="${cp - 1}">‹ Ant</button>`;

    const range = buildRange(cp, totalPages);
    range.forEach(p => {
      if (p === "…") {
        html += `<button disabled>…</button>`;
      } else {
        html += `<button class="${p === cp ? "active" : ""}" data-p="${p}">${p}</button>`;
      }
    });

    html += `<button ${cp === totalPages ? "disabled" : ""} data-p="${cp + 1}">Sig ›</button>`;
    pagination.innerHTML = html;

    pagination.querySelectorAll("button[data-p]").forEach(btn => {
      btn.addEventListener("click", () => {
        currentPage = parseInt(btn.dataset.p, 10);
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
  }

  function buildRange(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = new Set([1, total, current, current - 1, current + 1].filter(p => p >= 1 && p <= total));
    const sorted = [...pages].sort((a, b) => a - b);
    const result = [];
    let prev = 0;
    for (const p of sorted) {
      if (p - prev > 1) result.push("…");
      result.push(p);
      prev = p;
    }
    return result;
  }

  // ── Per-page toggles ───────────────────────────────
  toggleGrp.querySelectorAll(".toggle-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      toggleGrp.querySelectorAll(".toggle-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const n = btn.dataset.n;
      perPage = n === "all" ? "all" : parseInt(n, 10);
      currentPage = 1;
      render();
    });
  });

  // ── Filter listeners ───────────────────────────────
  [fPosicion, fClase, fEstado].forEach(el => el.addEventListener("change", applyFilters));
  fBuscar.addEventListener("input", applyFilters);

  btnLimpiar.addEventListener("click", () => {
    fPosicion.value = "";
    fClase.value    = "";
    fEstado.value   = "";
    fBuscar.value   = "";
    ["dd-etapa-panel", "dd-decision-panel"].forEach(id => {
      document.querySelectorAll(`#${id} .pf-dd-check`)
        .forEach(cb => cb.checked = false);
    });
    document.querySelectorAll(".pf-dd-btn .pf-dd-label")
      .forEach(l => l.textContent = "Todas");
    document.querySelectorAll(".pf-dd-btn")
      .forEach(b => b.classList.remove("has-selection"));
    applyFilters();
  });

  // ── Dropdown builders ──────────────────────────────
  function getChecked(panelId) {
    return Array.from(
      document.querySelectorAll(`#${panelId} .pf-dd-check:checked`)
    ).map(cb => cb.value);
  }

  function buildDropdown(ddId, panelId, items) {
    const panel = document.getElementById(panelId);
    const dd    = document.getElementById(ddId);
    const btn   = dd.querySelector(".pf-dd-btn");
    const label = btn.querySelector(".pf-dd-label");

    panel.innerHTML = items.map(val => `
      <label class="pf-dd-option">
        <input type="checkbox" value="${val}" class="pf-dd-check">
        ${val}
      </label>
    `).join("");

    btn.addEventListener("click", e => {
      e.stopPropagation();
      const isOpen = panel.classList.contains("open");
      document.querySelectorAll(".pf-dd-panel.open").forEach(p => {
        p.classList.remove("open");
        p.closest(".pf-dropdown").querySelector(".pf-dd-btn").classList.remove("open");
      });
      if (!isOpen) {
        panel.classList.add("open");
        btn.classList.add("open");
      }
    });

    document.addEventListener("click", () => {
      panel.classList.remove("open");
      btn.classList.remove("open");
    });
    panel.addEventListener("click", e => e.stopPropagation());

    panel.querySelectorAll(".pf-dd-check").forEach(cb => {
      cb.addEventListener("change", () => {
        const selected = getChecked(panelId);
        if (selected.length === 0) {
          label.textContent = "Todas";
          btn.classList.remove("has-selection");
        } else if (selected.length === 1) {
          label.textContent = selected[0];
          btn.classList.add("has-selection");
        } else {
          label.textContent = `${selected.length} seleccionadas`;
          btn.classList.add("has-selection");
        }
        panel.querySelectorAll(".pf-dd-option").forEach(opt => {
          opt.classList.toggle("selected", opt.querySelector("input").checked);
        });
        applyFilters();
      });
    });
  }

  buildDropdown("dd-etapa",    "dd-etapa-panel",    window.CONFIG.ETAPAS);
  buildDropdown("dd-decision", "dd-decision-panel", window.CONFIG.DECISIONES);

  // ── Init ───────────────────────────────────────────
  (async function init() {
    try {
      allJugadores = await fetchAll();
      loading.style.display = "none";
      applyFilters();
    } catch (err) {
      loading.innerHTML = `
        <div class="empty-icon" style="font-size:36px;">⚠️</div>
        <p style="color:#842029;">Error al cargar los datos. Verifica tu conexión.<br>
        <small>${esc(err.message)}</small></p>`;
    }
  })();

})();
