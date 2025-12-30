/* js/appointments.js - DYNAMIC CALENDAR FIXED */

// Time slots for the columns
const TIME_SLOTS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];

function toggleView(view) {
    if(view === 'list') {
        document.getElementById('apptListView').style.display = 'block';
        document.getElementById('apptCalendarView').style.display = 'none';
        renderAppointmentList();
    } else {
        document.getElementById('apptListView').style.display = 'none';
        document.getElementById('apptCalendarView').style.display = 'block';
        renderCalendar();
    }
}

// === THE FIXED CALENDAR RENDERER ===
async function renderCalendar() {
    const gridHeader = document.getElementById('calHeader');
    const gridBody = document.getElementById('calBody');
    
    if(!gridHeader || !gridBody) return;

    // 1. FETCH REAL DATA (Staff & Appointments)
    const [staffRes, apptRes] = await Promise.all([
        fetch(`${API_BASE}/staff`),
        fetch(`${API_BASE}/appointments`)
    ]);
    
    const staffList = await staffRes.json();
    const apps = await apptRes.json();
    
    // 2. DRAW HEADER
    gridHeader.innerHTML = '<div class="cal-corner">Staff</div>';
    TIME_SLOTS.forEach(time => {
        gridHeader.innerHTML += `<div class="cal-time-slot">${time}</div>`;
    });

    // 3. DRAW BODY
    gridBody.innerHTML = '';
    const dateInput = document.getElementById('calDateInput');
    const selectedDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];

    // Check if we have staff
    if (staffList.length === 0) {
        gridBody.innerHTML = '<div style="padding:20px; text-align:center;">No Staff Found. Please add staff in the "Staff" tab.</div>';
        return;
    }

    staffList.forEach(staff => {
        let rowHtml = `<div class="cal-row">`;
        // Left Column: Staff Name & Role
        rowHtml += `
            <div class="cal-staff-name" style="border-left: 4px solid ${staff.color}">
                ${staff.name}
                <br><span style="font-size:10px; color:#666;">${staff.role}</span>
            </div>`;
        
        // Time Slots
        TIME_SLOTS.forEach(time => {
            // Find Appointment
            const appt = apps.find(a => 
                a.staffName === staff.name && 
                a.time === time && 
                a.date === selectedDate &&
                a.status !== 'Cancelled'
            );

            if (appt) {
                // BOOKED SLOT
                rowHtml += `
                    <div class="cal-cell">
                        <div class="appt-block" 
                             style="background:${appt.color || staff.color};"
                             onclick="openEditAppt('${appt._id}', '${appt.clientName}', '${appt.date} ${appt.time}', '${appt.status}', '${appt.staffName}')">
                            <b>${appt.clientName}</b><br>
                            <small>${appt.serviceName}</small>
                        </div>
                    </div>`;
            } else {
                // EMPTY SLOT
                rowHtml += `<div class="cal-cell empty-slot" onclick="openWalkinModal('${time}', '${staff.name}')"></div>`;
            }
        });
        
        rowHtml += `</div>`;
        gridBody.innerHTML += rowHtml;
    });
}

// === UPDATED BOOKING MODAL (Populate Staff Dropdown) ===
function openWalkinModal(preTime, preStaffName) {
    document.getElementById('walkinModal').style.display = 'block';
    
    // Pre-fill Time
    if(preTime) {
        const today = document.getElementById('calDateInput').value;
        document.getElementById('wDateTime')._flatpickr.setDate(`${today} ${preTime}`);
    }

    // Load Staff into Dropdown
    const staffSelect = document.getElementById('wStaff');
    staffSelect.innerHTML = '<option value="Unassigned">Unassigned</option>';
    
    // Fetch staff list for the dropdown
    fetch(`${API_BASE}/staff`)
        .then(res => res.json())
        .then(staffMembers => {
            staffMembers.forEach(s => {
                const isSelected = (preStaffName === s.name) ? 'selected' : '';
                staffSelect.innerHTML += `<option value="${s.name}" ${isSelected}>${s.name}</option>`;
            });
        });

    // Load Services
    const sel = document.getElementById('wService');
    sel.innerHTML = '<option value="" disabled selected>-- Select Service --</option>';
    if(typeof allServices !== 'undefined') {
        allServices.forEach(s => sel.innerHTML += `<option value='${JSON.stringify({name:s.name, price:s.price})}'>${s.name} - ₹${s.price}</option>`);
    }
}

// ... (Keep renderAppointmentList, handleWalkinSubmit, etc. same as before) ...
// Just ensure handleWalkinSubmit reads the 'wStaff' value correctly.