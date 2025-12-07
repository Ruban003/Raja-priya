/* admin/dashboard.js */

// SECURITY
(function checkSession() {
  const session = JSON.parse(localStorage.getItem("glam_session"));
  if (!session || !session.loggedIn) window.location.href = "admin.html";
})();

const API_BASE = "https://glam-backend-nw7q.onrender.com/api"; // CHANGE THIS IF NEEDED

document.addEventListener("DOMContentLoaded", () => {
  renderDashboard();
  renderServices(); // New
  renderAppointmentList();
  renderBillingQueue();
  
  // Handle Service Form
  document.getElementById('serviceForm').addEventListener('submit', handleServiceSubmit);
});

// --- NAVIGATION ---
function switchTab(tab) {
  document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
  document.getElementById(`view-${tab}`).style.display = 'block';
  document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
  event.target.closest('.menu-item').classList.add('active');
  if(tab === 'services') renderServices();
}

// --- SERVICES MANAGEMENT (NEW) ---
async function renderServices() {
  const res = await fetch(`${API_BASE}/services`);
  const services = await res.json();
  const tbody = document.getElementById('serviceListBody');
  tbody.innerHTML = '';

  services.forEach(s => {
    tbody.innerHTML += `
      <tr>
        <td>${s.name}</td>
        <td>${s.category}</td>
        <td>₹${s.price}</td>
        <td>
          <button class="btn-edit" onclick='editService(${JSON.stringify(s)})'><i class="fas fa-edit"></i></button>
          <button class="btn-del" onclick="deleteService('${s._id}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`;
  });
}

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

  await fetch(url, {
    method: method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  closeServiceModal();
  renderServices();
}

function editService(s) {
  document.getElementById('modalTitle').innerText = "Edit Service";
  document.getElementById('sId').value = s._id; // Hidden ID
  document.getElementById('sName').value = s.name;
  document.getElementById('sCat').value = s.category;
  document.getElementById('sPrice').value = s.price;
  document.getElementById('serviceModal').style.display = 'block';
}

async function deleteService(id) {
  if(confirm("Delete this service?")) {
    await fetch(`${API_BASE}/services/${id}`, { method: 'DELETE' });
    renderServices();
  }
}

// --- APPOINTMENTS & BILLING ---
async function renderAppointmentList() {
  const apps = await (await fetch(`${API_BASE}/appointments`)).json();
  const tbody = document.getElementById('apptListBody');
  tbody.innerHTML = '';
  apps.forEach(a => {
    tbody.innerHTML += `
      <tr>
        <td>${a.date}</td>
        <td>${a.clientName}</td>
        <td>${a.serviceName}</td>
        <td>${a.status}</td>
        <td><button class="btn-del" onclick="deleteAppt('${a._id}')">X</button></td>
      </tr>`;
  });
}

async function deleteAppt(id) {
  if(confirm("Delete?")) {
    await fetch(`${API_BASE}/appointments/${id}`, { method: 'DELETE' });
    renderAppointmentList();
  }
}

async function renderBillingQueue() {
  const apps = await (await fetch(`${API_BASE}/appointments`)).json();
  const unpaid = apps.filter(a => a.paymentStatus === 'Unpaid');
  const div = document.getElementById('billingQueue');
  div.innerHTML = unpaid.length ? '' : 'No bills';
  unpaid.forEach(a => {
    div.innerHTML += `<div class="queue-item" onclick="loadBill('${a._id}')"><h4>${a.clientName}</h4><p>₹${a.price}</p></div>`;
  });
}

async function loadBill(id) {
  const appt = await (await fetch(`${API_BASE}/appointments/${id}`)).json();
  document.getElementById('invoicePanel').style.display = 'block';
  document.getElementById('invName').innerText = appt.clientName;
  document.getElementById('invService').innerText = appt.serviceName;
  document.getElementById('invSub').innerText = appt.price;
  const gst = Math.round(appt.price * 0.05);
  document.getElementById('invTax').innerText = gst;
  document.getElementById('invTotal').innerText = appt.price + gst;
  
  // Store current ID for payment
  document.getElementById('invoicePanel').dataset.id = id;
}

async function processPayment(method) {
  const id = document.getElementById('invoicePanel').dataset.id;
  await fetch(`${API_BASE}/appointments/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentStatus: 'Paid', status: 'Completed' })
  });
  document.getElementById('invoicePanel').style.display = 'none';
  renderBillingQueue();
}

function logout() { localStorage.removeItem('glam_session'); window.location.href='admin.html'; }
function openServiceModal() { 
  document.getElementById('serviceForm').reset(); 
  document.getElementById('sId').value = ""; 
  document.getElementById('modalTitle').innerText = "Add Service";
  document.getElementById('serviceModal').style.display = 'block'; 
}
function closeServiceModal() { document.getElementById('serviceModal').style.display = 'none'; }