/* js/services.js - WITH SERVICE PICKER */

// 1. Show/Hide the Picker & Populate Checkboxes
function togglePackageFields(isPackage) {
    const area = document.getElementById('pkgSelectionArea');
    const container = document.getElementById('pkgCheckboxes');
    
    // Show or Hide
    area.style.display = isPackage ? 'block' : 'none';
    
    if(isPackage) {
        container.innerHTML = ''; // Clear old list
        
        // Use the global 'allServices' list to create checkboxes
        if(typeof allServices !== 'undefined' && allServices.length > 0) {
            allServices.forEach(s => {
                // Prevent putting a Package inside another Package (optional)
                if(s.type !== 'package') {
                    container.innerHTML += `
                        <label style="display:flex; align-items:center; gap:8px; margin-bottom:5px; cursor:pointer; font-size:14px;">
                            <input type="checkbox" value="${s.name}" class="pkg-item-check"> 
                            ${s.name} <span style="color:#999; font-size:11px;">(₹${s.price})</span>
                        </label>`;
                }
            });
        } else {
            container.innerHTML = '<small>No services found. Add single services first!</small>';
        }
    }
}

// 2. Render the Table
async function renderServices() {
    const res = await fetch(`${API_BASE}/services`);
    allServices = await res.json();
    const tbody = document.getElementById('serviceListBody');
    if(tbody) {
       tbody.innerHTML = '';
       allServices.forEach(s => {
           // Badge for Packages
           const badge = s.type === 'package' 
               ? '<span style="background:#d4af37; color:black; padding:2px 6px; font-size:10px; border-radius:4px; font-weight:bold;">PKG</span>' 
               : '';
           
           // Show contents (Description)
           const subtext = s.description ? `<br><small style="color:#7f8c8d; font-style:italic;">Includes: ${s.description}</small>` : '';

           tbody.innerHTML += `
               <tr>
                   <td>${s.name} ${badge} ${subtext}</td>
                   <td>${s.category}</td>
                   <td>₹${s.price}</td>
                   <td><button class="btn-del" onclick="deleteService('${s._id}')">Del</button></td>
               </tr>`;
       });
    }
}

async function deleteService(id) { 
    if(confirm("Delete this service?")) { 
        await fetch(`${API_BASE}/services/${id}`, { method: 'DELETE' }); 
        renderServices(); 
    } 
}

// 3. Handle Form Submit (The Auto-Combiner)
const sForm = document.getElementById('serviceForm');
if(sForm) {
    sForm.addEventListener('submit', async (e) => { 
       e.preventDefault(); 
       
       const type = document.querySelector('input[name="sType"]:checked').value;
       let description = "";

       // If it is a Package, grab all checked boxes
       if (type === 'package') {
           const checkedBoxes = document.querySelectorAll('.pkg-item-check:checked');
           const selectedNames = Array.from(checkedBoxes).map(cb => cb.value);
           
           if(selectedNames.length === 0) {
               alert("⚠️ Please select at least one service for the package!");
               return;
           }
           // Create string: "Haircut + Beard Trim"
           description = selectedNames.join(" + ");
       }

       await fetch(`${API_BASE}/services`, { 
           method: 'POST', 
           headers: {'Content-Type': 'application/json'}, 
           body: JSON.stringify({ 
               name: document.getElementById('sName').value, 
               category: document.getElementById('sCat').value, 
               price: document.getElementById('sPrice').value,
               type: type,
               description: description // Save the combined string
           }) 
       });
       
       closeModal('serviceModal'); 
       renderServices(); 
    });
}