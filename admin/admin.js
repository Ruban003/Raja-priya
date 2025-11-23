function adminLogin() {
  const user = document.getElementById("adminUser").value.trim();
  const pass = document.getElementById("adminPass").value.trim();

  const correctUser = "admin";
  const correctPass = "1234"; // you can change

  if (user === correctUser && pass === correctPass) {   
    localStorage.setItem("adminLoggedIn", "true");
    window.location.href = "/admin/dashboard.html";
  } else {
    document.getElementById("adminError").innerText = "Invalid username or password";
  }
}
