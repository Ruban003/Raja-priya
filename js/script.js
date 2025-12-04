document.addEventListener("DOMContentLoaded", function () {
  
  // 1. FILL SERVICES (Static from DB)
  const select = document.getElementById("service");
  if(select && typeof DB !== 'undefined') {
    const services = DB.getServices();
    select.innerHTML = '<option value="" disabled selected>Select Experience</option>';
    services.forEach(s => {
      select.innerHTML += `<option value="${s.name}">${s.name} - ₹${s.price}</option>`;
    });
  }

  // ... (Preloader, Burger Menu, Scroll, BackToTop logic remains exactly the same) ...
  // (Copy valid code from your previous file for sections 2, 3, 4, 5, 6)
  
  // 6. SMART DATE PICKER
  const dateInput = document.getElementById("date");
  if (dateInput) dateInput.setAttribute("min", new Date().toISOString().split("T")[0]);

  // 7. FORM SUBMISSION WITH DB (UPDATED)
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
        let [h, m] = time.split(':');
        let ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${m} ${ampm}`;
      }

      try {
        if (typeof DB !== 'undefined') {
          // AWAIT the database call
          await DB.createBooking({
            name: name,
            phone: phone,
            serviceId: service,
            date: date,
            time: convertToAMPM(time),
            type: "Online Booking",
            status: "Pending"
          });
          
          // Show Success
          const popup = document.getElementById("popup");
          if(popup) {
            popup.style.display = "block";
            setTimeout(() => { popup.style.display = "none"; }, 3000);
          }
          form.reset();
        } 
      } catch (error) {
        alert("Booking failed. Please try again.");
        console.error(error);
      } finally {
        btn.innerText = originalText;
        btn.disabled = false;
      }
    });
  } 
});