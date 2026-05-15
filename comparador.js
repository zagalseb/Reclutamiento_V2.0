// Variables globales
let jugadores = [];
let jugadoresFiltrados = [];

// Cargar el archivo TSV
async function cargarJugadores() {
  try {
    const response = await fetch("jugadores.tsv");
    if (!response.ok) throw new Error("No se pudo cargar el archivo TSV.");

    const tsvData = await response.text();
    jugadores = procesarTSV(tsvData);

    generarListaJugadores();
  } catch (error) {
    console.error("Error al cargar los datos:", error);
  }
}

// Manejar la visibilidad de la lista de jugadores
document.getElementById("toggleListaJugadores").addEventListener("click", () => {
  const listaJugadores = document.getElementById("lista-jugadores");
  const botonToggle = document.getElementById("toggleListaJugadores");

  if (listaJugadores.style.display === "none") {
    listaJugadores.style.display = "grid"; // Mostrar la lista
    botonToggle.textContent = "Ocultar Jugadores";
  } else {
    listaJugadores.style.display = "none"; // Ocultar la lista
    botonToggle.textContent = "Mostrar Jugadores";
  }
});

// Procesar TSV a formato JSON
function procesarTSV(data) {
  const rows = data.split("\n");
  const headers = rows[0].split("\t").map(header => header.trim());

  return rows.slice(1).map(row => {
    const values = row.split("\t").map(value => value.trim());
    const jugador = {};
    headers.forEach((header, index) => {
      jugador[header] = values[index] || "N/A";
    });
    return jugador;
  }).filter(jugador => jugador["Nombre"]); // Filtrar filas vacías
}

// Generar lista de jugadores
function generarListaJugadores() {
  const listaJugadoresDiv = document.getElementById("lista-jugadores");
  const filtroEstado = document.getElementById("filtroEstado").value;
  const filtroOfensiva = document.getElementById("filtroOfensiva").value;
  const filtroDefensiva = document.getElementById("filtroDefensiva").value;

  listaJugadoresDiv.innerHTML = "";

  // Actualizar jugadoresFiltrados según los filtros seleccionados
  jugadoresFiltrados = jugadores.filter(jugador => {
    const coincideEstado = filtroEstado === "Todos" || jugador["Estado"] === filtroEstado;
    const coincidePosicionOFF = filtroOfensiva === "" || jugador["Posición Principal"] === filtroOfensiva;
    const coincidePosicionDEF = filtroDefensiva === "" || jugador["Posición Defensiva"] === filtroDefensiva;
    return coincideEstado && coincidePosicionOFF && coincidePosicionDEF;
  });

  // Generar dinámicamente los elementos visibles
  jugadoresFiltrados.forEach((jugador, index) => {
    const jugadorDiv = document.createElement("div");
    jugadorDiv.className = "jugador-item";

    // Checkbox
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `jugador-${index}`;
    checkbox.dataset.index = index; // Índice basado en jugadoresFiltrados

    // Nombre del jugador
    const label = document.createElement("label");
    label.htmlFor = `jugador-${index}`;
    label.textContent = `${jugador["Nombre"]} ${jugador["Apellido Paterno"]}`;

    // Agregar elementos al contenedor del jugador
    jugadorDiv.appendChild(checkbox);
    jugadorDiv.appendChild(label);

    // Agregar al contenedor principal
    listaJugadoresDiv.appendChild(jugadorDiv);
  });

  // Escuchar cambios en la selección
  listaJugadoresDiv.addEventListener("change", actualizarComparacion);
}

// Actualizar comparación considerando jugadoresFiltrados
function actualizarComparacion() {
  // Obtener los jugadores seleccionados
  const seleccionados = Array.from(document.querySelectorAll("#lista-jugadores input[type='checkbox']:checked"))
    .map(checkbox => jugadoresFiltrados[checkbox.dataset.index]);

  if (seleccionados.length > 2) {
    alert("Solo puedes seleccionar hasta 2 jugadores para comparar.");
    return;
  }

  // Llamar a la función para mostrar la comparación
  mostrarComparacion(seleccionados);
}

// Agregar eventos a los filtros
document.getElementById("filtroEstado").addEventListener("change", generarListaJugadores);
document.getElementById("filtroOfensiva").addEventListener("change", generarListaJugadores);
document.getElementById("filtroDefensiva").addEventListener("change", generarListaJugadores);

// Mostrar comparación solo con las estadísticas seleccionadas
function mostrarComparacion(seleccionados) {
  const tablaComparacionDiv = document.getElementById("tabla-comparacion");
  tablaComparacionDiv.innerHTML = "";

  if (seleccionados.length < 2) {
    tablaComparacionDiv.innerHTML = "<p>Selecciona dos jugadores para comparar.</p>";
    return;
  }

  const [jugador1, jugador2] = seleccionados;

  const rutaBaseImagenes = "imagenes/";

  const generarRutaImagen = (nombre, apellidoPaterno, apellidoMaterno, extension) =>
    `${rutaBaseImagenes}${nombre}_${apellidoPaterno}_${apellidoMaterno}.${extension}`;

  const rutaImagen1JPG = generarRutaImagen(
    jugador1["Nombre"], jugador1["Apellido Paterno"], jugador1["Apellido Materno"], "jpg"
  );
  const rutaImagen1PNG = generarRutaImagen(
    jugador1["Nombre"], jugador1["Apellido Paterno"], jugador1["Apellido Materno"], "png"
  );

  const rutaImagen2JPG = generarRutaImagen(
    jugador2["Nombre"], jugador2["Apellido Paterno"], jugador2["Apellido Materno"], "jpg"
  );
  const rutaImagen2PNG = generarRutaImagen(
    jugador2["Nombre"], jugador2["Apellido Paterno"], jugador2["Apellido Materno"], "png"
  );

  const estadisticasAComparar = [
    "Promedio Acádemico",
    "Clase (Año de graduación)",
    "Posición Ofensiva",
    "Posición Defensiva",
    "Altura",
    "Peso",
    "40 YD",
    "Vertical",
    "3 cone",
    "Shuttle",
    "Broad",
    "TL %"
  ];

  const tabla = document.createElement("table");
  tabla.className = "tabla-comparacion";

  const encabezadoRow = document.createElement("tr");
  encabezadoRow.innerHTML = `
    <th>Estadística</th>
    <th>
      <img src="${rutaImagen1JPG}" 
           onerror="this.src='${rutaImagen1PNG}'; this.onerror=null;" 
           alt="${jugador1["Nombre"]}" 
           style="width: 100px; border-radius: 10px;">
      <br>${jugador1["Nombre"]} ${jugador1["Apellido Paterno"]}
    </th>
    <th>
      <img src="${rutaImagen2JPG}" 
           onerror="this.src='${rutaImagen2PNG}'; this.onerror=null;" 
           alt="${jugador2["Nombre"]}" 
           style="width: 100px; border-radius: 10px;">
      <br>${jugador2["Nombre"]} ${jugador2["Apellido Paterno"]}
    </th>
  `;
  tabla.appendChild(encabezadoRow);

  estadisticasAComparar.forEach(key => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${key}</td>
      <td>${jugador1[key] || "N/A"}</td>
      <td>${jugador2[key] || "N/A"}</td>
    `;
    tabla.appendChild(fila);
  });

  tablaComparacionDiv.appendChild(tabla);

  generarGraficoComparativo(jugador1, jugador2, estadisticasAComparar);
}

// Generar gráficos solo con las estadísticas relevantes
function generarGraficoComparativo(jugador1, jugador2) {
  const container = document.createElement("div");
  container.style.width = "600px";
  container.style.height = "400px";

  const canvas = document.createElement("canvas");
  container.appendChild(canvas);

  const tablaComparacionDiv = document.getElementById("tabla-comparacion");
  tablaComparacionDiv.appendChild(container);

  const labels = ["Altura", "Peso", "40 YD", "Vertical", "3 cone", "Shuttle", "Broad"];

  // Extraer los valores numéricos originales
  const datos1 = labels.map(label => parseFloat(jugador1[label]) || 0);
  const datos2 = labels.map(label => parseFloat(jugador2[label]) || 0);

  // Definir rangos específicos por estadística
  const rangos = {
    "Altura": { min: 1.50, max: 2.10 },
    "Peso": { min: 50, max: 150 },
    "40 YD": { min: 4, max: 6 },
    "Vertical": { min: 20, max: 50 },
    "3 cone": { min: 6, max: 10 },
    "Shuttle": { min: 2, max: 6 },
    "Broad": { min: 80, max: 150 }
  };

  // Normalización y ajuste de valores para gráficos
  const ajustarValores = (valor, label) => {
    const { min, max } = rangos[label];
    const invertir = ["40 YD", "3 cone", "Shuttle"].includes(label); // Invertir para métricas de tiempo
    const ajustado = (valor - min) / (max - min);
    return invertir ? 1 - ajustado : ajustado;
  };

  const datosAjustados1 = labels.map(label => ajustarValores(jugador1[label], label));
  const datosAjustados2 = labels.map(label => ajustarValores(jugador2[label], label));

  // Generar la gráfica
  new Chart(canvas, {
    type: "radar",
    data: {
      labels: labels,
      datasets: [
        {
          label: jugador1["Nombre"],
          data: datosAjustados1,
          borderColor: "blue",
          backgroundColor: "rgba(0, 0, 255, 0.2)"
        },
        {
          label: jugador2["Nombre"],
          data: datosAjustados2,
          borderColor: "red",
          backgroundColor: "rgba(255, 0, 0, 0.2)"
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        r: {
          min: 0,
          max: 1, // Escalamos a 0-1 para visualización
          ticks: {
            stepSize: 0.2,
            callback: (value) => value // Mostrar los valores normales
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = labels[context.dataIndex];
              const { min, max } = rangos[label];
              const invertir = ["40 YD", "3 cone", "Shuttle"].includes(label);
              const valorOriginal = invertir
                ? max - context.raw * (max - min)
                : context.raw * (max - min) + min;
              return `${label}: ${valorOriginal.toFixed(2)}`;
            }
          }
        }
      }
    }
  });
}





// Cargar datos al iniciar
document.addEventListener("DOMContentLoaded", cargarJugadores);

