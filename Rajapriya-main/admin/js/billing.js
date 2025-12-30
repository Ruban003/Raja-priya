/* js/billing.js - WITH GST & AUTO PRINT */

let currentBillItems = [];
let currentBillApptId = null;

// 1. RENDER QUEUE
async function renderBillingQueue() {
    try {
        const apps = await (await fetch(`${API_BASE}/appointments`)).json();
        const unpaid = apps.filter(a => a.paymentStatus === 'Unpaid');
        const div = document.getElementById('billingQueue');
        if (!div) return;

        div.innerHTML = unpaid.length ? '' : '<p style="padding:20px; text-align:center; color:#7f8c8d;">No Pending Bills</p>';
        unpaid.forEach(a => {
            div.innerHTML += `<div class="queue-item" onclick="initBill('${a._id}')"><b>${a.clientName}</b><br>${a.serviceName}</div>`;
        });
    } catch (e) { console.error(e); }
}

// 2. INIT BILL
async function initBill(id) {
    currentBillApptId = id;
    const appt = await (await fetch(`${API_BASE}/appointments/${id}`)).json();
    
    currentBillItems = [{ name: appt.serviceName, price: appt.price }];
    document.getElementById('invoicePanel').style.display = 'block';
    document.getElementById('invClientName').innerText = appt.clientName;
    document.getElementById('invId').innerText = appt._id.slice(-4).toUpperCase();
    
    // Fill Dropdown
    const sel = document.getElementById('billAddService');
    sel.innerHTML = '';
    if(typeof allServices !== 'undefined') {
         allServices.forEach(s => sel.innerHTML += `<option value='${JSON.stringify(s)}'>${s.name} - ₹${s.price}</option>`);
    }
    renderBillItems();
}

function addItemToBill() {
    const val = document.getElementById('billAddService').value;
    if(!val) return;
    const s = JSON.parse(val);
    currentBillItems.push({ name: s.name, price: s.price });
    renderBillItems();
}

function removeItem(index) { 
    currentBillItems.splice(index, 1); 
    renderBillItems(); 
}

// 3. RENDER ITEMS & CALCULATE GST
function renderBillItems() {
    let subtotal = 0;
    const tbody = document.getElementById('billItemsBody');
    tbody.innerHTML = '';
    
    currentBillItems.forEach((i, index) => {
        subtotal += i.price;
        tbody.innerHTML += `<tr><td>${i.name}</td><td>₹${i.price}</td><td><button style="color:red; cursor:pointer; border:none;" onclick="removeItem(${index})">X</button></td></tr>`;
    });

    // GST CALCULATION (5%)
    const gst = Math.round(subtotal * 0.05);
    const grandTotal = subtotal + gst;

    // Update UI
    document.getElementById('invSubtotal').innerText = subtotal;
    document.getElementById('invGST').innerText = gst;
    document.getElementById('invTotal').innerText = grandTotal;

    calculateBalance();
}

// 4. CHECK BALANCE
function calculateBalance() {
    const total = parseInt(document.getElementById('invTotal').innerText) || 0;
    const cash = parseInt(document.getElementById('payCash').value) || 0;
    const upi = parseInt(document.getElementById('payUPI').value) || 0;
    
    const balance = total - (cash + upi);
    const btn = document.getElementById('btnCompleteBill');
    
    document.getElementById('payBalance').innerText = balance;
    
    if (balance === 0 && total > 0) {
        btn.disabled = false; 
        btn.style.background = "#27ae60"; 
        btn.innerText = "Complete & Print";
    } else {
        btn.disabled = true; 
        btn.style.background = "#ccc";
        btn.innerText = balance > 0 ? `Pay ₹${balance} more` : "Check Amount";
    }
}

// 5. PROCESS PAYMENT & AUTO PRINT
async function processSplitPayment() {
    const subtotal = parseInt(document.getElementById('invSubtotal').innerText);
    const gst = parseInt(document.getElementById('invGST').innerText);
    const total = parseInt(document.getElementById('invTotal').innerText);
    
    const cash = parseInt(document.getElementById('payCash').value) || 0;
    const upi = parseInt(document.getElementById('payUPI').value) || 0;
    const names = currentBillItems.map(i => i.name).join(' + ');

    let method = "Split";
    if(cash === total) method = "Cash"; 
    else if(upi === total) method = "UPI";
    
    try {
        // A. Save to Database
        await fetch(`${API_BASE}/appointments/${currentBillApptId}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                paymentStatus: 'Paid', status: 'Completed', 
                totalAmount: total, // Saving the Grand Total
                paymentMethod: method, 
                serviceName: names, cashAmount: cash, upiAmount: upi 
            })
        });

        // B. TRIGGER PRINT IMMEDIATELY
        fillAndPrintReceipt(subtotal, gst, total, cash, upi, method);

        // C. Cleanup UI
        document.getElementById('invoicePanel').style.display = 'none';
        renderBillingQueue(); 
        if(typeof renderDashboard === 'function') renderDashboard();
        
    } catch(e) { alert("Error processing bill"); console.error(e); }
}

// 6. THE PRINT FUNCTION
function fillAndPrintReceipt(subtotal, gst, total, cash, upi, method) {
    // Fill Header
    document.getElementById('pDate').innerText = new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString();
    document.getElementById('pInvId').innerText = document.getElementById('invId').innerText;
    document.getElementById('pClient').innerText = document.getElementById('invClientName').innerText;

    // Fill Items
    const tbody = document.getElementById('pItems');
    tbody.innerHTML = '';
    currentBillItems.forEach(item => {
        tbody.innerHTML += `
            <tr>
                <td>${item.name}</td>
                <td style="text-align:right;">₹${item.price}</td>
            </tr>`;
    });

    // Fill Totals
    document.getElementById('pSubtotal').innerText = subtotal;
    document.getElementById('pGST').innerText = gst;
    document.getElementById('pGrandTotal').innerText = total;

    // Fill Payment Details
    document.getElementById('pCash').innerText = cash;
    document.getElementById('pUPI').innerText = upi;

    // Print
    setTimeout(() => {
        window.print();
    }, 500); // Small delay to ensure data is ready
}

function moveToBill(id) { switchTab('billing'); initBill(id); }