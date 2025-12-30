/* js/reports.js */

// Initialize Date Picker for Reports when file loads
document.addEventListener("DOMContentLoaded", () => {
    try {
        flatpickr("#reportDate", { dateFormat: "Y-m-d", defaultDate: "today" });
    } catch(e) {}
});

async function renderReport() {
    const dateInput = document.getElementById('reportDate').value;
    if(!dateInput) { alert("⚠️ Please select a date!"); return; }

    try {
        const apps = await (await fetch(`${API_BASE}/appointments`)).json();
        
        // Filter: Match Date AND Status is Paid
        const filtered = apps.filter(a => a.date === dateInput && a.paymentStatus === 'Paid');
        
        const tbody = document.getElementById('reportListBody');
        if(!tbody) return;
        
        tbody.innerHTML = '';
        let total = 0;
        
        if(filtered.length === 0) {
            tbody.innerHTML = "<tr><td colspan='5' style='text-align:center; padding:15px;'>No Sales found for this date.</td></tr>";
        } else {
            filtered.forEach(a => {
                total += a.totalAmount;
                tbody.innerHTML += `
                    <tr>
                        <td>#${a._id.slice(-4).toUpperCase()}</td>
                        <td>${a.clientName}</td>
                        <td>${a.serviceName}</td>
                        <td>₹${a.totalAmount}</td>
                        <td>${a.paymentMethod}</td>
                    </tr>`;
            });
        }
        
        // Update Total Revenue Display
        const totalDiv = document.getElementById('reportRevenue');
        if(totalDiv) totalDiv.innerText = total.toLocaleString();
        
    } catch(e) { console.error("Report Error:", e); }
}