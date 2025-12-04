/* =========================================
   GLAM ADMIN - DASHBOARD CONTROLLER (Async)
   ========================================= */

// ... (Security/Session check remains the same) ...
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
  if (typeof DB !== 'undefined') {
    await renderDashboard();
    await renderAppointmentList();
    await renderBillingQueue();
    populateServiceDropdown();
  }
});

// --- NAVIGATION ---
async function switchTab(id) {
  document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
  document.getElementById(`view-${id}`).style.display = 'block';
  
  const activeLink = document.querySelector(`.menu-item[onclick="switchTab('${id}')"]`);
  if(activeLink) activeLink.classList.add('active');
  
  if(id === 'appointments') await renderAppointmentList();
  if(id === 'billing') await renderBillingQueue();
  if(id === 'dashboard') await renderDashboard();
  
  document.getElementById('pageTitle').innerText = id.charAt(0).toUpperCase() + id.slice(1);
}

// --- DASHBOARD STATS ---
async function renderDashboard() {
  const apps = await DB.getAppointments();
  
  const today = new Date().toISOString().split('T')[0];
  const revenue = apps
    .filter(a => a.date === today && a.paymentStatus === 'Paid')
    .reduce((sum, a) => sum + (a.price || 0), 0);

  document.getElementById('todayRev').innerText = revenue.toLocaleString();
  document.getElementById('activeCount').innerText = apps.filter(a => a.status !== 'Completed').length;
  document.getElementById('pendingBillsCount').innerText = apps.filter(a => a.paymentStatus === 'Unpaid').length;
}

// --- APPOINTMENTS LIST ---
async function renderAppointmentList() {
  const tbody = document.getElementById('apptListBody');
  if(!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
  
  const apps = await DB.getAppointments(); 
  tbody.innerHTML = '';

  apps.forEach(a => {
    let badgeClass = `badge-${a.status.toLowerCase().replace(/\s+/g, '-')}`;
    let actionBtn = a.paymentStatus === 'Unpaid' 
      ? `<button class="btn-walkin" style="padding:6px 12px; font-size:0.8rem;" onclick="goToBilling('${a._id}')">Bill</button>` // Note: MongoDB uses _id
      : '<span style="color:#27ae60; font-weight:700;"><i class="fas fa-check-circle"></i> Paid</span>';

    // Handle ID (MongoDB uses _id, local used id)
    const id = a._id || a.id;

    let row = `
      <tr>
        <td>
          <div style="font-weight:600;">${a.date}</div>
          <div style="font-size:0.85rem; color:#888;">${a.time}</div>
        </td>
        <td>
          <div style="font-weight:600;">${a.clientName}</div>
          <div style="font-size:0.85rem; color:#888;">${a.clientPhone}</div>
        </td>
        <td>${a.serviceName}</td>
        <td><span class="badge ${badgeClass}">${a.status}</span></td>
        <td>${actionBtn}</td>
      </tr>`;
    tbody.innerHTML += row;
  });
}

// --- BILLING ---
async function renderBillingQueue() {
  const div = document.getElementById('billingQueue');
  if(!div) return;
  div.innerHTML = 'Loading...';
  
  const apps = await DB.getAppointments();
  const unpaid = apps.filter(a => a.paymentStatus === 'Unpaid');
  
  div.innerHTML = '';
  if(unpaid.length === 0) {
    div.innerHTML = `<div class="empty-state"><p>No pending bills.</p></div>`;
    return;
  }

  unpaid.forEach(a => {
    const id = a._id || a.id;
    div.innerHTML += `
      <div class="queue-item" onclick="loadInvoice('${id}')">
        <div><strong>${a.clientName}</strong><br><small>${a.serviceName}</small></div>
        <div style="font-weight:700;">₹${a.price}</div>
      </div>`;
  });
}

async function goToBilling(id) {
  await switchTab('billing');
  await loadInvoice(id);
}

async function loadInvoice(id) {
  currentInvoiceId = id;
  const data = await DB.getInvoiceDetails(id);
  
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

async function completePayment(method) {
  if(!currentInvoiceId) return;
  if(confirm(`Confirm ${method} Payment?`)) {
    await DB.processPayment(currentInvoiceId, method);
    alert("Invoice Paid Successfully! ✅");
    document.getElementById('invoiceActive').style.display = 'none';
    document.getElementById('invoiceEmpty').style.display = 'flex';
    currentInvoiceId = null;
    await renderBillingQueue();
  }
}

// --- SMART BOOKING MODAL (WALK-IN) ---
function openWalkinModal() { /* Same as before */ 
    document.getElementById('walkinModal').style.display = 'block';
    const now = new Date();
    document.getElementById('wDate').value = now.toISOString().split('T')[0];
    document.getElementById('wTime').value = now.toTimeString().substring(0,5);
}
function closeWalkinModal() { document.getElementById('walkinModal').style.display = 'none'; }

function populateServiceDropdown() {
  const select = document.getElementById('wService');
  if(select) {
    select.innerHTML = '';
    DB.getServices().forEach(s => {
      select.innerHTML += `<option value="${s.id}">${s.name} - ₹${s.price}</option>`;
    });
  }
}

async function handleBookingSubmit(e) {
  e.preventDefault();
  const date = document.getElementById('wDate').value;
  const time = document.getElementById('wTime').value;
  
  // Basic logic for Walk-in vs Phone
  const isFuture = new Date(`${date}T${time}`) > new Date(new Date().getTime() + 30*60000);

  // Convert Time format
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
    await goToBilling(newApp._id); // Use _id from MongoDB
  }
}

// REPORTS (Add this function to handle the report generation)
async function renderReport() {
    const date = document.getElementById('reportDate').value;
    if(!date) return;
    
    const report = await DB.generateDailyReport(date);
    
    document.getElementById('reportRevenue').innerText = report.revenue;
    document.getElementById('reportCount').innerText = report.totalAppointments;
    
    const tbody = document.getElementById('reportListBody');
    tbody.innerHTML = '';
    report.details.forEach(a => {
        tbody.innerHTML += `
            <tr>
                <td>${a.clientName}</td>
                <td>${