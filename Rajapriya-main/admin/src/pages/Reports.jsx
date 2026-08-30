import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Reports() {
  const { user, getActiveCenterId } = useAuth();
  const [monthly, setMonthly] = useState(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const centerId = getActiveCenterId();

  const fetch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month, year, ...(centerId && { centerId }) });
      const { data } = await api.get(`/reports/monthly?${params}`);
      setMonthly(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [month, year]);

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p>Revenue analytics</p>
        </div>
        <div className="header-actions">
          <select value={month} onChange={e => setMonth(+e.target.value)} className="select-input">
            {months.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(+e.target.value)} className="select-input">
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? <div className="page-loading">Loading...</div> : monthly && (
        <>
          <div className="stats-grid">
            <div className="stat-card stat-green">
              <div className="stat-icon">₹</div>
              <div className="stat-info">
                <div className="stat-value">₹{monthly.totalRevenue?.toLocaleString()}</div>
                <div className="stat-label">Total Revenue</div>
              </div>
            </div>
            <div className="stat-card stat-blue">
              <div className="stat-icon">◈</div>
              <div className="stat-info">
                <div className="stat-value">{monthly.totalBills}</div>
                <div className="stat-label">Total Bills</div>
              </div>
            </div>
            <div className="stat-card stat-amber">
              <div className="stat-icon">~</div>
              <div className="stat-info">
                <div className="stat-value">₹{monthly.totalBills ? Math.round(monthly.totalRevenue / monthly.totalBills).toLocaleString() : 0}</div>
                <div className="stat-label">Avg per Bill</div>
              </div>
            </div>
          </div>

          <div className="chart-card full">
            <h3>Daily Revenue — {months[month-1]} {year}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthly.dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text2)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text2)' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', backdropFilter: 'var(--glass-blur)', color: 'var(--text)' }}
                  itemStyle={{ color: 'var(--primary)', fontWeight: '600' }}
                  labelStyle={{ color: 'var(--text2)', marginBottom: '4px' }}
                  cursor={{ fill: 'var(--bg3)' }}
                  formatter={(v) => [`₹${v.toLocaleString()}`, 'Revenue']} 
                />
                <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>


          {monthly.staffCommissions && monthly.staffCommissions.length > 0 && (
            <div className="table-container" style={{ marginTop: '24px' }}>
              <h3>Staff Commissions</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Services Rendered</th>
                    <th>Revenue Generated</th>
                    <th>Commission Rate</th>
                    <th>Commission Earned</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.staffCommissions.map(sc => (
                    <tr key={sc.staffId}>
                      <td><strong>{sc.staffName}</strong></td>
                      <td>{sc.servicesRendered}</td>
                      <td>₹{sc.revenueGenerated.toLocaleString()}</td>
                      <td>{sc.commissionRate}%</td>
                      <td style={{ color: 'var(--green)', fontWeight: 'bold' }}>₹{sc.commissionEarned.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="table-container" style={{ marginTop: '24px' }}>
            <h3>Daily Breakdown</h3>
            <table className="data-table">
              <thead><tr><th>Day</th><th>Revenue</th></tr></thead>
              <tbody>
                {monthly.dailyData.filter(d => d.revenue > 0).map(d => (
                  <tr key={d.day}>
                    <td>{months[month-1]} {d.day}, {year}</td>
                    <td><strong>₹{d.revenue.toLocaleString()}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
