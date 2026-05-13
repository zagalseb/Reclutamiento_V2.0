/* tareas.js – Panel de Tareas & Alertas
   Persistencia: localStorage
   Key tareas:          tareas_{username}      → array de objetos tarea
   Key procesos index:  procesos_{username}    → array de playerKeys
   Key proceso data:    proceso_{playerKey}    → objeto proceso CRM
*/

(function () {
  "use strict";

  // ─── Config ───────────────────────────────────────────────────────────────
  const DIAS_SIN_CONTACTO = 7; // días sin actualización para mostrar alerta

  // ─── State ────────────────────────────────────────────────────────────────
  let tareas = [];
  let editingId = null;
  let vista = "tareas";

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function username() {
    return localStorage.getItem("usuarioActual") || "guest";
  }

  function tareasKey() {
    return `tareas_${username()}`;
  }

  function loadTareas() {
    try {
      return JSON.parse(localStorage.getItem(tareasKey()) || "[]");
    } catch {
      return [];
    }
  }

  function saveTareas(arr) {
    localStorage.setItem(tareasKey(), JSON.stringify(arr));
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

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
    const [y, m, d] = str.split("-");
    return `${d}/${m}/${y}`;
  }

  function daysDiff(dateStr) {
    if (!dateStr) return null;
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const d   = new Date(dateStr + "T00:00:00");
    return Math.round((d - now) / 86400000);
  }

  function escHtml(s) {
    return String(s || "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;");
  }

  // ─── Procesos index ───────────────────────────────────────────────────────
  function getProcesosIndex() {
    try {
      return JSON.parse(localStorage.getItem(`procesos_${username()}`) || "[]");
    } catch { return []; }
  }

  function loadProceso(playerKey) {
    try {
      return JSON.parse(localStorage.getItem(`proceso_${playerKey}`) || "null");
    } catch { return null; }
  }

  function parsePlayerKey(playerKey) {
    const parts = (playerKey || "").split("_");
    if (parts.length < 3) return { nombre: playerKey, apellido: "" };
    return { nombre: parts[1] || "", apellido: parts.slice(2).join(" ") };
  }

  // ─── Jugadores para datalist ──────────────────────────────────────────────
  async function poblarDatalist() {
    const dl = document.getElementById("jugadores-list");
    if (!dl) return;
    try {
      const resp = await fetch("jugadores.tsv");
      if (!resp.ok) return;
      const text = await resp.text();
      const rows = text.split("\n").filter(Boolean);
      const headers = rows[0].split("\t").map(h => h.trim());
      const iNombre   = headers.indexOf("Nombre");
      const iApellido = headers.indexOf("Apellido");
      rows.slice(1).forEach(row => {
        const cols = row.split("\t");
        const nombre   = (cols[iNombre]   || "").trim();
        const apellido = (cols[iApellido] || "").trim();
        if (!nombre) return;
        const opt = document.createElement("option");
        opt.value = `${nombre} ${apellido}`.trim();
        dl.appendChild(opt);
      });
    } catch { /* sin fetch */ }
  }

  // ─── KPIs ─────────────────────────────────────────────────────────────────
  function actualizarKPIs(lista) {
    const hoy  = todayStr();
    const fin  = endOfWeekStr();
    let vencidas = 0, hoyC = 0, semana = 0, completadas = 0;

    lista.forEach(t => {
      if (t.completada) { completadas++; return; }
      if (!t.fecha) return;
      if (t.fecha < hoy)       vencidas++;
      else if (t.fecha === hoy) hoyC++;
      else if (t.fecha <= fin)  semana++;
    });

    document.getElementById("kpi-vencidas").textContent   = vencidas;
    document.getElementById("kpi-hoy").textContent        = hoyC;
    document.getElementById("kpi-proximas").textContent   = semana;
    document.getElementById("kpi-completadas").textContent = completadas;

    // Banner de alerta
    const banner = document.getElementById("alert-banner");
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
    if (!t.fecha) return "sinfecha";
    const hoy = todayStr();
    const fin = endOfWeekStr();
    if (t.fecha < hoy)        return "vencida";
    if (t.fecha === hoy)      return "hoy";
    if (t.fecha <= fin)       return "semana";
    return "despues";
  }

  // ─── Render tarea card ────────────────────────────────────────────────────
  function tareaCard(t) {
    const cat = categoria(t);
    const diff = daysDiff(t.fecha);
    let dateLabel = "";
    let dateClass = "";

    if (t.fecha) {
      if (diff === null) {
        dateLabel = "";
      } else if (diff < 0) {
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

    return `
      <div class="task-card ${cardClass}" data-id="${escHtml(t.id)}">
        <div class="task-check" onclick="toggleCompletar('${escHtml(t.id)}')">
          <span class="task-check-mark">✓</span>
        </div>
        <div class="task-body">
          <div class="task-title">${escHtml(t.titulo)}</div>
          <div class="task-meta">
            ${t.jugador ? `<span class="task-tag tag-jugador">👤 ${escHtml(t.jugador)}</span>` : ""}
            ${t.etapa   ? `<span class="task-tag tag-etapa">${escHtml(t.etapa)}</span>` : ""}
            ${t.prioridad ? `<span class="task-tag tag-prioridad-${escHtml(t.prioridad)}">Prioridad ${escHtml(t.prioridad)}</span>` : ""}
            ${dateLabel ? `<span class="task-date ${dateClass}">📅 ${dateLabel}</span>` : ""}
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

  // ─── Render principal ──────────────────────────────────────────────────────
  window.renderAll = function () {
    tareas = loadTareas();

    const q         = (document.getElementById("search-tareas")?.value || "").toLowerCase();
    const filPri    = document.getElementById("filter-prioridad")?.value || "";
    const filEstado = document.getElementById("filter-estado")?.value || "pendiente";

    // Filtrar
    let filtradas = tareas.filter(t => {
      const haystack = `${t.titulo} ${t.jugador} ${t.etapa} ${t.notas}`.toLowerCase();
      const okQ  = !q || haystack.includes(q);
      const okP  = !filPri || t.prioridad === filPri;
      const okE  = filEstado === "todas" ? true :
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
    const buckets = {
      vencidas: [],
      hoy:      [],
      semana:   [],
      despues:  [],
      sinfecha: [],
    };

    filtradas.forEach(t => {
      const cat = categoria(t);
      if      (cat === "vencida")    buckets.vencidas.push(t);
      else if (cat === "hoy")        buckets.hoy.push(t);
      else if (cat === "semana")     buckets.semana.push(t);
      else if (cat === "despues")    buckets.despues.push(t);
      else if (cat === "sinfecha")   buckets.sinfecha.push(t);
      // completadas se omiten de los buckets — ya están filtradas arriba
    });

    const fill = (listId, cntId, blockId, arr) => {
      const listEl  = document.getElementById(listId);
      const cntEl   = document.getElementById(cntId);
      const blockEl = document.getElementById(blockId);
      if (!listEl) return;
      listEl.innerHTML = arr.length
        ? arr.map(tareaCard).join("")
        : `<div class="empty-state"><div class="icon">✅</div><div>Sin tareas aquí</div></div>`;
      if (cntEl)   cntEl.textContent = arr.length;
      if (blockEl) blockEl.style.display = arr.length === 0 && listEl.querySelector(".empty-state") ? "none" : "";
    };

    fill("list-vencidas", "cnt-vencidas", "block-vencidas", buckets.vencidas);
    fill("list-hoy",      "cnt-hoy",      "block-hoy",      buckets.hoy);
    fill("list-semana",   "cnt-semana",   "block-semana",   buckets.semana);
    fill("list-despues",  "cnt-despues",  "block-despues",  buckets.despues);
    fill("list-sinfecha", "cnt-sinfecha", "block-sinfecha", buckets.sinfecha);

    // Ocultar secciones vacías
    ["vencidas","hoy","semana","despues","sinfecha"].forEach(key => {
      const block = document.getElementById(`block-${key}`);
      const cnt   = parseInt(document.getElementById(`cnt-${key}`)?.textContent || "0");
      if (block) block.style.display = cnt === 0 ? "none" : "";
    });
  }

  // ─── Vista: Sin contacto ──────────────────────────────────────────────────
  function renderSinContacto() {
    const container = document.getElementById("list-sincontacto");
    const empty     = document.getElementById("empty-sincontacto");
    const cntEl     = document.getElementById("cnt-sincontacto");
    if (!container) return;

    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const keys = getProcesosIndex();
    const resultados = [];

    keys.forEach(playerKey => {
      const proc = loadProceso(playerKey);
      if (!proc) return;
      if (proc.stage === "Admitido" || proc.stage === "No interesado") return;

      const last = proc.lastUpdated ? new Date(proc.lastUpdated) : null;
      if (!last || isNaN(last)) return;
      last.setHours(0,0,0,0);
      const dias = Math.round((hoy - last) / 86400000);
      if (dias >= DIAS_SIN_CONTACTO) {
        const { nombre, apellido } = parsePlayerKey(playerKey);
        resultados.push({ playerKey, nombre, apellido, dias, stage: proc.stage, priority: proc.priority });
      }
    });

    resultados.sort((a, b) => b.dias - a.dias);

    cntEl.textContent = resultados.length;

    if (resultados.length === 0) {
      container.innerHTML = "";
      empty.classList.remove("hidden");
      return;
    }
    empty.classList.add("hidden");

    container.innerHTML = resultados.map(r => {
      const initials = `${r.nombre[0] || ""}${(r.apellido[0] || "")}`.toUpperCase();
      const perfilUrl = `perfil.html?nombre=${encodeURIComponent(r.nombre)}&apellido=${encodeURIComponent(r.apellido)}`;
      return `
        <a class="sin-contacto-card" href="${perfilUrl}">
          <div class="avatar">${escHtml(initials)}</div>
          <div class="info">
            <div class="sc-name">${escHtml(r.nombre)} ${escHtml(r.apellido)}</div>
            <div class="sc-meta">${escHtml(r.stage)} · Prioridad ${escHtml(r.priority || "–")}</div>
          </div>
          <div class="sc-days">
            ${r.dias}
            <span>días sin<br>actualizar</span>
          </div>
        </a>
      `;
    }).join("");
  }

  // ─── Vista toggle ──────────────────────────────────────────────────────────
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
    const modal = document.getElementById("modal-overlay");
    const titulo = document.getElementById("modal-titulo");

    if (id) {
      const t = tareas.find(x => x.id === id);
      if (!t) return;
      titulo.textContent = "Editar tarea";
      document.getElementById("f-titulo").value    = t.titulo    || "";
      document.getElementById("f-jugador").value   = t.jugador   || "";
      document.getElementById("f-etapa").value     = t.etapa     || "";
      document.getElementById("f-fecha").value     = t.fecha     || "";
      document.getElementById("f-prioridad").value = t.prioridad || "B";
      document.getElementById("f-notas").value     = t.notas     || "";
    } else {
      titulo.textContent = "Nueva tarea";
      document.getElementById("f-titulo").value    = "";
      document.getElementById("f-jugador").value   = "";
      document.getElementById("f-etapa").value     = "";
      document.getElementById("f-fecha").value     = todayStr();
      document.getElementById("f-prioridad").value = "B";
      document.getElementById("f-notas").value     = "";
    }

    modal.classList.add("open");
    document.getElementById("f-titulo").focus();
  };

  window.cerrarModal = function () {
    document.getElementById("modal-overlay").classList.remove("open");
    editingId = null;
  };

  window.cerrarModalSiOverlay = function (e) {
    if (e.target === document.getElementById("modal-overlay")) cerrarModal();
  };

  window.guardarTarea = function () {
    const titulo = (document.getElementById("f-titulo").value || "").trim();
    if (!titulo) {
      document.getElementById("f-titulo").style.borderColor = "#c0392b";
      document.getElementById("f-titulo").focus();
      return;
    }
    document.getElementById("f-titulo").style.borderColor = "";

    const tarea = {
      id:         editingId || uid(),
      titulo,
      jugador:    (document.getElementById("f-jugador").value   || "").trim(),
      etapa:      (document.getElementById("f-etapa").value     || "").trim(),
      fecha:      (document.getElementById("f-fecha").value     || "").trim(),
      prioridad:  (document.getElementById("f-prioridad").value || "B"),
      notas:      (document.getElementById("f-notas").value     || "").trim(),
      completada: false,
      creadaEn:   editingId ? (tareas.find(x=>x.id===editingId)?.creadaEn || new Date().toISOString()) : new Date().toISOString(),
    };

    tareas = loadTareas();
    if (editingId) {
      const idx = tareas.findIndex(x => x.id === editingId);
      if (idx >= 0) {
        tarea.completada = tareas[idx].completada;
        tareas[idx] = tarea;
      }
    } else {
      tareas.unshift(tarea);
    }

    saveTareas(tareas);
    cerrarModal();
    renderAll();
  };

  // ─── Acciones ─────────────────────────────────────────────────────────────
  window.toggleCompletar = function (id) {
    tareas = loadTareas();
    const t = tareas.find(x => x.id === id);
    if (!t) return;
    t.completada = !t.completada;
    saveTareas(tareas);
    renderAll();
  };

  window.editarTarea = function (id) {
    tareas = loadTareas();
    abrirModal(id);
  };

  window.borrarTarea = function (id) {
    if (!confirm("¿Eliminar esta tarea?")) return;
    tareas = loadTareas().filter(x => x.id !== id);
    saveTareas(tareas);
    renderAll();
  };

  // ─── Init ─────────────────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", () => {
    tareas = loadTareas();
    poblarDatalist();
    renderAll();

    // Keyboard shortcut: Escape cierra modal
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") cerrarModal();
    });
  });

})();
