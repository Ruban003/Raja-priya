/* =========================================
   GLAM ADMIN - DASHBOARD CONTROLLER (Async)
   ========================================= */

// 1. SECURITY CHECK
(function checkSession() {
  const sessionRaw = localStorage.getItem("glam_session");
  const now = new Date().getTime();

  if (!sessionRaw) {
    window.location.href = "admin.html";
    return;
  }
  const session = JSON.parse(sessionRaw);
  if (!session.loggedIn || now > session.expiry) {
    alert("Session Expired"); 
    localStorage.removeItem("glam_session"); 
    window.location.href = "admin.html";
  }
})();

let currentInvoiceId = null;

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", async () => {
  if (typeof DB !== 'undefined') {
    try {
        await renderDashboard();
        await renderAppointmentList();
        await renderBillingQueue();
        populateServiceDropdown();
    } catch (e) { console.error("Init Error", e); }
  }
});

// --- NAVIGATION ---
async function switchTab(id) {
  document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
  
  const view = document.getElementById(`view-${id}`);
  if(view) view.style.display = 'block';
  
  const activeLink = document.querySelector(`.menu-item[onclick="switchTab('${id}')"]`);
  if(activeLink) activeLink.classList.add('active');
  
  if(id === 'appointments') await renderAppointmentList();
  if(id === 'billing') await renderBillingQueue();
  if(id === 'dashboard') await renderDashboard();
  
  const title = document.getElementById('pageTitle');
  if(title) title.innerText = id.charAt(0).toUpperCase() + id.slice(1);
}

// --- DATA RENDERING ---
async function renderDashboard() {
  const apps = await DB.getAppointments();
  
  const today = new Date().toISOString().split('T')[0];
  const revenue = apps.filter(a => a.date === today && a.paymentStatus === 'Paid')
                      .reduce((sum, a) => sum + (a.price || 0), 0);
  
  if(document.getElementById('todayRev')) document.getElementById('todayRev').innerText = revenue.toLocaleString();
  if(document.getElementById('activeCount')) document.getElementById('activeCount').innerText = apps.filter(a => a.status !== 'Completed').length;
  if(document.getElementById('pendingBillsCount')) document.getElementById('pendingBillsCount').innerText = apps.filter(a => a.paymentStatus === 'Unpaid').length;
}

async function renderAppointmentList() {
  const tbody = document.getElementById('apptListBody');
  if(!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
  
  const apps = await DB.getAppointments();
  tbody.innerHTML = '';
  
  apps.forEach(a => {
    let badgeClass = `badge-${(a.status || 'pending').toLowerCase().replace(/\s+/g, '-')}`;
    const id = a._id || a.id; 
    let actionBtn = a.paymentStatus === 'Unpaid' 
      ? `<button class="btn-walkin" onclick="goToBilling('${id}')">Bill</button>`
      : '<span style="color:#27ae60;">Paid</span>';

    tbody.innerHTML += `
      <tr>
        <td><div>${a.date}</div><small>${a.time}</small></td>
        <td><div>${a.clientName}</div><small>${a.clientPhone}</small></td>
        <td>${a.serviceName}</td>
        <td><span class="badge ${badgeClass}">${a.status}</span></td>
        <td>${actionBtn}</td>
      </tr>`;
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
  if(unpaid.length === 0) { div.innerHTML = '<div class="empty-state">No pending bills</div>'; return; }

  unpaid.forEach(a => {
    const id = a._id || a.id;
    div.innerHTML += `<div class="queue-item" onclick="loadInvoice('${id}')"><strong>${a.clientName}</strong><br>₹${a.price}</div>`;
  });
}

async function goToBilling(id) { await switchTab('billing'); await loadInvoice(id); }

async function loadInvoice(id) {
  currentInvoiceId = id;
  const data = await DB.getInvoiceDetails(id);
  if(!data) return;

  document.getElementById('invoiceEmpty').style.display = 'none';
  document.getElementById('invoiceActive').style.display = 'block';
  document.getElementById('invName').innerText = data.clientName;
  document.getElementById('invPhone').innerText = data.clientPhone;
  document.getElementById('invService').innerText = data.serviceName;
  document.getElementById('invPrice').innerText = data.subtotal;
  document.getElementById('invTotal').innerText = data.total;
  document.getElementById('invId').innerText = (typeof id === 'string') ? id.substr(-6).toUpperCase() : '---';
  document.getElementById('invSub').innerText = data.subtotal;
  document.getElementById('invTax').innerText = data.tax;
}

async function completePayment(method) {
  if(!currentInvoiceId) return;
  if(confirm(`Confirm ${method}?`)) {
    await DB.processPayment(currentInvoiceId, method);
    alert("Paid! ✅");
    document.getElementById('invoiceActive').style.display = 'none';
    document.getElementById('invoiceEmpty').style.display = 'flex';
    await renderBillingQueue();
  }
}

// --- BOOKING (Walk-in) ---
function openWalkinModal() { 
  document.getElementById('walkinModal').style.display = 'block'; 
  const now = new Date();
  document.getElementById('wDate').value = now.toISOString().split('T')[0];
  document.getElementById('wTime').value = now.toTimeString().slice(0,5);
}
function closeWalkinModal() { document.getElementById('walkinModal').style.display = 'none'; }

function populateServiceDropdown() {
  const select = document.getElementById('wService');
  if(select) {
    select.innerHTML = '';
    DB.getServices().forEach(s => select.innerHTML += `<option value="${s.id}">${s.name} - ₹${s.price}</option>`);
  }
}

async function handleBookingSubmit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn.innerText;
  btn.innerText = "Booking..."; btn.disabled = true;

  try {
      const date = document.getElementById('wDate').value;
      const time = document.getElementById('wTime').value;
      
      let [h, m] = time.split(':');
      let ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      const displayTime = `${h}:${m} ${ampm}`;
      
      const bookTime = new Date(`${date}T${time}`);
      const now = new Date();
      const isFuture = bookTime > new Date(now.getTime() + 30*60000);

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
        alert("Booking Confirmed!");
        await switchTab('appointments');
      } else {
        await goToBilling(newApp._id || newApp.id);
      }
  } catch (err) {
      alert("Error: " + err.message);
  } finally {
      btn.innerText = originalText; btn.disabled = false;
  }
}

async function renderReport() {
    const date = document.getElementById('reportDate').value;
    if(!date) return;
    const report = await DB.generateDailyReport(date);
    document.getElementById('reportRevenue').innerText = report.revenue;
    document.getElementById('reportCount').innerText = report.totalAppointments;
    const tbody = document.getElementById('reportListBody');
    tbody.innerHTML = '';
    report.details.forEach(a => {
        tbody.innerHTML += `<tr><td>${a.clientName}</td><td>${a.serviceName}</td><td>₹${a.price}</td><td>${a.paymentMethod}</td></tr>`;
    });
}
