// CHECK LOGIN & PERMISSIONS
const sessionRaw = localStorage.getItem("glam_session");
if (!sessionRaw) window.location.href = "admin.html";

const session = JSON.parse(sessionRaw);

// Display who is logged in
document.getElementById('userDisplay').textContent = session.user;
document.getElementById('roleDisplay').textContent = session.role;

// === THE MANAGER RESTRICTION LOGIC ===
if (session.role === 'manager') {
    // 1. Find all elements marked 'admin-only'
    const adminElements = document.querySelectorAll('.admin-only');
    
    // 2. Hide them completely
    adminElements.forEach(el => el.style.display = 'none');
}

// LOGOUT
function logout() { 
    localStorage.removeItem('glam_session'); 
    window.location.href='admin.html'; 
}

// TAB SWITCHER
function switchTab(tabName) {
    document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
    
    // If Manager tries to access restricted tab via code, stop them
    if(session.role === 'manager' && (tabName === 'services' || tabName === 'reports')) {
        alert("⛔ Access Denied: Admins Only");
        return;
    }

    const activeView = document.getElementById(`view-${tabName}`);
    if(activeView) activeView.style.display = 'block';
    
    // Trigger Refresh
    if(tabName === 'dashboard') renderDashboard(); // In auth.js for convenience or move to separate file
    if(tabName === 'appointments') renderAppointmentList();
    if(tabName === 'services') renderServices();
    if(tabName === 'clients') renderClients();
    if(tabName === 'billing') renderBillingQueue();
    if(tabName === 'reports') renderReport();
    
}

// Simple Dashboard logic
async function renderDashboard() {
    try {
        const res = await fetch(`${API_BASE}/appointments`);
        const apps = await res.json();
        // Calculation logic here...
        document.getElementById('dashCount').innerText = apps.length;
        // (You can copy the revenue calculation logic here if needed)
    } catch(e) { console.error(e); }
}