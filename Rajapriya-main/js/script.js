document.addEventListener("DOMContentLoaded", function () {
  
  // FAIL-SAFE: Hide Preloader
  setTimeout(() => { 
    const p = document.getElementById("preloader"); 
    if(p) { p.style.opacity = '0'; setTimeout(()=>p.style.display='none',500); }
  }, 500);

  // FILL SERVICES
  const select = document.getElementById("service");
  if(select && typeof DB !== 'undefined') {
    select.innerHTML = '<option value="" disabled selected>Select Experience</option>';
    DB.getServices().forEach(s => {
      select.innerHTML += `<option value="${s.name}">${s.name} - ₹${s.price}</option>`;
    });
  }

  // BOOKING LOGIC
  const form = document.getElementById("appointmentForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button');
      const originalText = btn.innerText;
      btn.innerText = "Booking..."; btn.disabled = true;

      try {
        const timeVal = document.getElementById("time").value;
        let [h, m] = timeVal.split(':');
        let ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        
        // Wait for DB to create booking
        await DB.createBooking({
          name: document.getElementById("name").value,
          phone: document.getElementById("phone").value,
          serviceId: document.getElementById("service").value,
          date: document.getElementById("date").value,
          time: `${h}:${m} ${ampm}`,
          type: "Online Booking",
          status: "Pending"
        });

        // Show Success
        const popup = document.getElementById("popup");
        if(popup) { popup.style.display = "block"; setTimeout(() => popup.style.display = "none", 3000); }
        form.reset();
      } catch (err) {
        alert("Booking Failed. Is the backend running?");
        console.error(err);
      } finally {
        btn.innerText = originalText; btn.disabled = false;
      }
    });
  }

  // UI ELEMENTS
  const burger = document.getElementById("burgerBtn");
  const nav = document.getElementById("navMenu");
  if (burger) {
      burger.addEventListener("click", () => { burger.classList.toggle("active"); nav.classList.toggle("open"); });
      document.querySelectorAll('#navMenu a').forEach(l => l.addEventListener('click', () => { burger.classList.remove("active"); nav.classList.remove("open"); }));
  }
  
  // Back to Top
  const backToTop = document.getElementById("backToTop");
  if(backToTop) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 300) backToTop.classList.add("visible");
      else backToTop.classList.remove("visible");
    });
    backToTop.onclick = function() { window.scrollTo({ top: 0, behavior: 'smooth' }); };
  }
  
  // Date Picker Min Date
  const dateInput = document.getElementById("date");
  if (dateInput) dateInput.setAttribute("min", new Date().toISOString().split("T")[0]);
});