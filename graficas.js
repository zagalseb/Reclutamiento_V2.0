document.addEventListener("DOMContentLoaded", () => {
  const formFiltros = document.getElementById("formFiltros");
  const ctx = document.getElementById("grafica").getContext("2d");

  let grafica;
  let jugadores = []; // Almacenará los datos del TSV

  // Leer el archivo TSV y procesarlo
  fetch("jugadores.tsv")
    .then(response => response.text())
    .then(data => {
      jugadores = procesarTSV(data);
      console.log("Datos cargados:", jugadores); // Verificar datos cargados
    })
    .catch(error => console.error("Error al cargar el TSV:", error));

  // Procesar el contenido del TSV a un objeto JSON
  function procesarTSV(data) {
    const rows = data.trim().split("\n");
    const headers = rows[0].split("\t").map(header => header.trim());

    return rows.slice(1).map(row => {
      const values = row.split("\t").map(value => value.trim());
      const jugador = {};
      headers.forEach((header, index) => {
        jugador[header] = values[index];
      });
      return jugador;
    });
  }

  // Generar gráfica al enviar el formulario
  formFiltros.addEventListener("submit", (event) => {
    event.preventDefault();

    // Obtener filtros seleccionados
    const ejeX = document.getElementById("ejeX").value;
    const ejeY = document.getElementById("ejeY").value;
    const estado = document.getElementById("estado").value;
    const posicion = document.getElementById("posicion").value;
    const posicionDefensiva = document.getElementById("posicionDefensiva").value;

    // Filtrar datos
    const datos = obtenerDatosFiltrados(estado, posicion, posicionDefensiva);

    // Validar datos para graficar
    const datosFiltrados = datos.map(d => ({
      x: parseFloat(d[ejeX]),
      y: parseFloat(d[ejeY]),
      name: `${d["Nombre"]} ${d["Apellido Paterno"]}`,
      profileLink: `perfil.html?nombre=${encodeURIComponent(d["Nombre"])}&apellido=${encodeURIComponent(d["Apellido Paterno"])}`,
    })).filter(d => !isNaN(d.x) && !isNaN(d.y));

    if (datosFiltrados.length === 0) {
      alert("No hay datos disponibles para los filtros seleccionados.");
      console.error("Datos insuficientes para graficar.");
      return;
    }

    // Configurar datos para la gráfica
    const data = {
      datasets: [{
        label: `${ejeY} vs ${ejeX}`,
        data: datosFiltrados,
        backgroundColor: "rgba(0, 123, 255, 0.7)",
        borderColor: "rgba(0, 73, 146, 1)",
        borderWidth: 1,
      }],
    };

    // Crear o actualizar gráfica
    if (grafica) grafica.destroy();
    grafica = new Chart(ctx, {
      type: "scatter",
      data,
      options: {
        responsive: true,
        plugins: {
          tooltip: {
            callbacks: {
              label: function (context) {
                const { name } = context.raw;
                const xValue = context.raw.x;
                const yValue = context.raw.y;

                return [
                  `Nombre: ${name}`,
                  `${context.chart.options.scales.x.title.text}: ${xValue}`,
                  `${context.chart.options.scales.y.title.text}: ${yValue}`,
                ];
              },
            },
          },
        },
        onClick: (event, elements, chart) => {
          if (elements.length > 0) {
            const point = chart.data.datasets[elements[0].datasetIndex].data[elements[0].index];

            // Redirigir al perfil del jugador
            if (point.profileLink) {
              window.location.href = point.profileLink;
            }
          }
        },
        scales: {
          x: {
            beginAtZero: false,
            title: {
              display: true,
              text: ejeX,
            },
          },
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: ejeY,
            },
          },
        },
      },
    });
  });

  // Filtrar datos con base en estado, posición y posición defensiva
  function obtenerDatosFiltrados(estado, posicion, posicionDefensiva) {
    return jugadores.filter(jugador => {
      const estadoJugador = jugador["Estado"]?.trim().toLowerCase() || "";
      const posicionJugador = jugador["Posición Ofensiva"]?.trim().toLowerCase() || "";
      const posicionDefensivaJugador = jugador["Posición Defensiva"]?.trim().toLowerCase() || "";

      const estadoFiltro = estado.trim().toLowerCase();
      const posicionFiltro = posicion.trim().toLowerCase();
      const posicionDefensivaFiltro = posicionDefensiva.trim().toLowerCase();

      const estadoCoincide = (estadoFiltro === "todos" || estadoJugador === estadoFiltro);
      const posicionCoincide = (posicionFiltro === "todas" || posicionJugador === posicionFiltro);
      const posicionDefensivaCoincide = (posicionDefensivaFiltro === "todas" || posicionDefensivaJugador === posicionDefensivaFiltro);

      return estadoCoincide && posicionCoincide && posicionDefensivaCoincide;
    });
  }
});

