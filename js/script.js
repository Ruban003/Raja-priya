document.addEventListener("DOMContentLoaded", function () {
  
  // 1. FILL SERVICES DROPDOWN FROM DB
  const select = document.getElementById("service");
  if(select && typeof DB !== 'undefined') {
    const services = DB.getServices();
    // Clear existing options except the first placeholder
    select.innerHTML = '<option value="" disabled selected>Select Experience</option>';
    services.forEach(s => {
      select.innerHTML += `<option value="${s.name}">${s.name} - ₹${s.price}</option>`;
    });
  }

  // 2. PRELOADER FADE OUT
  const preloader = document.getElementById("preloader");
  if(preloader) {
    window.addEventListener("load", () => {
      preloader.style.opacity = "0";
      setTimeout(() => { preloader.style.display = "none"; }, 500);
    });
  }

  // 3. MOBILE BURGER MENU
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

  // 4. SCROLL TO BOOKING
  const bookBtn = document.getElementById("bookBtn");
  if (bookBtn) {
    bookBtn.addEventListener("click", () => {
      document.getElementById("appointment").scrollIntoView({ behavior: "smooth" });
    });
  }

  // 5. BACK TO TOP BUTTON
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

  // 6. SMART DATE PICKER (No Past Dates)
  const dateInput = document.getElementById("date");
  if (dateInput) {
    dateInput.setAttribute("min", new Date().toISOString().split("T")[0]);
  }

  // 7. FORM SUBMISSION WITH DB
  const form = document.getElementById("appointmentForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      
      const name = document.getElementById("name").value.trim();
      const phone = document.getElementById("phone").value.trim();
      const date = document.getElementById("date").value;
      const time = document.getElementById("time").value; // Capture time
      const service = document.getElementById("service").value;

      if (phone.length !== 10 || isNaN(phone)) {
        alert("Please enter a valid 10-digit phone number.");
        return;
      }

      // Convert time to 12hr format for display
      const displayTime = convertToAMPM(time);

      // Save to Database using DB Engine
      if (typeof DB !== 'undefined') {
        DB.createBooking({
          name: name,
          phone: phone,
          serviceId: service,
          date: date,
          time: displayTime,
          type: "Online Booking",
          status: "Pending"
        });
      } else {
         // Fallback if DB not loaded (should not happen if index.html is correct)
         console.error("Database Engine not loaded!");
         const appointment = { name, phone, service, date, time: displayTime };
         let apps = JSON.parse(localStorage.getItem("appointments")) || [];
         apps.push(appointment);
         localStorage.setItem("appointments", JSON.stringify(apps));
      }

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

// Helper Function for Time Format
function convertToAMPM(time) {
  if (!time) return "Flexible";
  let [h, m] = time.split(':');
  let ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}