// Credenciales simuladas
// Lista de usuarios y contraseñas
const USUARIOS = [
    { username: "admin", password: "12345" },
    { username: "MTY", password: "tec" },
    
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
  


  
  
  