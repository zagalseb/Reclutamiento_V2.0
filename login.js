// Credenciales simuladas
// Lista de usuarios y contraseñas
const USUARIOS = [
    { username: "admin", password: "12345" },
    { username: "CEM", password: "SVG25" },
    { username: "UANL", password: "TIGRES" },
    { username: "UNAM", password: "PUMAS" },
    { username: "GDL", password: "TEC" },
    { username: "MTY", password: "tec" },
    { username: "HDL", password: "Tec" },
    { username: "PUEBLA", password: "TEC" },
    { username: "CSF", password: "SF" },
    { username: "ANAHUAC", password: "QRO" },
    { username: "UDLAP", password: "AZTECAS" },
    { username: "UP", password: "CDMX" },
    { username: "UPAEP", password: "Puebla" },
    { username: "CETYS", password: "Mexicali" }
  ];
  
function iniciarSesion() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
  
    // Buscar al usuario en la lista de usuarios
    const usuarioValido = USUARIOS.find(
      usuario => usuario.username === username && usuario.password === password
    );
  
    if (usuarioValido) {
      // Si las credenciales son correctas
      localStorage.setItem("sesionIniciada", "true"); // Marcar sesión como iniciada
      localStorage.setItem("usuarioActual", username); // Guardar el usuario actual
      window.location.href = "index.html"; // Redirigir al sitio principal
    } else {
      // Mostrar mensaje de error si las credenciales no son válidas
      const error = document.getElementById("error");
      error.style.display = "block";
    }
}
  


  
  
  