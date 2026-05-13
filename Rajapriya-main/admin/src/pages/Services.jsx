import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Services() {
  const { user, canManage } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ name: '', category: '', gender: 'unisex', price: '', duration: 30, description: '' });

  const centerId = user?.centerId;
  const categories = ['Hair', 'Skin', 'Nail', 'Spa', 'Makeup', 'Other'];

  const fetch = async () => {
    try {
      const { data } = await api.get(`/services${centerId ? `?centerId=${centerId}` : ''}`);
      setServices(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/services/${editing._id}`, { ...form, centerId });
      } else {
        await api.post('/services', { ...form, centerId });
      }
      setShowModal(false); setEditing(null);
      setForm({ name: '', category: '', gender: 'unisex', price: '', duration: 30, description: '' });
      fetch();
    } catch (e) { alert('Error saving service'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this service?')) return;
    await api.delete(`/services/${id}`);
    fetch();
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({ name: s.name, category: s.category, gender: s.gender, price: s.price, duration: s.duration, description: s.description || '' });
    setShowModal(true);
  };

  const filtered = filter === 'all' ? services : services.filter(s => s.category === filter);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Services</h1>
          <p>{services.length} services available</p>
        </div>
        {canManage() && (
          <button className="btn-primary" onClick={() => { setEditing(null); setForm({ name: '', category: '', gender: 'unisex', price: '', duration: 30, description: '' }); setShowModal(true); }}>
            + Add Service
          </button>
        )}
      </div>

      <div className="filter-tabs">
        {['all', ...categories].map(c => (
          <button key={c} className={`filter-tab ${filter === c ? 'active' : ''}`} onClick={() => setFilter(c)}>
            {c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      {loading ? <div className="page-loading">Loading...</div> : (
        <div className="cards-grid">
          {filtered.map(s => (
            <div key={s._id} className="service-card">
              <div className="service-category">{s.category}</div>
              <h3>{s.name}</h3>
              <div className="service-meta">
                <span className="badge">{s.gender}</span>
                <span className="badge">{s.duration} min</span>
              </div>
              <div className="service-price">₹{s.price?.toLocaleString()}</div>
              {s.description && <p className="service-desc">{s.description}</p>}
              {canManage() && (
                <div className="card-actions">
                  <button className="btn-edit" onClick={() => openEdit(s)}>Edit</button>
                  <button className="btn-delete" onClick={() => handleDelete(s._id)}>Delete</button>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && <div className="empty-state">No services found</div>}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Service' : 'Add Service'}</h2>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Service Name</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Hair Cut" />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required>
                    <option value="">Select</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Gender</label>
                  <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                    <option value="unisex">Unisex</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Price (₹)</label>
                  <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required placeholder="500" />
                </div>
                <div className="form-group">
                  <label>Duration (min)</label>
                  <input type="number" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} placeholder="30" />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">{editing ? 'Update' : 'Add Service'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
