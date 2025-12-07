/* =========================================
   GLAM SALON - API CLIENT (Frontend DB)
   Connects to Render Backend
   ========================================= */

// ✅ YOUR RENDER BACKEND URL
const API_URL = "https://glam-backend-nw7q.onrender.com/api";


const DB = {
  // Static Services Menu
  getServices: function() {
    return [
      { id: "hair_cut", name: "Signature Hair Cut", price: 210, category: "Hair" },
      { id: "hair_spa", name: "Luxury Hair Spa", price: 550, category: "Hair" },
      { id: "facial_gold", name: "Gold Facial", price: 1200, category: "Skin" },
      { id: "waxing_hand", name: "Full Hand Waxing", price: 315, category: "Skin" },
      { id: "bridal_makeover", name: "Bridal Makeover", price: 3150, category: "Makeup" },
      { id: "nail_art", name: "Nail Artistry", price: 400, category: "Nails" }
    ];
  },

  // --- ASYNC API CALLS ---

  getAppointments: async function() {
    try {
      const res = await fetch(`${API_URL}/appointments`);
      if (!res.ok) throw new Error("Failed to fetch");
      return await res.json();
    } catch (err) {
      console.error("DB Error:", err);
      return [];
    }
  },

  createBooking: async function(data) {
    const services = this.getServices();
    const selectedService = services.find(s => s.name === data.serviceId || s.id === data.serviceId) 
                            || { name: data.serviceId, price: 0 };
    
    const payload = {
      clientName: data.name,
      clientPhone: data.phone,
      serviceId: selectedService.id || 'custom',
      serviceName: selectedService.name,
      price: selectedService.price,
      date: data.date,
      time: data.time,
      type: data.type || "Online",
      status: data.status || "Pending",
      paymentStatus: "Unpaid"
    };

    const res = await fetch(`${API_URL}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return await res.json();
  },

  getInvoiceDetails: async function(apptId) {
    const res = await fetch(`${API_URL}/appointments/${apptId}`);
    const appt = await res.json();
    
    if (!appt) return null;

    const subtotal = appt.price;
    const tax = Math.round(subtotal * 0.18);
    const total = subtotal + tax;

    return { ...appt, subtotal, tax, total };
  },

  processPayment: async function(apptId, method) {
    await fetch(`${API_URL}/appointments/${apptId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentStatus: "Paid",
        paymentMethod: method,
        status: "Completed"
      })
    });
    return true;
  },

  generateDailyReport: async function(date) {
    const apps = await this.getAppointments();
    const dailyApps = apps.filter(a => a.date === date && a.paymentStatus === 'Paid');
    
    const totalRevenue = dailyApps.reduce((sum, a) => {
         const subtotal = a.price;
         const tax = Math.round(subtotal * 0.18);
         return sum + subtotal + tax;
    }, 0);

    return {
        date: date,
        totalAppointments: dailyApps.length,
        revenue: totalRevenue,
        details: dailyApps
    };
  }
};

/
// --- ADMIN LOGIN ROUTE (SECURE) ---
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  // You can change these credentials here (Server-side is secure)
  const ADMIN_USER = "Glam";
  const ADMIN_PASS = "Glam@123"; 

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    res.json({ success: true, token: "secure_session_token_123" });
  } else {
    res.status(401).json({ success: false, message: "Invalid Credentials" });
  }
});

