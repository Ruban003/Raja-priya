import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Settings() {
  const { user, isOwner } = useAuth();
  const [users, setUsers] = useState([]);
  const [centers, setCenters] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', username: '', password: '', role: 'manager', centerId: '' });
  const centerId = user?.centerId;

  const fetch = async () => {
    try {
      const [u, c] = await Promise.all([api.get('/users'), api.get('/centers')]);
      setUsers(u.data); setCenters(c.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetch(); }, []);

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', { ...userForm, centerId: userForm.centerId || centerId });
      setShowUserModal(false);
      setUserForm({ name: '', username: '', password: '', role: 'manager', centerId: '' });
      fetch();
    } catch (e) { alert('Error creating user: ' + (e.response?.data?.message || e.message)); }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm('Deactivate this user?')) return;
    await api.delete(`/users/${id}`);
    fetch();
  };

  const roleLabels = { rv_owner: 'RV Owner', rv_admin: 'RV Admin', center_owner: 'Center Owner', center_admin: 'Center Admin', manager: 'Manager' };
  const roleColors = { rv_owner: '#8b5cf6', rv_admin: '#6366f1', center_owner: '#c9a96e', center_admin: '#3b82f6', manager: '#10b981' };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      <div className="settings-section">
        <div className="section-header">
          <h2>Users & Access</h2>
          {isOwner() && (
            <button className="btn-primary" onClick={() => setShowUserModal(true)}>+ Add User</button>
          )}
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Username</th><th>Role</th><th>Center</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <td><div className="customer-name"><div className="avatar-sm" style={{ backgroundColor: roleColors[u.role] }}>{u.name.charAt(0)}</div><strong>{u.name}</strong></div></td>
                  <td>@{u.username}</td>
                  <td><span className="badge" style={{ backgroundColor: roleColors[u.role] + '30', color: roleColors[u.role] }}>{roleLabels[u.role]}</span></td>
                  <td>{u.centerId ? centers.find(c => c._id === u.centerId)?.name || 'Assigned' : 'All Centers'}</td>
                  <td>{isOwner() && u._id !== user._id && <button className="btn-delete sm" onClick={() => handleDeleteUser(u._id)}>Remove</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {centers.length > 0 && (
        <div className="settings-section">
          <h2>Centers</h2>
          <div className="cards-grid">
            {centers.map(c => (
              <div key={c._id} className="service-card">
                <h3>{c.name}</h3>
                {c.address && <p>{c.address}</p>}
                {c.gstNumber && <p>GST: {c.gstNumber}</p>}
                <p>GST Rate: {c.gstRate}%</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {showUserModal && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add User</h2>
              <button onClick={() => setShowUserModal(false)}>✕</button>
            </div>
            <form onSubmit={handleUserSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} required placeholder="Full name" />
                </div>
                <div className="form-group">
                  <label>Username</label>
                  <input value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} required placeholder="username" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Password</label>
                  <input type="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} required placeholder="Password" />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
                    {user.role === 'rv_owner' && <><option value="rv_admin">RV Admin</option><option value="center_owner">Center Owner</option></>}
                    <option value="center_admin">Center Admin</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
              </div>
              {user.role === 'rv_owner' && (
                <div className="form-group">
                  <label>Assign Center</label>
                  <select value={userForm.centerId} onChange={e => setUserForm({ ...userForm, centerId: e.target.value })}>
                    <option value="">All Centers (RV Level)</option>
                    {centers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowUserModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
