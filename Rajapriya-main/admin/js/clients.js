/* js/clients.js */

async function renderClients() {
    try {
        const apps = await (await fetch(`${API_BASE}/appointments`)).json();
        const tbody = document.getElementById('clientListBody');
        if(!tbody) return;
        
        tbody.innerHTML = '';
        
        // Group by Phone Number
        const clients = {};
        
        apps.forEach(a => {
            if(!clients[a.clientPhone]) {
                clients[a.clientPhone] = { 
                    name: a.clientName, 
                    phone: a.clientPhone, 
                    visits: 0, 
                    last: a.date 
                };
            }
            clients[a.clientPhone].visits++;
            // Update last visit if this appointment is newer (basic string compare works for YYYY-MM-DD)
            if(a.date > clients[a.clientPhone].last) {
                clients[a.clientPhone].last = a.date;
            }
        });
        
        // Render the list
        Object.values(clients).forEach(c => {
            tbody.innerHTML += `
                <tr>
                    <td>${c.name}</td>
                    <td>${c.phone}</td>
                    <td>${c.visits} Visits</td>
                    <td>
                        <button class="btn-new" style="background:#34495e;" onclick="alert('Last Visit: ${c.last}')">
                            Info
                        </button>
                    </td>
                </tr>`;
        });
        
    } catch(e) { console.error("Client Load Error:", e); }
}