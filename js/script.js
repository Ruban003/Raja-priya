document.addEventListener("DOMContentLoaded", function () {
  
  // 1. PRELOADER FADE OUT
  const preloader = document.getElementById("preloader");
  if(preloader) {
    window.addEventListener("load", () => {
      preloader.style.opacity = "0";
      setTimeout(() => { preloader.style.display = "none"; }, 500);
    });
  }

  // 2. MOBILE BURGER MENU
  const burger = document.getElementById("burgerBtn");
  const nav = document.getElementById("navMenu");

  if (burger && nav) {
    burger.addEventListener("click", () => {
      burger.classList.toggle("active");
      nav.classList.toggle("open");
    });
    
    // Close menu when clicking links
    document.querySelectorAll('#navMenu a').forEach(link => {
      link.addEventListener('click', () => {
        burger.classList.remove("active");
        nav.classList.remove("open");
      });
    });
  }

  // 3. SCROLL TO BOOKING
  const bookBtn = document.getElementById("bookBtn");
  if (bookBtn) {
    bookBtn.addEventListener("click", () => {
      document.getElementById("appointment").scrollIntoView({ behavior: "smooth" });
    });
  }

  // 4. BACK TO TOP BUTTON
  const backToTop = document.getElementById("backToTop");
  window.addEventListener("scroll", () => {
    if (window.scrollY > 300) {
      backToTop.classList.add("visible");
    } else {
      backToTop.classList.remove("visible");
    }
  });
  window.scrollToTop = function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 5. SMART DATE PICKER (No Past Dates)
  const dateInput = document.getElementById("date");
  if (dateInput) {
    dateInput.setAttribute("min", new Date().toISOString().split("T")[0]);
  }

  // 6. FORM VALIDATION & MOCK SUBMIT
  const form = document.getElementById("appointmentForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      
      const name = document.getElementById("name").value.trim();
      const phone = document.getElementById("phone").value.trim();
      const date = document.getElementById("date").value;
      const service = document.getElementById("service").value;

      if (phone.length !== 10 || isNaN(phone)) {
        alert("Please enter a valid 10-digit phone number.");
        return;
      }

      // Save to LocalStorage
      const appointment = { name, phone, service, date, time: new Date().toLocaleTimeString() };
      let apps = JSON.parse(localStorage.getItem("appointments")) || [];
      apps.push(appointment);
      localStorage.setItem("appointments", JSON.stringify(apps));

      // Show Success UI
      const popup = document.getElementById("popup");
      if(popup) {
        popup.style.display = "block";
        setTimeout(() => { popup.style.display = "none"; }, 3000);
      }
      form.reset();
    });
  }
});
