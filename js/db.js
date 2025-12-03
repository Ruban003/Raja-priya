/* =========================================
   GLAM SALON - CENTRAL DATABASE ENGINE
   (Powered by LocalStorage)
   ========================================= */

const DB_KEYS = {
  SERVICES: "glam_services",
  APPOINTMENTS: "glam_appointments",
  CLIENTS: "glam_clients",
  REPORTS: "glam_reports" // New key for reports if needed separately
};

/* --- SEED DATA (Default Menu) --- */
const DEFAULT_SERVICES = [
  { id: "hair_cut", name: "Signature Hair Cut", price: 210, category: "Hair" },
  { id: "hair_spa", name: "Luxury Hair Spa", price: 550, category: "Hair" },
  { id: "facial_gold", name: "Gold Facial", price: 1200, category: "Skin" },
  { id: "waxing_hand", name: "Full Hand Waxing", price: 315, category: "Skin" },
  { id: "bridal_makeover", name: "Bridal Makeover", price: 3150, category: "Makeup" },
  { id: "nail_art", name: "Nail Artistry", price: 400, category: "Nails" }
];

const DB = {
  init: function() {
    if (!localStorage.getItem(DB_KEYS.SERVICES)) {
      localStorage.setItem(DB_KEYS.SERVICES, JSON.stringify(DEFAULT_SERVICES));
    }
    if (!localStorage.getItem(DB_KEYS.APPOINTMENTS)) {
      localStorage.setItem(DB_KEYS.APPOINTMENTS, JSON.stringify([]));
    }
    if (!localStorage.getItem(DB_KEYS.CLIENTS)) {
      localStorage.setItem(DB_KEYS.CLIENTS, JSON.stringify([]));
    }
  },

  /* --- GETTERS --- */
  getServices: () => JSON.parse(localStorage.getItem(DB_KEYS.SERVICES)),
  getAppointments: () => JSON.parse(localStorage.getItem(DB_KEYS.APPOINTMENTS)) || [],
  getClients: () => JSON.parse(localStorage.getItem(DB_KEYS.CLIENTS)) || [],

  /* --- BOOKING LOGIC --- */
  createBooking: function(data) {
    const apps = this.getAppointments();
    const services = this.getServices();
    const selectedService = services.find(s => s.name === data.serviceId || s.id === data.serviceId) || { id: "custom", name: data.serviceId, price: 0 };
    
    const newApp = {
      id: Date.now().toString(),
      clientName: data.name,
      clientPhone: data.phone,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      price: selectedService.price,
      date: data.date,
      time: data.time,
      type: data.type || "Online", 
      status: data.status || "Pending",
      paymentStatus: "Unpaid",
      createdAt: new Date().toISOString()
    };

    apps.push(newApp);
    this.save(DB_KEYS.APPOINTMENTS, apps);
    this.saveClient(data);
    return newApp;
  },

  /* --- BILLING LOGIC --- */
  getInvoiceDetails: function(apptId) {
    const apps = this.getAppointments();
    const appt = apps.find(a => a.id === apptId);
    if (!appt) return null;

    const subtotal = appt.price;
    const tax = Math.round(subtotal * 0.18); // 18% GST
    const total = subtotal + tax;

    return { ...appt, subtotal, tax, total };
  },

  processPayment: function(apptId, method) {
    const apps = this.getAppointments();
    const index = apps.findIndex(a => a.id === apptId);
    if (index !== -1) {
      apps[index].paymentStatus = "Paid";
      apps[index].paymentMethod = method;
      apps[index].status = "Completed";
      apps[index].paidAt = new Date().toISOString(); // Record payment time
      this.save(DB_KEYS.APPOINTMENTS, apps);
      return true;
    }
    return false;
  },

  /* --- CLIENTS --- */
  saveClient: function(data) {
    let clients = this.getClients();
    let existing = clients.find(c => c.phone === data.phone);
    
    const visitInfo = {
        date: data.date,
        service: data.serviceId
    };

    if (!existing) {
      clients.push({ 
          id: "c_" + Date.now(), 
          name: data.name, 
          phone: data.phone, 
          visits: 1,
          history: [visitInfo] // Store visit history
      });
    } else {
      existing.visits++;
      if(!existing.history) existing.history = [];
      existing.history.push(visitInfo);
    }
    this.save(DB_KEYS.CLIENTS, clients);
  },
  
  /* --- REPORTING --- */
  generateDailyReport: function(date) {
      const apps = this.getAppointments();
      const dailyApps = apps.filter(a => a.date === date && a.paymentStatus === 'Paid');
      
      const totalRevenue = dailyApps.reduce((sum, a) => {
          // Calculate total including tax for revenue report
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
  },

  save: (key, data) => localStorage.setItem(key, JSON.stringify(data))
};

// Initialize DB on load
DB.init();