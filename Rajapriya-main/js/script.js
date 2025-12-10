const API_URL = "https://glam-backend-nw7q.onrender.com/api"; 

document.addEventListener("DOMContentLoaded", async function () {
  
  // 1. FETCH SERVICES FROM DB (Dynamic)
  try {
    const res = await fetch(`${API_URL}/services`);
    const services = await res.json();
    window.allServices = services;
    // Fill the first dropdown if it exists
    const firstSelect = document.querySelector(".service-select");
    if(firstSelect) populateDropdown(firstSelect);
  } catch (err) { console.error("Error loading services"); }

  // 2. "ADD SERVICE" BUTTON (+)
  const addBtn = document.getElementById("addServiceBtn");
  if(addBtn) {
    addBtn.addEventListener("click", function() {
      const container = document.getElementById("services-container");
      const div = document.createElement("div");
      div.classList.add("input-group");
      div.style.marginTop = "10px";
      
      // Create dropdown
      const sel = document.createElement("select");
      sel.classList.add("service-select");
      sel.required = true;
      populateDropdown(sel);
      
      // Create remove button (x)
      const removeBtn = document.createElement("span");
      removeBtn.innerHTML = " &times;";
      removeBtn.style.cursor = "pointer";
      removeBtn.style.color = "red";
      removeBtn.onclick = function() { container.removeChild(div); };

      div.appendChild(sel);
      div.appendChild(removeBtn);
      container.appendChild(div);
    });
  }

  // 3. BOOKING FORM LOGIC
  const form = document.getElementById("appointmentForm");
  if(form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = form.querySelector("button[type='submit']");
      btn.innerText = "Booking..."; btn.disabled = true;

      try {
        // Collect all selected services
        const selects = document.querySelectorAll(".service-select");
        let names = [];
        let price = 0;

        selects.forEach(s => {
          if(s.value) {
            const data = JSON.parse(s.value);
            names.push(data.name);
            price += data.price;
          }
        });

        const payload = {
          clientName: document.getElementById("name").value,
          clientPhone: document.getElementById("phone").value,
          serviceName: names.join(" + "), // "Haircut + Facial"
          price: price,
          date: document.getElementById("date").value,
          time: document.getElementById("time").value,
          status: "Pending"
        };

        await fetch(`${API_URL}/bookings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        alert("Booking Confirmed!");
        window.location.reload();

      } catch (err) { alert("Booking Failed"); }
      finally { btn.innerText = "Confirm Reservation"; btn.disabled = false; }
    });
  }
});

function populateDropdown(select) {
  if(!window.allServices) return;
  select.innerHTML = '<option value="" disabled selected>Select Service</option>';
  window.allServices.forEach(s => {
    // Store price in the value so we can calculate it easily
    const val = JSON.stringify({ name: s.name, price: s.price });
    select.innerHTML += `<option value='${val}'>${s.name} - ₹${s.price}</option>`;
  });
}
