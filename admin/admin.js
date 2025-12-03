/* =========================================
   GLAM ADMIN - LOGIN CONTROLLER
   ========================================= */

// --- SECURITY CONFIGURATION ---
const CREDENTIALS = {
  user: "admin",
  // Base64 for "1234" (Prevents casual snooping)
  passHash: "MTIzNA==" 
};

function handleLogin(e) {
  e.preventDefault();
  
  const user = document.getElementById("username").value.trim();
  const pass = document.getElementById("password").value.trim();
  const errorMsg = document.getElementById("errorMsg");
  const btn = document.querySelector(".login-btn");

  // Reset UI
  errorMsg.style.display = "none";
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Verifying...';
  btn.style.opacity = "0.8";

  // Simulate Network Delay
  setTimeout(() => {
    // Validate Credentials
    if (user === CREDENTIALS.user && btoa(pass) === CREDENTIALS.passHash) {
      
      // SUCCESS: Create Secure Session
      const sessionData = {
        loggedIn: true,
        user: user,
        expiry: new Date().getTime() + (24 * 60 * 60 * 1000) // 24 Hours
      };
      
      localStorage.setItem("glam_session", JSON.stringify(sessionData));
      
      // Redirect to Dashboard
      window.location.href = "dashboard.html";
      
    } else {
      // FAIL: Show Error & Shake
      errorMsg.style.display = "block";
      btn.innerHTML = originalText;
      btn.style.opacity = "1";
      
      const card = document.querySelector(".login-card");
      card.style.animation = "none";
      card.offsetHeight; /* trigger reflow */
      card.style.animation = "shake 0.5s";
    }
  }, 800);
}

// Add Shake Animation Style Dynamically
const style = document.createElement('style');
style.innerHTML = `
  @keyframes shake {
    0% { transform: translateX(0); }
    25% { transform: translateX(-10px); }
    50% { transform: translateX(10px); }
    75% { transform: translateX(-10px); }
    100% { transform: translateX(0); }
  }
`;
document.head.appendChild(style);