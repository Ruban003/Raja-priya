# Raja-priya
Glam Pro
/my-app
  ├── /backend         
  └── /admin        
       ├── /src
       │    ├── /components   (Reusable stuff)
       │    │     ├── Sidebar.jsx
       │    │     ├── Navbar.jsx
       │    │     ├── Modal.jsx
       │    │     └── PrintInvoice.jsx
       │    │
       │    ├── /pages        (Your "Views")
       │    │     ├── Login.jsx
       │    │     ├── Dashboard.jsx
       │    │     ├── Calendar.jsx
       │    │     └── Billing.jsx
       │    │
       │    ├── /context      (State Management)
       │    │     └── AuthContext.jsx  (Holds User Role: Admin/Manager)
       │    │
       │    └── App.jsx       (The Router)