/* admin/dashboard.js - COMPLETE UPDATED VERSION */
(function checkSession() {
  const session = JSON.parse(localStorage.getItem("glam_session"));
  if (!session || !session.loggedIn) window.location.href = "admin.html";
})();

const API_BASE = "https://glam-backend-nw7q.onrender.com/api"; 
let allServices = [];
let currentBillItems = [];
let currentBillApptId = null;

document.addEventListener("DOMContentLoaded", () => {
  // Init Date Pickers
  flatpickr("#reportDate", { dateFormat: "Y-m-d", defaultDate: "today" });
  flatpickr("#wDateTime", { enableTime: true, dateFormat: "Y-m-d H:i" });
  flatpickr("#editDateTime", { enableTime: true, dateFormat: "Y-m-d H:i" });

  // Initial Data Load
  renderDashboard();
  renderAppointmentList();
  renderServices();
  renderClients();
  renderBillingQueue();

  // Attach Listeners
  document.getElementById('serviceForm').addEventListener('submit', handleServiceSubmit);
  document.getElementById('walkinForm').addEventListener('submit', handleWalkinSubmit);
  document.getElementById('editApptForm').addEventListener('submit', handleEditApptSubmit);
});

// --- NAVIGATION ---
function switchTab(tab) {
  document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
  document.getElementById(`view-${tab}`).style.display = 'block';
  document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
  event.currentTarget.classList.add('active');
  
  // Refresh data immediately when tab is clicked
  if(tab === 'appointments') renderAppointmentList();
  if(tab === 'services') renderServices();
  if(tab === 'clients') renderClients();
  if(tab === 'reports') renderReport();
  if(tab === 'dashboard') renderDashboard();
}

function logout() { localStorage.removeItem('glam_session'); window.location.href='admin.html'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// --- 1. APPOINTMENTS (Stats + Edit Modal) ---
async function renderAppointmentList() {
  const apps = await (await fetch(`${API_BASE}/appointments`)).json();
  const tbody = document.getElementById('apptListBody');
  tbody.innerHTML = '';
  
  // Update Stats Cards
  const total = apps.length;
  const completed = apps.filter(a => a.status === 'Completed').length;
  const pending = apps.filter(a => a.status === 'Pending' || a.status === 'In-Store').length;

  document.getElementById('apptTotal').innerText = total;
  document.getElementById('apptDone').innerText = completed;
  document.getElementById('apptPending').innerText = pending;

  apps.forEach(a => {
    let billAction = '';
    // Show Bill button if unpaid, otherwise show Paid status
    if(a.paymentStatus === 'Unpaid') {
      billAction = `<button class="btn-new" style="background:#e67e22; padding:5px 10px;" onclick="moveToBill('${a._id}')">Bill ➔</button>`;
    } else {
      billAction = `<span style="color:#27ae60; font-weight:bold;">Paid</span>`;
    }

    // Status Color
    let statusColor = '#333';
    if(a.status === 'Completed') statusColor = 'green';
    if(a.status === 'Pending') statusColor = 'orange';
    if(a.status === 'Cancelled') statusColor = 'red';

    // Safe object for Edit function
    const safeName = a.clientName.replace(/'/g, "");

    tbody.innerHTML += `
      <tr>
        <td>${a.date} <br><small>${a.time}</small></td>
        <td><strong>${a.clientName}</strong><br><small>${a.clientPhone}</small></td>
        <td>${a.serviceName}</td>
        <td style="color:${statusColor}; font-weight:bold;">${a.status}</td>
        <td>${billAction}</td>
        <td>
          <button class="btn-edit" onclick="openEditAppt('${a._id}', '${safeName}', '${a.date} ${a.time}', '${a.status}')" title="Edit"><i class="fas fa-edit"></i></button>
          <button class="btn-del" onclick="deleteAppt('${a._id}')" title="Delete"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`;
  });
}

function openEditAppt(id, name, datetime, status) {
  document.getElementById('editApptId').value = id;
  document.getElementById('editName').value = name;
  document.getElementById('editStatus').value = status;
  // Set Date Picker
  document.getElementById('editDateTime')._flatpickr.setDate(datetime);
  document.getElementById('editApptModal').style.display = 'block';
}

async function handleEditApptSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('editApptId').value;
  const dt = document.getElementById('editDateTime').value.split(' '); // "2025-12-12 14:00"
  
  await fetch(`${API_BASE}/appointments/${id}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      clientName: document.getElementById('editName').value,
      date: dt[0],
      time: dt[1],
      status: document.getElementById('editStatus').value
    })
  });

  closeModal('editApptModal');
  renderAppointmentList(); // Immediate Refresh
  renderDashboard();
}

async function moveToBill(id) {
  switchTab('billing');
  initBill(id);
}

async function deleteAppt(id) {
  if(confirm("Permanently delete this appointment?")) { 
    await fetch(`${API_BASE}/appointments/${id}`, { method: 'DELETE' }); 
    renderAppointmentList(); 
    renderDashboard();
  }
}

// --- 2. SERVICES ---
async function renderServices() {
  const res = await fetch(`${API_BASE}/services`);
  allServices = await res.json();
  const tbody = document.getElementById('serviceListBody');
  tbody.innerHTML = '';
  
  allServices.forEach(s => {
    const safeObj = JSON.stringify(s).replace(/'/g, "&apos;");
    tbody.innerHTML += `
      <tr>
        <td>${s.name}</td>
        <td>${s.category}</td>
        <td>${s.gender||'U'}</td>
        <td>₹${s.price}</td>
        <td>
          <button class="btn-edit" onclick='openServiceModal(${safeObj})'><i class="fas fa-edit"></i></button>
          <button class="btn-del" onclick="deleteService('${s._id}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`;
  });
}

function openServiceModal(service = null) {
  document.getElementById('serviceForm').reset();
  if (service) {
    document.getElementById('sId').value = service._id;
    document.getElementById('sName').value = service.name;
    document.getElementById('sCat').value = service.category;
    document.getElementById('sPrice').value = service.price;
    document.getElementById('sGender').value = service.gender || 'Unisex';
  } else { document.getElementById('sId').value = ""; }
  document.getElementById('serviceModal').style.display = 'block';
}

async function handleServiceSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('sId').value;
  const payload = {
    name: document.getElementById('sName').value,
    category: document.getElementById('sCat').value,
    price: document.getElementById('sPrice').value,
    gender: document.getElementById('sGender').value
  };
  const url = id ? `${API_BASE}/services/${id}` : `${API_BASE}/services`;
  const method = id ? 'PUT' : 'POST';
  
  await fetch(url, { method: method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
  
  closeModal('serviceModal');
  renderServices(); // Immediate Refresh
}

async function deleteService(id) { 
  if(confirm("Remove this service?")) { 
    await fetch(`${API_BASE}/services/${id}`, { method: 'DELETE' }); 
    renderServices(); 
  } 
}

// --- 3. REPORTS (Added Invoice ID) ---
async function renderReport() {
  const date = document.getElementById('reportDate').value;
  if(!date) return;
  const apps = await (await fetch(`${API_BASE}/appointments`)).json();
  const filtered = apps.filter(a => a.date === date && a.paymentStatus === 'Paid');
  
  const tbody = document.getElementById('reportListBody');
  tbody.innerHTML = '';
  let total = 0;
  
  filtered.forEach(a => {
    total += (a.totalAmount || 0);
    // Invoice ID is last 4 chars of DB ID
    const invId = a._id.slice(-4).toUpperCase();
    
    tbody.innerHTML += `
      <tr>
        <td>#${invId}</td>
        <td>${a.clientName}</td>
        <td>${a.serviceName}</td>
        <td>₹${a.totalAmount}</td>
        <td>${a.paymentMethod}</td>
      </tr>`;
  });
  document.getElementById('reportRevenue').innerText = total.toLocaleString();
}

// --- 4. BILLING ---
async function renderBillingQueue() {
  const apps = await (await fetch(`${API_BASE}/appointments`)).json();
  const unpaid = apps.filter(a => a.paymentStatus === 'Unpaid');
  const div = document.getElementById('billingQueue');
  div.innerHTML = unpaid.length ? '' : '<p style="padding:20px; text-align:center; color:#888;">No Pending Bills</p>';
  unpaid.forEach(a => {
    div.innerHTML += `<div class="queue-item" onclick="initBill('${a._id}')"><b>${a.clientName}</b><br>${a.serviceName}</div>`;
  });
}

async function initBill(id) {
  const appt = await (await fetch(`${API_BASE}/appointments/${id}`)).json();
  currentBillApptId = id;
  currentBillItems = [{ name: appt.serviceName, price: appt.price }];
  
  document.getElementById('invoicePanel').style.display = 'block';
  document.getElementById('invClientName').innerText = appt.clientName;
  document.getElementById('invId').innerText = appt._id.slice(-4).toUpperCase();
  
  const sel = document.getElementById('billAddService');
  sel.innerHTML = '';
  allServices.forEach(s => sel.innerHTML += `<option value='${JSON.stringify(s)}'>${s.name} - ₹${s.price}</option>`);
  
  renderBillItems();
}

function addItemToBill() {
  const s = JSON.parse(document.getElementById('billAddService').value);
  currentBillItems.push({ name: s.name, price: s.price });
  renderBillItems();
}

function renderBillItems() {
  let total = 0;
  const tbody = document.getElementById('billItemsBody');
  tbody.innerHTML = '';
  currentBillItems.forEach(i => {
    total += i.price;
    tbody.innerHTML += `<tr><td>${i.name}</td><td>₹${i.price}</td></tr>`;
  });
  document.getElementById('invTotal').innerText = total;
}

async function processPayment(method) {
  const total = parseInt(document.getElementById('invTotal').innerText);
  const names = currentBillItems.map(i => i.name).join(' + ');
  await fetch(`${API_BASE}/appointments/${currentBillApptId}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ paymentStatus: 'Paid', status: 'Completed', totalAmount: total, paymentMethod: method, serviceName: names })
  });
  document.getElementById('invoicePanel').style.display = 'none';
  renderBillingQueue();
  renderDashboard(); // Immediate Refresh
}

// --- 5. WALK-IN ---
function openWalkinModal() {
  document.getElementById('walkinModal').style.display = 'block';
  const sel = document.getElementById('wService');
  sel.innerHTML = '';
  allServices.forEach(s => sel.innerHTML += `<option value='${JSON.stringify(s)}'>${s.name} - ₹${s.price}</option>`);
}

async function handleWalkinSubmit(e) {
  e.preventDefault();
  const s = JSON.parse(document.getElementById('wService').value);
  const dt = document.getElementById('wDateTime').value.split(' ');
  await fetch(`${API_BASE}/bookings`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      clientName: document.getElementById('wName').value,
      clientPhone: document.getElementById('wPhone').value,
      clientGender: document.getElementById('wGender').value,
      serviceName: s.name,
      price: s.price,
      date: dt[0], time: dt[1],
      status: "In-Store", paymentStatus: "Unpaid"
    })
  });
  closeModal('walkinModal');
  switchTab('appointments'); // Immediate Refresh
}

// --- 6. DASHBOARD STATS ---
async function renderDashboard() {
  const apps = await (await fetch(`${API_BASE}/appointments`)).json();
  const paidApps = apps.filter(a => a.paymentStatus === 'Paid');
  const cash = paidApps.filter(a => a.paymentMethod === 'Cash').reduce((sum, a) => sum + (a.totalAmount||0), 0);
  const upi = paidApps.filter(a => a.paymentMethod === 'UPI').reduce((sum, a) => sum + (a.totalAmount||0), 0);
  
  document.getElementById('dashNet').innerText = "₹" + (cash + upi).toLocaleString();
  document.getElementById('salesCash').innerText = "₹" + cash.toLocaleString();
  document.getElementById('salesUPI').innerText = "₹" + upi.toLocaleString();
  document.getElementById('dashCount').innerText = apps.length;
}

// --- 7. CLIENTS ---
async function renderClients() {
  const apps = await (await fetch(`${API_BASE}/appointments`)).json();
  const tbody = document.getElementById('clientListBody');
  tbody.innerHTML = '';
  const clients = {};
  apps.forEach(a => {
    if(!clients[a.clientPhone]) {
      clients[a.clientPhone] = { name: a.clientName, phone: a.clientPhone, visits: 0, lastVisit: a.date };
    }
    clients[a.clientPhone].visits++;
    if(a.date > clients[a.clientPhone].lastVisit) clients[a.clientPhone].lastVisit = a.date;
  });
  Object.values(clients).forEach(c => {
    tbody.innerHTML += `<tr><td>${c.name}</td><td>${c.phone}</td><td>${c.visits}</td><td>${c.lastVisit}</td><td><button class="btn-new" style="padding:4px 8px;" onclick="viewHistory('${c.phone}')">View</button></td></tr>`;
  });
}

function showDayCloseReport() {
  const cash = document.getElementById('salesCash').innerText;
  const upi = document.getElementById('salesUPI').innerText;
  const total = document.getElementById('dashNet').innerText;
  alert(`=== DAY CLOSING TALLY ===\n\nCash: ${cash}\nUPI: ${upi}\n------------------\nTotal: ${total}`);
}
