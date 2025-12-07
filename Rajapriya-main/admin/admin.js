/* =========================================
   GLAM ADMIN - SECURE LOGIN CONTROLLER
   ========================================= */

// Ensure API URL is loaded
const API_BASE = (typeof API_URL !== 'undefined') 
  ? API_URL 
  : "https://glam-backend-nw7q.onrender.com/api"; // Fallback

document.getElementById('loginForm').addEventListener('submit', handleLogin);

async function handleLogin(e) {
  e.preventDefault();
  
  const userInput = document.getElementById("username");
  const passInput = document.getElementById("password");
  const errorMsg = document.getElementById("errorMsg");
  const btn = document.querySelector(".login-btn");
  const btnText = document.querySelector(".btn-text");
  const loader = document.querySelector(".loader");
  const card = document.querySelector(".login-card");

  // 1. Reset UI
  errorMsg.style.display = "none";
  card.classList.remove("shake-animation");
  
  // 2. Loading State
  btn.disabled = true;
  btnText.textContent = "Verifying...";
  loader.style.display = "block";

  try {
    // 3. Send to Server (SECURE CHECK)
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
      // 4. SUCCESS: Save Session & Redirect
      const sessionData = {
        loggedIn: true,
        user: userInput.value,
        token: data.token,
        expiry: new Date().getTime() + (24 * 60 * 60 * 1000) // 24 Hours
      };
      
      localStorage.setItem("glam_session", JSON.stringify(sessionData));
      
      btnText.textContent = "Success!";
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 500);

    } else {
      throw new Error(data.message || "Invalid Credentials");
    }

  } catch (error) {
    // 5. FAIL: Show Error & Animation
    errorMsg.style.display = "flex";
    errorMsg.querySelector("span").innerText = "Incorrect Username or Password";
    
    // Trigger Shake Animation
    void card.offsetWidth; // Trigger reflow
    card.classList.add("shake-animation");
    
    // Reset Button
    btn.disabled = false;
    btnText.textContent = "Sign In";
    loader.style.display = "none";
  }
}

// Feature: Show/Hide Password
function togglePassword() {
  const passInput = document.getElementById("password");
  const icon = document.querySelector(".toggle-pass");
  
  if (passInput.type === "password") {
    passInput.type = "text";
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-eye-slash");
  } else {
    passInput.type = "password";
    icon.classList.remove("fa-eye-slash");
    icon.classList.add("fa-eye");
  }
}