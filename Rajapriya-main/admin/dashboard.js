/* admin/dashboard.js - SPLIT PAYMENT LOGIC */
(function checkSession() {
  const session = JSON.parse(localStorage.getItem("glam_session"));
  if (!session || !session.loggedIn) window.location.href = "admin.html";
})();

const API_BASE = "https://glam-backend-nw7q.onrender.com/api"; 
let allServices = [];
let currentBillItems = [];
let currentBillApptId = null;

document.addEventListener("DOMContentLoaded", () => {
  flatpickr("#reportDate", { dateFormat: "Y-m-d", defaultDate: "today" });
  flatpickr("#wDateTime", { enableTime: true, dateFormat: "Y-m-d H:i" });
  flatpickr("#editDateTime", { enableTime: true, dateFormat: "Y-m-d H:i" });

  switchTab('dashboard'); // Load initial data
  
  document.getElementById('serviceForm').addEventListener('submit', handleServiceSubmit);
  document.getElementById('walkinForm').addEventListener('submit', handleWalkinSubmit);
  document.getElementById('editApptForm').addEventListener('submit', handleEditApptSubmit);
});

function switchTab(tab) {
  document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
  document.getElementById(`view-${tab}`).style.display = 'block';
  document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
  event.currentTarget.classList.add('active');

  if(tab === 'dashboard') renderDashboard();
  if(tab === 'appointments') renderAppointmentList();
  if(tab === 'services') renderServices();
  if(tab === 'clients') renderClients();
  if(tab === 'billing') renderBillingQueue();
  if(tab === 'reports') renderReport();
}

function logout() { localStorage.removeItem('glam_session'); window.location.href='admin.html'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// --- BILLING & SPLIT PAYMENT LOGIC ---
async function renderBillingQueue() {
  const apps = await (await fetch(`${API_BASE}/appointments`)).json();
  const unpaid = apps.filter(a => a.paymentStatus === 'Unpaid');
  const div = document.getElementById('billingQueue');
  div.innerHTML = unpaid.length ? '' : '<p style="padding:20px; text-align:center;">No Pending Bills</p>';
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

  // Populate Add Service Dropdown
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

// 🛑 REMOVE SERVICE FROM BILL
function removeItemFromBill(index) {
  currentBillItems.splice(index, 1);
  renderBillItems();
}

function renderBillItems() {
  let total = 0;
  const tbody = document.getElementById('billItemsBody');
  tbody.innerHTML = '';
  
  currentBillItems.forEach((i, index) => {
    total += i.price;
    tbody.innerHTML += `
      <tr>
        <td>${i.name}</td>
        <td>₹${i.price}</td>
        <td><button style="color:red; font-weight:bold; border:none; background:none; cursor:pointer;" onclick="removeItemFromBill(${index})">X</button></td>
      </tr>`;
  });
  
  document.getElementById('invTotal').innerText = total;
  
  // Reset Payment Inputs
  document.getElementById('payCash').value = 0;
  document.getElementById('payUPI').value = 0;
  calculateBalance();
}

// 💰 CALCULATE CASH + UPI
function calculateBalance() {
  const total = parseInt(document.getElementById('invTotal').innerText) || 0;
  const cash = parseInt(document.getElementById('payCash').value) || 0;
  const upi = parseInt(document.getElementById('payUPI').value) || 0;
  
  const balance = total - (cash + upi);
  document.getElementById('payBalance').innerText = balance;
  
  const btn = document.getElementById('btnCompleteBill');
  
  if (balance === 0 && total > 0) {
    btn.disabled = false;
    btn.style.background = "#27ae60"; // Green
    btn.innerText = "Complete Bill (Amount Matched)";
  } else {
    btn.disabled = true;
    btn.style.background = "#ccc"; // Grey
    if(balance > 0) btn.innerText = `Collect ₹${balance} more`;
    if(balance < 0) btn.innerText = `Excess amount entered!`;
  }
}

async function processSplitPayment() {
  const total = parseInt(document.getElementById('invTotal').innerText);
  const cash = parseInt(document.getElementById('payCash').value) || 0;
  const upi = parseInt(document.getElementById('payUPI').value) || 0;
  const names = currentBillItems.map(i => i.name).join(' + ');

  let method = "Mixed";
  if(cash === total) method = "Cash";
  if(upi === total) method = "UPI";
  if(cash > 0 && upi > 0) method = `Split (Cash:${cash}, UPI:${upi})`;

  await fetch(`${API_BASE}/appointments/${currentBillApptId}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ 
      paymentStatus: 'Paid', 
      status: 'Completed', 
      totalAmount: total, 
      paymentMethod: method, 
      serviceName: names,
      cashAmount: cash, // Save precise amounts
      upiAmount: upi 
    })
  });
  
  document.getElementById('invoicePanel').style.display = 'none';
  renderBillingQueue();
  renderDashboard();
  alert("Bill Saved Successfully!");
}

// --- DASHBOARD & REPORTS (UPDATED FOR SPLIT) ---
async function renderDashboard() {
  const apps = await (await fetch(`${API_BASE}/appointments`)).json();
  const paidApps = apps.filter(a => a.paymentStatus === 'Paid');
  
  // Summing up cash and UPI amounts directly from DB
  const cashTotal = paidApps.reduce((sum, a) => sum + (a.cashAmount || 0), 0);
  const upiTotal = paidApps.reduce((sum, a) => sum + (a.upiAmount || 0), 0);
  const totalRev = cashTotal + upiTotal;

  document.getElementById('dashNet').innerText = "₹" + totalRev.toLocaleString();
  document.getElementById('salesCash').innerText = "₹" + cashTotal.toLocaleString();
  document.getElementById('salesUPI').innerText = "₹" + upiTotal.toLocaleString();
  document.getElementById('dashCount').innerText = apps.length;
}

async function renderReport() {
  const date = document.getElementById('reportDate').value;
  const apps = await (await fetch(`${API_BASE}/appointments`)).json();
  const filtered = apps.filter(a => a.date === date && a.paymentStatus === 'Paid');
  
  const tbody = document.getElementById('reportListBody');
  tbody.innerHTML = '';
  let dayTotal = 0;
  
  filtered.forEach(a => {
    dayTotal += a.totalAmount;
    tbody.innerHTML += `<tr><td>#${a._id.slice(-4)}</td><td>${a.clientName}</td><td>${a.serviceName}</td><td>₹${a.totalAmount}</td><td>${a.paymentMethod}</td></tr>`;
  });
  document.getElementById('reportRevenue').innerText = dayTotal.toLocaleString();
}

// --- STANDARD FUNCTIONS (Appt, Services, etc.) ---
async function renderAppointmentList() {
  const apps = await (await fetch(`${API_BASE}/appointments`)).json();
  const tbody = document.getElementById('apptListBody');
  tbody.innerHTML = '';
  
  // Appt Stats
  document.getElementById('apptTotal').innerText = apps.length;
  document.getElementById('apptDone').innerText = apps.filter(a => a.status === 'Completed').length;
  document.getElementById('apptPending').innerText = apps.filter(a => a.status === 'Pending').length;

  apps.forEach(a => {
    const btn = a.paymentStatus === 'Unpaid' 
      ? `<button class="btn-new" onclick="initBill('${a._id}')">Bill</button>` 
      : `<span style="color:green;font-weight:bold;">Paid</span>`;
      
    tbody.innerHTML += `<tr><td>${a.date} ${a.time}</td><td>${a.clientName}</td><td>${a.serviceName}</td><td>${a.status}</td><td>${btn}</td><td><button onclick="openEditAppt('${a._id}','${a.clientName}','${a.date} ${a.time}','${a.status}')">✏️</button></td></tr>`;
  });
}
async function renderServices() {
  const res = await fetch(`${API_BASE}/services`);
  allServices = await res.json();
  const tbody = document.getElementById('serviceListBody');
  tbody.innerHTML = '';
  allServices.forEach(s => {
    // 🛑 DELETE BUTTON FOR SERVICES
    tbody.innerHTML += `<tr><td>${s.name}</td><td>${s.category}</td><td>₹${s.price}</td><td><button onclick="deleteService('${s._id}')" style="color:red;">Delete</button></td></tr>`;
  });
}
async function deleteService(id) { if(confirm("Remove Service?")) { await fetch(`${API_BASE}/services/${id}`, { method: 'DELETE' }); renderServices(); } }
async function renderClients() { /* Client list logic same as before */ }

function openEditAppt(id,name,dt,stat) { document.getElementById('editApptId').value=id; document.getElementById('editName').value=name; document.getElementById('editDateTime')._flatpickr.setDate(dt); document.getElementById('editStatus').value=stat; document.getElementById('editApptModal').style.display='block'; }
async function handleEditApptSubmit(e) { 
    e.preventDefault(); 
    const id=document.getElementById('editApptId').value;
    const d=document.getElementById('editDateTime').value.split(' ');
    await fetch(`${API_BASE}/appointments/${id}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({clientName:document.getElementById('editName').value, date:d[0], time:d[1], status:document.getElementById('editStatus').value})});
    closeModal('editApptModal'); renderAppointmentList(); 
}
// ... Walkin/Service submit logic remains standard ...
async function handleServiceSubmit(e) { e.preventDefault(); /* ... */ closeModal('serviceModal'); renderServices(); }
async function handleWalkinSubmit(e) { e.preventDefault(); /* ... */ closeModal('walkinModal'); switchTab('appointments'); }
