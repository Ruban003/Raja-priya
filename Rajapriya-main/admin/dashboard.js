/* admin/dashboard.js */

// 1. SECURITY: Check Login
(function checkSession() {
  const session = JSON.parse(localStorage.getItem("glam_session"));
  if (!session || !session.loggedIn) {
    window.location.href = "admin.html"; // Redirect if not logged in
  }
})();

let currentAppt = null; // Store current selected appointment for billing

document.addEventListener("DOMContentLoaded", () => {
  renderDashboard();
  renderAppointmentList();
  renderBillingQueue();
  populateServices();
  
  // Handle Walk-in Form
  document.getElementById('walkinForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await createWalkin();
  });
});

// --- LOGIC ---

function logout() {
  localStorage.removeItem("glam_session");
  window.location.href = "admin.html";
}

function switchTab(tab) {
  document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
  document.getElementById(`view-${tab}`).style.display = 'block';
  document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
  event.target.closest('.menu-item').classList.add('active');
  
  if(tab === 'appointments') renderAppointmentList();
  if(tab === 'billing') renderBillingQueue();
  if(tab === 'dashboard') renderDashboard();
}

// 1. MULTIPLE SERVICES & BOOKING
function populateServices() {
  const select = document.getElementById('wService');
  const services = DB.getServices(); // From db.js
  services.forEach(s => {
    let opt = document.createElement('option');
    opt.value = JSON.stringify({ name: s.name, price: s.price });
    opt.innerText = `${s.name} - ₹${s.price}`;
    select.appendChild(opt);
  });
}

async function createWalkin() {
  const select = document.getElementById('wService');
  let selectedOpts = Array.from(select.selectedOptions);
  
  // Combine Multiple Services
  let serviceNames = selectedOpts.map(o => JSON.parse(o.value).name).join(" + ");
  let totalPrice = selectedOpts.reduce((sum, o) => sum + JSON.parse(o.value).price, 0);

  const bookingData = {
    clientName: document.getElementById('wName').value,
    clientPhone: document.getElementById('wPhone').value,
    serviceName: serviceNames,
    price: totalPrice,
    date: document.getElementById('wDate').value,
    time: document.getElementById('wTime').value,
    status: "In-Store",
    paymentStatus: "Unpaid"
  };

  await fetch(`${API_URL}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bookingData)
  });

  closeWalkinModal();
  switchTab('appointments');
}

// 2. APPOINTMENT LIST (Edit / Delete)
async function renderAppointmentList() {
  const tbody = document.getElementById('apptListBody');
  const apps = await DB.getAppointments();
  tbody.innerHTML = '';

  apps.forEach(a => {
    tbody.innerHTML += `
      <tr>
        <td>${a.date}<br><small>${a.time}</small></td>
        <td>${a.clientName}<br><small>${a.clientPhone}</small></td>
        <td>${a.serviceName}</td>
        <td><span class="badge-${a.status.toLowerCase()}">${a.status}</span></td>
        <td>
          <button class="btn-del" onclick="deleteAppt('${a._id}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`;
  });
}

async function deleteAppt(id) {
  if(confirm("Are you sure you want to delete this?")) {
    await fetch(`${API_URL}/appointments/${id}`, { method: 'DELETE' });
    renderAppointmentList(); // Refresh
  }
}

// 3. BILLING & GST (5%)
async function renderBillingQueue() {
  const container = document.getElementById('billingQueue');
  const apps = await DB.getAppointments();
  const unpaid = apps.filter(a => a.paymentStatus === 'Unpaid');
  
  container.innerHTML = unpaid.length ? '' : '<p>No pending bills</p>';
  
  unpaid.forEach(a => {
    container.innerHTML += `
      <div class="queue-item" onclick="loadBill('${a._id}')">
        <h4>${a.clientName}</h4>
        <p>${a.serviceName}</p>
        <small>₹${a.price}</small>
      </div>`;
  });
}

async function loadBill(id) {
  const appt = await (await fetch(`${API_URL}/appointments/${id}`)).json();
  currentAppt = appt;
  
  document.getElementById('invoicePanel').style.display = 'block';
  document.getElementById('invName').innerText = appt.clientName;
  document.getElementById('invService').innerText = appt.serviceName;
  document.getElementById('invSub').innerText = appt.price;
  
  // Calculate 5% GST
  const gst = Math.round(appt.price * 0.05);
  const total = appt.price + gst;
  
  document.getElementById('invTax').innerText = gst;
  document.getElementById('invTotal').innerText = total;
}

async function processPayment(method) {
  if(!currentAppt) return;
  
  const gst = Math.round(currentAppt.price * 0.05);
  const total = currentAppt.price + gst;

  await fetch(`${API_URL}/appointments/${currentAppt._id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      paymentStatus: 'Paid',
      paymentMethod: method,
      status: 'Completed',
      gst: gst,
      totalAmount: total
    })
  });

  alert("Payment Successful!");
  document.getElementById('invoicePanel').style.display = 'none';
  renderBillingQueue();
}

// 4. PRINT INVOICE
function printInvoice() {
  if(!currentAppt) return;
  const gst = Math.round(currentAppt.price * 0.05);
  const total = currentAppt.price + gst;

  const content = `
    <div class="print-header">
      <h1>GLAM SALON</h1>
      <p>Luxury Beauty & Spa</p>
      <p>Date: ${new Date().toLocaleDateString()}</p>
    </div>
    <div class="print-body">
      <div class="print-row"><span>Client:</span> <span>${currentAppt.clientName}</span></div>
      <div class="print-row"><span>Service:</span> <span>${currentAppt.serviceName}</span></div>
      <hr>
      <div class="print-row"><span>Subtotal:</span> <span>₹${currentAppt.price}</span></div>
      <div class="print-row"><span>GST (5%):</span> <span>₹${gst}</span></div>
      <div class="print-total print-row"><span>TOTAL:</span> <span>₹${total}</span></div>
    </div>
    <br><center>Thank you for visiting!</center>
  `;

  document.getElementById('printArea').innerHTML = content;
  window.print();
}

function openWalkinModal() { document.getElementById('walkinModal').style.display='block'; }
function closeWalkinModal() { document.getElementById('walkinModal').style.display='none'; }