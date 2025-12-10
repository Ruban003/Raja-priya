/* =========================================
   GLAMPRO ADMIN DASHBOARD CONTROLLER
   ========================================= */

// --- CONFIGURATION ---
const API_BASE = "https://glam-backend-nw7q.onrender.com/api"; 

// --- 1. SECURITY: CHECK SESSION ---
(function checkSession() {
  const session = JSON.parse(localStorage.getItem("glam_session"));
  if (!session || !session.loggedIn) {
    window.location.href = "admin.html"; // Redirect if not logged in
  }
})();

// --- 2. INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  // Set default report date to today
  const dateInput = document.getElementById('reportDate');
  if(dateInput) dateInput.value = new Date().toISOString().split('T')[0];

  // Load Initial View
  renderDashboard();
  renderAppointmentList();
  renderBillingQueue();
  renderServices();

  // Attach Form Listeners
  const serviceForm = document.getElementById('serviceForm');
  if(serviceForm) serviceForm.addEventListener('submit', handleServiceSubmit);

  const walkinForm = document.getElementById('walkinForm');
  if(walkinForm) walkinForm.addEventListener('submit', handleWalkinSubmit);
});

// --- 3. NAVIGATION ---
function switchTab(tabId) {
  // Hide all views
  document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
  // Show selected view
  document.getElementById(`view-${tabId}`).style.display = 'block';
  
  // Update Menu Active State
  document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
  event.currentTarget.classList.add('active');

  // Refresh Data for the Tab
  if(tabId === 'dashboard') renderDashboard();
  if(tabId === 'appointments') renderAppointmentList();
  if(tabId === 'services') renderServices();
  if(tabId === 'billing') renderBillingQueue();
  if(tabId === 'reports') renderReport();
}

function logout() {
  localStorage.removeItem("glam_session");
  window.location.href = "admin.html";
}

// --- 4. DASHBOARD OVERVIEW ---
async function renderDashboard() {
  try {
    const res = await fetch(`${API_BASE}/appointments`);
    const apps = await res.json();
    
    const today = new Date().toISOString().split('T')[0];
    
    // Calculate Today's Revenue (Only Paid)
    const revenue = apps
      .filter(a => a.date === today && a.paymentStatus === 'Paid')
      .reduce((sum, a) => sum + (a.totalAmount || a.price || 0), 0);

    // Update Cards
    document.getElementById('todayRev').innerText = "₹" + revenue.toLocaleString();
    document.getElementById('activeCount').innerText = apps.filter(a => a.status !== 'Completed').length;
    document.getElementById('pendingBillsCount').innerText = apps.filter(a => a.paymentStatus === 'Unpaid').length;
  } catch (err) { console.error("Error loading dashboard stats", err); }
}

// --- 5. APPOINTMENTS MANAGEMENT ---
async function renderAppointmentList() {
  try {
    const res = await fetch(`${API_BASE}/appointments`);
    const apps = await res.json();
    const tbody = document.getElementById('apptListBody');
    tbody.innerHTML = '';

    if(apps.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No appointments found</td></tr>';
      return;
    }

    apps.forEach(a => {
      // Style status badge
      let badgeColor = '#ffeeba'; // yellow (pending)
      if(a.status === 'Completed') badgeColor = '#d4edda'; // green
      if(a.status === 'In-Store') badgeColor = '#cce5ff'; // blue

      tbody.innerHTML += `
        <tr>
          <td>${a.date}<br><small>${a.time}</small></td>
          <td><strong>${a.clientName}</strong><br><small>${a.clientPhone}</small></td>
          <td>${a.serviceName}</td>
          <td><span style="background:${badgeColor}; padding:4px 8px; border-radius:4px; font-size:0.85rem;">${a.status}</span></td>
          <td>
            <button class="btn-del" onclick="deleteAppt('${a._id}')" title="Delete"><i class="fas fa-trash"></i></button>
          </td>
        </tr>`;
    });
  } catch (err) { console.error("Error loading appointments", err); }
}

async function deleteAppt(id) {
  if(confirm("Are you sure you want to delete this appointment?")) {
    await fetch(`${API_BASE}/appointments/${id}`, { method: 'DELETE' });
    renderAppointmentList(); // Refresh list
  }
}

// --- 6. WALK-IN BOOKING (NEW APPOINTMENT) ---
function openWalkinModal() {
  document.getElementById('walkinModal').style.display = 'block';
  // Set default date/time to now
  const now = new Date();
  document.getElementById('wDate').value = now.toISOString().split('T')[0];
  
  // Populate the service dropdown dynamically
  populateWalkinServices();
}

function closeWalkinModal() {
  document.getElementById('walkinModal').style.display = 'none';
}

async function populateWalkinServices() {
  const select = document.getElementById('wService');
  select.innerHTML = '<option>Loading...</option>';
  
  const res = await fetch(`${API_BASE}/services`);
  const services = await res.json();
  
  select.innerHTML = '';
  services.forEach(s => {
    // We store the full object stringified to get both Name and Price later
    const val = JSON.stringify({ name: s.name, price: s.price });
    select.innerHTML += `<option value='${val}'>${s.name} - ₹${s.price}</option>`;
  });
}

async function handleWalkinSubmit(e) {
  e.preventDefault();
  
  const rawService = document.getElementById('wService').value;
  const serviceData = JSON.parse(rawService); // Parse the stored JSON

  const payload = {
    clientName: document.getElementById('wName').value,
    clientPhone: document.getElementById('wPhone').value,
    serviceName: serviceData.name,
    price: serviceData.price,
    date: document.getElementById('wDate').value,
    time: document.getElementById('wTime').value,
    status: "In-Store",      // Walk-ins are physically present
    paymentStatus: "Unpaid"
  };

  await fetch(`${API_BASE}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  alert("Walk-in Added!");
  closeWalkinModal();
  renderAppointmentList();
  document.getElementById('walkinForm').reset();
}

// --- 7. SERVICE MANAGEMENT (CRUD) ---
async function renderServices() {
  try {
    const res = await fetch(`${API_BASE}/services`);
    const services = await res.json();
    const tbody = document.getElementById('serviceListBody');
    tbody.innerHTML = '';

    services.forEach(s => {
      // Pass the object safely to edit function
      const safeObj = JSON.stringify(s).replace(/'/g, "&apos;");
      
      tbody.innerHTML += `
        <tr>
          <td>${s.name}</td>
          <td>${s.category}</td>
          <td>₹${s.price}</td>
          <td>
            <button class="btn-edit" onclick='editService(${safeObj})'><i class="fas fa-edit"></i></button>
            <button class="btn-del" onclick="deleteService('${s._id}')"><i class="fas fa-trash"></i></button>
          </td>
        </tr>`;
    });
  } catch (err) { console.error("Error loading services", err); }
}

function openServiceModal() {
  document.getElementById('serviceForm').reset();
  document.getElementById('sId').value = ""; // Clear ID for new entry
  document.getElementById('serviceModal').style.display = 'block';
}

function closeServiceModal() {
  document.getElementById('serviceModal').style.display = 'none';
}

function editService(service) {
  document.getElementById('sId').value = service._id;
  document.getElementById('sName').value = service.name;
  document.getElementById('sCat').value = service.category;
  document.getElementById('sPrice').value = service.price;
  document.getElementById('serviceModal').style.display = 'block';
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

async function deleteService(id) {
  if(confirm("Delete this service? It will disappear from the booking menu.")) {
    await fetch(`${API_BASE}/services/${id}`, { method: 'DELETE' });
    renderServices();
  }
}

// --- 8. BILLING & GST ---
let currentBillAppt = null;

async function renderBillingQueue() {
  try {
    const res = await fetch(`${API_BASE}/appointments`);
    const apps = await res.json();
    const unpaid = apps.filter(a => a.paymentStatus === 'Unpaid');
    
    const div = document.getElementById('billingQueue');
    div.innerHTML = unpaid.length ? '' : '<p class="empty-msg">No pending bills</p>';
    
    unpaid.forEach(a => {
      div.innerHTML += `
        <div class="queue-item" onclick="loadBill('${a._id}')">
          <div style="font-weight:bold;">${a.clientName}</div>
          <div style="font-size:0.85rem; color:#666;">${a.serviceName}</div>
          <div style="color:#c48a8a;">₹${a.price}</div>
        </div>`;
    });
  } catch (err) { console.error("Error loading bills", err); }
}

async function loadBill(id) {
  const res = await fetch(`${API_BASE}/appointments/${id}`);
  const appt = await res.json();
  currentBillAppt = appt;

  document.getElementById('invoicePanel').style.display = 'block';
  
  // Fill Invoice Details
  document.getElementById('invName').innerText = appt.clientName;
  document.getElementById('invService').innerText = appt.serviceName;
  document.getElementById('invSub').innerText = appt.price;
  
  // GST Calculation (5%)
  const gst = Math.round(appt.price * 0.05);
  const total = appt.price + gst;
  
  document.getElementById('invTax').innerText = gst;
  document.getElementById('invTotal').innerText = total;
}

async function processPayment(method) {
  if(!currentBillAppt) return;
  
  const gst = parseInt(document.getElementById('invTax').innerText);
  const total = parseInt(document.getElementById('invTotal').innerText);

  // Update Database
  await fetch(`${API_BASE}/appointments/${currentBillAppt._id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      paymentStatus: 'Paid',
      status: 'Completed',
      gst: gst,
      totalAmount: total,
      paymentMethod: method
    })
  });

  alert("Payment Successful!");
  document.getElementById('invoicePanel').style.display = 'none';
  renderBillingQueue(); // Remove from queue
}

function printInvoice() {
  if(!currentBillAppt) return;
  
  const gst = document.getElementById('invTax').innerText;
  const total = document.getElementById('invTotal').innerText;

  const invoiceHTML = `
    <div style="font-family: monospace; padding: 20px; max-width: 300px; margin: 0 auto; border: 1px solid #000;">
      <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px;">
        <h2 style="margin:0;">GLAM SALON</h2>
        <p style="margin:5px 0;">Luxury & Spa</p>
        <p style="font-size:0.8rem;">Date: ${new Date().toLocaleDateString()}</p>
      </div>
      <div style="margin-top: 15px;">
        <p><strong>Client:</strong> ${currentBillAppt.clientName}</p>
        <p><strong>Service:</strong> ${currentBillAppt.serviceName}</p>
      </div>
      <div style="border-top: 1px dashed #000; margin-top: 10px; padding-top: 10px;">
        <div style="display:flex; justify-content:space-between;"><span>Subtotal:</span> <span>₹${currentBillAppt.price}</span></div>
        <div style="display:flex; justify-content:space-between;"><span>GST (5%):</span> <span>₹${gst}</span></div>
        <div style="display:flex; justify-content:space-between; font-weight:bold; margin-top:5px; font-size:1.1rem;">
          <span>TOTAL:</span> <span>₹${total}</span>
        </div>
      </div>
      <div style="text-align: center; margin-top: 20px; font-size: 0.8rem;">
        <p>Thank you for visiting!</p>
      </div>
    </div>
  `;

  document.getElementById('printArea').innerHTML = invoiceHTML;
  window.print();
}

// --- 9. REPORTS ---
async function renderReport() {
  const date = document.getElementById('reportDate').value;
  if(!date) return;

  const res = await fetch(`${API_BASE}/appointments`);
  const apps = await res.json();
  
  // Filter for PAID appointments on selected date
  const filtered = apps.filter(a => a.date === date && a.paymentStatus === 'Paid');
  
  const tbody = document.getElementById('reportListBody');
  tbody.innerHTML = '';
  
  let dayTotal = 0;

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">No sales recorded for this date</td></tr>';
    document.getElementById('reportRevenue').innerText = "0";
    return;
  }

  filtered.forEach(a => {
    // Use totalAmount if it exists (includes tax), otherwise fallback to price
    const amt = a.totalAmount || a.price; 
    dayTotal += amt;
    
    tbody.innerHTML += `
      <tr>
        <td>${a.clientName}</td>
        <td>${a.serviceName}</td>
        <td>₹${amt}</td>
        <td>${a.paymentMethod}</td>
      </tr>`;
  });

  document.getElementById('reportRevenue').innerText = dayTotal.toLocaleString();
}
