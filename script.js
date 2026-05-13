// script.js

// Variables globales
let jugadores = [];

// Cargar un archivo TSV automáticamente
async function cargarArchivoTSV() {
  try {
    // Ruta del archivo TSV
    const archivo = "jugadores.tsv"; // Cambia "jugadores.tsv" por el nombre y ruta de tu archivo

    const response = await fetch(archivo);
    if (!response.ok) throw new Error(`No se pudo cargar el archivo: ${response.status}`);

    const tsvData = await response.text(); // Leer el archivo como texto

    jugadores = procesarTSV(tsvData); // Procesar el contenido TSV
    mostrarResultados(jugadores); // Mostrar resultados
  } catch (error) {
    console.error("Error al cargar el archivo TSV:", error);
  }
}

// Procesar contenido TSV
function procesarTSV(data) {
  const rows = data.split("\n"); // Dividir en filas
  const headers = rows[0].split("\t").map(header => header.trim()); // Extraer encabezados

  return rows.slice(1).map(row => {
    const values = row.split("\t").map(value => value.trim()); // Dividir fila en columnas
    const jugador = {};

    // Mapear encabezados a valores
    headers.forEach((header, index) => {
      jugador[header] = values[index] || ""; // Asignar el valor correspondiente
    });

    return jugador; // Devolver el jugador como objeto
  }).filter(jugador => jugador["Nombre"]); // Filtrar filas vacías
}






// Variables globales para los filtros
let filtroPosicionOfensiva = "";
let filtroPosicionDefensiva = "";
let filtroClase = "";
let filtroEstado = "";
let filtroAlturaMin = null;
let filtroAlturaMax = null;
let filtroPesoMin = null;
let filtroPesoMax = null;
let filtroRating = "";
let filtroFavoritos = "todos"; // Estado inicial
let filtroEnProceso = "todos";
let filtroNombre = "";
let filtroOrden = "";
let listaFiltradaActual = []; // Para exportar CSV
let paginaActual = 1; // Página inicial
const jugadoresPorPagina = 10; // Número de jugadores por página

// Filtrar jugadores por posición ofensiva
function filtrarPorPosicionOfensiva() {
  filtroPosicionOfensiva = document.getElementById("posicionOfensivaFiltro").value;
  paginaActual = 1; // Reinicia la paginación
  filtrarJugadores();
}

// Filtrar jugadores por posición defensiva
function filtrarPorPosicionDefensiva() {
  filtroPosicionDefensiva = document.getElementById("posicionDefensivaFiltro").value;
  paginaActual = 1;
  filtrarJugadores();
}

// Filtrar jugadores por estado
function filtrarPorEstado() {
  filtroEstado = document.getElementById("estadoFiltro").value;
  paginaActual = 1;
  filtrarJugadores();
}

// Filtrar jugadores por altura
function filtrarPorAltura() {
  filtroAlturaMin = parseFloat(document.getElementById("alturaMinFiltro").value) || null;
  filtroAlturaMax = parseFloat(document.getElementById("alturaMaxFiltro").value) || null;
  paginaActual = 1;
  filtrarJugadores();
}

// Filtrar jugadores por peso
function filtrarPorPeso() {
  filtroPesoMin = parseFloat(document.getElementById("pesoMinFiltro").value) || null;
  filtroPesoMax = parseFloat(document.getElementById("pesoMaxFiltro").value) || null;
  paginaActual = 1;
  filtrarJugadores();
}

// Filtrar jugadores por rating
function filtrarPorRating() {
  filtroRating = document.getElementById("ratingFiltro").value;
  paginaActual = 1;
  filtrarJugadores();
}

function filtrarPorClase() {
  filtroClase = document.getElementById("claseFiltro").value; // Obtiene el valor del filtro
  filtrarJugadores(); // Llama a la función principal de filtrado
}

function filtrarPorFavoritos() {
  filtroFavoritos = document.getElementById("favoritosFiltro").value;
  filtrarJugadores();
}

function filtrarPorEnProceso() {
  filtroEnProceso = document.getElementById("enProcesoFiltro").value;
  filtrarJugadores();
}

function filtrarPorNombre() {
  paginaActual = 1;
  filtroNombre = document.getElementById("buscador-nombre").value.toLowerCase().trim();
  filtrarJugadores();
}




function cerrarSesion() {
  // Eliminar datos básicos de sesión almacenados en localStorage
  localStorage.removeItem("usuario");

  // Redirigir a la página de inicio de sesión
  window.location.href = "login.html";
}

function calcularEstrellas(rating) {
  if (rating >= 70 && rating <= 89) return `<span style="color: #FFD700;">★★★</span>`;
  if (rating >= 90 && rating <= 97) return `<span style="color: #FFD700;">★★★★</span>`;
  if (rating >= 98 && rating <= 110) return `<span style="color: #FFD700;">★★★★★</span>`;
  return `<span style="color: #999;">Sin clasificación</span>`;
}

function toggleFavorito(nombre, apellido) {
  const equipoActual = localStorage.getItem("usuarioActual");
  const claveFavoritos = `favoritos_${equipoActual}`;
  let favoritos = JSON.parse(localStorage.getItem(claveFavoritos)) || [];
  const idJugador = `${nombre}_${apellido}`;

  const indice = favoritos.indexOf(idJugador);
  if (indice === -1) {
      favoritos.push(idJugador);
  } else {
      favoritos.splice(indice, 1);
  }
  localStorage.setItem(claveFavoritos, JSON.stringify(favoritos));
  actualizarBotonFavorito(nombre, apellido);
}


function toggleFavoritoGlobal(nombre, apellido) {
  const equipoActual = localStorage.getItem("usuarioActual");
  if (!equipoActual) {
    alert("Usuario no identificado. Inicia sesión para usar favoritos.");
    return;
  }

  const claveFavoritos = `favoritos_${equipoActual}`;
  let favoritos = JSON.parse(localStorage.getItem(claveFavoritos)) || [];
  const idJugador = `${nombre}_${apellido}`;

  const indice = favoritos.indexOf(idJugador);
  if (indice === -1) {
    favoritos.push(idJugador);
  } else {
    favoritos.splice(indice, 1);
  }

  localStorage.setItem(claveFavoritos, JSON.stringify(favoritos));
  sincronizarEstadoGlobal(nombre, apellido);
}

function sincronizarEstadoGlobal(nombre, apellido) {
  const botones = document.querySelectorAll(`button.favorito-btn[data-nombre="${nombre}"][data-apellido="${apellido}"]`);
  botones.forEach(boton => {
    sincronizarBotonFavoritos(boton, nombre, apellido);
  });

  // Actualizar BigBoard u otros elementos que dependan de favoritos
  if (typeof renderBigBoard === "function") {
    renderBigBoard();
  }
}

function sincronizarBotonFavoritos(boton, nombre, apellido) {
  const equipoActual = localStorage.getItem("usuarioActual");
  const claveFavoritos = `favoritos_${equipoActual}`;
  const favoritos = JSON.parse(localStorage.getItem(claveFavoritos)) || [];
  const idJugador = `${nombre}_${apellido}`;

  const esFavorito = favoritos.includes(idJugador);
  boton.textContent = esFavorito ? "Quitar de Favoritos" : "Agregar a Favoritos";
  boton.classList.toggle("activo", esFavorito);
}


function actualizarBotonFavorito(nombre, apellido) {
  const equipoActual = localStorage.getItem("usuarioActual");
  const claveFavoritos = `favoritos_${equipoActual}`;
  const favoritos = JSON.parse(localStorage.getItem(claveFavoritos)) || [];
  const idJugador = `${nombre}_${apellido}`;
  const esFavorito = favoritos.includes(idJugador);

  // Actualizar botones en el perfil
  const botonPerfil = document.querySelector(`#favoritos-btn`);
  if (botonPerfil) {
    botonPerfil.textContent = esFavorito ? "Quitar de Favoritos" : "Agregar a Favoritos";
    botonPerfil.classList.toggle("activo", esFavorito);
  }

  // Actualizar botones en el listado
  const botonesListado = document.querySelectorAll(`button.favorito-btn[data-nombre="${nombre}"][data-apellido="${apellido}"]`);
  botonesListado.forEach(boton => {
    boton.textContent = esFavorito ? "Quitar de Favoritos" : "Agregar a Favoritos";
    boton.classList.toggle("activo", esFavorito);
  });
}

function actualizarBotonProceso(nombre, apellido) {
  const equipoActual = localStorage.getItem("usuarioActual");
  const claveProceso = `proceso_${equipoActual}`;
  const enProceso = JSON.parse(localStorage.getItem(claveProceso)) || [];
  const idJugador = `${nombre}_${apellido}`;
  const esEnProceso = enProceso.includes(idJugador);

  const boton = document.querySelector(`button.proceso-btn[data-nombre="${nombre}"][data-apellido="${apellido}"]`);
  if (boton) {
    boton.textContent = esEnProceso ? "En proceso de admisión" : "No esta en admisión";
    boton.classList.toggle("activo", esEnProceso);
  }
}





document.addEventListener("DOMContentLoaded", () => {
  filtroFavoritos = "todos";
  filtroEnProceso = "todos";
  filtrarJugadores();
});








// Función para alternar "En proceso"
function toggleProceso(nombre, apellido) {
  const equipoActual = localStorage.getItem("usuarioActual");
  const claveProceso = `proceso_${equipoActual}`;
  let enProceso = JSON.parse(localStorage.getItem(claveProceso)) || [];
  const idJugador = `${nombre}_${apellido}`;

  if (enProceso.includes(idJugador)) {
    enProceso = enProceso.filter(jugador => jugador !== idJugador);
  } else {
    enProceso.push(idJugador);
  }

  localStorage.setItem(claveProceso, JSON.stringify(enProceso));
  actualizarBotonProceso(nombre, apellido);
}



function ordenarPorRating(jugadores) {
  return jugadores.sort((a, b) => {
      const ratingA = parseFloat(a["Rating"]) || 0;
      const ratingB = parseFloat(b["Rating"]) || 0;

      // Colocar jugadores sin rating al final
      if (ratingA === 0 && ratingB === 0) return 0;
      if (ratingA === 0) return 1;
      if (ratingB === 0) return -1;

      // Orden descendente para los jugadores con rating
      return ratingB - ratingA;
  });
}

function obtenerCalificacionUsuario(nombre, apellido) {
  const username = localStorage.getItem("usuarioActual");
  const calificacionKey = `${username}_${nombre}_${apellido}_calificacion`;

  const calificacionGuardada = parseInt(localStorage.getItem(calificacionKey)) || 0;

  // Si no hay calificación guardada, retorna "Sin calificar"
  return calificacionGuardada > 0
    ? `Calificación: ${calificacionGuardada} estrellas`
    : "Calificación: Sin calificar";
}




function mostrarRanking(jugadores) {
  const rankingContainer = document.getElementById("ranking-list");
  rankingContainer.innerHTML = ""; // Limpiar contenido previo

  const jugadoresOrdenados = ordenarPorRating(jugadores);
  jugadoresOrdenados.forEach((jugador, index) => {
      const li = document.createElement("li");
      li.className = "ranking-card";
      if (index === 0 && jugador["Rating"] >= 70) li.classList.add("top-1"); // Resaltar al mejor jugador

      const rating = jugador["Rating"] && parseFloat(jugador["Rating"]) >= 70
          ? `${jugador["Rating"]} (${calcularEstrellas(jugador["Rating"])})`
          : "N/A";

      li.innerHTML = `
          <img src="${jugador["Carpeta"] || "imagenes/default.jpg"}" alt="${jugador["Nombre"]}">
          <div>
              <strong>${jugador["Nombre"]} ${jugador["Apellido Paterno"]}</strong><br>
              Rating: ${rating}
          </div>
      `;
      rankingContainer.appendChild(li);
  });
}


// Combinar todos los filtros
function filtrarJugadores() {
  const equipoActual = localStorage.getItem("usuarioActual"); // Identificar el equipo actual
  const claveFavoritos = `favoritos_${equipoActual}`; // Clave específica para favoritos
  const claveEnProceso = `proceso_${equipoActual}`; // Clave específica para "En Proceso"
  
  const favoritos = JSON.parse(localStorage.getItem(claveFavoritos)) || []; // Obtener favoritos
  const enProceso = JSON.parse(localStorage.getItem(claveEnProceso)) || []; // Obtener "En Proceso"

  const jugadoresFiltrados = jugadores.filter(jugador => {
    const posicionOfensivaJugador = jugador["Posición Principal"] || "Ninguna";
    const posicionDefensivaJugador = jugador["Posición Defensiva"] || "Ninguna";
    const claseJugador = jugador["Clase (Año de graduación)"];
    const estadoJugador = jugador["Estado"];
    const alturaJugador = parseFloat(jugador["Altura"]) || 0; 
    const pesoJugador = parseFloat(jugador["Peso en Kgs"]) || 0;
    const ratingJugador = parseFloat(jugador["Rating"]) || 0;

    const cumpleOfensiva = filtroPosicionOfensiva === "" || posicionOfensivaJugador === filtroPosicionOfensiva;
    const cumpleDefensiva = filtroPosicionDefensiva === "" || posicionDefensivaJugador === filtroPosicionDefensiva;
    const cumpleClase =
      filtroClase === "" || // Mostrar todos si no hay filtro
      claseJugador === filtroClase || // Coincidencia exacta
      (filtroClase === "all" && ["2025", "2026", "2027"].includes(claseJugador)); // Opción 'all'
    const cumpleEstado = filtroEstado === "" || filtroEstado === "Todos" || estadoJugador === filtroEstado;
    const cumpleAltura =
      (filtroAlturaMin === null || alturaJugador >= filtroAlturaMin) &&
      (filtroAlturaMax === null || alturaJugador <= filtroAlturaMax);
    const cumplePeso =
      (filtroPesoMin === null || pesoJugador >= filtroPesoMin) &&
      (filtroPesoMax === null || pesoJugador <= filtroPesoMax);
    const cumpleRating =
      filtroRating === "" ||
      (filtroRating === "3" && ratingJugador >= 70 && ratingJugador <= 89) ||
      (filtroRating === "4" && ratingJugador >= 90 && ratingJugador <= 97) ||
      (filtroRating === "5" && ratingJugador >= 98 && ratingJugador <= 110);
    
    // Nuevo filtro para favoritos
    const cumpleFavoritos =
      filtroFavoritos === "todos" || // Mostrar todos
      (filtroFavoritos === "favoritos" && favoritos.includes(`${jugador["Nombre"]}_${jugador["Apellido Paterno"]}`));

    const cumpleEnProceso =
      filtroEnProceso === "todos" ||
      (filtroEnProceso === "enProceso" && enProceso.includes(`${jugador["Nombre"]}_${jugador["Apellido Paterno"]}`));

    const cumpleNombre =
      filtroNombre === "" ||
      `${jugador["Nombre"]} ${jugador["Apellido Paterno"]}`.toLowerCase().includes(filtroNombre);

    return cumpleOfensiva && cumpleDefensiva && cumpleClase && cumpleEstado && cumpleAltura && cumplePeso && cumpleRating && cumpleFavoritos && cumpleEnProceso && cumpleNombre;
  });

  const jugadoresOrdenados = aplicarOrden(jugadoresFiltrados);
  listaFiltradaActual = jugadoresOrdenados;
  mostrarResultados(jugadoresOrdenados);
}



// Ordenar lista según criterio seleccionado
function aplicarOrden(lista) {
  const orden = document.getElementById("ordenarFiltro")?.value || "";
  if (!orden) return lista;
  const copia = [...lista];
  const nombreCompleto = j => `${j["Nombre"]} ${j["Apellido Paterno"]}`;
  switch (orden) {
    case "nombre-az":
      return copia.sort((a, b) => nombreCompleto(a).localeCompare(nombreCompleto(b)));
    case "nombre-za":
      return copia.sort((a, b) => nombreCompleto(b).localeCompare(nombreCompleto(a)));
    case "altura-desc":
      return copia.sort((a, b) => (parseFloat(b["Altura"]) || 0) - (parseFloat(a["Altura"]) || 0));
    case "altura-asc":
      return copia.sort((a, b) => (parseFloat(a["Altura"]) || 0) - (parseFloat(b["Altura"]) || 0));
    case "rating-desc":
      return copia.sort((a, b) => (parseFloat(b["Rating"]) || 0) - (parseFloat(a["Rating"]) || 0));
    case "clase-asc":
      return copia.sort((a, b) => (a["Clase (Año de graduación)"] || "").localeCompare(b["Clase (Año de graduación)"] || ""));
    default:
      return lista;
  }
}

function ordenarResultados() {
  paginaActual = 1;
  filtrarJugadores();
}

// Resetear todos los filtros a estado inicial
function resetearFiltros() {
  filtroPosicionOfensiva = "";
  filtroPosicionDefensiva = "";
  filtroClase = "";
  filtroEstado = "";
  filtroAlturaMin = null;
  filtroAlturaMax = null;
  filtroPesoMin = null;
  filtroPesoMax = null;
  filtroRating = "";
  filtroFavoritos = "todos";
  filtroEnProceso = "todos";
  filtroNombre = "";
  filtroOrden = "";
  paginaActual = 1;

  document.getElementById("posicionOfensivaFiltro").value = "";
  document.getElementById("claseFiltro").value = "";
  document.getElementById("favoritosFiltro").value = "todos";
  document.getElementById("estadoFiltro").value = "Todos";
  document.getElementById("alturaMinFiltro").value = "";
  document.getElementById("alturaMaxFiltro").value = "";
  document.getElementById("buscador-nombre").value = "";
  const ordenEl = document.getElementById("ordenarFiltro");
  if (ordenEl) ordenEl.value = "";

  filtrarJugadores();
}

// Actualizar barra de estadísticas
function actualizarStatsBar(lista) {
  const equipoActual = localStorage.getItem("usuarioActual");
  const favoritosGuardados = JSON.parse(localStorage.getItem(`favoritos_${equipoActual}`)) || [];
  const enProcesoGuardados = JSON.parse(localStorage.getItem(`proceso_${equipoActual}`)) || [];

  const totalFav = lista.filter(j =>
    favoritosGuardados.includes(`${j["Nombre"]}_${j["Apellido Paterno"]}`)
  ).length;
  const totalEnProceso = lista.filter(j =>
    enProcesoGuardados.includes(`${j["Nombre"]}_${j["Apellido Paterno"]}`)
  ).length;

  const statTotal = document.getElementById("stat-total");
  const statFav = document.getElementById("stat-favoritos");
  const statProceso = document.getElementById("stat-proceso");
  if (statTotal) statTotal.textContent = `${lista.length} prospectos`;
  if (statFav) statFav.textContent = `★ ${totalFav} favoritos`;
  if (statProceso) statProceso.textContent = `⚡ ${totalEnProceso} en proceso`;
}

// Exportar lista filtrada actual como CSV
function exportarCSV() {
  if (!listaFiltradaActual || listaFiltradaActual.length === 0) {
    alert("No hay jugadores en la lista para exportar.");
    return;
  }

  const equipoActual = localStorage.getItem("usuarioActual") || "equipo";
  const calificaciones = JSON.parse(localStorage.getItem(`calificaciones_${equipoActual}`)) || {};
  const favoritosGuardados = JSON.parse(localStorage.getItem(`favoritos_${equipoActual}`)) || [];

  const columnas = [
    "Nombre", "Apellido Paterno", "Posición Principal", "Posición Defensiva",
    "Clase (Año de graduación)", "Estado", "Altura", "Peso en Kgs",
    "40 YD", "Vertical", "Broad", "Shuttle", "3 cone", "Rating",
    "Teléfono personal", "Correo Electrónico"
  ];

  const filas = listaFiltradaActual.map(j => {
    const notaKey = `${equipoActual}_${j["Nombre"]}_${j["Apellido Paterno"]}`;
    const calificacion = calificaciones[notaKey] || 0;
    const esFavorito = favoritosGuardados.includes(`${j["Nombre"]}_${j["Apellido Paterno"]}`);
    const valores = columnas.map(col => `"${(j[col] || "").toString().replace(/"/g, '""')}"`);
    valores.push(`"${calificacion}"`);
    valores.push(`"${esFavorito ? "Sí" : "No"}"`);
    return valores.join(",");
  });

  const encabezados = [...columnas, "Calificación (estrellas)", "Favorito"].map(c => `"${c}"`).join(",");
  const csv = "\uFEFF" + [encabezados, ...filas].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `prospectos_${equipoActual}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// Obtener el usuario actual del almacenamiento local
const usuarioActual = localStorage.getItem("usuarioActual");

// Mostrar el mensaje de bienvenida si el usuario está autenticado
if (usuarioActual) {
  document.getElementById("bienvenida").textContent = `Bienvenido, ${usuarioActual}!`;
} else {
  // Redirigir al login si no hay un usuario registrado
  window.location.href = "login.html";
}


// Mostrar resultados en la interfaz
function mostrarResultados(lista) {
  actualizarStatsBar(lista);

  const resultados = document.getElementById("resultados");
  resultados.innerHTML = "";

  // Paginación
  const inicio = (paginaActual - 1) * jugadoresPorPagina;
  const fin = inicio + jugadoresPorPagina;
  const listaPaginada = lista.slice(inicio, fin);

  if (listaPaginada.length === 0) {
    resultados.innerHTML = "<li>No se encontraron jugadores.</li>";
    return;
  }

  // Obtener favoritos actuales
  const equipoActual = localStorage.getItem("usuarioActual");
  const claveFavoritos = `favoritos_${equipoActual}`;
  const favoritos = JSON.parse(localStorage.getItem(claveFavoritos)) || [];
  

  listaPaginada.forEach(jugador => {
    const li = document.createElement("li");
    li.className = "jugador-card";

    // Imagen del jugador
    const img = document.createElement("img");
    img.src = jugador["Carpeta"] && jugador["Carpeta"].trim() !== "" 
              ? jugador["Carpeta"] 
              : "imagenes/default.jpg"; // Ruta predeterminada
    img.alt = `${jugador["Nombre"]} ${jugador["Apellido Paterno"]} ${jugador["Apellido Materno"]}`;    
    img.className = "jugador-imagen";
    li.appendChild(img);

    // Información del jugador
    const info = document.createElement("div");
    info.className = "jugador-info";

    // Crear el enlace del nombre
    const nombreLink = document.createElement("a");
    nombreLink.href = `perfil.html?nombre=${encodeURIComponent(jugador["Nombre"])}&apellido=${encodeURIComponent(jugador["Apellido Paterno"])}`;
    nombreLink.textContent = `${jugador["Nombre"]} ${jugador["Apellido Paterno"]}`;
    nombreLink.style.color = "#000"; // Mantiene estilo
    nombreLink.style.textDecoration = "none"; // Sin subrayado

    // Añadir información del jugador
    info.innerHTML = `
      <strong></strong><br>
      Fecha de Nacimiento: ${jugador["Fecha de Nacimiento"] || "N/A"}<br>
      Ciudad: ${jugador["Ciudad"] || "N/A"}, Estado: ${jugador["Estado"] || "N/A"}<br>
      Altura: ${jugador["Altura"] || "Ninguna"}<br>
      Posición Principal: ${jugador["Posición Principal"] || "Ninguna"}<br>
      Clase: ${jugador["Clase (Año de graduación)"] || "N/A"}<br>
    `;
    // Insertar el enlace del nombre al principio
    info.querySelector("strong").appendChild(nombreLink);
    li.appendChild(info);

    // Botón de favoritos
    const botonFavorito = document.createElement("button");
    botonFavorito.className = "favorito-btn";
    botonFavorito.setAttribute("data-nombre", jugador["Nombre"]);
    botonFavorito.setAttribute("data-apellido", jugador["Apellido Paterno"]);
    botonFavorito.onclick = () => toggleFavoritoGlobal(jugador["Nombre"], jugador["Apellido Paterno"]);
    li.appendChild(botonFavorito);

    resultados.appendChild(li);

    // Actualizar los estados de los botones después de agregarlos al DOM
    actualizarBotonFavorito(jugador["Nombre"], jugador["Apellido Paterno"]);
    actualizarBotonProceso(jugador["Nombre"], jugador["Apellido Paterno"]);
  });

  // Actualizar la paginación
  actualizarPaginacion(lista.length);
}


// Cambiar página
function cambiarPagina(nuevaPagina, totalJugadores) {
  const totalPaginas = Math.ceil(totalJugadores / jugadoresPorPagina);
  if (nuevaPagina < 1 || nuevaPagina > totalPaginas) return;
  paginaActual = nuevaPagina;
  filtrarJugadores();
}

function actualizarPaginacion(totalJugadores) {
  const paginacion = document.getElementById("paginacion");
  paginacion.innerHTML = ""; // Limpia los controles existentes

  const totalPaginas = Math.ceil(totalJugadores / jugadoresPorPagina);

  // Botón anterior
  const btnAnterior = document.createElement("button");
  btnAnterior.textContent = "Anterior";
  btnAnterior.disabled = paginaActual === 1;
  btnAnterior.onclick = () => cambiarPagina(paginaActual - 1, totalJugadores);
  paginacion.appendChild(btnAnterior);

  // Botones de página
  for (let i = 1; i <= totalPaginas; i++) {
    const btnPagina = document.createElement("button");
    btnPagina.textContent = i;
    btnPagina.className = i === paginaActual ? "active" : "";
    btnPagina.onclick = () => cambiarPagina(i, totalJugadores);
    paginacion.appendChild(btnPagina);
  }

  // Botón siguiente
  const btnSiguiente = document.createElement("button");
  btnSiguiente.textContent = "Siguiente";
  btnSiguiente.disabled = paginaActual === totalPaginas;
  btnSiguiente.onclick = () => cambiarPagina(paginaActual + 1, totalJugadores);
  paginacion.appendChild(btnSiguiente);
}



// Cargar el archivo TSV al iniciar la aplicación
cargarArchivoTSV();