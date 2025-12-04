document.addEventListener("DOMContentLoaded", function () {
  
  // FAIL-SAFE: Hide Preloader
  setTimeout(() => { 
    const p = document.getElementById("preloader"); 
    if(p) p.style.display = 'none'; 
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
      btn.innerText = "Booking..."; btn.disabled = true;

      try {
        const timeVal = document.getElementById("time").value;
        let [h, m] = timeVal.split(':');
        let ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        
        await DB.createBooking({
          name: document.getElementById("name").value,
          phone: document.getElementById("phone").value,
          serviceId: document.getElementById("service").value,
          date: document.getElementById("date").value,
          time: `${h}:${m} ${ampm}`,
          status: "Pending"
        });

        const popup = document.getElementById("popup");
        if(popup) { popup.style.display = "block"; setTimeout(() => popup.style.display = "none", 3000); }
        form.reset();
      } catch (err) {
        alert("Booking Failed. Check internet connection.");
        console.error(err);
      } finally {
        btn.innerText = "Confirm Reservation"; btn.disabled = false;
      }
    });
  }

  // BURGER MENU & SCROLL (Keep your existing code for these if you want, or paste below)
  const burger = document.getElementById("burgerBtn");
  const nav = document.getElementById("navMenu");
  if (burger) burger.addEventListener("click", () => { burger.classList.toggle("active"); nav.classList.toggle("open"); });
});
