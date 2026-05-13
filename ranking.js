// ranking.js
// Lee "jugadores.tsv" y genera el ranking de jugadores en la tabla.
// Añade ranking nacional y por estado.

window.addEventListener("DOMContentLoaded", initRanking);

function initRanking() {
  fetch("jugadores.tsv")
    .then(response => response.text())
    .then(tsvData => {
      let players = parseTSV(tsvData);
      players = assignRankings(players); // Asignar rankings nacional y por estado
      renderRanking(players);
    })
    .catch(error => console.error("Error al cargar TSV:", error));
}

function parseTSV(tsv) {
  const lines = tsv.trim().split("\n");
  if (lines.length < 2) return [];

  // Encabezados
  const headers = lines[0].split("\t").map(h => h.trim());

  // Índices de columnas
  const idxNombre = headers.indexOf("Nombre");
  const idxApP = headers.indexOf("Apellido Paterno");
  const idxApM = headers.indexOf("Apellido Materno");
  const idxOfensiva = headers.indexOf("Posición Ofensiva");
  const idxDefensiva = headers.indexOf("Posición Defensiva");
  const idxAltura = headers.indexOf("Altura");
  const idxPeso = headers.indexOf("Peso");
  const idxRatingPublico = headers.indexOf("Rating Publico");
  const idxClub = headers.indexOf("Club o equipo actual");
  const idxCiudad = headers.indexOf("Ciudad");
  const idxEstado = headers.indexOf("Estado");
  const idxComprometido = headers.indexOf("Comprometido");
  const idxCarpeta = headers.indexOf("Carpeta");

  return lines.slice(1).map(row => {
    const cols = row.split("\t").map(c => c.trim());

    // Nombre completo (se muestra solo Nombre y Apellido Paterno)
    const fullName = [cols[idxNombre], cols[idxApP]].filter(Boolean).join(" ").trim();

    // Generamos rowId usando Nombre, Apellido Paterno y Apellido Materno
    const rowId = `${cols[idxNombre]}_${cols[idxApP]}_${cols[idxApM]}`.replace(/ /g, "_").toLowerCase();

    // Posición
    const position = getPosition(cols[idxOfensiva], cols[idxDefensiva]);

    // Altura / Peso
    const heightWeight = `${cols[idxAltura] || "-"} / ${cols[idxPeso] || "-"}`;

    // Ciudad y estado
    const cityState = `${cols[idxCiudad] || ""} (${cols[idxEstado] || ""})`.trim();
    const state = cols[idxEstado] || "Desconocido";

    // Equipo actual
    const teamCurrent = idxClub !== -1 && cols[idxClub] ? cols[idxClub].trim() : "Sin equipo actual";

    // Rating
    let rating = null;
    if (idxRatingPublico !== -1 && cols[idxRatingPublico]) {
      const rawRating = cols[idxRatingPublico].replace(",", ".");
      rating = parseFloat(rawRating) || null;
    }

    // Imagen del jugador
    let playerImage = idxCarpeta !== -1 && cols[idxCarpeta] ? cols[idxCarpeta].trim() : "imagenes/default.jpg";

    // Compromiso del jugador
    let comprometido = idxComprometido !== -1 && cols[idxComprometido] ? cols[idxComprometido].trim() : "";
    if (comprometido.toLowerCase() === "uncommitted") {
      comprometido = "Uncommitted 🔓";
    }

    // Logo del equipo basado en la columna "Comprometido"
    let teamLogo = comprometido !== "Uncommitted 🔓" ? `equipos/${comprometido}.png` : "";

    return {
      rowId,
      name: fullName,
      position,
      heightWeight,
      ratingPublico: rating,
      team: comprometido,
      teamLogo,
      cityState,
      state,
      playerImage,
      teamCurrent,
      comprometido
    };
  });
}

function assignRankings(players) {
  players.sort((a, b) => (b.ratingPublico || 0) - (a.ratingPublico || 0));
  players.forEach((player, index) => {
    player.rankNacional = index + 1;
  });
  const stateGroups = {};
  players.forEach(player => {
    if (!stateGroups[player.state]) stateGroups[player.state] = [];
    stateGroups[player.state].push(player);
  });
  Object.values(stateGroups).forEach(playersInState => {
    playersInState.sort((a, b) => (b.ratingPublico || 0) - (a.ratingPublico || 0));
    playersInState.forEach((player, index) => {
      player.rankEstado = index + 1;
    });
  });
  return players;
}

function getStars(ratingPublico, rankNacional, rankEstado) {
  let stars = "";
  if (ratingPublico >= 70 && ratingPublico <= 89) stars = `<span style="color: #FFD700;">★★★</span>`;
  if (ratingPublico >= 90 && ratingPublico <= 97) stars = `<span style="color: #FFD700;">★★★★</span>`;
  if (ratingPublico >= 98 && ratingPublico <= 110) stars = `<span style="color: #FFD700;">★★★★★</span>`;
  
  return ratingPublico !== null 
    ? `${stars} <span style="font-weight: bold; color: #333;">${ratingPublico}</span><br>
       <span style="font-size: 0.8em; color: #666;">RANK: ${rankNacional} Edo: ${rankEstado}</span>` 
    : "";
}

function renderRanking(players) {
  const tbody = document.getElementById("playersTableBody");
  if (!tbody) {
    console.error('No existe <tbody id="playersTableBody"> en el HTML.');
    return;
  }

  tbody.innerHTML = "";

  players.forEach(player => {
    const starHTML = getStars(player.ratingPublico, player.rankNacional, player.rankEstado);

    const playerImageHTML = `
      <img src="${player.playerImage}" alt="Foto de ${player.name}" class="player-photo"
      onerror="this.style.display='none';">
    `;

    const teamLogoHTML = player.comprometido !== "Uncommitted 🔓"
      ? `<img src="${player.teamLogo}" alt="Logo de ${player.comprometido}" class="team-logo" onerror="this.style.display='none';">`
      : "";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${player.rankNacional}</td>
      <td>
        <div class="player-flex">
          ${playerImageHTML}
          <div>
            <div class="player-name" data-id="${player.rowId}">${player.name}</div>
            <div class="player-subinfo">${player.cityState}</div>
            <div class="player-team-current">${player.teamCurrent}</div>
          </div>
        </div>
      </td>
      <td><span class="pos-label">${player.position || "N/A"}</span></td>
      <td>${player.heightWeight}</td>
      <td>${starHTML}</td>
      <td class="commit-cell">
        ${teamLogoHTML}
        <div class="commit-name">${player.comprometido}</div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Manejo simplificado del click: se usa el atributo data-id
document.addEventListener("click", function(event) {
  if (event.target.classList.contains("player-name")) {
    const id = event.target.getAttribute("data-id");
    if (id) {
      window.location.href = `perfilpublico.html?id=${id}`;
    }
  }
});

function getPosition(ofensiva, defensiva) {
  if (ofensiva && ofensiva.toLowerCase() !== "ninguna") {
    return ofensiva.trim();
  } else if (defensiva && defensiva.toLowerCase() !== "ninguna") {
    return defensiva.trim();
  } else {
    return "Sin posición definida";
  }
}
