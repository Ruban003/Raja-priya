import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Sidebar from './components/Sidebar';
import Billing from './pages/Billing';
import Services from './pages/Services';
import Staff from './pages/Staff';

const Layout = ({ children }) => {
  const location = useLocation();
  // Don't show Sidebar on Login page
  if (location.pathname === '/') return children;

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '20px', background: '#f4f4f9', height: '100vh', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <Layout>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/services" element={<Services />} />
            <Route path="/staff" element={<Staff />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;