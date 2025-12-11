/* admin/dashboard.js - FINAL VERSION */
(function checkSession() {
  const session = JSON.parse(localStorage.getItem("glam_session"));
  if (!session || !session.loggedIn) window.location.href = "admin.html";
})();

const API_BASE = "https://glam-backend-nw7q.onrender.com/api"; 
let allServices = []; // Store services for billing dropdown
let currentBillItems = []; // Store active items in current bill
let currentBillApptId = null; // ID of appointment being billed

document.addEventListener("DOMContentLoaded", () => {
  renderDashboard();
  renderAppointmentList();
  renderServices();
  renderBillingQueue();
  renderHistory();
  
  // Load services for dropdowns
  fetchServicesGlobal();
  
  // Attach Modal Forms
  document.getElementById('walkinForm').addEventListener('submit', handleWalkinSubmit);
  document.getElementById('serviceForm').addEventListener('submit', handleServiceSubmit);
});

// --- GLOBAL UTILS ---
function switchTab(tab) {
  document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
  document.getElementById(`view-${tab}`).style.display = 'block';
  document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
  event.currentTarget.classList.add('active');
  
  if(tab === 'dashboard') renderDashboard();
  if(tab === 'appointments') renderAppointmentList();
  if(tab === 'services') renderServices();
  if(tab === 'billing') renderBillingQueue();
  if(tab === 'history') renderHistory();
}

function logout() { localStorage.removeItem('glam_session'); window.location.href='admin.html'; }

async function fetchServicesGlobal() {
  const res = await fetch(`${API_BASE}/services`);
  allServices = await res.json();
}

// --- 1. DASHBOARD STATS (Green Trends Logic) ---
async function renderDashboard() {
  const apps = await (await fetch(`${API_BASE}/appointments`)).json();
  
  // Filter Paid
  const paidApps = apps.filter(a => a.paymentStatus === 'Paid');
  const totalNet = paidApps.reduce((sum, a) => sum + (a.totalAmount || a.price), 0);
  const totalBills = paidApps.length;
  
  // Filter Pending
  const pendingCount = apps.filter(a => a.paymentStatus === 'Unpaid' && a.status !== 'Completed').length;
  
  // Payment Splits
  const cashSales = paidApps.filter(a => a.paymentMethod === 'Cash').reduce((sum, a) => sum + (a.totalAmount||0), 0);
  const upiSales = paidApps.filter(a => a.paymentMethod === 'UPI').reduce((sum, a) => sum + (a.totalAmount||0), 0);
  
  // Update UI
  document.getElementById('dashNet').innerText = "₹" + totalNet.toLocaleString();
  document.getElementById('dashGross').innerText = "₹" + totalNet.toLocaleString(); // Gross = Net for now
  
  document.getElementById('countBills').innerText = totalBills;
  document.getElementById('salesCash').innerText = "₹" + cashSales;
  document.getElementById('salesUPI').innerText = "₹" + upiSales;
  document.getElementById('countPending').innerText = pendingCount;
  
  // Fake Gender Stats (since we don't track gender yet)
  document.getElementById('countMen').innerText = Math.round(totalBills * 0.4);
  document.getElementById('countWomen').innerText = Math.round(totalBills * 0.6);
  
  // Avg Sale
  const avg = totalBills > 0 ? Math.round(totalNet / totalBills) : 0;
  document.getElementById('avgSale').innerText = "₹" + avg;
}

// --- 2. APPOINTMENTS ---
async function renderAppointmentList() {
  const apps = await (await fetch(`${API_BASE}/appointments`)).json();
  const tbody = document.getElementById('apptListBody');
  tbody.innerHTML = '';
  apps.forEach(a => {
    let statusColor = a.status === 'Completed' ? '#d4edda' : '#fff3cd';
    tbody.innerHTML += `
      <tr>
        <td>${a.date} <br><small>${a.time}</small></td>
        <td><strong>${a.clientName}</strong><br><small>${a.clientPhone}</small></td>
        <td>${a.serviceName}</td>
        <td><span style="background:${statusColor}; padding:3px 6px; border-radius:4px;">${a.status}</span></td>
        <td><button class="btn-del" onclick="deleteAppt('${a._id}')"><i class="fas fa-trash"></i></button></td>
      </tr>`;
  });
}
async function deleteAppt(id) {
  if(confirm("Delete?")) { await fetch(`${API_BASE}/appointments/${id}`, { method: 'DELETE' }); renderAppointmentList(); }
}

// --- 3. SERVICES ---
async function renderServices() {
  await fetchServicesGlobal(); // Refresh list
  const tbody = document.getElementById('serviceListBody');
  tbody.innerHTML = '';
  allServices.forEach(s => {
    const val = JSON.stringify(s).replace(/'/g, "&apos;");
    tbody.innerHTML += `<tr><td>${s.name}</td><td>${s.category}</td><td>₹${s.price}</td><td><button onclick='deleteService("${s._id}")' class="btn-del"><i class="fas fa-trash"></i></button></td></tr>`;
  });
}
async function deleteService(id) {
  if(confirm("Delete Service?")) { await fetch(`${API_BASE}/services/${id}`, { method: 'DELETE' }); renderServices(); }
}

// --- 4. DYNAMIC BILLING (ADD/REMOVE ITEMS) ---
async function renderBillingQueue() {
  const apps = await (await fetch(`${API_BASE}/appointments`)).json();
  const unpaid = apps.filter(a => a.paymentStatus === 'Unpaid');
  const container = document.getElementById('billingQueue');
  container.innerHTML = unpaid.length ? '' : '<p style="text-align:center; padding:20px; color:#888;">No Pending Bills</p>';
  
  unpaid.forEach(a => {
    container.innerHTML += `
      <div class="queue-item" onclick="initBill('${a._id}')">
        <h4>${a.clientName}</h4>
        <small>${a.serviceName}</small>
        <div style="float:right; font-weight:bold; color:#27ae60;">₹${a.price}</div>
      </div>`;
  });
}

async function initBill(id) {
  const appt = await (await fetch(`${API_BASE}/appointments/${id}`)).json();
  currentBillApptId = id;
  currentBillItems = [];
  
  // Try to parse existing services, or just use the string
  // For simplicity in this version, we start with the booked amount as one item
  currentBillItems.push({ name: appt.serviceName, price: appt.price });
  
  document.getElementById('invoicePanel').style.display = 'flex';
  document.getElementById('invId').innerText = appt._id.slice(-4).toUpperCase();
  document.getElementById('invClientName').innerText = appt.clientName;
  
  // Fill dropdown
  const select = document.getElementById('billAddService');
  select.innerHTML = '';
  allServices.forEach(s => {
    select.innerHTML += `<option value='${JSON.stringify(s)}'>${s.name} - ₹${s.price}</option>`;
  });

  renderBillItems();
}

function addItemToBill() {
  const select = document.getElementById('billAddService');
  const service = JSON.parse(select.value);
  currentBillItems.push({ name: service.name, price: service.price });
  renderBillItems();
}

function removeItemFromBill(index) {
  currentBillItems.splice(index, 1);
  renderBillItems();
}

function renderBillItems() {
  const tbody = document.getElementById('billItemsBody');
  tbody.innerHTML = '';
  let subtotal = 0;
  
  currentBillItems.forEach((item, index) => {
    subtotal += item.price;
    tbody.innerHTML += `
      <tr>
        <td>${item.name}</td>
        <td>₹${item.price}</td>
        <td class="btn-remove-item" onclick="removeItemFromBill(${index})">&times;</td>
      </tr>`;
  });
  
  const gst = Math.round(subtotal * 0.05);
  const total = subtotal + gst;
  
  document.getElementById('invSub').innerText = subtotal;
  document.getElementById('invTax').innerText = gst;
  document.getElementById('invTotal').innerText = total;
}

async function processPayment(method) {
  if(!currentBillApptId) return;
  const gst = parseInt(document.getElementById('invTax').innerText);
  const total = parseInt(document.getElementById('invTotal').innerText);
  
  // Join all item names
  const finalServiceName = currentBillItems.map(i => i.name).join(" + ");
  const subTotal = parseInt(document.getElementById('invSub').innerText);

  await fetch(`${API_BASE}/appointments/${currentBillApptId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serviceName: finalServiceName, // Update services if changed
      price: subTotal,
      gst: gst,
      totalAmount: total,
      paymentStatus: 'Paid',
      status: 'Completed',
      paymentMethod: method
    })
  });
  
  alert("Payment Successful");
  document.getElementById('invoicePanel').style.display = 'none';
  renderBillingQueue();
}

// --- 5. BILLING HISTORY ---
async function renderHistory() {
  const apps = await (await fetch(`${API_BASE}/appointments`)).json();
  const paidApps = apps.filter(a => a.paymentStatus === 'Paid');
  const tbody = document.getElementById('historyListBody');
  tbody.innerHTML = '';
  
  paidApps.forEach(a => {
    tbody.innerHTML += `
      <tr>
        <td>${a.date}</td>
        <td>${a.clientName}</td>
        <td>${a.serviceName}</td>
        <td>₹${a.totalAmount}</td>
        <td>${a.paymentMethod}</td>
        <td>
          <button class="btn-print" onclick='printHistoryReceipt(${JSON.stringify(a)})'><i class="fas fa-print"></i></button>
        </td>
      </tr>`;
  });
}

function printHistoryReceipt(appt) {
  const content = `
    <div style="font-family:monospace; padding:20px; text-align:center;">
      <h2>GLAM SALON</h2>
      <p>DUPLICATE RECEIPT</p>
      <hr>
      <p>Client: ${appt.clientName}</p>
      <p>Service: ${appt.serviceName}</p>
      <p>Total: ₹${appt.totalAmount}</p>
    </div>
  `;
  document.getElementById('printArea').innerHTML = content;
  window.print();
}

// --- MODAL UTILS ---
function openWalkinModal() {
  populateWalkinDropdown();
  document.getElementById('walkinModal').style.display = 'block';
}
function closeWalkinModal() { document.getElementById('walkinModal').style.display = 'none'; }
function openServiceModal() { document.getElementById('serviceForm').reset(); document.getElementById('serviceModal').style.display='block'; }
function closeServiceModal() { document.getElementById('serviceModal').style.display='none'; }

async function populateWalkinDropdown() {
  const select = document.getElementById('wService');
  select.innerHTML = '';
  allServices.forEach(s => select.innerHTML += `<option value='${JSON.stringify(s)}'>${s.name} - ₹${s.price}</option>`);
}

document.getElementById('walkinForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const sData = JSON.parse(document.getElementById('wService').value);
  await fetch(`${API_BASE}/bookings`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      clientName: document.getElementById('wName').value,
      clientPhone: document.getElementById('wPhone').value,
      serviceName: sData.name,
      price: sData.price,
      date: document.getElementById('wDate').value || new Date().toISOString().split('T')[0],
      time: document.getElementById('wTime').value || "12:00",
      status: "In-Store",
      paymentStatus: "Unpaid"
    })
  });
  closeWalkinModal();
  switchTab('appointments');
});
// Service submit handler is identical to previous version, attached in init.
async function handleServiceSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('sId').value;
    const data = {
        name: document.getElementById('sName').value,
        category: document.getElementById('sCat').value,
        price: document.getElementById('sPrice').value
    };
    const url = id ? `${API_BASE}/services/${id}` : `${API_BASE}/services`;
    const method = id ? 'PUT' : 'POST';
    await fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    closeServiceModal();
    renderServices();
}
