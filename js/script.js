// 1. FAIL-SAFE: Force Preloader to hide when page loads
window.addEventListener("load", () => {
  const preloader = document.getElementById("preloader");
  if(preloader) {
    preloader.style.opacity = "0";
    setTimeout(() => { preloader.style.display = "none"; }, 500);
  }
});

document.addEventListener("DOMContentLoaded", function () {
  console.log("Glam Website Loaded");

  // 2. FILL SERVICES (Wrapped in try-catch to prevent crashing)
  try {
    const select = document.getElementById("service");
    if(select && typeof DB !== 'undefined') {
      const services = DB.getServices();
      select.innerHTML = '<option value="" disabled selected>Select Experience</option>';
      services.forEach(s => {
        select.innerHTML += `<option value="${s.name}">${s.name} - ₹${s.price}</option>`;
      });
    }
  } catch (err) {
    console.error("Service Load Error:", err);
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
      const section = document.getElementById("appointment");
      if(section) section.scrollIntoView({ behavior: "smooth" });
    });
  }

  // 5. BACK TO TOP BUTTON
  const backToTop = document.getElementById("backToTop");
  if(backToTop) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 300) {
        backToTop.classList.add("visible");
      } else {
        backToTop.classList.remove("visible");
      }
    });
    // Attach click handler safely
    backToTop.onclick = function() {
       window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  }

  // 6. SMART DATE PICKER
  const dateInput = document.getElementById("date");
  if (dateInput) {
    dateInput.setAttribute("min", new Date().toISOString().split("T")[0]);
  }

  // 7. FORM SUBMISSION (Async)
  const form = document.getElementById("appointmentForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const btn = form.querySelector('button');
      const originalText = btn.innerText;
      btn.innerText = "Booking...";
      btn.disabled = true;

      const name = document.getElementById("name").value.trim();
      const phone = document.getElementById("phone").value.trim();
      const date = document.getElementById("date").value;
      const time = document.getElementById("time").value;
      const service = document.getElementById("service").value;

      if (phone.length !== 10 || isNaN(phone)) {
        alert("Please enter a valid 10-digit phone number.");
        btn.innerText = originalText;
        btn.disabled = false;
        return;
      }

      function convertToAMPM(time) {
        if(!time) return "Flexible";
        let [h, m] = time.split(':');
        let ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${m} ${ampm}`;
      }

      try {
        if (typeof DB !== 'undefined') {
          await DB.createBooking({
            name: name,
            phone: phone,
            serviceId: service,
            date: date,
            time: convertToAMPM(time),
            type: "Online Booking",
            status: "Pending"
          });
          
          const popup = document.getElementById("popup");
          if(popup) {
            popup.style.display = "block";
            setTimeout(() => { popup.style.display = "none"; }, 3000);
          }
          form.reset();
        } else {
          alert("Database not connected. Check Console.");
        }
      } catch (error) {
        console.error(error);
        alert("Connection Error. Is the backend running?");
      } finally {
        btn.innerText = originalText;
        btn.disabled = false;
      }
    });
  } 
});
