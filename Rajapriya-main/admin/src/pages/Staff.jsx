import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Staff() {
  const { user, canManage, getActiveCenterId } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', role: 'Stylist', phone: '', color: '#38bdf8', commissionRate: 0 });
  const centerId = getActiveCenterId();

  const fetch = async () => {
    try {
      const { data } = await api.get(`/staff${centerId ? `?centerId=${centerId}` : ''}`);
      setStaff(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/staff/${editing._id}`, { ...form, centerId });
      else await api.post('/staff', { ...form, centerId });
      setShowModal(false); setEditing(null);
      setForm({ name: '', role: 'Stylist', phone: '', color: '#38bdf8', commissionRate: 0 });
      fetch();
    } catch (e) { alert('Error saving staff'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this staff member?')) return;
    await api.delete(`/staff/${id}`);
    fetch();
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({ name: s.name, role: s.role, phone: s.phone || '', color: s.color, commissionRate: s.commissionRate || 0 });
    setShowModal(true);
  };

  
  const [centers, setCenters] = useState([]);
  const [roles, setRoles] = useState(['Stylist', 'Therapist', 'Makeup Artist', 'Nail Tech', 'Receptionist', 'Manager']);

  useEffect(() => {
    api.get('/centers').then(res => {
      setCenters(res.data);
      const c = res.data.find(c => c._id === centerId) || res.data[0];
      if (c && c.staffRoles && c.staffRoles.length > 0) {
        setRoles(c.staffRoles);
      }
    }).catch(console.error);
  }, [centerId]);


  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Staff</h1>
          <p>{staff.length} active members</p>
        </div>
        {canManage() && (
          <button className="btn-primary" onClick={() => { setEditing(null); setForm({ name: '', role: 'Stylist', phone: '', color: '#38bdf8', commissionRate: 0 }); setShowModal(true); }}>
            + Add Staff
          </button>
        )}
      </div>

      {loading ? <div className="page-loading">Loading...</div> : (
        <div className="staff-grid">
          {staff.map(s => (
            <div key={s._id} className="staff-card" style={{ flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div className="staff-avatar" style={{ backgroundColor: (s.color || '#38bdf8') + '30', color: s.color || '#38bdf8', border: `1px solid ${s.color || '#38bdf8'}50` }}>
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="staff-info">
                  <h3>{s.name}</h3>
                  <span className="badge" style={{ backgroundColor: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)' }}>{s.role}</span>
                </div>
              </div>
              <div style={{ paddingLeft: '68px' }}>
                {s.phone && <p className="staff-phone" style={{ marginTop: '0', fontSize: '13px' }}>📞 {s.phone}</p>}
                <p className="staff-commission" style={{ marginTop: '4px', fontSize: '13px' }}>Commission: <strong style={{ color: 'var(--primary)' }}>{s.commissionRate}%</strong></p>
              </div>
              {canManage() && (
                <div className="card-actions" style={{ paddingLeft: '68px', paddingTop: '8px', borderTop: '1px solid var(--border)', marginTop: '4px' }}>
                  <button className="btn-edit" onClick={() => openEdit(s)}>Edit</button>
                  <button className="btn-delete" onClick={() => handleDelete(s._id)}>Remove</button>
                </div>
              )}
            </div>
          ))}
          {staff.length === 0 && <div className="empty-state">No staff added yet</div>}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Staff' : 'Add Staff'}</h2>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Staff name" />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                    {!roles.includes(form.role) && form.role && <option value={form.role}>{form.role}</option>}
                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="9876543210" />
                </div>
                <div className="form-group">
                  <label>Commission %</label>
                  <input type="number" value={form.commissionRate} onChange={e => setForm({ ...form, commissionRate: e.target.value })} placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Color</label>
                  <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">{editing ? 'Update' : 'Add Staff'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
