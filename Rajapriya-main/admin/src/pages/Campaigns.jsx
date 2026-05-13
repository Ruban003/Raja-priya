import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Campaigns() {
  const { user, canManage } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', discountType: 'percentage', discountValue: '', startDate: '', endDate: '', applicableServices: [], isActive: true });
  const centerId = user?.centerId;

  const fetchData = async () => {
    try {
      const params = centerId ? `?centerId=${centerId}` : '';
      const [c, s] = await Promise.all([api.get(`/campaigns${params}`), api.get(`/services${params}`)]);
      setCampaigns(c.data); setServices(s.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/campaigns/${editing._id}`, { ...form, centerId });
      else await api.post('/campaigns', { ...form, centerId });
      setShowModal(false); setEditing(null);
      setForm({ name: '', discountType: 'percentage', discountValue: '', startDate: '', endDate: '', applicableServices: [], isActive: true });
      fetchData();
    } catch (e) { alert('Error saving campaign'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this campaign?')) return;
    await api.delete(`/campaigns/${id}`);
    fetchData();
  };

  const toggleService = (id) => {
    setForm(f => ({
      ...f,
      applicableServices: f.applicableServices.includes(id)
        ? f.applicableServices.filter(s => s !== id)
        : [...f.applicableServices, id]
    }));
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.name, discountType: c.discountType, discountValue: c.discountValue,
      startDate: c.startDate?.split('T')[0], endDate: c.endDate?.split('T')[0],
      applicableServices: c.applicableServices?.map(s => s._id || s) || [],
      isActive: c.isActive
    });
    setShowModal(true);
  };

  const isActive = (c) => c.isActive && new Date(c.startDate) <= new Date() && new Date(c.endDate) >= new Date();

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Campaigns</h1>
          <p>{campaigns.filter(isActive).length} active campaigns</p>
        </div>
        {canManage() && (
          <button className="btn-primary" onClick={() => { setEditing(null); setForm({ name: '', discountType: 'percentage', discountValue: '', startDate: '', endDate: '', applicableServices: [], isActive: true }); setShowModal(true); }}>
            + New Campaign
          </button>
        )}
      </div>

      {loading ? <div className="page-loading">Loading...</div> : (
        <div className="cards-grid">
          {campaigns.map(c => (
            <div key={c._id} className={`campaign-card ${isActive(c) ? 'active' : ''}`}>
              <div className="campaign-badge">
                {isActive(c) ? '🟢 Active' : '⚫ Inactive'}
              </div>
              <h3>{c.name}</h3>
              <div className="campaign-discount">
                {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}
              </div>
              <div className="campaign-dates">
                <span>📅 {new Date(c.startDate).toLocaleDateString('en-IN')}</span>
                <span>→</span>
                <span>{new Date(c.endDate).toLocaleDateString('en-IN')}</span>
              </div>
              <div className="campaign-services">
                {c.applicableServices?.length === 0
                  ? <span className="badge">All Services</span>
                  : c.applicableServices?.map(s => <span key={s._id || s} className="badge">{s.name || 'Service'}</span>)
                }
              </div>
              {canManage() && (
                <div className="card-actions">
                  <button className="btn-edit" onClick={() => openEdit(c)}>Edit</button>
                  <button className="btn-delete" onClick={() => handleDelete(c._id)}>Delete</button>
                </div>
              )}
            </div>
          ))}
          {campaigns.length === 0 && <div className="empty-state">No campaigns yet. Create one to offer discounts!</div>}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Campaign' : 'New Campaign'}</h2>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Campaign Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. May Special Offer" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Discount Type</label>
                  <select value={form.discountType} onChange={e => setForm({ ...form, discountType: e.target.value })}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Discount Value</label>
                  <input type="number" value={form.discountValue} onChange={e => setForm({ ...form, discountValue: e.target.value })} required placeholder={form.discountType === 'percentage' ? '30' : '200'} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label>Applicable Services <span className="label-hint">(leave empty for all services)</span></label>
                <div className="service-checkboxes">
                  {services.map(s => (
                    <label key={s._id} className="checkbox-item">
                      <input type="checkbox" checked={form.applicableServices.includes(s._id)} onChange={() => toggleService(s._id)} />
                      <span>{s.name} — ₹{s.price}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="checkbox-item">
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
                  <span>Active</span>
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">{editing ? 'Update' : 'Create Campaign'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
