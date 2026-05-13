// perfilpublico.js
window.addEventListener("DOMContentLoaded", function () {
  // 1. Tomar el "id" de la URL
  const params = new URLSearchParams(window.location.search);
  const playerId = params.get("id");
  if (!playerId) {
    console.log("No se encontró un 'id' en la URL.");
    return;
  }

  // 2. Leer el archivo TSV
  fetch("jugadores.tsv")
    .then(response => response.text())
    .then(data => {
      // 3. Dividir el contenido en líneas y parsear la primera como encabezados
      const lines = data.trim().split("\n");
      if (lines.length < 2) return;

      const headers = lines[0].split("\t").map(h => h.trim());

      // Índices de columnas
      const idxNombre = headers.indexOf("Nombre");
      const idxApP = headers.indexOf("Apellido Paterno");
      const idxApM = headers.indexOf("Apellido Materno");
      const idxOfensiva = headers.indexOf("Posición Ofensiva");
      const idxDefensiva = headers.indexOf("Posición Defensiva");
      const idxAltura = headers.indexOf("Altura");
      const idxPeso = headers.indexOf("Peso");
      const idxClub = headers.indexOf("Club o equipo actual");
      const idxCiudad = headers.indexOf("Ciudad");
      const idxEstado = headers.indexOf("Estado");
      const idxClase = headers.indexOf("Clase (Año de graduación)");
      const idxCarpeta = headers.indexOf("Carpeta");
      const idxRating = headers.indexOf("Rating Publico");

      let players = [];
      let foundPlayer = null;

      // 4. Recorrer filas y almacenar jugadores
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split("\t").map(c => c.trim());
        if (cols.length < 2) continue;

        // Construcción del rowId
        const nombre = idxNombre !== -1 ? cols[idxNombre] : "";
        const apP = idxApP !== -1 ? cols[idxApP] : "";
        const apM = idxApM !== -1 ? cols[idxApM] : "";
        const rowId = [nombre, apP, apM].join("_").replace(/ /g, "_").toLowerCase();

        const player = {
          rowId,
          nombre,
          apP,
          apM,
          ofensiva: idxOfensiva !== -1 ? cols[idxOfensiva] : "",
          defensiva: idxDefensiva !== -1 ? cols[idxDefensiva] : "",
          altura: idxAltura !== -1 ? cols[idxAltura] : "",
          peso: idxPeso !== -1 ? cols[idxPeso] : "",
          club: idxClub !== -1 ? cols[idxClub] : "",
          ciudad: idxCiudad !== -1 ? cols[idxCiudad] : "",
          estado: idxEstado !== -1 ? cols[idxEstado] : "",
          clase: idxClase !== -1 ? cols[idxClase] : "",
          carpeta: idxCarpeta !== -1 ? cols[idxCarpeta] : "imagenes/default.jpg",
          ratingPublico: idxRating !== -1 && cols[idxRating] ? parseFloat(cols[idxRating].replace(",", ".")) || 0 : 0
        };

        players.push(player);

        if (rowId === playerId) {
          foundPlayer = player;
        }
      }

      // 5. Si no se encontró el jugador, salir
      if (!foundPlayer) {
        console.log("No se encontró el jugador con id:", playerId);
        return;
      }

      // 6. Asignar rankings nacional y estatal
      assignRankings(players);

      // Buscar los rankings del jugador encontrado
      const playerRank = players.find(p => p.rowId === playerId);
      const rankNacional = playerRank ? playerRank.rankNacional : "N/A";
      const rankEstado = playerRank ? playerRank.rankEstado : "N/A";

      // 7. Llenar el HTML con los datos
      document.getElementById("playerName").textContent =
        [foundPlayer.nombre, foundPlayer.apP].filter(Boolean).join(" ");

      document.getElementById("playerPosition").textContent =
        getPosition(foundPlayer.ofensiva, foundPlayer.defensiva);

      document.getElementById("playerHeightWeight").textContent =
        `${foundPlayer.altura || "-"} m | ${foundPlayer.peso || "-"} KG`;

      document.getElementById("playerTeam").textContent =
        foundPlayer.club || "Sin equipo actual";

      document.getElementById("playerCity").textContent =
        foundPlayer.ciudad && foundPlayer.estado
          ? `${foundPlayer.ciudad}, ${foundPlayer.estado}`
          : (foundPlayer.ciudad || "");

      document.getElementById("playerClass").textContent = foundPlayer.clase || "";

      document.getElementById("playerPhoto").src = foundPlayer.carpeta;
      document.getElementById("playerPhoto").alt = `Foto de ${foundPlayer.nombre}`;

      document.getElementById("playerStars").textContent =
        getStars(foundPlayer.ratingPublico);

      document.getElementById("playerRating").textContent =
        foundPlayer.ratingPublico || "-";

      // Asignar rankings al HTML
      document.getElementById("playerNat").textContent = rankNacional;
      document.getElementById("playerSta").textContent = rankEstado;

    })
    .catch(error => console.error("Error al cargar TSV:", error));
});

// Función para asignar rankings nacional y estatal
function assignRankings(players) {
  players.sort((a, b) => (b.ratingPublico || 0) - (a.ratingPublico || 0));
  players.forEach((player, index) => {
    player.rankNacional = index + 1;
  });

  const stateGroups = {};
  players.forEach(player => {
    if (!stateGroups[player.estado]) stateGroups[player.estado] = [];
    stateGroups[player.estado].push(player);
  });

  Object.values(stateGroups).forEach(playersInState => {
    playersInState.sort((a, b) => (b.ratingPublico || 0) - (a.ratingPublico || 0));
    playersInState.forEach((player, index) => {
      player.rankEstado = index + 1;
    });
  });
}

// Función para determinar la posición principal
function getPosition(ofensiva, defensiva) {
  if (ofensiva && ofensiva.toLowerCase() !== "ninguna") {
    return ofensiva.trim();
  } else if (defensiva && defensiva.toLowerCase() !== "ninguna") {
    return defensiva.trim();
  }
  return "Sin posición definida";
}

// Función para convertir rating en estrellas
function getStars(rating) {
  if (rating >= 98 && rating <= 110) return "★★★★★";
  if (rating >= 90 && rating <= 97) return "★★★★";
  if (rating >= 70 && rating <= 89) return "★★★";
  return "";
}
