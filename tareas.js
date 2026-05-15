/* tareas.js — Panel de Tareas & Alertas
   Persistencia: Supabase REST API
*/

(function () {
  "use strict";

  // ─── Supabase ─────────────────────────────────────────────────────────────
  const SB_URL = CONFIG.SUPABASE_URL;
  const SB_KEY = CONFIG.SUPABASE_KEY;
  const SB_HDR = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };

  async function sbGet(path) {
    const res = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: SB_HDR });
    if (!res.ok) throw new Error(`GET ${path}: ${res.status}`);
    return res.json();
  }

  async function sbPost(table, body) {
    const res = await fetch(`${SB_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: { ...SB_HDR, "Content-Type": "application/json", "Prefer": "return=representation" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`POST ${table}: ${res.status}`);
    return res.json();
  }

  async function sbPatch(table, id, body) {
    const res = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { ...SB_HDR, "Content-Type": "application/json", "Prefer": "return=representation" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`PATCH ${table}/${id}: ${res.status}`);
    return res.json();
  }

  async function sbDelete(table, id) {
    const res = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: SB_HDR,
    });
    if (!res.ok) throw new Error(`DELETE ${table}/${id}: ${res.status}`);
  }

  // ─── State ────────────────────────────────────────────────────────────────
  let tareas        = [];   // tareas con jugadores join
  let jugadoresLista = [];  // { id, nombre, apellido_paterno }
  let procesosData  = [];   // { jugador_id, etapa, updated_at }
  let editingId     = null;
  let vista         = "tareas";

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function endOfWeekStr() {
    const d = new Date();
    d.setDate(d.getDate() + (7 - d.getDay()));
    return d.toISOString().slice(0, 10);
  }

  function formatDate(str) {
    if (!str) return "";
    const [y, m, d] = str.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }

  function daysDiff(dateStr) {
    if (!dateStr) return null;
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const d   = new Date(dateStr.slice(0, 10) + "T00:00:00");
    return Math.round((d - now) / 86400000);
  }

  function escHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function jugadorNombre(t) {
    if (t.jugadores) {
      return `${t.jugadores.nombre || ""} ${t.jugadores.apellido_paterno || ""}`.trim();
    }
    return "";
  }

  // ─── Carga de datos ───────────────────────────────────────────────────────
  async function cargarDatos() {
    const [tareasRaw, jugs, procs] = await Promise.all([
      sbGet("tareas?select=*,jugadores(nombre,apellido_paterno)&order=fecha.asc.nullslast"),
      sbGet("jugadores?select=id,nombre,apellido_paterno&order=apellido_paterno.asc"),
      sbGet("procesos?select=jugador_id,etapa,updated_at&etapa=neq.Admitido&etapa=neq.No%20interesado"),
    ]);
    tareas         = tareasRaw;
    jugadoresLista = jugs;
    procesosData   = procs;
  }

  async function recargarYRender() {
    const [tareasRaw, procs] = await Promise.all([
      sbGet("tareas?select=*,jugadores(nombre,apellido_paterno)&order=fecha.asc.nullslast"),
      sbGet("procesos?select=jugador_id,etapa,updated_at&etapa=neq.Admitido&etapa=neq.No%20interesado"),
    ]);
    tareas       = tareasRaw;
    procesosData = procs;
    renderAll();
  }

  // ─── Datalist jugadores ───────────────────────────────────────────────────
  function poblarDatalist() {
    const dl = document.getElementById("jugadores-list");
    if (!dl) return;
    dl.innerHTML = jugadoresLista
      .map(j => `<option value="${escHtml(`${j.nombre} ${j.apellido_paterno}`.trim())}" data-id="${escHtml(j.id)}">`)
      .join("");
  }

  function bindJugadorInput() {
    const input  = document.getElementById("f-jugador");
    const hidden = document.getElementById("modal-jugador-id");
    if (!input || !hidden) return;
    input.addEventListener("input", () => {
      const val   = input.value.trim().toLowerCase();
      const match = jugadoresLista.find(j =>
        `${j.nombre} ${j.apellido_paterno}`.trim().toLowerCase() === val
      );
      hidden.value = match ? match.id : "";
    });
  }

  // ─── Etapas dinámicas desde CONFIG ───────────────────────────────────────
  function poblarEtapas() {
    const sel = document.getElementById("f-etapa");
    if (!sel) return;
    sel.innerHTML =
      `<option value="">— Sin etapa —</option>` +
      CONFIG.ETAPAS.map(e => `<option value="${escHtml(e)}">${escHtml(e)}</option>`).join("");
  }

  // ─── KPIs ─────────────────────────────────────────────────────────────────
  function actualizarKPIs(lista) {
    const hoy = todayStr();
    const fin = endOfWeekStr();
    let vencidas = 0, hoyC = 0, semana = 0, completadas = 0;

    lista.forEach(t => {
      if (t.completada) { completadas++; return; }
      const fecha = t.fecha ? t.fecha.slice(0, 10) : null;
      if (!fecha) return;
      if (fecha < hoy)        vencidas++;
      else if (fecha === hoy) hoyC++;
      else if (fecha <= fin)  semana++;
    });

    document.getElementById("kpi-vencidas").textContent    = vencidas;
    document.getElementById("kpi-hoy").textContent         = hoyC;
    document.getElementById("kpi-proximas").textContent    = semana;
    document.getElementById("kpi-completadas").textContent = completadas;

    const banner    = document.getElementById("alert-banner");
    const alertText = document.getElementById("alert-text");
    if (vencidas > 0) {
      alertText.innerHTML = `Tienes <strong>${vencidas}</strong> tarea${vencidas > 1 ? "s" : ""} vencida${vencidas > 1 ? "s" : ""}.
        <a onclick="document.getElementById('filter-estado').value='pendiente';renderAll()">Verlas ahora →</a>`;
      banner.classList.remove("hidden");
    } else {
      banner.classList.add("hidden");
    }
  }

  // ─── Categorizar tarea ────────────────────────────────────────────────────
  function categoria(t) {
    if (t.completada) return "completada";
    const fecha = t.fecha ? t.fecha.slice(0, 10) : null;
    if (!fecha) return "sinfecha";
    const hoy = todayStr();
    const fin = endOfWeekStr();
    if (fecha < hoy)        return "vencida";
    if (fecha === hoy)      return "hoy";
    if (fecha <= fin)       return "semana";
    return "despues";
  }

  // ─── Render tarea card ────────────────────────────────────────────────────
  function tareaCard(t) {
    const cat  = categoria(t);
    const diff = daysDiff(t.fecha);
    let dateLabel = "";
    let dateClass = "";

    if (t.fecha) {
      if (diff < 0) {
        dateLabel = `Venció hace ${Math.abs(diff)} día${Math.abs(diff) > 1 ? "s" : ""}`;
        dateClass = "vencida";
      } else if (diff === 0) {
        dateLabel = "Hoy";
        dateClass = "hoy";
      } else if (diff === 1) {
        dateLabel = "Mañana";
      } else {
        dateLabel = formatDate(t.fecha);
      }
    }

    const cardClass = t.completada ? "done" :
      cat === "vencida" ? "urgente" :
      cat === "hoy"     ? "hoy"     : "normal";

    const nombre = jugadorNombre(t);

    return `
      <div class="task-card ${cardClass}" data-id="${escHtml(t.id)}">
        <div class="task-check" onclick="toggleCompletar('${escHtml(t.id)}',${!!t.completada})">
          <span class="task-check-mark">✓</span>
        </div>
        <div class="task-body">
          <div class="task-title">${escHtml(t.titulo)}</div>
          <div class="task-meta">
            ${nombre    ? `<span class="task-tag tag-jugador">👤 ${escHtml(nombre)}</span>` : ""}
            ${t.etapa   ? `<span class="task-tag tag-etapa">${escHtml(t.etapa)}</span>` : ""}
            ${t.prioridad ? `<span class="task-tag tag-prioridad-${escHtml(t.prioridad)}">Prioridad ${escHtml(t.prioridad)}</span>` : ""}
            ${dateLabel  ? `<span class="task-date ${dateClass}">📅 ${dateLabel}</span>` : ""}
          </div>
          ${t.notas ? `<div style="margin-top:6px;font-size:.78rem;color:#666;font-family:'Inter',sans-serif;">${escHtml(t.notas)}</div>` : ""}
        </div>
        <div class="task-actions">
          <button class="btn-icon" onclick="editarTarea('${escHtml(t.id)}')" title="Editar">✏️</button>
          <button class="btn-icon del" onclick="borrarTarea('${escHtml(t.id)}')" title="Eliminar">🗑️</button>
        </div>
      </div>
    `;
  }

  // ─── Render principal ─────────────────────────────────────────────────────
  window.renderAll = function () {
    const q         = (document.getElementById("search-tareas")?.value || "").toLowerCase();
    const filPri    = document.getElementById("filter-prioridad")?.value || "";
    const filEstado = document.getElementById("filter-estado")?.value || "pendiente";

    const filtradas = tareas.filter(t => {
      const nombre   = jugadorNombre(t);
      const haystack = `${t.titulo} ${nombre} ${t.etapa || ""} ${t.notas || ""}`.toLowerCase();
      const okQ = !q || haystack.includes(q);
      const okP = !filPri || t.prioridad === filPri;
      const okE = filEstado === "todas"      ? true :
                  filEstado === "completada" ? t.completada :
                  !t.completada;
      return okQ && okP && okE;
    });

    actualizarKPIs(tareas);

    if (vista === "tareas") {
      renderTareas(filtradas);
    } else {
      renderSinContacto();
    }
  };

  function renderTareas(filtradas) {
    const buckets = { vencidas: [], hoy: [], semana: [], despues: [], sinfecha: [] };

    filtradas.forEach(t => {
      const cat = categoria(t);
      if      (cat === "vencida")  buckets.vencidas.push(t);
      else if (cat === "hoy")      buckets.hoy.push(t);
      else if (cat === "semana")   buckets.semana.push(t);
      else if (cat === "despues")  buckets.despues.push(t);
      else if (cat === "sinfecha") buckets.sinfecha.push(t);
    });

    const fill = (listId, cntId, blockId, arr) => {
      const listEl  = document.getElementById(listId);
      const cntEl   = document.getElementById(cntId);
      const blockEl = document.getElementById(blockId);
      if (!listEl) return;
      listEl.innerHTML = arr.length
        ? arr.map(tareaCard).join("")
        : `<div class="empty-state"><div class="icon">✅</div><div>Sin tareas aquí</div></div>`;
      if (cntEl)   cntEl.textContent  = arr.length;
      if (blockEl) blockEl.style.display = arr.length === 0 ? "none" : "";
    };

    fill("list-vencidas", "cnt-vencidas", "block-vencidas", buckets.vencidas);
    fill("list-hoy",      "cnt-hoy",      "block-hoy",      buckets.hoy);
    fill("list-semana",   "cnt-semana",   "block-semana",   buckets.semana);
    fill("list-despues",  "cnt-despues",  "block-despues",  buckets.despues);
    fill("list-sinfecha", "cnt-sinfecha", "block-sinfecha", buckets.sinfecha);
  }

  // ─── Vista: Sin contacto ──────────────────────────────────────────────────
  function renderSinContacto() {
    const container = document.getElementById("list-sincontacto");
    const empty     = document.getElementById("empty-sincontacto");
    const cntEl     = document.getElementById("cnt-sincontacto");
    if (!container) return;

    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);

    const mapaJug = {};
    jugadoresLista.forEach(j => { mapaJug[j.id] = j; });

    const resultados = procesosData
      .filter(p => {
        if (!p.updated_at) return false;
        const last = new Date(p.updated_at); last.setHours(0, 0, 0, 0);
        return Math.round((hoy - last) / 86400000) >= 7;
      })
      .map(p => {
        const j    = mapaJug[p.jugador_id] || {};
        const last = new Date(p.updated_at); last.setHours(0, 0, 0, 0);
        const dias = Math.round((hoy - last) / 86400000);
        return {
          id:      p.jugador_id,
          nombre:  j.nombre || "",
          apellido: j.apellido_paterno || "",
          etapa:   p.etapa || "—",
          dias,
        };
      })
      .sort((a, b) => b.dias - a.dias);

    cntEl.textContent = resultados.length;

    if (resultados.length === 0) {
      container.innerHTML = "";
      empty.classList.remove("hidden");
      return;
    }
    empty.classList.add("hidden");

    container.innerHTML = resultados.map(r => {
      const initials = `${r.nombre[0] || ""}${r.apellido[0] || ""}`.toUpperCase();
      return `
        <a class="sin-contacto-card" href="perfil.html?id=${encodeURIComponent(r.id)}">
          <div class="avatar">${escHtml(initials)}</div>
          <div class="info">
            <div class="sc-name">${escHtml(r.nombre)} ${escHtml(r.apellido)}</div>
            <div class="sc-meta">${escHtml(r.etapa)}</div>
          </div>
          <div class="sc-days">
            ${r.dias}
            <span>días sin<br>actualizar</span>
          </div>
        </a>
      `;
    }).join("");
  }

  // ─── Vista toggle ─────────────────────────────────────────────────────────
  window.setVista = function (v) {
    vista = v;
    document.getElementById("vista-tareas").style.display  = v === "tareas"  ? "" : "none";
    document.getElementById("vista-alertas").style.display = v === "alertas" ? "" : "none";
    document.getElementById("btn-vista-tareas").classList.toggle("active",  v === "tareas");
    document.getElementById("btn-vista-alertas").classList.toggle("active", v === "alertas");
    renderAll();
  };

  // ─── Modal ────────────────────────────────────────────────────────────────
  window.abrirModal = function (id) {
    editingId = id || null;
    const titulo = document.getElementById("modal-titulo");
    const hidden = document.getElementById("modal-jugador-id");

    if (id) {
      const t = tareas.find(x => x.id === id);
      if (!t) return;
      titulo.textContent = "Editar tarea";
      document.getElementById("f-titulo").value    = t.titulo    || "";
      document.getElementById("f-jugador").value   = jugadorNombre(t);
      document.getElementById("f-etapa").value     = t.etapa     || "";
      document.getElementById("f-fecha").value     = (t.fecha || "").slice(0, 10);
      document.getElementById("f-prioridad").value = t.prioridad || "B";
      document.getElementById("f-notas").value     = t.notas     || "";
      if (hidden) hidden.value = t.jugador_id || "";
    } else {
      titulo.textContent = "Nueva tarea";
      document.getElementById("f-titulo").value    = "";
      document.getElementById("f-jugador").value   = "";
      document.getElementById("f-etapa").value     = "";
      document.getElementById("f-fecha").value     = todayStr();
      document.getElementById("f-prioridad").value = "B";
      document.getElementById("f-notas").value     = "";
      if (hidden) hidden.value = "";
    }

    document.getElementById("modal-overlay").classList.add("open");
    document.getElementById("f-titulo").focus();
  };

  window.cerrarModal = function () {
    document.getElementById("modal-overlay").classList.remove("open");
    editingId = null;
  };

  window.cerrarModalSiOverlay = function (e) {
    if (e.target === document.getElementById("modal-overlay")) cerrarModal();
  };

  window.guardarTarea = async function () {
    const titulo = (document.getElementById("f-titulo").value || "").trim();
    if (!titulo) {
      document.getElementById("f-titulo").style.borderColor = "#c0392b";
      document.getElementById("f-titulo").focus();
      return;
    }
    document.getElementById("f-titulo").style.borderColor = "";

    const jugadorId = (document.getElementById("modal-jugador-id")?.value || "").trim() || null;
    const etapa     = (document.getElementById("f-etapa").value    || "").trim() || null;
    const fecha     = (document.getElementById("f-fecha").value    || "").trim() || null;
    const prioridad =  document.getElementById("f-prioridad").value || "B";
    const notas     = (document.getElementById("f-notas").value    || "").trim() || null;
    const now       = new Date().toISOString();

    const payload = { titulo, jugador_id: jugadorId, etapa, prioridad, fecha, notas, updated_at: now };

    try {
      if (editingId) {
        await sbPatch("tareas", editingId, payload);
      } else {
        await sbPost("tareas", { ...payload, completada: false });
      }
      cerrarModal();
      await recargarYRender();
    } catch (err) {
      alert("Error al guardar la tarea. Intenta de nuevo.");
      console.error(err);
    }
  };

  // ─── Acciones ─────────────────────────────────────────────────────────────
  window.toggleCompletar = async function (id, actual) {
    try {
      await sbPatch("tareas", id, { completada: !actual, updated_at: new Date().toISOString() });
      await recargarYRender();
    } catch (err) {
      console.error("Error al actualizar tarea:", err);
    }
  };

  window.editarTarea = function (id) {
    abrirModal(id);
  };

  window.borrarTarea = async function (id) {
    if (!confirm("¿Eliminar esta tarea?")) return;
    try {
      await sbDelete("tareas", id);
      await recargarYRender();
    } catch (err) {
      console.error("Error al eliminar tarea:", err);
    }
  };

  // ─── Init ─────────────────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", async () => {
    poblarEtapas();

    try {
      await cargarDatos();
    } catch (err) {
      console.error("Error al cargar datos de Supabase:", err);
    }

    poblarDatalist();
    bindJugadorInput();
    renderAll();

    document.addEventListener("keydown", e => {
      if (e.key === "Escape") cerrarModal();
    });
  });

})();
