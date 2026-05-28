// prueba.js — Carga y muestra jugadores desde Supabase

const SUPABASE_URL = "https://euqfdisgmrulhjvwjyeg.supabase.co";
const SUPABASE_KEY = "sb_publishable_sP8bw-wi21966IJFV9ij5w_4d3hWVf4";

let jugadoresCache = [];

// ── Carga principal ────────────────────────────────────────────────────────
async function cargarJugadores() {
  setStatus("loading");
  ocultarError();

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/jugadores?select=*&order=created_at.desc`, {
      headers: {
        "apikey":        SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Content-Type":  "application/json"
      }
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || `Error ${res.status}`);
    }

    jugadoresCache = await res.json();
    setStatus("ok", jugadoresCache.length);
    actualizarStats(jugadoresCache);
    renderTabla(jugadoresCache);

  } catch (err) {
    setStatus("error");
    mostrarError("Error al conectar con Supabase: " + err.message);
    console.error(err);
  }
}

// ── Render tabla ───────────────────────────────────────────────────────────
function renderTabla(lista) {
  const tbody    = document.getElementById("tabla-body");
  const tabla    = document.getElementById("tabla-jugadores");
  const loading  = document.getElementById("loading-state");
  const empty    = document.getElementById("empty-state");

  loading.style.display = "none";

  if (lista.length === 0) {
    tabla.style.display = "none";
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";
  tabla.style.display = "table";

  const hoy = new Date().toISOString().slice(0, 10);

  tbody.innerHTML = lista.map((j, i) => {
    const nombre    = `${j.nombre || ""} ${j.apellido_paterno || ""} ${j.apellido_materno || ""}`.trim();
    const fechaReg  = j.created_at ? j.created_at.slice(0, 10) : "—";
    const esHoy     = fechaReg === hoy;
    const estatura  = j.estatura   ? `${j.estatura} m`  : "—";
    const peso      = j.peso       ? `${j.peso} kg`     : "—";
    const cuarenta  = j.cuarenta_yardas ? `${parseFloat(j.cuarenta_yardas).toFixed(2)}s` : "—";

    return `
      <tr>
        <td style="color:#7a8a9a; font-size:12px;">${i + 1}</td>
        <td class="td-nombre">
          ${nombre}
          ${esHoy ? '<span class="tag-nuevo">NUEVO</span>' : ""}
        </td>
        <td><span class="badge-pos">${j.posicion_principal || "—"}</span></td>
        <td><span class="badge-clase">${j.clase || "—"}</span></td>
        <td>${j.ciudad || "—"}</td>
        <td>${j.estado || "—"}</td>
        <td>${estatura}</td>
        <td>${peso}</td>
        <td>${cuarenta}</td>
        <td>${j.preparatoria || "—"}</td>
        <td style="color:#7a8a9a; font-size:12px;">${formatFecha(fechaReg)}</td>
      </tr>
    `;
  }).join("");
}

// ── Stats strip ────────────────────────────────────────────────────────────
function actualizarStats(lista) {
  const hoy = new Date().toISOString().slice(0, 10);

  const hoyCount    = lista.filter(j => (j.created_at || "").startsWith(hoy)).length;
  const posiciones  = new Set(lista.map(j => j.posicion_principal).filter(Boolean)).size;
  const estados     = new Set(lista.map(j => j.estado).filter(Boolean)).size;

  document.getElementById("stat-total").textContent     = lista.length;
  document.getElementById("stat-hoy").textContent       = hoyCount;
  document.getElementById("stat-posiciones").textContent = posiciones;
  document.getElementById("stat-estados").textContent   = estados;
}

// ── Filtros en tiempo real ─────────────────────────────────────────────────
function aplicarFiltros() {
  const buscar = document.getElementById("buscar").value.toLowerCase().trim();
  const pos    = document.getElementById("filtro-pos").value;
  const clase  = document.getElementById("filtro-clase").value;

  const filtrados = jugadoresCache.filter(j => {
    const nombre = `${j.nombre} ${j.apellido_paterno} ${j.apellido_materno} ${j.posicion_principal} ${j.ciudad} ${j.preparatoria}`.toLowerCase();

    const okBuscar = !buscar || nombre.includes(buscar);
    const okPos    = !pos    || j.posicion_principal === pos;
    const okClase  = !clase  || String(j.clase) === clase;

    return okBuscar && okPos && okClase;
  });

  renderTabla(filtrados);
}

// ── UI helpers ─────────────────────────────────────────────────────────────
function setStatus(tipo, count) {
  const badge = document.getElementById("status-badge");
  if (tipo === "ok") {
    badge.className = "badge-status badge-ok";
    badge.textContent = `✅ Conectado · ${count} registros`;
  } else if (tipo === "error") {
    badge.className = "badge-status badge-err";
    badge.textContent = "❌ Error de conexión";
  } else {
    badge.className = "badge-status badge-loading";
    badge.textContent = "⏳ Cargando...";
  }
}

function mostrarError(msg) {
  const box = document.getElementById("error-box");
  box.textContent = msg;
  box.style.display = "block";
  document.getElementById("loading-state").style.display = "none";
}

function ocultarError() {
  document.getElementById("error-box").style.display = "none";
}

function formatFecha(str) {
  if (!str || str === "—") return "—";
  const [y, m, d] = str.split("-");
  return `${d}/${m}/${y}`;
}

// ── Eventos ────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  cargarJugadores();

  document.getElementById("buscar").addEventListener("input", aplicarFiltros);
  document.getElementById("filtro-pos").addEventListener("change", aplicarFiltros);
  document.getElementById("filtro-clase").addEventListener("change", aplicarFiltros);
});