/* =========================================
   GLAM SALON - CLIENT SIDE LOGIC
   ========================================= */

// ⚠️ IMPORTANT: Verify this URL matches your Render Backend
const API_URL = "https://glam-backend-nw7q.onrender.com/api"; 

document.addEventListener("DOMContentLoaded", async function () {
  
  // 1. FETCH SERVICES DYNAMICALLY
  // This replaces "Loading..." with actual database services
  try {
    const res = await fetch(`${API_URL}/services`);
    if (res.ok) {
      const services = await res.json();
      window.allServices = services; // Store globally
      
      // Populate the first dropdown if it exists on page
      const firstSelect = document.querySelector(".service-select");
      if (firstSelect) populateDropdown(firstSelect);
    } else {
      console.error("Failed to connect to backend service API");
    }
  } catch (err) {
    console.error("Error loading services:", err);
  }

  // 2. "ADD ANOTHER SERVICE" BUTTON LOGIC
  const addBtn = document.getElementById("addServiceBtn");
  if (addBtn) {
    addBtn.addEventListener("click", function() {
      const container = document.getElementById("services-container");
      
      // Create new wrapper
      const div = document.createElement("div");
      div.classList.add("input-group");
      div.style.marginTop = "15px";
      div.style.display = "flex";
      div.style.alignItems = "center";
      
      // Icon
      const icon = document.createElement("i");
      icon.className = "fas fa-spa input-icon";
      
      // Select Box
      const sel = document.createElement("select");
      sel.classList.add("service-select");
      sel.required = true;
      sel.style.width = "100%";
      sel.style.padding = "15px 15px 15px 45px"; // Padding for icon
      sel.style.border = "1px solid #ddd";
      sel.style.borderRadius = "5px";
      
      populateDropdown(sel); // Fill with options
      
      // Remove Button (Red X)
      const removeBtn = document.createElement("span");
      removeBtn.innerHTML = "&times;";
      removeBtn.style.color = "red";
      removeBtn.style.fontSize = "1.5rem";
      removeBtn.style.marginLeft = "10px";
      removeBtn.style.cursor = "pointer";
      removeBtn.onclick = function() { container.removeChild(div); };

      // Assemble
      div.appendChild(icon);
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
      btn.innerText = "Processing...";
      btn.disabled = true;

      try {
        // A. Collect Services & Price
        const selects = document.querySelectorAll(".service-select");
        let serviceNames = [];
        let totalPrice = 0;

        selects.forEach(s => {
          if (s.value) {
            const data = JSON.parse(s.value);
            serviceNames.push(data.name);
            totalPrice += data.price;
          }
        });

        if (serviceNames.length === 0) throw new Error("Please select at least one service.");

        // B. Parse Date & Time from Flatpickr
        const rawDate = document.getElementById("date").value; // "2025-10-15 14:30"
        if (!rawDate) throw new Error("Please select a date and time.");
        
        const parts = rawDate.split(' ');
        const datePart = parts[0];
        const timePart = parts[1] || "12:00";

        // C. Construct Payload
        const payload = {
          clientName: document.getElementById("name").value,
          clientPhone: document.getElementById("phone").value,
          clientGender: document.getElementById("gender").value, // New Field
          serviceName: serviceNames.join(" + "), // "Haircut + Facial"
          price: totalPrice,
          date: datePart,
          time: timePart,
          status: "Pending"
        };

        // D. Send to Backend
        const response = await fetch(`${API_URL}/bookings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Server error, please try again.");

        // E. Success Message
        const popup = document.getElementById("popup");
        if(popup) {
            popup.style.display = "block";
            popup.innerText = "✅ Booking Confirmed! We'll call you soon.";
            setTimeout(() => { popup.style.display = "none"; }, 5000);
        } else {
            alert("Booking Confirmed!");
        }

        form.reset();
        // Reset date picker explicitly if needed
        document.getElementById("date")._flatpickr.clear();

      } catch (err) {
        alert("Booking Failed: " + err.message);
      } finally {
        btn.innerText = originalText;
        btn.disabled = false;
      }
    });
  }
});

// --- HELPER: Fill Dropdowns ---
function populateDropdown(selectElement) {
  if (!window.allServices) return;
  
  selectElement.innerHTML = '<option value="" disabled selected>Select Service</option>';
  
  window.allServices.forEach(s => {
    // Value stores the JSON object so we can read name AND price
    const val = JSON.stringify({ name: s.name, price: s.price });
    
    // Label shows Gender if available: "Haircut (Female) - ₹500"
    const genderLabel = s.gender ? `(${s.gender})` : '';
    
    selectElement.innerHTML += `<option value='${val}'>${s.name} ${genderLabel} - ₹${s.price}</option>`;
  });
}
