import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const statusColors = { pending: '#f59e0b', confirmed: '#3b82f6', in_progress: '#8b5cf6', completed: '#10b981', cancelled: '#ef4444' };

export default function Appointments() {
  const { user, getActiveCenterId } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [form, setForm] = useState({ clientName: '', clientPhone: '', clientGender: 'female', staffId: '', serviceName: '', price: '', date: new Date().toISOString().split('T')[0], time: '10:00', status: 'pending', type: 'walkin', notes: '' });
  const centerId = getActiveCenterId();

  const fetch = async () => {
    try {
      const params = new URLSearchParams({ ...(centerId && { centerId }), date: selectedDate });
      const [a, st, sv] = await Promise.all([
        api.get(`/appointments?${params}`),
        api.get(`/staff${centerId ? `?centerId=${centerId}` : ''}`),
        api.get(`/services${centerId ? `?centerId=${centerId}` : ''}`)
      ]);
      setAppointments(a.data); setStaff(st.data); setServices(sv.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [selectedDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const staffMember = staff.find(s => s._id === form.staffId);
      await api.post('/appointments', { ...form, centerId, staffName: staffMember?.name || 'Unassigned', color: staffMember?.color || '#3498db' });
      setShowModal(false);
      setForm({ clientName: '', clientPhone: '', clientGender: 'female', staffId: '', serviceName: '', price: '', date: selectedDate, time: '10:00', status: 'pending', type: 'walkin', notes: '' });
      fetch();
    } catch (e) { alert('Error saving appointment'); }
  };

  const updateStatus = async (id, status) => {
    await api.put(`/appointments/${id}`, { status });
    fetch();
  };

  const timeSlots = Array.from({ length: 22 }, (_, i) => {
    const h = Math.floor(i / 2) + 9;
    const m = i % 2 === 0 ? '00' : '30';
    return `${String(h).padStart(2, '0')}:${m}`;
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Appointments</h1>
          <p>{appointments.length} appointments on {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
        </div>
        <div className="header-actions">
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="date-picker" />
          <button className="btn-primary" onClick={() => setShowModal(true)}>+ New Appointment</button>
        </div>
      </div>

      {loading ? <div className="page-loading">Loading...</div> : (
        <div className="appointments-list">
          {appointments.length === 0 && <div className="empty-state">No appointments for this date</div>}
          {appointments.map(a => (
            <div key={a._id} className="appointment-card" style={{ borderLeftColor: statusColors[a.status] }}>
              <div className="appt-time">{a.time}</div>
              <div className="appt-info">
                <h3>{a.clientName}</h3>
                <p>{a.serviceName} • {a.staffName}</p>
                {a.clientPhone && <small>📞 {a.clientPhone}</small>}
              </div>
              <div className="appt-right">
                <div className="appt-price">₹{a.price?.toLocaleString()}</div>
                <select
                  className="status-select"
                  value={a.status}
                  onChange={e => updateStatus(a._id, e.target.value)}
                  style={{ color: statusColors[a.status] }}
                >
                  {Object.keys(statusColors).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
                <span className={`type-badge ${a.type}`}>{a.type}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Appointment</h2>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Client Name</label>
                  <input value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} required placeholder="Client name" />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input value={form.clientPhone} onChange={e => setForm({ ...form, clientPhone: e.target.value })} placeholder="9876543210" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Service</label>
                  <select value={form.serviceName} onChange={e => {
                    const svc = services.find(s => s.name === e.target.value);
                    setForm({ ...form, serviceName: e.target.value, price: svc?.price || '' });
                  }}>
                    <option value="">Select service</option>
                    {services.map(s => <option key={s._id} value={s.name}>{s.name} — ₹{s.price}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Staff</label>
                  <select value={form.staffId} onChange={e => setForm({ ...form, staffId: e.target.value })}>
                    <option value="">Any staff</option>
                    {staff.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Date</label>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Time</label>
                  <select value={form.time} onChange={e => setForm({ ...form, time: e.target.value })}>
                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option value="walkin">Walk-in</option>
                    <option value="prebooked">Pre-booked</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Book Appointment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
