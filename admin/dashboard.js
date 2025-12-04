/* =========================================
   GLAM ADMIN - DASHBOARD CONTROLLER (Async)
   ========================================= */

// 1. SECURITY CHECK
(function checkSession() {
  const sessionRaw = localStorage.getItem("glam_session");
  const now = new Date().getTime();
  if (!sessionRaw) { window.location.href = "admin.html"; return; }
  const session = JSON.parse(sessionRaw);
  if (!session.loggedIn || now > session.expiry) {
    alert("Session Expired"); localStorage.removeItem("glam_session"); window.location.href = "admin.html";
  }
})();

let currentInvoiceId = null;

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", async () => {
  // Ensure DB is loaded
  if (typeof DB !== 'undefined') {
    try {
        console.log("Initializing Dashboard...");
        await renderDashboard();
        await renderAppointmentList();
        await renderBillingQueue();
        populateServiceDropdown();
    } catch (error) {
        console.error("Dashboard Initialization Error:", error);
        alert("Failed to load dashboard data. Is the Backend Server running?");
    }
  } else {
    console.error("Database Engine (db.js) not loaded!");
  }
});

// --- NAVIGATION ---
async function switchTab(id) {
  // Hide all sections
  document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
  
  // Show selected
  const view = document.getElementById(`view-${id}`);
  if (view) view.style.display = 'block';
  
  // Highlight Menu Item
  const activeLink = document.querySelector(`.menu-item[onclick="switchTab('${id}')"]`);
  if(activeLink) activeLink.classList.add('active');
  
  // Refresh Data
  if(id === 'appointments') await renderAppointmentList();
  if(id === 'billing') await renderBillingQueue();
  if(id === 'dashboard') await renderDashboard();
  
  // Update Title
  const titleEl = document.getElementById('pageTitle');
  if(titleEl) titleEl.innerText = id.charAt(0).toUpperCase() + id.slice(1);
}

// --- DASHBOARD STATS ---
async function renderDashboard() {
  const apps = await DB.getAppointments(); // Await the API call
  
  const today = new Date().toISOString().split('T')[0];
  const revenue = apps
    .filter(a => a.date === today && a.paymentStatus === 'Paid')
    .reduce((sum, a) => sum + (a.price || 0), 0);

  const activeCount = apps.filter(a => a.status !== 'Completed').length;
  const pendingCount = apps.filter(a => a.paymentStatus === 'Unpaid').length;

  if(document.getElementById('todayRev')) document.getElementById('todayRev').innerText = revenue.toLocaleString();
  if(document.getElementById('activeCount')) document.getElementById('activeCount').innerText = activeCount;
  if(document.getElementById('pendingBillsCount')) document.getElementById('pendingBillsCount').innerText = pendingCount;
}

// --- APPOINTMENTS VIEW ---
async function renderAppointmentList() {
  const tbody = document.getElementById('apptListBody');
  if(!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading...</td></tr>';
  
  const apps = await DB.getAppointments(); 
  tbody.innerHTML = '';

  if (apps.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No appointments found.</td></tr>';
    return;
  }

  apps.forEach(a => {
    let badgeClass = `badge-${(a.status || 'pending').toLowerCase().replace(/\s+/g, '-')}`;
    
    // SAFE ID HANDLING: MongoDB uses '_id', LocalStorage used 'id'
    const id = a._id || a.id; 

    // Generate Action Button
    let actionBtn = '';
    if (a.paymentStatus === 'Unpaid') {
      // FIX: Use the 'id' variable we securely resolved above
      actionBtn = `<button class="btn-walkin" style="padding:6px 12px; font-size:0.8rem;" onclick="goToBilling('${id}')">Bill</button>`;
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

// --- BILLING / POS LOGIC ---
async function renderBillingQueue() {
  const div = document.getElementById('billingQueue');
  if(!div) return;
  div.innerHTML = '<p style="text-align:center; color:#888;">Loading...</p>';
  
  const apps = await DB.getAppointments();
  const unpaid = apps.filter(a => a.paymentStatus === 'Unpaid');
  
  div.innerHTML = '';
  
  if(unpaid.length === 0) {
    div.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-check-circle" style="font-size:2rem; color:#ddd; margin-bottom:10px;"></i>
        <p>All cleared! No pending bills.</p>
      </div>`;
    return;
  }

  unpaid.forEach(a => {
    const id = a._id || a.id; // Handle both ID types
    div.innerHTML += `
      <div class="queue-item" onclick="loadInvoice('${id}')">
        <div>
          <strong style="font-size:1rem; color:#333;">${a.clientName}</strong><br>
          <small style="color:#888;">${a.serviceName}</small>
        </div>
        <div style="font-weight:700; color:var(--rose-primary); font-size:1.1rem;">₹${a.price}</div>
      </div>
    `;
  });
}

async function goToBilling(id) {
  if (!id || id === 'undefined') {
      console.error("Invalid ID passed to goToBilling");
      return;
  }
  await switchTab('billing');
  await loadInvoice(id);
}

async function loadInvoice(id) {
  currentInvoiceId = id;
  const data = await DB.getInvoiceDetails(id);
  
  if (!data) {
      alert("Error loading invoice details.");
      return;
  }
  
  document.getElementById('invoiceEmpty').style.display = 'none';
  document.getElementById('invoiceActive').style.display = 'block';
  
  // Safe string manipulation for ID
  const displayId = (typeof id === 'string') ? id.substr(-6).toUpperCase() : '---';

  document.getElementById('invId').innerText = displayId;
  document.getElementById('invName').innerText = data.clientName || 'N/A';
  document.getElementById('invPhone').innerText = data.clientPhone || 'N/A';
  
  document.getElementById('invService').innerText = data.serviceName;
  document.getElementById('invPrice').innerText = (data.subtotal || 0).toFixed(2);
  
  document.getElementById('invSub').innerText = (data.subtotal || 0).toFixed(2);
  document.getElementById('invTax').innerText = (data.tax || 0).toFixed(2);
  document.getElementById('invTotal').innerText = (data.total || 0).toFixed(2);
}

async function completePayment(method) {
  if(!currentInvoiceId) return;
  
  if(confirm(`Confirm ${method} Payment?`)) {
    const success = await DB.processPayment(currentInvoiceId, method);
    if (success) {
        alert("Invoice Paid Successfully! ✅");
        document.getElementById('invoiceActive').style.display = 'none';
        document.getElementById('invoiceEmpty').style.display = 'flex';
        currentInvoiceId = null;
        await renderBillingQueue();
    } else {
        alert("Payment failed. Check server connection.");
    }
  }
}

// --- MODALS & FORMS ---
function openWalkinModal() {
  const modal = document.getElementById('walkinModal');
  if(modal) {
      modal.style.display = 'block';
      const now = new Date();
      if(document.getElementById('wDate')) document.getElementById('wDate').value = now.toISOString().split('T')[0];
      if(document.getElementById('wTime')) document.getElementById('wTime').value = now.toTimeString().substring(0,5);
  }
}

function closeWalkinModal() {
  const modal = document.getElementById('walkinModal');
  if(modal) modal.style.display = 'none';
}

function populateServiceDropdown() {
  const select = document.getElementById('wService');
  if(select) {
    select.innerHTML = '';
    const services = DB.getServices(); // This is still sync in db.js
    services.forEach(s => {
      select.innerHTML += `<option value="${s.id}">${s.name} - ₹${s.price}</option>`;
    });
  }
}

async function handleBookingSubmit(e) {
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

  const newApp = await DB.createBooking({
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
    await switchTab('appointments');
  } else {
    // Walk-ins go straight to billing. Use the correct ID field.
    await goToBilling(newApp._id || newApp.id);
  }
}

// --- REPORTS ---
async function renderReport() {
    const dateInput = document.getElementById('reportDate');
    if(!dateInput || !dateInput.value) {
        alert("Please select a date");
        return;
    }
    
    const report = await DB.generateDailyReport(dateInput.value);
    
    document.getElementById('reportRevenue').innerText = report.revenue;
    document.getElementById('reportCount').innerText = report.totalAppointments;
    
    const tbody = document.getElementById('reportListBody');
    tbody.innerHTML = '';
    report.details.forEach(a => {
        tbody.innerHTML += `
            <tr>
                <td>${a.clientName}</td>
                <td>${a.serviceName}</td>
                <td>₹${a.price + Math.round(a.price*0.18)}</td>
                <td>${a.paymentMethod}</td>
            </tr>
        `;
    });
}
