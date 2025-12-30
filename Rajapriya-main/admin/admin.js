/* =========================================
   GLAM ADMIN - SECURE LOGIN CONTROLLER
   ========================================= */

// POINT TO LOCALHOST
const API_BASE = "http://localhost:5001/api";

document.getElementById('loginForm').addEventListener('submit', handleLogin);

async function handleLogin(e) {
  e.preventDefault();
  
  const userInput = document.getElementById("username");
  const passInput = document.getElementById("password");
  const errorMsg = document.getElementById("errorMsg");
  const btn = document.querySelector(".login-btn");
  const btnText = document.querySelector(".btn-text");

  // Reset UI
  errorMsg.style.display = "none";
  btn.disabled = true;
  btnText.textContent = "Verifying...";

  try {
    // 1. Send Login Request
    const response = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        username: userInput.value.trim(), 
        password: passInput.value.trim() 
      })
    });

    const data = await response.json();

    if (data.success) {
      // 2. SAVE SESSION & ROLE
      const sessionData = {
        loggedIn: true,
        user: data.username,
        role: data.role, // <--- Stores 'admin' or 'manager'
        token: data.token,
        expiry: new Date().getTime() + (24 * 60 * 60 * 1000)
      };
      
      localStorage.setItem("glam_session", JSON.stringify(sessionData));
      
      btnText.textContent = "Success!";
      
      // 3. Redirect
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 500);

    } else {
      throw new Error(data.message || "Invalid Credentials");
    }

  } catch (error) {
    // Show Error
    errorMsg.style.display = "flex";
    errorMsg.querySelector("span").innerText = "Incorrect Username or Password";
    btn.disabled = false;
    btnText.textContent = "Sign In";
  }
}