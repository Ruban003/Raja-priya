import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Services() {
  const { canManage, getActiveCenterId } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showPackage, setShowPackage] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', gender: 'unisex', price: '', duration: 30, gstRate: 0, description: '', isPackage: false, packageItems: [] });
  const fileRef = useRef();
  const categories = ['Hair', 'Skin', 'Nail', 'Spa', 'Makeup', 'Other'];

  const centerId = getActiveCenterId();

  const fetchServices = async () => {
    try {
      const { data } = await api.get(`/services${centerId ? `?centerId=${centerId}` : ''}`);
      setServices(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchServices(); }, [centerId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!centerId) return alert('Please select a center first');
    try {
      const payload = { ...form, centerId };
      if (editing) await api.put(`/services/${editing._id}`, payload);
      else await api.post('/services', payload);
      setShowModal(false); setEditing(null); resetForm(); fetchServices();
    } catch (e) { alert(e.response?.data?.message || 'Error saving service'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this service?')) return;
    await api.delete(`/services/${id}`); fetchServices();
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({ name: s.name, category: s.category, gender: s.gender, price: s.price, duration: s.duration, gstRate: s.gstRate || 0, description: s.description || '', isPackage: s.isPackage || false, packageItems: s.packageItems || [] });
    setShowPackage(s.isPackage || false);
    setShowModal(true);
  };

  const resetForm = () => setForm({ name: '', category: '', gender: 'unisex', price: '', duration: 30, gstRate: 0, description: '', isPackage: false, packageItems: [] });

  // Package: add individual services
  const addPackageItem = () => setForm(f => ({ ...f, packageItems: [...f.packageItems, { serviceName: '', originalPrice: 0 }] }));
  const updatePackageItem = (idx, field, val) => {
    const items = [...form.packageItems];
    items[idx][field] = val;
    // Auto-calculate total
    const total = items.reduce((s, i) => s + (+i.originalPrice || 0), 0);
    setForm(f => ({ ...f, packageItems: items, price: f.price || total }));
  };
  const removePackageItem = (idx) => setForm(f => ({ ...f, packageItems: f.packageItems.filter((_, i) => i !== idx) }));

  // Export CSV
  const exportCSV = () => { window.location.href = `/api/services/export/csv?centerId=${centerId}`; };

  // Import CSV
  const importCSV = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target.result;
      const lines = text.split('\n').slice(1).filter(Boolean);
      const rows = lines.map(line => {
        const [name, category, gender, price, duration, gstRate, description] = line.split(',').map(s => s.replace(/"/g, '').trim());
        return { name, category, gender, price: +price, duration: +duration, gstRate: +gstRate, description };
      });
      try {
        await api.post('/services/import/csv', { rows, centerId });
        fetchServices(); alert(`Imported ${rows.length} services!`);
      } catch { alert('Import failed'); }
    };
    reader.readAsText(file);
  };

  const filtered = filter === 'all' ? services : services.filter(s => s.category === filter);
  const regularServices = services.filter(s => !s.isPackage);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Services</h1>
          <p>{services.filter(s => !s.isPackage).length} services · {services.filter(s => s.isPackage).length} packages</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={exportCSV}>↓ Export CSV</button>
          <button className="btn-secondary" onClick={() => fileRef.current.click()}>↑ Import CSV</button>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={importCSV} />
          {canManage() && (
            <button className="btn-primary" onClick={() => { setEditing(null); resetForm(); setShowPackage(false); setShowModal(true); }}>
              + Add Service
            </button>
          )}
        </div>
      </div>

      <div className="filter-tabs">
        {['all', ...categories, 'packages'].map(c => (
          <button key={c} className={`filter-tab ${filter === c ? 'active' : ''}`} onClick={() => setFilter(c)}>
            {c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      {loading ? <div className="page-loading">Loading...</div> : (
        <div className="cards-grid">
          {(filter === 'packages' ? services.filter(s => s.isPackage) : filtered.filter(s => filter === 'all' ? true : !s.isPackage)).map(s => (
            <div key={s._id} className={`service-card ${s.isPackage ? 'package-card' : ''}`}>
              <div className="service-category-row">
                <span className="service-category">{s.category}</span>
                {s.isPackage && <span className="package-badge">📦 Package</span>}
              </div>
              <h3>{s.name}</h3>
              <div className="service-meta">
                <span className="badge">{s.gender}</span>
                <span className="badge">{s.duration} min</span>
                {s.gstRate > 0 && <span className="badge gst-badge">GST {s.gstRate}%</span>}
              </div>
              {s.isPackage && s.packageItems?.length > 0 && (
                <div className="package-items">
                  {s.packageItems.map((p, i) => (
                    <div key={i} className="package-item-row">
                      <span>{p.serviceName}</span>
                      <span className="original-price">₹{p.originalPrice}</span>
                    </div>
                  ))}
                  <div className="package-item-row savings">
                    <span>You save</span>
                    <span>₹{s.packageItems.reduce((t, p) => t + p.originalPrice, 0) - s.price}</span>
                  </div>
                </div>
              )}
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
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Service' : 'Add Service'}</h2>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label className="checkbox-item">
                  <input type="checkbox" checked={form.isPackage} onChange={e => { setForm({ ...form, isPackage: e.target.checked }); setShowPackage(e.target.checked); }} />
                  <span>This is a Package (bundle of services)</span>
                </label>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Service Name</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder={form.isPackage ? 'e.g. Hair & Beard Combo' : 'e.g. Hair Cut'} />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required>
                    <option value="">Select</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {showPackage && (
                <div className="form-group">
                  <div className="package-items-header">
                    <label>Package Items</label>
                    <button type="button" className="btn-secondary sm" onClick={addPackageItem}>+ Add Item</button>
                  </div>
                  {form.packageItems.map((item, idx) => (
                    <div key={idx} className="bill-item-row" style={{ marginTop: 8 }}>
                      <input placeholder="Service name (e.g. Hair Cut)" value={item.serviceName} onChange={e => updatePackageItem(idx, 'serviceName', e.target.value)} style={{ flex: 2, background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px', borderRadius: '6px' }} />
                      <input type="number" placeholder="Original price" value={item.originalPrice} onChange={e => updatePackageItem(idx, 'originalPrice', e.target.value)} style={{ width: 120, background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px', borderRadius: '6px' }} />
                      <button type="button" className="btn-delete sm" onClick={() => removePackageItem(idx)}>✕</button>
                    </div>
                  ))}
                  {form.packageItems.length > 0 && (
                    <div className="package-total-hint">
                      Original total: ₹{form.packageItems.reduce((t, p) => t + (+p.originalPrice || 0), 0)} — Set package price below (can be lower!)
                    </div>
                  )}
                </div>
              )}

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
                  <label>{form.isPackage ? 'Package Price (₹)' : 'Price (₹)'}</label>
                  <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required placeholder="500" />
                </div>
                <div className="form-group">
                  <label>Duration (min)</label>
                  <input type="number" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} placeholder="30" />
                </div>
                <div className="form-group">
                  <label>GST Rate (%)</label>
                  <select value={form.gstRate} onChange={e => setForm({ ...form, gstRate: +e.target.value })}>
                    <option value={0}>0% (No GST)</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
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
