/* =========================================
   GLAMPRO CLIENT BOOKING SCRIPT
   ========================================= */

const API_URL = "https://glam-backend-nw7q.onrender.com/api"; 

document.addEventListener("DOMContentLoaded", async function () {
  
  // 1. FETCH SERVICES DYNAMICALLY FROM DB
  try {
    const res = await fetch(`${API_URL}/services`);
    if (res.ok) {
      const services = await res.json();
      window.allServices = services;
      
      // Populate the initial dropdown
      const firstSelect = document.querySelector(".service-select");
      if (firstSelect) populateDropdown(firstSelect);
    } else {
      console.error("Failed to fetch services");
    }
  } catch (err) {
    console.error("Error loading services:", err);
  }

  // 2. "ADD SERVICE" BUTTON (+)
  // Allows clients to book multiple services at once
  const addBtn = document.getElementById("addServiceBtn");
  if (addBtn) {
    addBtn.addEventListener("click", function() {
      const container = document.getElementById("services-container");
      
      // Create a new input group wrapper
      const div = document.createElement("div");
      div.classList.add("input-group");
      div.style.marginTop = "10px";
      div.style.display = "flex";
      div.style.alignItems = "center";
      
      // Create the new dropdown
      const sel = document.createElement("select");
      sel.classList.add("service-select");
      sel.required = true;
      sel.style.flex = "1"; // Take up available space
      populateDropdown(sel);
      
      // Create the remove button (X)
      const removeBtn = document.createElement("span");
      removeBtn.innerHTML = "&times;";
      removeBtn.style.cursor = "pointer";
      removeBtn.style.color = "red";
      removeBtn.style.fontSize = "1.5rem";
      removeBtn.style.marginLeft = "10px";
      removeBtn.title = "Remove Service";
      removeBtn.onclick = function() { container.removeChild(div); };

      // Append to the container
      div.appendChild(sel);
      div.appendChild(removeBtn);
      container.appendChild(div);
    });
  }

  // 3. BOOKING FORM SUBMISSION
  const form = document.getElementById("appointmentForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = document.querySelector(".btn-submit");
      const originalText = btn.innerText;
      
      // Disable button to prevent double booking
      btn.innerText = "Booking..."; 
      btn.disabled = true;

      try {
        // Collect all selected services
        const selects = document.querySelectorAll(".service-select");
        let serviceNames = [];
        let totalPrice = 0;

        selects.forEach(s => {
          if (s.value && s.value !== "") {
            const data = JSON.parse(s.value);
            serviceNames.push(data.name);
            totalPrice += data.price;
          }
        });

        if (serviceNames.length === 0) {
          throw new Error("Please select at least one service.");
        }

        // Handle Date/Time from Flatpickr
        // Format comes in as "2025-12-25 14:30"
        const dateTimeInput = document.getElementById("date").value;
        if (!dateTimeInput) throw new Error("Please select a date and time.");
        
        const dtParts = dateTimeInput.split(' ');
        const datePart = dtParts[0];
        const timePart = dtParts[1] || "00:00";

        // Prepare Data for Backend
        const payload = {
          clientName: document.getElementById("name").value,
          clientPhone: document.getElementById("phone").value,
          clientGender: document.getElementById("gender").value, // NEW: Gender
          serviceName: serviceNames.join(" + "), // Combine multiple services
          price: totalPrice,
          date: datePart,
          time: timePart,
          status: "Pending" // Default status for online bookings
        };

        // Send to Server
        const response = await fetch(`${API_URL}/bookings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Server error. Please try again.");

        alert("✅ Booking Confirmed! We will see you soon.");
        window.location.reload();

      } catch (err) {
        alert("Booking Failed: " + err.message);
      } finally {
        // Re-enable button
        btn.innerText = originalText; 
        btn.disabled = false; 
      }
    });
  }
});

// Helper function to fill dropdowns
function populateDropdown(select) {
  if (!window.allServices) return;
  
  select.innerHTML = '<option value="" disabled selected>Select Service</option>';
  
  window.allServices.forEach(s => {
    // We store the price in the value so we can calculate total easily later
    // Format: {"name":"Haircut","price":500}
    const val = JSON.stringify({ name: s.name, price: s.price });
    
    // Display Format: Haircut (Male) - ₹500
    // If gender is missing, default to 'U' (Unisex)
    const genderLabel = s.gender ? `(${s.gender})` : ''; 
    
    select.innerHTML += `<option value='${val}'>${s.name} ${genderLabel} - ₹${s.price}</option>`;
  });
}
