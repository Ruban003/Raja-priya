// admin/src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import api from '../api';
import { FaMoneyBillWave, FaWallet, FaCalendarCheck } from 'react-icons/fa';

const Dashboard = () => {
  const [stats, setStats] = useState({ revenue: 0, cash: 0, count: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/appointments');
        const apps = res.data;
        let revenue = 0, cash = 0;
        apps.filter(a => a.paymentStatus === 'Paid').forEach(a => {
            revenue += a.totalAmount || 0;
            cash += a.cashAmount || 0;
        });
        setStats({ revenue, cash, count: apps.length });
      } catch (e) { console.error(e); }
    };
    fetchStats();
  }, []);

  const StatCard = ({ title, value, icon, iconColor, bg }) => (
    <div className="card stat-card">
      <div>
        <p className="text-sm font-bold uppercase tracking-wider opacity-70">{title}</p>
        <h3 className="text-3xl mt-2">{value}</h3>
      </div>
      <div className="stat-icon" style={{ background: bg, color: iconColor }}>
        {icon}
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2>Dashboard</h2>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Refresh Data</button>
      </div>

      <div className="grid grid-cols-3">
        <StatCard 
            title="Total Revenue" 
            value={`₹${stats.revenue.toLocaleString()}`} 
            icon={<FaMoneyBillWave />} 
            bg="#dcfce7" iconColor="#16a34a" // Soft Green
        />
        <StatCard 
            title="Cash in Hand" 
            value={`₹${stats.cash.toLocaleString()}`} 
            icon={<FaWallet />} 
            bg="#dbeafe" iconColor="#2563eb" // Soft Blue
        />
        <StatCard 
            title="Total Bookings" 
            value={stats.count} 
            icon={<FaCalendarCheck />} 
            bg="#fce7f3" iconColor="#db2777" // Soft Pink
        />
      </div>
    </div>
  );
};

export default Dashboard;