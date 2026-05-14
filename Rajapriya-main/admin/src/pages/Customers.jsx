import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Customers() {
  const { user, getActiveCenterId } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', email: '', gender: 'female', dob: '', notes: '' });
  const fileRef = useRef();
  const centerId = getActiveCenterId();

  const fetchCustomers = async () => {
    try {
      const { data } = await api.get(`/customers${centerId ? `?centerId=${centerId}` : ''}`);
      setCustomers(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCustomers(); }, [centerId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!centerId) return alert('Please select a center first');
    try {
      if (editing) await api.put(`/customers/${editing._id}`, { ...form, centerId });
      else await api.post('/customers', { ...form, centerId });
      setShowModal(false); setEditing(null);
      setForm({ name: '', phone: '', email: '', gender: 'female', dob: '', notes: '' });
      fetchCustomers();
    } catch (e) { alert(e.response?.data?.message || 'Error saving customer'); }
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone, email: c.email || '', gender: c.gender || 'female', dob: c.dob?.split('T')[0] || '', notes: c.notes || '' });
    setShowModal(true);
  };

  const exportCSV = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/customers/export/csv?centerId=${centerId}`;
  };

  const importCSV = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const lines = ev.target.result.split('\n').slice(1).filter(Boolean);
      const rows = lines.map(line => {
        const [name, phone, email, gender] = line.split(',').map(s => s.replace(/"/g, '').trim());
        return { name, phone, email, gender };
      });
      try {
        await api.post('/customers/import/csv', { rows, centerId });
        fetchCustomers(); alert(`Imported ${rows.length} customers!`);
      } catch { alert('Import failed'); }
    };
    reader.readAsText(file);
  };

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Customers</h1>
          <p>{customers.length} registered customers</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={exportCSV}>↓ Export CSV</button>
          <button className="btn-secondary" onClick={() => fileRef.current.click()}>↑ Import CSV</button>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={importCSV} />
          <button className="btn-primary" onClick={() => {
            setEditing(null);
            setForm({ name: '', phone: '', email: '', gender: 'female', dob: '', notes: '' });
            setShowModal(true);
          }}>
            + Add Customer
          </button>
        </div>
      </div>

      <div className="search-bar">
        <input placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <div className="page-loading">Loading...</div> : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Gender</th>
                <th>Visits</th>
                <th>Total Spent</th>
                <th>Loyalty Points</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c._id}>
                  <td>
                    <div className="customer-name">
                      <div className="avatar-sm">{c.name.charAt(0)}</div>
                      <div>
                        <strong>{c.name}</strong>
                        {c.email && <small>{c.email}</small>}
                      </div>
                    </div>
                  </td>
                  <td>{c.phone}</td>
                  <td><span className="badge">{c.gender}</span></td>
                  <td>{c.totalVisits || 0}</td>
                  <td>₹{c.totalSpent?.toLocaleString() || 0}</td>
                  <td>⭐ {c.loyaltyPoints || 0}</td>
                  <td>
                    <button className="btn-edit sm" onClick={() => openEdit(c)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="empty-state">No customers found</div>}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Customer' : 'Add Customer'}</h2>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Customer name" />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required placeholder="9876543210" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input type="date" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any notes about this customer" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">{editing ? 'Update' : 'Add Customer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
