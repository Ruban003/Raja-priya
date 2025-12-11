/* admin/dashboard.js - FIXED BOOKING & SPLIT PAYMENTS */

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
  flatpickr("#wDateTime", { enableTime: true, dateFormat: "Y-m-d H:i", minDate: "today" });
  flatpickr("#editDateTime", { enableTime: true, dateFormat: "Y-m-d H:i" });

  // Initial Load
  switchTab('dashboard'); 
  
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

  if(tab === 'dashboard') renderDashboard();
  if(tab === 'appointments') renderAppointmentList();
  if(tab === 'services') renderServices();
  if(tab === 'clients') renderClients();
  if(tab === 'billing') renderBillingQueue();
  if(tab === 'reports') renderReport();
}

function logout() { localStorage.removeItem('glam_session'); window.location.href='admin.html'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// --- WALKIN BOOKING (FIXED) ---
function openWalkinModal() {
  document.getElementById('walkinModal').style.display = 'block';
  
  // Reset Form
  document.getElementById('walkinForm').reset();
  
  // Set default Date to Now
  const now = new Date();
  document.getElementById('wDateTime')._flatpickr.setDate(now);

  // Populate Services
  const sel = document.getElementById('wService');
  sel.innerHTML = '<option value="" disabled selected>-- Select Service --</option>';
  
  if(allServices.length === 0) {
     sel.innerHTML += '<option disabled>Loading services...</option>';
     // Try fetching again if empty
     renderServices().then(() => {
         sel.innerHTML = '<option value="" disabled selected>-- Select Service --</option>';
         allServices.forEach(s => {
            const val = JSON.stringify({ name: s.name, price: s.price });
            sel.innerHTML += `<option value='${val}'>${s.name} - ₹${s.price}</option>`;
         });
     });
  } else {
     allServices.forEach(s => {
        const val = JSON.stringify({ name: s.name, price: s.price });
        sel.innerHTML += `<option value='${val}'>${s.name} - ₹${s.price}</option>`;
     });
  }
}

async function handleWalkinSubmit(e) {
  e.preventDefault();
  
  const name = document.getElementById('wName').value;
  const phone = document.getElementById('wPhone').value;
  const serviceVal = document.getElementById('wService').value;
  const dateVal = document.getElementById('wDateTime').value;

  // 1. Validate Inputs
  if (!serviceVal) { alert("⚠️ Please select a Service!"); return; }
  if (!dateVal) { alert("⚠️ Please select Date & Time!"); return; }

  try {
    const s = JSON.parse(serviceVal); // This is where it failed before
    const dt = dateVal.split(' '); // "2025-12-12 14:00"

    const payload = {
      clientName: name,
      clientPhone: phone,
      clientGender: document.getElementById('wGender').value,
      serviceName: s.name,
      price: s.price,
      date: dt[0], 
      time: dt[1],
      status: "In-Store", 
      paymentStatus: "Unpaid"
    };

    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });

    if(res.ok) {
        alert("✅ Booking Successful!");
        closeModal('walkinModal');
        switchTab('appointments');
    } else {
        alert("❌ Error saving booking.");
    }
  } catch (err) {
    console.error(err);
    alert("❌ Error: " + err.message);
  }
}

// --- BILLING & SPLIT PAYMENT ---
async function renderBillingQueue() {
  const apps = await (await fetch(`${API_BASE}/appointments`)).json();
  const unpaid = apps.filter(a => a.paymentStatus === 'Unpaid');
  const div = document.getElementById('billingQueue');
  div.innerHTML = unpaid.length ? '' : '<p style="padding:20px; text-align:center; color:#888;">No Pending Bills</p>';
  
  unpaid.forEach(a => {
    div.innerHTML += `
      <div class="queue-item" onclick="initBill('${a._id}')">
        <b>${a.clientName}</b><br>
        <span style="font-size:0.85rem">${a.serviceName}</span>
      </div>`;
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
  const val = document.getElementById('billAddService').value;
  if(!val) return;
  const s = JSON.parse(val);
  currentBillItems.push({ name: s.name, price: s.price });
  renderBillItems();
}

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
        <td><button style="color:red; background:none; border:none; cursor:pointer; font-weight:bold;" onclick="removeItemFromBill(${index})">X</button></td>
      </tr>`;
  });
  
  document.getElementById('invTotal').innerText = total;
  document.getElementById('payCash').value = 0;
  document.getElementById('payUPI').value = 0;
  calculateBalance();
}

function calculateBalance() {
  const total = parseInt(document.getElementById('invTotal').innerText) || 0;
  const cash = parseInt(document.getElementById('payCash').value) || 0;
  const upi = parseInt(document.getElementById('payUPI').value) || 0;
  
  const balance = total - (cash + upi);
  const balEl = document.getElementById('payBalance');
  const btn = document.getElementById('btnCompleteBill');
  
  balEl.innerText = balance;
  
  if (balance === 0 && total > 0) {
    btn.disabled = false;
    btn.style.background = "#27ae60"; 
    btn.innerText = "Complete Bill";
    balEl.style.color = "green";
  } else {
    btn.disabled = true;
    btn.style.background = "#ccc";
    balEl.style.color = "red";
    btn.innerText = balance > 0 ? "Amount Pending" : "Excess Amount";
  }
}

async function processSplitPayment() {
  const total = parseInt(document.getElementById('invTotal').innerText);
  const cash = parseInt(document.getElementById('payCash').value) || 0;
  const upi = parseInt(document.getElementById('payUPI').value) || 0;
  const names = currentBillItems.map(i => i.name).join(' + ');

  let method = "Split";
  if(cash === total) method = "Cash";
  else if(upi === total) method = "UPI";
  else method = `Split (Cash:${cash}, UPI:${upi})`;

  await fetch(`${API_BASE}/appointments/${currentBillApptId}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ 
      paymentStatus: 'Paid', status: 'Completed', totalAmount: total, paymentMethod: method, serviceName: names, cashAmount: cash, upiAmount: upi 
    })
  });
  
  document.getElementById('invoicePanel').style.display = 'none';
  renderBillingQueue();
  renderDashboard();
  alert("Bill Saved!");
}

// --- DASHBOARD & REPORTS ---
async function renderDashboard() {
  const apps = await (await fetch(`${API_BASE}/appointments`)).json();
  const paidApps = apps.filter(a => a.paymentStatus === 'Paid');
  
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
  let total = 0;
  filtered.forEach(a => {
    total += a.totalAmount;
    tbody.innerHTML += `<tr><td>#${a._id.slice(-4).toUpperCase()}</td><td>${a.clientName}</td><td>${a.serviceName}</td><td>₹${a.totalAmount}</td><td>${a.paymentMethod}</td></tr>`;
  });
  document.getElementById('reportRevenue').innerText = total.toLocaleString();
}

// --- APPOINTMENTS LIST ---
async function renderAppointmentList() {
  const apps = await (await fetch(`${API_BASE}/appointments`)).json();
  const tbody = document.getElementById('apptListBody');
  tbody.innerHTML = '';
  
  document.getElementById('apptTotal').innerText = apps.length;
  document.getElementById('apptDone').innerText = apps.filter(a => a.status === 'Completed').length;
  document.getElementById('apptPending').innerText = apps.filter(a => a.status === 'Pending' || a.status === 'In-Store').length;

  apps.forEach(a => {
    let btn = a.paymentStatus === 'Unpaid' 
      ? `<button class="btn-new" style="background:#e67e22; padding:6px 12px; font-size:0.8rem;" onclick="moveToBill('${a._id}')">Bill ➔</button>` 
      : `<span style="color:#27ae60;font-weight:bold;">Paid</span>`;
      
    const safeName = a.clientName.replace(/'/g, "");

    tbody.innerHTML += `
      <tr>
        <td>${a.date}<br><small>${a.time}</small></td>
        <td><strong>${a.clientName}</strong><br><small>${a.clientPhone}</small></td>
        <td>${a.serviceName}</td>
        <td>${a.status}</td>
        <td>${btn}</td>
        <td>
          <button class="btn-edit" onclick="openEditAppt('${a._id}', '${safeName}', '${a.date} ${a.time}', '${a.status}')"><i class="fas fa-edit"></i></button>
        </td>
      </tr>`;
  });
}

function moveToBill(id) { switchTab('billing'); initBill(id); }

function openEditAppt(id, name, datetime, status) {
  document.getElementById('editApptId').value = id;
  document.getElementById('editName').value = name;
  document.getElementById('editStatus').value = status;
  document.getElementById('editDateTime')._flatpickr.setDate(datetime);
  document.getElementById('editApptModal').style.display = 'block';
}

async function handleEditApptSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('editApptId').value;
  const dt = document.getElementById('editDateTime').value.split(' ');
  await fetch(`${API_BASE}/appointments/${id}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ clientName: document.getElementById('editName').value, date: dt[0], time: dt[1], status: document.getElementById('editStatus').value })
  });
  closeModal('editApptModal');
  renderAppointmentList();
}

// --- SERVICES & CLIENTS ---
async function renderServices() {
  const res = await fetch(`${API_BASE}/services`);
  allServices = await res.json();
  const tbody = document.getElementById('serviceListBody');
  tbody.innerHTML = '';
  allServices.forEach(s => {
    const safeObj = JSON.stringify(s).replace(/'/g, "&apos;");
    tbody.innerHTML += `<tr><td>${s.name}</td><td>${s.category}</td><td>₹${s.price}</td><td><button class="btn-del" onclick="deleteService('${s._id}')"><i class="fas fa-trash"></i></button></td></tr>`;
  });
}
async function deleteService(id) { if(confirm("Delete?")) { await fetch(`${API_BASE}/services/${id}`, { method: 'DELETE' }); renderServices(); } }
async function handleServiceSubmit(e) { 
    e.preventDefault(); 
    await fetch(`${API_BASE}/services`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ name: document.getElementById('sName').value, category: document.getElementById('sCat').value, price: document.getElementById('sPrice').value }) });
    closeModal('serviceModal'); renderServices(); 
}

async function renderClients() {
  const apps = await (await fetch(`${API_BASE}/appointments`)).json();
  const tbody = document.getElementById('clientListBody');
  tbody.innerHTML = '';
  const clients = {};
  apps.forEach(a => { if(!clients[a.clientPhone]) clients[a.clientPhone] = { name: a.clientName, phone: a.clientPhone, visits: 0 }; clients[a.clientPhone].visits++; });
  Object.values(clients).forEach(c => tbody.innerHTML += `<tr><td>${c.name}</td><td>${c.phone}</td><td>${c.visits}</td><td><button class="btn-new" style="padding:5px;" onclick="alert('History View Coming Soon')">View</button></td></tr>`);
}

function showDayCloseReport() {
  const cash = document.getElementById('salesCash').innerText;
  const upi = document.getElementById('salesUPI').innerText;
  const total = document.getElementById('dashNet').innerText;
  alert(`=== DAY TALLY ===\nCash: ${cash}\nUPI: ${upi}\nTotal: ${total}`);
}
