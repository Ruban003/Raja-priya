import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const HOURS = Array.from({ length: 13 }, (_, i) => i + 9); // 9AM to 9PM
const SLOT_WIDTH = 120; // px per hour
const STATUS_COLORS = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  in_progress: '#8b5cf6',
  completed: '#10b981',
  cancelled: '#ef4444'
};

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToLeft(minutes) {
  const startMin = 9 * 60;
  return ((minutes - startMin) / 60) * SLOT_WIDTH;
}

export default function Appointments() {
  const { user, getActiveCenterId } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showModal, setShowModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null); // { staffId, time }
  const [viewAppt, setViewAppt] = useState(null);
  const [form, setForm] = useState({
    clientName: '', clientPhone: '', clientGender: 'female',
    staffId: '', date: new Date().toISOString().split('T')[0],
    time: '10:00', status: 'pending', type: 'walkin', notes: '',
    services: [{ serviceId: '', serviceName: '', price: 0, duration: 30 }]
  });
  const centerId = getActiveCenterId();

  const fetchData = async () => {
    setLoading(true);
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

  useEffect(() => { fetchData(); }, [selectedDate, centerId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!centerId) return alert('Please select a center first');
    try {
      const validServices = form.services.filter(s => s.serviceId);
      if (validServices.length === 0) return alert('Add at least one service');
      const staffMember = staff.find(s => s._id === form.staffId);
      const totalPrice = validServices.reduce((s, sv) => s + (sv.price || 0), 0);
      const totalDuration = validServices.reduce((s, sv) => s + (sv.duration || 30), 0);
      await api.post('/appointments', {
        ...form,
        centerId,
        services: validServices,
        serviceName: validServices.map(s => s.serviceName).join(', '),
        price: totalPrice,
        duration: totalDuration,
        staffName: staffMember?.name || 'Unassigned',
        color: staffMember?.color || '#3498db'
      });
      setShowModal(false); resetForm(); fetchData();
    } catch (e) { alert('Error saving appointment'); }
  };

  const resetForm = () => setForm({
    clientName: '', clientPhone: '', clientGender: 'female',
    staffId: '', date: selectedDate, time: '10:00',
    status: 'pending', type: 'walkin', notes: '',
    services: [{ serviceId: '', serviceName: '', price: 0, duration: 30 }]
  });

  const updateStatus = async (id, status) => {
    await api.put(`/appointments/${id}`, { status }); fetchData();
  };

  const handleTakePayment = (appt) => {
    // Navigate to billing with prefilled data
    navigate('/billing', { state: { prefill: appt } });
  };

  const openSlot = (staffId, hour) => {
    const time = `${String(hour).padStart(2, '0')}:00`;
    const staffMember = staff.find(s => s._id === staffId);
    setForm(f => ({ ...f, staffId, time, date: selectedDate }));
    setSelectedSlot({ staffId, time });
    setShowModal(true);
  };

  const addService = () => setForm(f => ({ ...f, services: [...f.services, { serviceId: '', serviceName: '', price: 0, duration: 30 }] }));
  const removeService = (idx) => setForm(f => ({ ...f, services: f.services.filter((_, i) => i !== idx) }));
  const updateService = (idx, field, value) => {
    const updated = [...form.services];
    updated[idx][field] = value;
    if (field === 'serviceId') {
      const svc = services.find(s => s._id === value);
      if (svc) { updated[idx].serviceName = svc.name; updated[idx].price = svc.price; updated[idx].duration = svc.duration || 30; }
    }
    setForm(f => ({ ...f, services: updated }));
  };

  const goToday = () => setSelectedDate(new Date().toISOString().split('T')[0]);
  const goDate = (dir) => {
    const d = new Date(selectedDate); d.setDate(d.getDate() + dir);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  // Get appointments for a staff member
  const getStaffAppts = (staffId) => appointments.filter(a => a.staffId === staffId || a.staffName === staff.find(s => s._id === staffId)?.name);

  const timeSlots = [];
  for (let h = 9; h <= 21; h++) { timeSlots.push(`${String(h).padStart(2,'0')}:00`); timeSlots.push(`${String(h).padStart(2,'0')}:30`); }

  const totalWidth = HOURS.length * SLOT_WIDTH;

  return (
    <div className="page appt-page">
      {/* HEADER */}
      <div className="appt-header">
        <div className="appt-nav">
          <button className="appt-nav-btn" onClick={() => goDate(-1)}>‹</button>
          <button className="appt-today-btn" onClick={goToday}>Today</button>
          <button className="appt-nav-btn" onClick={() => goDate(1)}>›</button>
          <h2 className="appt-date">{formatDate(selectedDate)}</h2>
        </div>
        <div className="header-actions">
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="date-picker" />
          <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>+ Book Appointment</button>
        </div>
      </div>

      {/* STATS BAR */}
      <div className="appt-stats-bar">
        <span>Total: <strong>{appointments.length}</strong></span>
        <span>Pending: <strong>{appointments.filter(a => a.status === 'pending').length}</strong></span>
        <span>In Progress: <strong>{appointments.filter(a => a.status === 'in_progress').length}</strong></span>
        <span>Completed: <strong>{appointments.filter(a => a.status === 'completed').length}</strong></span>
        <span>Services Value: <strong>₹{appointments.reduce((s, a) => s + (a.price || 0), 0).toLocaleString()}</strong></span>
      </div>

      {loading ? <div className="page-loading">Loading...</div> : (
        <div className="calendar-container">
          {/* TIME HEADER */}
          <div className="calendar-grid">
            <div className="cal-staff-col">
              <div className="cal-header-cell">Therapists</div>
              {staff.map(s => (
                <div key={s._id} className="cal-staff-cell">
                  <div className="cal-staff-avatar" style={{ backgroundColor: s.color }}>{s.name.charAt(0)}</div>
                  <div>
                    <div className="cal-staff-name">{s.name}</div>
                    <div className="cal-staff-role">{s.role}</div>
                  </div>
                </div>
              ))}
              {staff.length === 0 && <div className="cal-staff-cell" style={{ color: 'var(--text3)', fontSize: 12 }}>No staff added</div>}
            </div>

            <div className="cal-scroll-wrap">
              {/* TIME RULER */}
              <div className="cal-time-ruler" style={{ width: totalWidth }}>
                {HOURS.map(h => (
                  <div key={h} className="cal-time-cell" style={{ width: SLOT_WIDTH }}>
                    {String(h).padStart(2,'0')}:00 {h < 12 ? 'AM' : h === 12 ? 'PM' : 'PM'}
                  </div>
                ))}
              </div>

              {/* CURRENT TIME LINE */}
              {selectedDate === new Date().toISOString().split('T')[0] && (() => {
                const now = new Date();
                const mins = now.getHours() * 60 + now.getMinutes();
                const left = minutesToLeft(mins);
                return left > 0 && left < totalWidth ? (
                  <div className="cal-now-line" style={{ left }} />
                ) : null;
              })()}

              {/* STAFF ROWS */}
              {staff.map(s => {
                const appts = getStaffAppts(s._id);
                return (
                  <div key={s._id} className="cal-row" style={{ width: totalWidth }}>
                    {/* HOUR CELLS — clickable */}
                    {HOURS.map(h => (
                      <div key={h} className="cal-hour-cell" style={{ width: SLOT_WIDTH }}
                        onClick={() => openSlot(s._id, h)} />
                    ))}
                    {/* APPOINTMENT BLOCKS */}
                    {appts.map(a => {
                      const startMin = timeToMinutes(a.time || '09:00');
                      const dur = a.duration || 30;
                      const left = minutesToLeft(startMin);
                      const width = (dur / 60) * SLOT_WIDTH - 4;
                      return (
                        <div key={a._id} className="cal-appt-block"
                          style={{ left, width, backgroundColor: STATUS_COLORS[a.status] + 'cc', borderColor: STATUS_COLORS[a.status] }}
                          onClick={(e) => { e.stopPropagation(); setViewAppt(a); }}>
                          <div className="cal-appt-client">{a.clientName}</div>
                          <div className="cal-appt-service">{a.serviceName}</div>
                          <div className="cal-appt-time">{a.time}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {/* UNASSIGNED ROW */}
              {(() => {
                const unassigned = appointments.filter(a => !a.staffId);
                return unassigned.length > 0 ? (
                  <div className="cal-row" style={{ width: totalWidth }}>
                    {HOURS.map(h => <div key={h} className="cal-hour-cell" style={{ width: SLOT_WIDTH }} />)}
                    {unassigned.map(a => {
                      const startMin = timeToMinutes(a.time || '09:00');
                      const dur = a.duration || 30;
                      const left = minutesToLeft(startMin);
                      const width = (dur / 60) * SLOT_WIDTH - 4;
                      return (
                        <div key={a._id} className="cal-appt-block"
                          style={{ left, width, backgroundColor: '#64748bcc', borderColor: '#64748b' }}
                          onClick={(e) => { e.stopPropagation(); setViewAppt(a); }}>
                          <div className="cal-appt-client">{a.clientName}</div>
                          <div className="cal-appt-service">{a.serviceName}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : null;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* VIEW APPOINTMENT MODAL */}
      {viewAppt && (
        <div className="modal-overlay" onClick={() => setViewAppt(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{viewAppt.clientName}</h2>
              <button onClick={() => setViewAppt(null)}>✕</button>
            </div>
            <div className="appt-view-body">
              <div className="appt-view-row"><span>📞 Phone</span><strong>{viewAppt.clientPhone || '—'}</strong></div>
              <div className="appt-view-row"><span>✦ Service</span><strong>{viewAppt.serviceName}</strong></div>
              <div className="appt-view-row"><span>◎ Staff</span><strong>{viewAppt.staffName}</strong></div>
              <div className="appt-view-row"><span>◷ Time</span><strong>{viewAppt.date} at {viewAppt.time}</strong></div>
              <div className="appt-view-row"><span>₹ Price</span><strong>₹{viewAppt.price?.toLocaleString()}</strong></div>
              <div className="appt-view-row"><span>Type</span><span className={`type-badge ${viewAppt.type}`}>{viewAppt.type}</span></div>
              {viewAppt.notes && <div className="appt-view-row"><span>Notes</span><span>{viewAppt.notes}</span></div>}
              <div className="appt-status-row">
                <span>Status</span>
                <select className="status-select" value={viewAppt.status}
                  style={{ color: STATUS_COLORS[viewAppt.status] }}
                  onChange={async e => { await updateStatus(viewAppt._id, e.target.value); setViewAppt({ ...viewAppt, status: e.target.value }); }}>
                  {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="appt-view-actions">
                <button className="btn-secondary" onClick={() => setViewAppt(null)}>Close</button>
                <button className="btn-primary" onClick={() => { handleTakePayment(viewAppt); setViewAppt(null); }}>
                  💳 Take Payment → Billing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW APPOINTMENT MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Appointment</h2>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Client Name *</label>
                  <input value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} required placeholder="Client name" />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input value={form.clientPhone} onChange={e => setForm({ ...form, clientPhone: e.target.value })} placeholder="9876543210" />
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select value={form.clientGender} onChange={e => setForm({ ...form, clientGender: e.target.value })}>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Staff</label>
                  <select value={form.staffId} onChange={e => setForm({ ...form, staffId: e.target.value })}>
                    <option value="">Any / Unassigned</option>
                    {staff.map(s => <option key={s._id} value={s._id}>{s.name} — {s.role}</option>)}
                  </select>
                </div>
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

              {/* SERVICES */}
              <div className="services-section">
                <div className="services-header">
                  <label>Services</label>
                  <button type="button" className="btn-secondary sm" onClick={addService}>+ Add Service</button>
                </div>
                {form.services.map((svc, idx) => (
                  <div key={idx} className="service-row">
                    <select value={svc.serviceId} onChange={e => updateService(idx, 'serviceId', e.target.value)} style={{ flex: 2 }}>
                      <option value="">Select service</option>
                      {services.map(s => <option key={s._id} value={s._id}>{s.name} — ₹{s.price} ({s.duration}min)</option>)}
                    </select>
                    <div className="service-row-price">₹{svc.price || 0}</div>
                    {form.services.length > 1 && (
                      <button type="button" className="btn-delete sm" onClick={() => removeService(idx)}>✕</button>
                    )}
                  </div>
                ))}
                <div className="services-total">
                  Total: ₹{form.services.reduce((s, sv) => s + (sv.price || 0), 0).toLocaleString()} •
                  Duration: {form.services.reduce((s, sv) => s + (sv.duration || 0), 0)} min
                </div>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" rows={2} />
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
