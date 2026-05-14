import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function Dashboard() {
  const { user, getActiveCenterId } = useAuth();
  const [stats, setStats] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [loading, setLoading] = useState(true);

  const centerId = getActiveCenterId();

  useEffect(() => {
    const fetch = async () => {
      try {
        const params = centerId ? `?centerId=${centerId}` : '';
        const [s, m] = await Promise.all([
          api.get(`/reports/dashboard${params}`),
          api.get(`/reports/monthly${params}`)
        ]);
        setStats(s.data);
        setMonthly(m.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  if (loading) return <div className="page-loading">Loading dashboard...</div>;

  const cards = [
    { label: "Today's Revenue", value: `₹${stats?.todayRevenue?.toLocaleString() || 0}`, icon: '₹', color: 'green' },
    { label: "Today's Bills", value: stats?.todayBills || 0, icon: '◈', color: 'blue' },
    { label: "Appointments", value: stats?.todayAppointments || 0, icon: '◷', color: 'purple' },
    { label: "Month Revenue", value: `₹${stats?.monthRevenue?.toLocaleString() || 0}`, icon: '◐', color: 'amber' },
  ];

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="stats-grid">
        {cards.map((c, i) => (
          <div key={i} className={`stat-card stat-${c.color}`}>
            <div className="stat-icon">{c.icon}</div>
            <div className="stat-info">
              <div className="stat-value">{c.value}</div>
              <div className="stat-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {monthly && (
        <div className="charts-grid">
          <div className="chart-card">
            <h3>Monthly Revenue — {new Date().toLocaleString('default', { month: 'long' })}</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthly.dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`₹${v}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#c9a96e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3>Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthly.dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`₹${v}`, 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke="#c9a96e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="summary-row">
        <div className="summary-card">
          <h3>Month Summary</h3>
          <div className="summary-item">
            <span>Total Revenue</span>
            <strong>₹{monthly?.totalRevenue?.toLocaleString() || 0}</strong>
          </div>
          <div className="summary-item">
            <span>Total Bills</span>
            <strong>{monthly?.totalBills || 0}</strong>
          </div>
          <div className="summary-item">
            <span>Avg per Bill</span>
            <strong>₹{monthly?.totalBills ? Math.round(monthly.totalRevenue / monthly.totalBills).toLocaleString() : 0}</strong>
          </div>
        </div>

        <div className="summary-card">
          <h3>Today's Summary</h3>
          <div className="summary-item">
            <span>Revenue</span>
            <strong>₹{stats?.todayRevenue?.toLocaleString() || 0}</strong>
          </div>
          <div className="summary-item">
            <span>Bills Generated</span>
            <strong>{stats?.todayBills || 0}</strong>
          </div>
          <div className="summary-item">
            <span>Pending Appointments</span>
            <strong>{stats?.pendingAppointments || 0}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
