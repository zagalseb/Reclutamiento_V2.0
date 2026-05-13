document.addEventListener("DOMContentLoaded", () => {
  const listaJugadoresDiv = document.querySelector("#lista-jugadores");
  const filtroEstado = document.getElementById("filtroEstado");
  const filtroOfensiva = document.getElementById("filtroOfensiva");
  const filtroDefensiva = document.getElementById("filtroDefensiva");
  const tablaComparacionDiv = document.querySelector("#tabla-comparacion");
  const toggleListaJugadoresBtn = document.getElementById("toggleListaJugadores"); // Asegurar referencia al botón


  let prospectos = [];
  let roster = [];

  // Cargar ambos archivos TSV
  Promise.all([
    fetch("jugadores.tsv")
      .then(response => {
        if (!response.ok) throw new Error("No se pudo cargar jugadores.tsv");
        return response.text();
      }),
    fetch("roster.tsv")
      .then(response => {
        if (!response.ok) throw new Error("No se pudo cargar roster.tsv");
        return response.text();
      })
  ])
    .then(([jugadoresData, rosterData]) => {
      prospectos = procesarTSV(jugadoresData);
      roster = procesarTSV(rosterData);
      mostrarJugadores(prospectos);
    })
    .catch(error => {
      console.error("Error al cargar los datos:", error);
    });

  // Procesar archivo TSV a formato JSON
  function procesarTSV(data) {
    const rows = data.split("\n").filter(Boolean);
    const headers = rows[0].split("\t").map(header => header.trim());
    return rows.slice(1).map(row => {
      const values = row.split("\t").map(value => value.trim());
      const jugador = {};
      headers.forEach((header, index) => {
        jugador[header] = values[index] || "N/A";
      });
      return jugador;
    });
  }

  if (toggleListaJugadoresBtn) {
    toggleListaJugadoresBtn.addEventListener("click", () => {
      if (listaJugadoresDiv.classList.contains("oculto")) {
        listaJugadoresDiv.classList.remove("oculto"); // Mostrar la lista
        toggleListaJugadoresBtn.textContent = "Ocultar Jugadores";
      } else {
        listaJugadoresDiv.classList.add("oculto"); // Ocultar la lista
        toggleListaJugadoresBtn.textContent = "Mostrar Jugadores";
      }
    });
  }

  // Mostrar jugadores en la lista
  function mostrarJugadores(jugadores) {
    listaJugadoresDiv.innerHTML = "";
    jugadores.forEach((jugador, index) => {
      const jugadorDiv = document.createElement("div");
      jugadorDiv.className = "jugador-item";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "seleccion-prospecto";
      radio.dataset.index = index;

      const label = document.createElement("label");
      const apellidoPaterno = jugador["Apellido Paterno"] || ""; // Validar apellidos
      label.textContent = `${jugador["Nombre"]} ${apellidoPaterno}  - ${jugador["Estado"]}`;

      jugadorDiv.appendChild(radio);
      jugadorDiv.appendChild(label);
      listaJugadoresDiv.appendChild(jugadorDiv);
    });

    listaJugadoresDiv.addEventListener("change", () => {
      const seleccionado = document.querySelector("input[name='seleccion-prospecto']:checked");
      if (seleccionado) {
        const prospecto = jugadores[seleccionado.dataset.index];
        mostrarComparacion(prospecto, roster);
      }
    });
  }

  // Mostrar comparación con jugadores del roster
  // Mostrar comparación con jugadores del roster
// Mostrar comparación con jugadores del roster (estilo Madden)
function mostrarComparacion(prospecto, roster) {
  tablaComparacionDiv.innerHTML = "";

  // 1) Posición del prospecto (Posición Principal en jugadores.tsv)
  const posProspecto = (prospecto["Posición Principal"] || prospecto["Posición principal"] || "")
    .toString()
    .trim()
    .toUpperCase();

  // 2) Filtrar jugadores del roster con la misma Pos
  const jugadoresMismaPosicion = roster.filter(jugador => {
    const posRoster = (jugador["Pos"] || jugador["Posición"] || "")
      .toString()
      .trim()
      .toUpperCase();
    return posRoster === posProspecto;
  });

  if (jugadoresMismaPosicion.length === 0) {
    tablaComparacionDiv.innerHTML = "<p>No hay jugadores del roster con la misma posición.</p>";
    return;
  }

  // 3) Contenedor general
  const contenedor = document.createElement("div");
  contenedor.classList.add("comparacion-madden");

  // ==========================
  // A) Tarjeta del prospecto
  // ==========================
  const cardProspecto = document.createElement("div");
  cardProspecto.classList.add("prospecto-card");

  const apellidoPaternoProspecto = prospecto["Apellido Paterno"] || "";
  const nombreCompletoProspecto = `${prospecto["Nombre"]} ${apellidoPaternoProspecto}`.trim();

  const edadProspecto = calcularEdadDesdeFecha(prospecto["Fecha de Nacimiento"]);
  const alturaProspecto = prospecto["Altura"] || "N/A";
  const pesoProspecto = prospecto["Peso"] || "N/A";

  cardProspecto.innerHTML = `
    <h3>${nombreCompletoProspecto} – ${posProspecto}</h3>
    <p><strong>Edad:</strong> ${edadProspecto} &nbsp;&nbsp; 
       <strong>Altura:</strong> ${alturaProspecto} &nbsp;&nbsp; 
       <strong>Peso:</strong> ${pesoProspecto}</p>
  `;

  contenedor.appendChild(cardProspecto);

  // ==========================
  // B) Depth chart de la misma posición
  // ==========================
  const tituloDepth = document.createElement("h3");
  tituloDepth.textContent = "Depth Chart (misma posición)";
  contenedor.appendChild(tituloDepth);

  const tabla = document.createElement("table");
  tabla.classList.add("tabla-comparacion", "depth-chart-table");

  // Encabezados estilo Madden
  tabla.innerHTML = `
    <thead>
      <tr>
        <th>#</th>
        <th>Pos</th>
        <th>Nombre</th>
        <th>Edad</th>
        <th>Altura</th>
        <th>Peso</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = tabla.querySelector("tbody");

  jugadoresMismaPosicion.forEach((jugador) => {
  const fila = document.createElement("tr");

  const apellidoPaternoJugador = jugador["Apellido Paterno"] || "";
  const nombreCompletoJugador = `${jugador["Nombre"]} ${apellidoPaternoJugador}`.trim();

  const edadJugador = calcularEdadDesdeAnio(jugador["Año"]); 
  const alturaJugador = jugador["Estatura"] || "N/A";
  const pesoJugador = jugador["Peso"] || "N/A";
  const pos = (jugador["Pos"] || "").toString().toUpperCase();
  const numero = jugador["Jersey"] || jugador["Número"] || "—";  // ← AQUI

  fila.innerHTML = `
    <td>${numero}</td>
    <td>${pos}</td>
    <td>${nombreCompletoJugador}</td>
    <td>${edadJugador}</td>
    <td>${alturaJugador}</td>
    <td>${pesoJugador}</td>
  `;

  tbody.appendChild(fila);
});


  contenedor.appendChild(tabla);

  // Activar drag & drop para ordenar profundidad
  activarDragAndDrop(tabla);

  // Render final
  tablaComparacionDiv.appendChild(contenedor);
}



  // Generar tabla de comparación
  function generarTablaComparacion(prospecto, jugadores, titulo) {
    const contenedor = document.createElement("div");
    const encabezado = document.createElement("h3");
    encabezado.textContent = titulo;
    contenedor.appendChild(encabezado);

    jugadores.forEach(jugador => {
      const tabla = document.createElement("table");
      tabla.classList.add("tabla-comparacion");

      const apellidoPaternoProspecto = prospecto["Apellido Paterno"] || "";
      const apellidoPaternoJugador = jugador["Apellido Paterno"] || "";

      tabla.innerHTML = `
        <tr>
          <th>Campo</th>
          <th>Prospecto</th>
          <th>Jugador del Roster</th>
        </tr>
        <tr>
          <td>Nombre</td>
          <td>${prospecto["Nombre"]} ${apellidoPaternoProspecto}</td>
          <td>${jugador["Nombre"]} ${apellidoPaternoJugador}</td>
        </tr>
        <tr>
          <td>Altura</td>
          <td>${prospecto["Altura"] || "N/A"}</td>
          <td>${jugador["Estatura"] || "N/A"}</td>
        </tr>
        <tr>
          <td>Peso</td>
          <td>${prospecto["Peso"] || "N/A"}</td>
          <td>${jugador["Peso"] || "N/A"}</td>
        </tr>
        <tr>
          <td>Año</td>
          <td>${prospecto["Fecha de Nacimiento"] || "N/A"}</td>
          <td>${jugador["Año"] || "N/A"}</td>
        </tr>
        <tr>
        </tr>
      `;

      contenedor.appendChild(tabla);
    });

    return contenedor;
  }

  // Filtrar jugadores según filtros seleccionados
  function filtrarJugadores() {
    const estadoSeleccionado = filtroEstado.value;
    const posicionOfensiva = filtroOfensiva.value;
    const posicionDefensiva = filtroDefensiva.value;

    const jugadoresFiltrados = prospectos.filter(jugador => {
      const coincideEstado = estadoSeleccionado === "Todos" || jugador["Estado"] === estadoSeleccionado;
      const coincidePosicionOFF = !posicionOfensiva || jugador["Posición Principal"] === posicionOfensiva;
      const coincidePosicionDEF = !posicionDefensiva || jugador["Posición Defensiva"] === posicionDefensiva;
      return coincideEstado && coincidePosicionOFF && coincidePosicionDEF;
    });

    mostrarJugadores(jugadoresFiltrados);
  }

  // Calcula edad aproximada a partir de una fecha tipo "3/17/2007"
function calcularEdadDesdeFecha(fechaStr) {
  if (!fechaStr) return "N/A";
  const fecha = new Date(fechaStr);
  if (isNaN(fecha.getTime())) return "N/A";
  const hoy = new Date();
  let edad = hoy.getFullYear() - fecha.getFullYear();
  const m = hoy.getMonth() - fecha.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < fecha.getDate())) {
    edad--;
  }
  return edad;
}

// Calcula edad si en el roster solo tienes el año (ej. 2001)
function calcularEdadDesdeAnio(anioStr) {
  if (!anioStr) return "N/A";
  const anio = parseInt(anioStr, 10);
  if (isNaN(anio)) return "N/A";
  const hoy = new Date();
  return hoy.getFullYear() - anio;
}

// ----- Drag & Drop para el depth chart -----
let filaArrastrada = null;

function activarDragAndDrop(tabla) {
  const filas = tabla.querySelectorAll("tbody tr");

  filas.forEach(fila => {
    fila.draggable = true;

    fila.addEventListener("dragstart", e => {
      filaArrastrada = fila;
      e.dataTransfer.effectAllowed = "move";
      fila.classList.add("dragging");
    });

    fila.addEventListener("dragover", e => {
      e.preventDefault(); // necesario para permitir drop
      e.dataTransfer.dropEffect = "move";
      const tbody = tabla.querySelector("tbody");
      const filaSobre = e.currentTarget;
      if (filaSobre !== filaArrastrada) {
        const rect = filaSobre.getBoundingClientRect();
        const offset = e.clientY - rect.top;
        // si arrastras hacia arriba o hacia abajo
        if (offset < rect.height / 2) {
          tbody.insertBefore(filaArrastrada, filaSobre);
        } else {
          tbody.insertBefore(filaArrastrada, filaSobre.nextSibling);
        }
      }
    });

    fila.addEventListener("dragend", () => {
      filaArrastrada.classList.remove("dragging");
      filaArrastrada = null;
    });
  });
}


  // Escuchar cambios en los filtros
  filtroEstado.addEventListener("change", filtrarJugadores);
  filtroOfensiva.addEventListener("change", filtrarJugadores);
  filtroDefensiva.addEventListener("change", filtrarJugadores);
});





  
  
  
  
  
  