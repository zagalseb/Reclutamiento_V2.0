(function () {
  "use strict";

  const SUPABASE_URL   = window.CONFIG.SUPABASE_URL;
  const SUPABASE_KEY   = window.CONFIG.SUPABASE_KEY;
  const POSITION_ORDER = window.CONFIG.POSICIONES;

  // Header color per position
  const POS_COLOR = {
    QB: "#c85200", RB: "#c85200", FB: "#c85200",
    WR: "#0d7a46", TE: "#0d7a46",
    OT: "#0d4fa0", OG: "#0d4fa0", C:  "#0d4fa0",
    DE: "#6a1490", DT: "#6a1490",
    LB: "#9e1414", CB: "#9e1414", S:  "#9e1414",
    K:  "#9a7000", P:  "#9a7000",
  };

  // Avatar initials background (darker shade of group color)
  const POS_AVATAR_BG = {
    QB: "#7a3200", RB: "#7a3200", FB: "#7a3200",
    WR: "#084d2a", TE: "#084d2a",
    OT: "#083066", OG: "#083066", C:  "#083066",
    DE: "#420d5c", DT: "#420d5c",
    LB: "#620c0c", CB: "#620c0c", S:  "#620c0c",
    K:  "#5e4500", P:  "#5e4500",
  };

  // ── Helpers ───────────────────────────────────────────

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function fullName(j) {
    return j.nombre || "";
  }

  function initials(j) {
    const parts = (j.nombre || "").trim().split(/\s+/);
    const a = (parts[0] || "").charAt(0).toUpperCase();
    const b = (parts[parts.length - 1] || "").charAt(0).toUpperCase();
    return (parts.length > 1 ? a + b : a) || "?";
  }

  function starsHTML(n) {
    const r = Math.min(5, Math.max(0, Math.round(n || 0)));
    return `<span class="s-on">${"★".repeat(r)}</span>` +
           `<span class="s-off">${"★".repeat(5 - r)}</span>`;
  }

  // ── Supabase fetch ────────────────────────────────────

  async function fetchFavoritos() {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/jugadores?favorito=eq.true&select=id,nombre,posicion,estado,calificacion`,
      {
        headers: {
          apikey:        SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    if (!res.ok) throw new Error(`Supabase ${res.status}`);
    return res.json();
  }

  // ── Card builder ──────────────────────────────────────

  function makeCard(j) {
    const pos    = j.posicion || "";
    const color  = POS_COLOR[pos]       || "#2e3348";
    const avBg   = POS_AVATAR_BG[pos]   || "#1e2230";
    const name   = fullName(j);
    const loc    = j.estado || "";

    const avatarHTML = `<div class="bb-avatar-ini" style="background:${avBg}">${esc(initials(j))}</div>`;

    const card = document.createElement("a");
    card.className          = "bb-card";
    card.href               = `perfil.html?id=${encodeURIComponent(j.id)}`;
    card.style.borderLeftColor = color;

    card.innerHTML = `
      <div class="bb-avatar-row">
        ${avatarHTML}
        <div class="bb-name-block">
          <div class="bb-name">${esc(name)}</div>
          <div class="bb-pos-clase">${esc(pos)}</div>
        </div>
      </div>
      ${loc ? `<div class="bb-location">${esc(loc)}</div>` : ""}
      <div class="bb-stars">${starsHTML(j.calificacion)}</div>
      <div class="bb-card-footer">
        <span class="bb-profile-lnk">Ver perfil →</span>
      </div>
    `;

    return card;
  }

  // ── Render ────────────────────────────────────────────

  function render(jugadores) {
    const boardEl = document.getElementById("bb-board");
    const badgeEl = document.getElementById("bb-total");

    badgeEl.textContent =
      `${jugadores.length} prospecto${jugadores.length !== 1 ? "s" : ""}`;

    if (jugadores.length === 0) {
      boardEl.innerHTML = `
        <div class="bb-empty">
          <div class="bb-empty-icon">🏈</div>
          <h3>Big Board vacío</h3>
          <p>Marca jugadores como favoritos desde Prospectos para verlos aquí.</p>
        </div>`;
      return;
    }

    // Group by position
    const groups = {};
    jugadores.forEach(j => {
      const pos = j.posicion || "—";
      if (!groups[pos]) groups[pos] = [];
      groups[pos].push(j);
    });

    // Build ordered column list — known positions first, then any unknown ones
    const ordered = [
      ...POSITION_ORDER.filter(p => groups[p]),
      ...Object.keys(groups).filter(p => !POSITION_ORDER.includes(p)),
    ];

    boardEl.innerHTML = "";

    ordered.forEach(pos => {
      const players = groups[pos];
      const color   = POS_COLOR[pos] || "#2e3348";

      const col = document.createElement("div");
      col.className = "bb-col";

      // Header
      const header = document.createElement("div");
      header.className = "bb-col-header";
      header.style.background = color;
      header.innerHTML = `
        <span class="bb-col-name">${esc(pos)}</span>
        <span class="bb-col-count">${players.length}</span>
      `;

      // Body
      const body = document.createElement("div");
      body.className = "bb-col-body";
      players.forEach(j => body.appendChild(makeCard(j)));

      col.appendChild(header);
      col.appendChild(body);
      boardEl.appendChild(col);
    });
  }

  // ── Init ──────────────────────────────────────────────

  async function init() {
    try {
      const jugadores = await fetchFavoritos();
      render(jugadores);
    } catch (err) {
      const boardEl = document.getElementById("bb-board");
      boardEl.innerHTML = `
        <div class="bb-empty">
          <div class="bb-empty-icon">⚠️</div>
          <h3>Error al cargar</h3>
          <p>${esc(err.message)}</p>
        </div>`;
      document.getElementById("bb-total").textContent = "Error";
    }
  }

  document.addEventListener("DOMContentLoaded", init);

})();
