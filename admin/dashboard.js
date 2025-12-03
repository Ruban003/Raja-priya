/* =========================================
   GLAM ADMIN - DASHBOARD CONTROLLER
   ========================================= */

// 1. SECURITY GATEKEEPER
(function checkSession() {
  const sessionRaw = localStorage.getItem("glam_session");
  const now = new Date().getTime();

  if (!sessionRaw) {
    // No session? Kick out to login page
    window.location.href = "admin.html";
    return;
  }

  const session = JSON.parse(sessionRaw);

  if (!session.loggedIn || now > session.expiry) {
    alert("Session Expired. Please login again.");
    localStorage.removeItem("glam_session");
    window.location.href = "admin.html";
    return;
  }
})();

// Global Variables
let currentInvoiceId = null;

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  // Only run if DB is loaded
  if (typeof DB !== 'undefined') {
    renderDashboard();
    renderAppointmentList();
    renderBillingQueue();
    populateServiceDropdown();
  } else {
    console.error("Database Engine (db.js) not loaded!");
  }
});

/* =========================================
   NAVIGATION
   ========================================= */
function switchTab(id) {
  // Hide all sections
  document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
  
  // Show selected
  document.getElementById(`view-${id}`).style.display = 'block';
  
  // Highlight Menu Item
  const activeLink = document.querySelector(`.menu-item[onclick="switchTab('${id}')"]`);
  if(activeLink) activeLink.classList.add('active');
  
  // Refresh Data
  if(id === 'appointments') renderAppointmentList();
  if(id === 'billing') renderBillingQueue();
  if(id === 'dashboard') renderDashboard();
  
  // Update Header Title
  document.getElementById('pageTitle').innerText = id.charAt(0).toUpperCase() + id.slice(1);
}

/* =========================================
   DASHBOARD STATS
   ========================================= */
function renderDashboard() {
  const apps = DB.getAppointments();
  
  // Today's Revenue Calculation
  const today = new Date().toISOString().split('T')[0];
  const revenue = apps
    .filter(a => a.date === today && a.paymentStatus === 'Paid')
    .reduce((sum, a) => sum + (a.price || 0), 0);

  document.getElementById('todayRev').innerText = revenue.toLocaleString();
  document.getElementById('activeCount').innerText = apps.filter(a => a.status !== 'Completed').length;
  document.getElementById('pendingBillsCount').innerText = apps.filter(a => a.paymentStatus === 'Unpaid').length;
}

/* =========================================
   APPOINTMENTS VIEW
   ========================================= */
function renderAppointmentList() {
  const tbody = document.getElementById('apptListBody');
  if(!tbody) return;
  tbody.innerHTML = '';
  
  const apps = DB.getAppointments().reverse(); 

  apps.forEach(a => {
    let badgeClass = `badge-${a.status.toLowerCase().replace(/\s+/g, '-')}`;
    
    // Action Button Logic
    let actionBtn = '';
    if (a.paymentStatus === 'Unpaid') {
      actionBtn = `<button class="btn-walkin" style="padding:6px 12px; font-size:0.8rem;" onclick="goToBilling('${a.id}')">Bill</button>`;
    } else {
      actionBtn = '<span style="color:#27ae60; font-weight:700; font-size:0.9rem;"><i class="fas fa-check-circle"></i> Paid</span>';
    }

    let row = `
      <tr>
        <td>
          <div style="font-weight:600; color:#333;">${a.date}</div>
          <div style="font-size:0.85rem; color:#888;">${a.time}</div>
        </td>
        <td>
          <div style="font-weight:600;">${a.clientName}</div>
          <div style="font-size:0.85rem; color:#888;">${a.clientPhone}</div>
        </td>
        <td>${a.serviceName}</td>
        <td><span class="badge ${badgeClass}">${a.status}</span></td>
        <td>${actionBtn}</td>
      </tr>
    `;
    tbody.innerHTML += row;
  });
}

/* =========================================
   BILLING / POS LOGIC
   ========================================= */
function renderBillingQueue() {
  const div = document.getElementById('billingQueue');
  if(!div) return;
  div.innerHTML = '';
  
  const unpaid = DB.getAppointments().filter(a => a.paymentStatus === 'Unpaid');
  
  if(unpaid.length === 0) {
    div.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-check-circle" style="font-size:2rem; color:#ddd; margin-bottom:10px;"></i>
        <p>All cleared! No pending bills.</p>
      </div>`;
    return;
  }

  unpaid.forEach(a => {
    div.innerHTML += `
      <div class="queue-item" onclick="loadInvoice('${a.id}')">
        <div>
          <strong style="font-size:1rem; color:#333;">${a.clientName}</strong><br>
          <small style="color:#888;">${a.serviceName}</small>
        </div>
        <div style="font-weight:700; color:var(--rose-primary); font-size:1.1rem;">₹${a.price}</div>
      </div>
    `;
  });
}

function goToBilling(id) {
  switchTab('billing');
  loadInvoice(id);
}

function loadInvoice(id) {
  currentInvoiceId = id;
  const data = DB.getInvoiceDetails(id);
  
  document.getElementById('invoiceEmpty').style.display = 'none';
  document.getElementById('invoiceActive').style.display = 'block';
  
  document.getElementById('invId').innerText = id.substr(-6).toUpperCase();
  document.getElementById('invName').innerText = data.clientName;
  document.getElementById('invPhone').innerText = data.clientPhone;
  
  document.getElementById('invService').innerText = data.serviceName;
  document.getElementById('invPrice').innerText = data.subtotal.toFixed(2);
  
  document.getElementById('invSub').innerText = data.subtotal.toFixed(2);
  document.getElementById('invTax').innerText = data.tax.toFixed(2);
  document.getElementById('invTotal').innerText = data.total.toFixed(2);
}

function completePayment(method) {
  if(!currentInvoiceId) return;
  
  if(confirm(`Confirm ${method} Payment?`)) {
    DB.processPayment(currentInvoiceId, method);
    alert("Invoice Paid Successfully! ✅");
    
    document.getElementById('invoiceActive').style.display = 'none';
    document.getElementById('invoiceEmpty').style.display = 'flex';
    currentInvoiceId = null;
    
    renderBillingQueue();
  }
}

/* =========================================
   SMART BOOKING MODAL
   ========================================= */
function openWalkinModal() {
  document.getElementById('walkinModal').style.display = 'block';
  
  // Set Date/Time to Now
  const now = new Date();
  document.getElementById('wDate').value = now.toISOString().split('T')[0];
  
  // HH:MM Format
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  document.getElementById('wTime').value = `${hours}:${minutes}`;
}

function closeWalkinModal() {
  document.getElementById('walkinModal').style.display = 'none';
}

function populateServiceDropdown() {
  const select = document.getElementById('wService');
  if(select) {
    select.innerHTML = '';
    DB.getServices().forEach(s => {
      select.innerHTML += `<option value="${s.id}">${s.name} - ₹${s.price}</option>`;
    });
  }
}

function handleBookingSubmit(e) {
  e.preventDefault();
  
  const date = document.getElementById('wDate').value;
  const time = document.getElementById('wTime').value;
  
  // Logic: Future Booking (>30 mins) or Walk-in Now
  const bookTime = new Date(`${date}T${time}`);
  const now = new Date();
  const isFuture = bookTime > new Date(now.getTime() + 30*60000);

  // Convert 24h to 12h for display
  let [h, m] = time.split(':');
  let ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const displayTime = `${h}:${m} ${ampm}`;

  const newApp = DB.createBooking({
    name: document.getElementById('wName').value,
    phone: document.getElementById('wPhone').value,
    serviceId: document.getElementById('wService').value,
    date: date,
    time: displayTime,
    type: isFuture ? 'Phone Booking' : 'Walk-in',
    status: isFuture ? 'Confirmed' : 'In-Store'
  });

  closeWalkinModal();
  
  if(isFuture) {
    alert(`Appointment Confirmed for ${displayTime}`);
    switchTab('appointments');
  } else {
    // Walk-ins go straight to billing
    goToBilling(newApp.id);
  }
}




/* ========================================= 
   LOGOUT
   ========================================= */
function logout() {
  if(confirm("Are you sure you want to logout?")) {
    localStorage.removeItem("glam_session");
    window.location.href = "admin.html"; // Redirect to login
  }
} 