// script.js — Dashboard ejecutivo de reclutamiento

(function () {
  "use strict";

  // ── Sesión ──────────────────────────────────────────────────────────────
  const usuario = localStorage.getItem("usuarioActual");
  const bienvenida = document.getElementById("bienvenida");
  if (bienvenida && usuario) bienvenida.textContent = `Bienvenido, ${usuario}`;


  // ── Supabase fetch ───────────────────────────────────────────────────────
  const SB_URL = CONFIG.SUPABASE_URL;
  const SB_KEY = CONFIG.SUPABASE_KEY;

  async function sbFetch(table, select) {
    const res = await fetch(
      `${SB_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
    );
    if (!res.ok) throw new Error(`Supabase ${table}: ${res.status}`);
    return res.json();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  function diasDesde(isoStr) {
    if (!isoStr) return null;
    const diff = Date.now() - new Date(isoStr).getTime();
    return Math.floor(diff / 86400000);
  }

  function haceXDias(isoStr) {
    const d = diasDesde(isoStr);
    if (d === null) return "—";
    if (d === 0) return "hoy";
    if (d === 1) return "ayer";
    return `hace ${d}d`;
  }

  function etapaBadge(etapa) {
    const color = (CONFIG.ETAPA_COLORS && CONFIG.ETAPA_COLORS[etapa]) || "#6c757d";
    return `<span class="badge" style="background:${color}">${etapa || "—"}</span>`;
  }

  const POS_COLORS = {
    QB: "#e67e00", RB: "#e67e00", FB: "#e67e00",
    WR: "#1a7a40", TE: "#1a7a40",
    OT: "#004892", OG: "#004892", C: "#004892",
    DE: "#6b21a8", DT: "#6b21a8",
    LB: "#b91c1c", CB: "#b91c1c", S: "#b91c1c",
    K:  "#a07800", P: "#a07800",
  };

  // ── Render ───────────────────────────────────────────────────────────────
  function renderKPIs(jugadores, procesos) {
    const hoy = Date.now();
    const hace7 = hoy - 7 * 86400000;

    const totalProspectos = jugadores.length;
    const favoritos       = jugadores.filter(j => j.favorito).length;
    const enProceso       = procesos.filter(p =>
      p.etapa !== "No interesado" && p.etapa !== "Nuevo"
    ).length;
    const admitidos       = procesos.filter(p => p.etapa === "Admitido").length;
    const sinContacto     = procesos.filter(p => {
      if (!p.updated_at) return false;
      if (p.etapa === "Admitido" || p.etapa === "No interesado") return false;
      return new Date(p.updated_at).getTime() < hace7;
    }).length;
    const prioridadA      = procesos.filter(p => p.prioridad === "A").length;

    const datos = [
      { icon: "👥", num: totalProspectos, lbl: "Total Prospectos",  alerta: false },
      { icon: "⭐", num: favoritos,        lbl: "Favoritos",         alerta: false },
      { icon: "⚡", num: enProceso,        lbl: "En Proceso",        alerta: false },
      { icon: "✅", num: admitidos,        lbl: "Admitidos",         alerta: false },
      { icon: "🔴", num: sinContacto,      lbl: "Sin Contacto 7d",   alerta: sinContacto > 0 },
      { icon: "🎯", num: prioridadA,       lbl: "Prioridad A",       alerta: false },
    ];

    const grid = document.getElementById("kpi-grid");
    grid.innerHTML = datos.map(d => `
      <div class="kpi-card${d.alerta ? " alerta" : ""}">
        <div class="kpi-icon">${d.icon}</div>
        <div class="kpi-num">${d.num}</div>
        <div class="kpi-lbl">${d.lbl}</div>
      </div>
    `).join("");
  }

  function renderPipeline(procesos) {
    const conteo = {};
    CONFIG.ETAPAS.forEach(e => { conteo[e] = 0; });
    procesos.forEach(p => { if (p.etapa && conteo[p.etapa] !== undefined) conteo[p.etapa]++; });

    const max = Math.max(...Object.values(conteo), 1);
    const container = document.getElementById("pipeline-rows");

    // Orden: etapas normales primero, "No interesado" al final
    const etapasOrden = CONFIG.ETAPAS.filter(e => e !== "No interesado").concat(["No interesado"]);

    container.innerHTML = etapasOrden.map(etapa => {
      const n     = conteo[etapa] || 0;
      const pct   = Math.round((n / max) * 100);
      const color = (CONFIG.ETAPA_COLORS && CONFIG.ETAPA_COLORS[etapa]) || "#6c757d";
      const href  = `prospectos.html?etapa=${encodeURIComponent(etapa)}`;
      return `
        <div class="pipeline-row" onclick="window.location.href='${href}'">
          <div class="pipeline-label">${etapa}</div>
          <div class="pipeline-track">
            <div class="pipeline-fill" style="width:${pct}%;background:${color}"></div>
          </div>
          <div class="pipeline-count">${n}</div>
        </div>
      `;
    }).join("");
  }

  function renderActividad(jugadores, procesos) {
    const mapaJug = {};
    jugadores.forEach(j => { mapaJug[j.id] = j; });

    const recientes = [...procesos]
      .filter(p => p.updated_at)
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 8);

    const container = document.getElementById("actividad-lista");
    if (!recientes.length) {
      container.innerHTML = `<div class="empty">Sin actividad reciente.</div>`;
      return;
    }

    container.innerHTML = recientes.map(p => {
      const j = mapaJug[p.jugador_id] || {};
      const nombre = j.nombre || `ID ${p.jugador_id}`;
      return `
        <a class="player-row" href="perfil.html?id=${p.jugador_id}">
          <span class="player-name">${nombre}</span>
          ${etapaBadge(p.etapa)}
          <span class="player-meta">${haceXDias(p.updated_at)}</span>
        </a>
      `;
    }).join("");
  }

  function renderPrioridad(jugadores, procesos) {
    const mapaJug = {};
    jugadores.forEach(j => { mapaJug[j.id] = j; });

    const etapaOrden = {};
    CONFIG.ETAPAS.forEach((e, i) => { etapaOrden[e] = i; });

    const alta = procesos
      .filter(p => p.prioridad === "A")
      .sort((a, b) => (etapaOrden[b.etapa] ?? 0) - (etapaOrden[a.etapa] ?? 0));

    const container = document.getElementById("prioridad-lista");
    if (!alta.length) {
      container.innerHTML = `<div class="empty">No hay prospectos con prioridad A.</div>`;
      return;
    }

    container.innerHTML = alta.map(p => {
      const j    = mapaJug[p.jugador_id] || {};
      const nombre = j.nombre || `ID ${p.jugador_id}`;
      const pos  = j.posicion || "";
      return `
        <a class="player-row" href="perfil.html?id=${p.jugador_id}">
          <span class="player-name">${nombre}</span>
          ${pos ? `<span class="player-meta">${pos}</span>` : ""}
          ${etapaBadge(p.etapa)}
          ${p.decision ? `<span class="badge badge-decision">${p.decision}</span>` : ""}
        </a>
      `;
    }).join("");
  }

  function renderPosiciones(jugadores) {
    const conteo = {};
    jugadores.forEach(j => {
      const pos = j.posicion;
      if (pos) conteo[pos] = (conteo[pos] || 0) + 1;
    });

    const container = document.getElementById("pos-pills");
    container.innerHTML = CONFIG.POSICIONES
      .filter(p => conteo[p])
      .map(p => {
        const color = POS_COLORS[p] || "#6c757d";
        return `<span class="pos-pill" style="background:${color}" title="${p}: ${conteo[p]} prospecto(s)">${p} ${conteo[p]}</span>`;
      }).join("");
  }

  // ── Bootstrap ────────────────────────────────────────────────────────────
  async function init() {
    try {
      const [jugadores, procesos] = await Promise.all([
        sbFetch("jugadores", "id,nombre,posicion,calificacion,favorito,created_at,activo"),
        sbFetch("procesos",  "jugador_id,etapa,decision,prioridad,siguiente_paso,updated_at"),
      ]);

      renderKPIs(jugadores, procesos);
      renderPipeline(procesos);
      renderActividad(jugadores, procesos);
      renderPrioridad(jugadores, procesos);
      renderPosiciones(jugadores);
    } catch (err) {
      console.error("Error cargando datos:", err);
      document.getElementById("kpi-grid").innerHTML =
        `<div style="grid-column:1/-1;color:#dc3545;padding:12px">
           Error al cargar datos. Verifica la conexión.
         </div>`;
    }
  }

  document.addEventListener("DOMContentLoaded", init);

})();
