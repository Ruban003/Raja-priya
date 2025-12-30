/* js/staff.js - MANAGE EMPLOYEES */

async function renderStaffList() {
    try {
        const res = await fetch(`${API_BASE}/staff`);
        const staffMembers = await res.json();
        
        const tbody = document.getElementById('staffListBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        staffMembers.forEach(s => {
            tbody.innerHTML += `
                <tr>
                    <td>
                        <span style="display:inline-block; width:12px; height:12px; background:${s.color}; border-radius:50%; margin-right:5px;"></span>
                        ${s.name}
                    </td>
                    <td>${s.role}</td>
                    <td>${s.phone || '-'}</td>
                    <td>
                        <button class="btn-del" onclick="deleteStaff('${s._id}')">Remove</button>
                    </td>
                </tr>`;
        });
    } catch (e) { console.error("Staff Error:", e); }
}

async function handleStaffSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('stName').value;
    const role = document.getElementById('stRole').value;
    const phone = document.getElementById('stPhone').value;
    const color = document.getElementById('stColor').value;

    await fetch(`${API_BASE}/staff`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name, role, phone, color })
    });
    
    closeModal('staffModal');
    renderStaffList();
    // Refresh calendar if open
    if(typeof renderCalendar === 'function') renderCalendar(); 
}

async function deleteStaff(id) {
    if(confirm("Remove this staff member?")) {
        await fetch(`${API_BASE}/staff/${id}`, { method: 'DELETE' });
        renderStaffList();
    }
}