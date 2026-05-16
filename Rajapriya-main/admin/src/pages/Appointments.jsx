import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const HOURS = Array.from({ length: 13 }, (_, i) => i + 9);
const SLOT_WIDTH = 120;
const STATUS_COLORS = {
  pending: '#f59e0b', confirmed: '#3b82f6',
  in_progress: '#8b5cf6', completed: '#10b981', cancelled: '#ef4444'
};

function timeToMinutes(t) {
  const [h, m] = (t || '09:00').split(':').map(Number);
  return h * 60 + m;
}
function minutesToLeft(minutes) {
  return ((minutes - 9 * 60) / 60) * SLOT_WIDTH;
}
function getNowLeft() {
  const now = new Date();
  return minutesToLeft(now.getHours() * 60 + now.getMinutes());
}

export default function Appointments() {
  const { getActiveCenterId } = useAuth();
  const navigate = useNavigate();
  const centerId = getActiveCenterId();

  const [appointments, setAppointments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [services, setServices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showModal, setShowModal] = useState(false);
  const [viewAppt, setViewAppt] = useState(null);
  const [nowLeft, setNowLeft] = useState(getNowLeft());
  const [clientSearch, setClientSearch] = useState('');
  const [clientSuggestions, setClientSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef();

  const [form, setForm] = useState({
    clientName: '', clientPhone: '', clientGender: 'female', customerId: '',
    staffId: '', date: new Date().toISOString().split('T')[0],
    time: '10:00', status: 'pending', type: 'walkin', notes: '',
    services: [{ serviceId: '', serviceName: '', price: 0, duration: 30 }]
  });

  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  const totalWidth = HOURS.length * SLOT_WIDTH;

  // Real-time clock - update every minute
  useEffect(() => {
    const timer = setInterval(() => setNowLeft(getNowLeft()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Auto-refresh appointments every minute
  useEffect(() => {
    const timer = setInterval(() => fetchData(false), 60000);
    return () => clearInterval(timer);
  }, [selectedDate, centerId]);

  const fetchData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const params = new URLSearchParams({ ...(centerId && { centerId }), date: selectedDate });
      const [a, st, sv, cu] = await Promise.all([
        api.get(`/appointments?${params}`),
        api.get(`/staff${centerId ? `?centerId=${centerId}` : ''}`),
        api.get(`/services${centerId ? `?centerId=${centerId}` : ''}`),
        api.get(`/customers${centerId ? `?centerId=${centerId}` : ''}`)
      ]);
      setAppointments(a.data); setStaff(st.data);
      setServices(sv.data); setCustomers(cu.data);
    } catch (e) { console.error(e); }
    finally { if (showLoader) setLoading(false); }
  }, [selectedDate, centerId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Client search suggestions
  useEffect(() => {
    if (!clientSearch.trim()) { setClientSuggestions([]); return; }
    const q = clientSearch.toLowerCase();
    const matches = customers.filter(c =>
      c.name.toLowerCase().includes(q) || c.phone.includes(q)
    ).slice(0, 6);
    setClientSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  }, [clientSearch, customers]);

  const selectClient = (c) => {
    setForm(f => ({ ...f, clientName: c.name, clientPhone: c.phone, customerId: c._id, clientGender: c.gender || 'female' }));
    setClientSearch(c.name);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!centerId) return alert('Please select a center first');
    const validServices = form.services.filter(s => s.serviceId);
    if (validServices.length === 0) return alert('Add at least one service');
    try {
      const staffMember = staff.find(s => s._id === form.staffId);
      const totalPrice = validServices.reduce((s, sv) => s + (sv.price || 0), 0);
      const totalDuration = validServices.reduce((s, sv) => s + (sv.duration || 30), 0);

      // Auto-create customer if not existing
      let customerId = form.customerId;
      if (!customerId && form.clientName && form.clientPhone) {
        try {
          const existing = customers.find(c => c.phone === form.clientPhone);
          if (existing) {
            customerId = existing._id;
          } else {
            const { data: newCustomer } = await api.post('/customers', {
              name: form.clientName, phone: form.clientPhone,
              gender: form.clientGender, centerId
            });
            customerId = newCustomer._id;
          }
        } catch (e) { console.error('Customer create error', e); }
      }

      await api.post('/appointments', {
        ...form, centerId, customerId,
        services: validServices,
        serviceName: validServices.map(s => s.serviceName).join(', '),
        price: totalPrice, duration: totalDuration,
        staffName: staffMember?.name || 'Unassigned',
        color: staffMember?.color || '#3498db'
      });
      setShowModal(false); resetForm(); fetchData();
    } catch (e) { alert('Error saving appointment'); }
  };

  const resetForm = () => {
    setClientSearch('');
    setForm({
      clientName: '', clientPhone: '', clientGender: 'female', customerId: '',
      staffId: '', date: selectedDate, time: '10:00',
      status: 'pending', type: 'walkin', notes: '',
      services: [{ serviceId: '', serviceName: '', price: 0, duration: 30 }]
    });
  };

  const updateStatus = async (id, status) => {
    await api.put(`/appointments/${id}`, { status });
    fetchData(false);
    if (viewAppt?._id === id) setViewAppt(v => ({ ...v, status }));
  };

  const handleTakePayment = (appt) => {
    navigate('/billing', { state: { prefill: appt } });
  };

  // Double-click to open booking at that slot
  const openSlot = (staffId, hour, isDouble = false) => {
    if (!isDouble) return; // only on double click
    const time = `${String(hour).padStart(2, '0')}:00`;
    setForm(f => ({ ...f, staffId, time, date: selectedDate }));
    setClientSearch('');
    setShowModal(true);
  };

  // Single click shows time tooltip (handled inline)
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

  const goDate = (dir) => {
    const d = new Date(selectedDate); d.setDate(d.getDate() + dir);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const formatDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const getStaffAppts = (staffId) => appointments.filter(a => a.staffId === staffId);
  const timeSlots = [];
  for (let h = 9; h <= 21; h++) { timeSlots.push(`${String(h).padStart(2,'0')}:00`); timeSlots.push(`${String(h).padStart(2,'0')}:30`); }

  return (
    <div className="page appt-page">
      {/* HEADER */}
      <div className="appt-header">
        <div className="appt-nav">
          <button className="appt-nav-btn" onClick={() => goDate(-1)}>‹</button>
          <button className="appt-today-btn" onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}>Today</button>
          <button className="appt-nav-btn" onClick={() => goDate(1)}>›</button>
          <h2 className="appt-date">{formatDate(selectedDate)}</h2>
        </div>
        <div className="header-actions">
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="date-picker" />
          <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>+ Book Appointment</button>
        </div>
      </div>

      {/* STATS */}
      <div className="appt-stats-bar">
        <span>Total <strong>{appointments.length}</strong></span>
        <span>Pending <strong style={{color:'#f59e0b'}}>{appointments.filter(a=>a.status==='pending').length}</strong></span>
        <span>In Progress <strong style={{color:'#8b5cf6'}}>{appointments.filter(a=>a.status==='in_progress').length}</strong></span>
        <span>Completed <strong style={{color:'#10b981'}}>{appointments.filter(a=>a.status==='completed').length}</strong></span>
        <span>Value <strong>₹{appointments.reduce((s,a)=>s+(a.price||0),0).toLocaleString()}</strong></span>
        {!isToday && <span style={{color:'var(--text3)',fontSize:11}}>Auto-refresh active</span>}
        {isToday && <span style={{color:'var(--green)',fontSize:11}}>● Live</span>}
      </div>

      {loading ? <div className="page-loading">Loading...</div> : (
        <div className="calendar-container">
          <div className="calendar-grid">
            {/* STAFF COLUMN */}
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
              {staff.length === 0 && (
                <div className="cal-staff-cell" style={{color:'var(--text3)',fontSize:12}}>Add staff first</div>
              )}
            </div>

            {/* SCROLLABLE TIME AREA */}
            <div className="cal-scroll-wrap">
              {/* TIME RULER */}
              <div className="cal-time-ruler" style={{ width: totalWidth }}>
                {HOURS.map(h => (
                  <div key={h} className="cal-time-cell" style={{ width: SLOT_WIDTH }}>
                    {String(h).padStart(2,'0')}:00 {h < 12 ? 'AM' : 'PM'}
                  </div>
                ))}
              </div>

              {/* NOW LINE — moves every minute */}
              {isToday && nowLeft > 0 && nowLeft < totalWidth && (
                <div className="cal-now-line" style={{ left: nowLeft }}>
                  <span className="cal-now-label">
                    {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </span>
                </div>
              )}

              {/* STAFF ROWS */}
              {staff.map(s => {
                const appts = getStaffAppts(s._id);
                return (
                  <div key={s._id} className="cal-row" style={{ width: totalWidth }}>
                    {HOURS.map(h => (
                      <div key={h} className="cal-hour-cell" style={{ width: SLOT_WIDTH }}
                        onDoubleClick={() => openSlot(s._id, h, true)}
                        title="Double-click to book"
                      />
                    ))}
                    {appts.map(a => {
                      const startMin = timeToMinutes(a.time);
                      const dur = a.duration || 30;
                      const left = minutesToLeft(startMin);
                      const width = Math.max((dur / 60) * SLOT_WIDTH - 4, 50);
                      return (
                        <div key={a._id} className="cal-appt-block"
                          style={{ left, width, backgroundColor: STATUS_COLORS[a.status] + 'dd', borderColor: STATUS_COLORS[a.status] }}
                          onClick={e => { e.stopPropagation(); setViewAppt(a); }}>
                          <div className="cal-appt-client">{a.clientName}</div>
                          <div className="cal-appt-service">{a.serviceName}</div>
                          <div className="cal-appt-time">{a.time} · ₹{a.price?.toLocaleString()}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {/* UNASSIGNED */}
              {appointments.filter(a => !a.staffId || a.staffId === '').length > 0 && (
                <div className="cal-row" style={{ width: totalWidth }}>
                  {HOURS.map(h => <div key={h} className="cal-hour-cell" style={{ width: SLOT_WIDTH }} />)}
                  {appointments.filter(a => !a.staffId).map(a => {
                    const left = minutesToLeft(timeToMinutes(a.time));
                    const width = Math.max(((a.duration || 30) / 60) * SLOT_WIDTH - 4, 50);
                    return (
                      <div key={a._id} className="cal-appt-block"
                        style={{ left, width, backgroundColor: '#64748bdd', borderColor: '#64748b' }}
                        onClick={e => { e.stopPropagation(); setViewAppt(a); }}>
                        <div className="cal-appt-client">{a.clientName}</div>
                        <div className="cal-appt-service">{a.serviceName}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="cal-hint">💡 Double-click any slot to book · Click appointment to view details</div>
        </div>
      )}

      {/* VIEW APPOINTMENT */}
      {viewAppt && (
        <div className="modal-overlay" onClick={() => setViewAppt(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{viewAppt.clientName}</h2>
              <button onClick={() => setViewAppt(null)}>✕</button>
            </div>
            <div className="appt-view-body">
              {viewAppt.clientPhone && <div className="appt-view-row"><span>📞 Phone</span><strong>{viewAppt.clientPhone}</strong></div>}
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
                  onChange={e => updateStatus(viewAppt._id, e.target.value)}>
                  {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                </select>
              </div>
              <div className="appt-view-actions">
                <button className="btn-secondary" onClick={() => setViewAppt(null)}>Close</button>
                <button className="btn-primary" onClick={() => { handleTakePayment(viewAppt); setViewAppt(null); }}>
                  💳 Take Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOOK APPOINTMENT MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Book Appointment</h2>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">

              {/* CLIENT SEARCH */}
              <div className="form-group" style={{ position: 'relative' }} ref={searchRef}>
                <label>Search Client by Name or Phone</label>
                <input
                  value={clientSearch}
                  onChange={e => {
                    setClientSearch(e.target.value);
                    setForm(f => ({ ...f, clientName: e.target.value, customerId: '' }));
                  }}
                  placeholder="Type name or phone to search, or enter new client..."
                  autoComplete="off"
                />
                {showSuggestions && (
                  <div className="client-suggestions">
                    {clientSuggestions.map(c => (
                      <div key={c._id} className="client-suggestion-item" onClick={() => selectClient(c)}>
                        <div className="suggestion-name">{c.name}</div>
                        <div className="suggestion-meta">{c.phone} · {c.totalVisits || 0} visits · ₹{c.totalSpent?.toLocaleString() || 0} spent</div>
                      </div>
                    ))}
                    <div className="client-suggestion-item new-client" onClick={() => {
                      setForm(f => ({ ...f, clientName: clientSearch }));
                      setShowSuggestions(false);
                    }}>
                      + Add as new client: <strong>{clientSearch}</strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-row">
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
                    <select value={svc.serviceId} onChange={e => updateService(idx, 'serviceId', e.target.value)}>
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
                  Total: ₹{form.services.reduce((s, sv) => s + (sv.price || 0), 0).toLocaleString()} ·
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
