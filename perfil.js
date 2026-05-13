(function () {
  "use strict";

  const SUPABASE_URL = window.CONFIG.SUPABASE_URL;
  const SUPABASE_KEY = window.CONFIG.SUPABASE_KEY;
  const TABLE = "jugadores";

  const CRM_CLASSES = {
    "Nuevo":           "crm-nuevo",
    "Evaluado":        "crm-evaluado",
    "Contactado":      "crm-contactado",
    "Interesado":      "crm-interesado",
    "Tryout / Visita": "crm-tryout",
    "Oferta":          "crm-oferta",
    "Admitido":        "crm-admitido",
    "No interesado":   "crm-no-interesado",
  };

  // ── State ────────────────────────────────────────────
  let jugadorId    = null;
  let procesoId    = null;
  let calificacion = 0;  // current star value (1-5)
  let esFavorito   = false;

  // ── DOM shortcuts ────────────────────────────────────
  const $ = id => document.getElementById(id);

  function show(id)  { $(id).style.display = ""; }
  function hide(id)  { $(id).style.display = "none"; }
  function text(id, val, fb = "—") { $(id).textContent = val || fb; }
  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // ── Show error state ─────────────────────────────────
  function showError(title, msg) {
    hide("state-loading");
    hide("state-content");
    $("error-title").textContent = title;
    $("error-msg").textContent   = msg;
    show("state-error");
  }

  // ── Supabase fetch one row ───────────────────────────
  async function fetchJugador(id) {
    const url = `${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}&limit=1`;
    const res = await fetch(url, {
      headers: {
        "apikey":        SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      }
    });
    if (!res.ok) throw new Error(`Supabase error ${res.status}`);
    const rows = await res.json();
    return rows[0] || null;
  }

  // ── Supabase: proceso helpers ────────────────────────
  async function fetchProcesoPerfil(jugId) {
    const url = `${SUPABASE_URL}/rest/v1/procesos?jugador_id=eq.${encodeURIComponent(jugId)}&limit=1`;
    const res = await fetch(url, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return rows[0] || null;
  }

  async function patchProcesoData(id, data) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/procesos?id=eq.${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type":  "application/json",
          "Prefer":        "return=minimal",
        },
        body: JSON.stringify(data),
      }
    );
    return res.ok;
  }

  async function createProcesoData(jugId, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/procesos`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type":  "application/json",
        "Prefer":        "return=representation",
      },
      body: JSON.stringify({ jugador_id: jugId, etapa: "Nuevo", ...data }),
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return rows[0] || null;
  }

  async function saveProcesoFields(data) {
    if (procesoId) {
      return patchProcesoData(procesoId, data);
    }
    const created = await createProcesoData(jugadorId, data);
    if (created) { procesoId = created.id; return true; }
    return false;
  }

  // ── Supabase PATCH ───────────────────────────────────
  async function patchJugador(id, data) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}`,
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

  // ── Render hero (Sección 1) ──────────────────────────
  function renderHero(j) {
    const nombre = [j.nombre, j.apellido_paterno, j.apellido_materno]
      .filter(Boolean).join(" ");
    $("h-nombre").textContent = nombre;

    // Tags
    const tags = [];
    if (j.posicion_principal) tags.push(j.posicion_principal);
    if (j.posicion_secundaria && j.posicion_secundaria !== j.posicion_principal)
      tags.push(j.posicion_secundaria);
    if (j.clase)   tags.push(`Clase ${j.clase}`);
    const tagsEl = $("h-tags");
    tagsEl.innerHTML = tags
      .map(t => `<span class="hero-tag">${esc(t)}</span>`)
      .join("");

    // Stars (read-only in hero)
    const n = Math.min(5, Math.max(0, Math.round(j.calificacion || 0)));
    $("h-stars").innerHTML =
      `<span class="s-on">${"★".repeat(n)}</span>` +
      `<span class="s-off">${"★".repeat(5 - n)}</span>`;

    // CRM badge
    const etapa   = j.etapa_crm || "";
    const cls     = CRM_CLASSES[etapa] || "crm-nuevo";
    const crmEl   = $("h-crm");
    crmEl.textContent = etapa || "Sin etapa";
    crmEl.className   = `crm-badge ${cls}`;
  }

  // ── Render info sections (2-4) ───────────────────────
  function renderInfo(j) {
    // Sección 2 — Personales
    text("d-ciudad",     j.ciudad);
    text("d-estado",     j.estado);
    text("d-telefono",   j.telefono);
    text("d-email",      j.email);
    text("d-instagram",  j.instagram);
    text("d-tiktok",     j.tiktok);
    text("d-nacimiento", j.fecha_nacimiento);
    text("d-lugar-nac",  j.lugar_nacimiento);

    // Sección 3 — Académicos
    text("d-prepa",        j.preparatoria);
    text("d-ciudad-prepa", j.ciudad_prepa);
    text("d-estado-prepa", j.estado_prepa);
    text("d-promedio",     j.promedio);
    text("d-idioma",       j.otro_idioma);

    // Sección 4 — Atléticos
    text("d-estatura",  j.estatura ? `${j.estatura} m`   : null);
    text("d-peso",      j.peso     ? `${j.peso} kg`      : null);
    text("d-40yds",     j.cuarenta_yardas ? `${j.cuarenta_yardas} s` : null);
    text("d-vertical",  j.salto_vertical  ? `${j.salto_vertical} cm` : null);
    text("d-equipo",    j.equipo_anterior);
    text("d-logros",    j.logros);
    text("d-lesiones",  j.lesiones);
  }

  // ── Render highlights (Sección 5) ───────────────────
  function renderHighlights(j) {
    const videos = [
      { label: "Highlights 1", url: j.video_1 },
      { label: "Highlights 2", url: j.video_2 },
      { label: "Highlights 3", url: j.video_3 },
    ].filter(v => v.url && v.url.trim());

    if (videos.length === 0) return;

    const container = $("highlight-btns");
    container.innerHTML = videos.map(v =>
      `<a href="${esc(v.url)}" target="_blank" rel="noopener" class="hl-btn">▶ ${esc(v.label)}</a>`
    ).join("");

    show("highlights-section");
  }

  // ── Render staff panel (Sección 6) ──────────────────
  function renderStaff(j) {
    calificacion = Math.min(5, Math.max(0, Math.round(j.calificacion || 0)));
    esFavorito   = !!j.favorito;

    updateStarUI(calificacion);
    updateFavBtn(esFavorito);

    $("edit-notas").value = j.notas_staff || "";
  }

  // ── Star UI ──────────────────────────────────────────
  function updateStarUI(val) {
    document.querySelectorAll(".edit-star").forEach(s => {
      s.classList.toggle("on", parseInt(s.dataset.v, 10) <= val);
    });
  }

  document.querySelectorAll(".edit-star").forEach(star => {
    star.addEventListener("mouseenter", () =>
      updateStarUI(parseInt(star.dataset.v, 10))
    );
    star.addEventListener("mouseleave", () =>
      updateStarUI(calificacion)
    );
    star.addEventListener("click", () => {
      calificacion = parseInt(star.dataset.v, 10);
      updateStarUI(calificacion);
    });
  });

  // ── Favorito toggle ──────────────────────────────────
  function updateFavBtn(active) {
    const btn = $("fav-btn");
    btn.textContent = active ? "★ En favoritos" : "☆ Agregar a favoritos";
    btn.classList.toggle("active", active);
  }

  $("fav-btn").addEventListener("click", () => {
    esFavorito = !esFavorito;
    updateFavBtn(esFavorito);
  });

  // ── Save ─────────────────────────────────────────────
  $("save-btn").addEventListener("click", async () => {
    const btn = $("save-btn");
    const msg = $("save-msg");
    btn.disabled = true;
    msg.style.display = "none";

    const payload = {
      calificacion: calificacion || null,
      notas_staff: $("edit-notas").value.trim() || null,
      favorito:    esFavorito,
    };

    const procesoPayload = {
      etapa:           $("edit-crm").value           || null,
      decision:        $("edit-decision").value        || null,
      prioridad:       $("edit-prioridad").value       || null,
      scouting_report: $("edit-scouting").value.trim() || null,
    };

    const [okJug, okProc] = await Promise.all([
      patchJugador(jugadorId, payload),
      saveProcesoFields(procesoPayload),
    ]);
    const ok = okJug && okProc;

    if (ok) {
      msg.textContent   = "✓ Cambios guardados";
      msg.className     = "ok";
      // Refresh hero badge & stars
      const crmVal  = procesoPayload.etapa || "";
      const crmEl   = $("h-crm");
      crmEl.textContent = crmVal || "Sin etapa";
      crmEl.className   = `crm-badge ${CRM_CLASSES[crmVal] || "crm-nuevo"}`;
      const n = Math.min(5, Math.max(0, Math.round(calificacion)));
      $("h-stars").innerHTML =
        `<span class="s-on">${"★".repeat(n)}</span>` +
        `<span class="s-off">${"★".repeat(5 - n)}</span>`;
    } else {
      msg.textContent = "✗ Error al guardar. Intenta de nuevo.";
      msg.className   = "err";
    }

    msg.style.display = "inline";
    btn.disabled = false;
    setTimeout(() => { msg.style.display = "none"; }, 3000);
  });

  // ── Init ─────────────────────────────────────────────
  (async function init() {
    const params = new URLSearchParams(window.location.search);
    jugadorId    = params.get("id");

    if (!jugadorId) {
      showError("Falta el parámetro de perfil", "No se especificó un ID de jugador en la URL.");
      return;
    }

    let jugador;
    try {
      jugador = await fetchJugador(jugadorId);
    } catch (err) {
      showError("Error de conexión", err.message);
      return;
    }

    if (!jugador) {
      showError("Jugador no encontrado", `No existe un prospecto con id "${jugadorId}".`);
      return;
    }

    renderHero(jugador);
    renderInfo(jugador);
    renderHighlights(jugador);
    renderStaff(jugador);

    try {
      const proceso = await fetchProcesoPerfil(jugadorId);
      if (proceso) {
        procesoId = proceso.id;
        $("edit-crm").value       = proceso.etapa           || "";
        $("edit-decision").value  = proceso.decision        || "";
        $("edit-prioridad").value = proceso.prioridad       || "";
        $("edit-scouting").value  = proceso.scouting_report || "";
        // Sync hero badge to proceso.etapa (source of truth)
        const etapa = proceso.etapa || "";
        const crmEl = $("h-crm");
        crmEl.textContent = etapa || "Sin etapa";
        crmEl.className   = `crm-badge ${CRM_CLASSES[etapa] || "crm-nuevo"}`;
      }
    } catch (_) { /* ignores silently if proceso table unreachable */ }

    hide("state-loading");
    show("state-content");
  })();

})();
