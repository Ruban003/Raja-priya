/* admin/dashboard.js - FINAL LOCALHOST VERSION */

// Check Login
(function checkSession() {
  const session = JSON.parse(localStorage.getItem("glam_session"));
  if (!session || !session.loggedIn) window.location.href = "admin.html";
})();

// --- POINT TO LOCALHOST ---
const API_BASE = "http://localhost:5000/api"; 
let allServices = [];
let currentBillItems = [];
let currentBillApptId = null;

document.addEventListener("DOMContentLoaded", () => {
  try {
    flatpickr("#reportDate", { dateFormat: "Y-m-d", defaultDate: "today" });
    flatpickr("#wDateTime", { enableTime: true, dateFormat: "Y-m-d H:i", minDate: "today" });
    flatpickr("#editDateTime", { enableTime: true, dateFormat: "Y-m-d H:i" });
  } catch(e) { console.warn("Flatpickr missing"); }

  switchTab('dashboard'); 
  
  const sForm = document.getElementById('serviceForm');
  if(sForm) sForm.addEventListener('submit', handleServiceSubmit);
  const wForm = document.getElementById('walkinForm');
  if(wForm) wForm.addEventListener('submit', handleWalkinSubmit);
  const eForm = document.getElementById('editApptForm');
  if(eForm) eForm.addEventListener('submit', handleEditApptSubmit);
});

// --- NAVIGATION ---
function switchTab(tabName) {
  document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
  const activeView = document.getElementById(`view-${tabName}`);
  if(activeView) activeView.style.display = 'block';
  
  // Refresh Data
  if(tabName === 'dashboard') renderDashboard();
  if(tabName === 'appointments') renderAppointmentList();
  if(tabName === 'services') renderServices();
  if(tabName === 'clients') renderClients();
  if(tabName === 'billing') renderBillingQueue();
  if(tabName === 'reports') renderReport(); // This calls the fixed function below
}

function logout() { localStorage.removeItem('glam_session'); window.location.href='admin.html'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// --- DASHBOARD ---
async function renderDashboard() {
  try {
    const res = await fetch(`${API_BASE}/appointments`);
    const apps = await res.json();
    const paidApps = apps.filter(a => a.paymentStatus === 'Paid');
    
    let cashTotal = 0, upiTotal = 0, grandTotal = 0;
    paidApps.forEach(a => {
        if (a.cashAmount || a.upiAmount) {
            cashTotal += (a.cashAmount || 0);
            upiTotal += (a.upiAmount || 0);
        } else {
            if (a.paymentMethod === 'Cash') cashTotal += a.totalAmount;
            else if (a.paymentMethod === 'UPI') upiTotal += a.totalAmount;
        }
        grandTotal += a.totalAmount;
    });

    document.getElementById('dashNet').innerText = "₹" + grandTotal.toLocaleString();
    document.getElementById('salesCash').innerText = "₹" + cashTotal.toLocaleString();
    document.getElementById('salesUPI').innerText = "₹" + upiTotal.toLocaleString();
    document.getElementById('dashCount').innerText = apps.length;
  } catch(e) { console.error("API Error - Is Server Running?", e); }
}

// --- APPOINTMENTS & BOOKING ---
async function renderAppointmentList() {
  const apps = await (await fetch(`${API_BASE}/appointments`)).json();
  const tbody = document.getElementById('apptListBody');
  if(!tbody) return;
  tbody.innerHTML = '';
  
  document.getElementById('apptTotal').innerText = apps.length;
  document.getElementById('apptDone').innerText = apps.filter(a => a.status === 'Completed').length;
  document.getElementById('apptPending').innerText = apps.filter(a => a.status === 'Pending').length;

  apps.forEach(a => {
    let btn = a.paymentStatus === 'Unpaid' 
      ? `<button class="btn-new" style="background:#e67e22; padding:5px 10px;" onclick="moveToBill('${a._id}')">Bill ➔</button>` 
      : `<span style="color:#27ae60;font-weight:bold;">Paid</span>`;
      
    tbody.innerHTML += `<tr><td>${a.date}<br><small>${a.time}</small></td><td>${a.clientName}<br><small>${a.clientPhone}</small></td><td>${a.serviceName}</td><td>${a.status}</td><td>${btn}</td><td><button class="btn-edit" onclick="openEditAppt('${a._id}','${a.clientName}','${a.date} ${a.time}','${a.status}')">Edit</button></td></tr>`;
  });
}

function openWalkinModal() {
  const modal = document.getElementById('walkinModal');
  modal.style.display = 'block';
  const sel = document.getElementById('wService');
  sel.innerHTML = '<option value="" disabled selected>-- Select Service --</option>';
  
  if (allServices.length === 0) {
     renderServices().then(() => {
         allServices.forEach(s => {
            sel.innerHTML += `<option value='${JSON.stringify({name:s.name, price:s.price})}'>${s.name} - ₹${s.price}</option>`;
         });
     });
  } else {
     allServices.forEach(s => {
        sel.innerHTML += `<option value='${JSON.stringify({name:s.name, price:s.price})}'>${s.name} - ₹${s.price}</option>`;
     });
  }
}

async function handleWalkinSubmit(e) {
  e.preventDefault();
  const serviceVal = document.getElementById('wService').value;
  if (!serviceVal) { alert("⚠️ Please select a Service!"); return; }
  
  const s = JSON.parse(serviceVal);
  const dt = document.getElementById('wDateTime').value.split(' ');

  await fetch(`${API_BASE}/bookings`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      clientName: document.getElementById('wName').value,
      clientPhone: document.getElementById('wPhone').value,
      serviceName: s.name, price: s.price,
      date: dt[0], time: dt[1] || "12:00",
      status: "In-Store"
    })
  });
  closeModal('walkinModal');
  switchTab('appointments');
}

// --- BILLING ---
async function renderBillingQueue() {
  const apps = await (await fetch(`${API_BASE}/appointments`)).json();
  const unpaid = apps.filter(a => a.paymentStatus === 'Unpaid');
  const div = document.getElementById('billingQueue');
  div.innerHTML = unpaid.length ? '' : '<p style="padding:20px; text-align:center;">No Pending Bills</p>';
  unpaid.forEach(a => div.innerHTML += `<div class="queue-item" onclick="initBill('${a._id}')"><b>${a.clientName}</b><br>${a.serviceName}</div>`);
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
  const val = document.getElementById('billAddService').value;
  if(!val) return;
  const s = JSON.parse(val);
  currentBillItems.push({ name: s.name, price: s.price });
  renderBillItems();
}

function renderBillItems() {
  let total = 0;
  const tbody = document.getElementById('billItemsBody');
  tbody.innerHTML = '';
  currentBillItems.forEach((i, index) => {
    total += i.price;
    tbody.innerHTML += `<tr><td>${i.name}</td><td>₹${i.price}</td><td><button style="color:red; cursor:pointer;" onclick="removeItem(${index})">X</button></td></tr>`;
  });
  document.getElementById('invTotal').innerText = total;
  calculateBalance();
}

function removeItem(index) { currentBillItems.splice(index, 1); renderBillItems(); }

function calculateBalance() {
  const total = parseInt(document.getElementById('invTotal').innerText) || 0;
  const cash = parseInt(document.getElementById('payCash').value) || 0;
  const upi = parseInt(document.getElementById('payUPI').value) || 0;
  const balance = total - (cash + upi);
  const btn = document.getElementById('btnCompleteBill');
  
  document.getElementById('payBalance').innerText = balance;
  if (balance === 0 && total > 0) {
    btn.disabled = false; btn.style.background = "#27ae60"; btn.innerText = "Complete Bill";
  } else {
    btn.disabled = true; btn.style.background = "#ccc";
  }
}

async function processSplitPayment() {
  const total = parseInt(document.getElementById('invTotal').innerText);
  const cash = parseInt(document.getElementById('payCash').value) || 0;
  const upi = parseInt(document.getElementById('payUPI').value) || 0;
  const names = currentBillItems.map(i => i.name).join(' + ');
  
  let method = "Split";
  if(cash === total) method = "Cash"; else if(upi === total) method = "UPI";
  
  await fetch(`${API_BASE}/appointments/${currentBillApptId}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ 
      paymentStatus: 'Paid', status: 'Completed', 
      totalAmount: total, paymentMethod: method, 
      serviceName: names, cashAmount: cash, upiAmount: upi 
    })
  });
  document.getElementById('invoicePanel').style.display = 'none';
  renderBillingQueue(); renderDashboard();
  alert("✅ Bill Saved!");
}

function moveToBill(id) { switchTab('billing'); initBill(id); }

// --- SERVICES ---
async function renderServices() {
  const res = await fetch(`${API_BASE}/services`);
  allServices = await res.json();
  const tbody = document.getElementById('serviceListBody');
  if(tbody) {
      tbody.innerHTML = '';
      allServices.forEach(s => tbody.innerHTML += `<tr><td>${s.name}</td><td>${s.category}</td><td>₹${s.price}</td><td><button class="btn-del" onclick="deleteService('${s._id}')">Del</button></td></tr>`);
  }
}
async function deleteService(id) { if(confirm("Delete?")) { await fetch(`${API_BASE}/services/${id}`, { method: 'DELETE' }); renderServices(); } }
async function handleServiceSubmit(e) { 
    e.preventDefault(); 
    await fetch(`${API_BASE}/services`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ name: document.getElementById('sName').value, category: document.getElementById('sCat').value, price: document.getElementById('sPrice').value }) });
    closeModal('serviceModal'); renderServices(); 
}

// --- CLIENTS (Restored Logic) ---
async function renderClients() {
  try {
      const apps = await (await fetch(`${API_BASE}/appointments`)).json();
      const tbody = document.getElementById('clientListBody');
      if(!tbody) return;
      tbody.innerHTML = '';
      
      const clients = {};
      apps.forEach(a => {
        if(!clients[a.clientPhone]) {
            clients[a.clientPhone] = { name: a.clientName, phone: a.clientPhone, visits: 0, last: a.date };
        }
        clients[a.clientPhone].visits++;
      });
      
      Object.values(clients).forEach(c => {
        tbody.innerHTML += `<tr><td>${c.name}</td><td>${c.phone}</td><td>${c.visits} Visits</td><td><button class="btn-new" onclick="alert('Last Visit: ${c.last}')">Info</button></td></tr>`;
      });
  } catch(e) { console.error(e); }
}

// --- REPORTS (Restored Logic) ---
async function renderReport() {
  const dateInput = document.getElementById('reportDate').value;
  if(!dateInput) { alert("⚠️ Select a date!"); return; }

  const apps = await (await fetch(`${API_BASE}/appointments`)).json();
  const filtered = apps.filter(a => a.date === dateInput && a.paymentStatus === 'Paid');
  const tbody = document.getElementById('reportListBody');
  if(!tbody) return;
  
  tbody.innerHTML = '';
  let total = 0;
  
  if(filtered.length === 0) {
      tbody.innerHTML = "<tr><td colspan='5' style='text-align:center; padding:15px;'>No Sales</td></tr>";
  } else {
      filtered.forEach(a => {
        total += a.totalAmount;
        tbody.innerHTML += `<tr><td>#${a._id.slice(-4)}</td><td>${a.clientName}</td><td>${a.serviceName}</td><td>₹${a.totalAmount}</td><td>${a.paymentMethod}</td></tr>`;
      });
  }
  
  const totalDiv = document.getElementById('reportRevenue');
  if(totalDiv) totalDiv.innerText = total.toLocaleString();
}

// Edit Functions
function openEditAppt(id, n, dt, s) { document.getElementById('editApptId').value=id; document.getElementById('editName').value=n; document.getElementById('editStatus').value=s; document.getElementById('editApptModal').style.display='block'; }
async function handleEditApptSubmit(e) { e.preventDefault(); const id = document.getElementById('editApptId').value; const dt = document.getElementById('editDateTime').value.split(' '); await fetch(`${API_BASE}/appointments/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ clientName: document.getElementById('editName').value, date: dt[0], time: dt[1], status: document.getElementById('editStatus').value }) }); closeModal('editApptModal'); renderAppointmentList(); }