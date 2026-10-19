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
  
  const [newRoleStr, setNewRoleStr] = useState({});

  const handleAddRole = async (cId, currentRoles) => {
    if (!newRoleStr[cId]) return;
    const roleName = newRoleStr[cId].trim();
    if (!roleName || currentRoles.includes(roleName)) return;
    const newRoles = [...currentRoles, roleName];
    try {
      await api.put(`/centers/${cId}`, { staffRoles: newRoles });
      setNewRoleStr(prev => ({ ...prev, [cId]: '' }));
      fetch();
    } catch(e) { alert('Error updating roles'); }
  };

  const handleRemoveRole = async (cId, currentRoles, roleToRemove) => {
    if (!confirm(`Remove role "${roleToRemove}"?`)) return;
    const newRoles = currentRoles.filter(r => r !== roleToRemove);
    try {
      await api.put(`/centers/${cId}`, { staffRoles: newRoles });
      fetch();
    } catch(e) { alert('Error removing role'); }
  };

  const roleColors = { rv_owner: '#2563eb', rv_admin: '#6366f1', center_owner: '#38bdf8', center_admin: '#3b82f6', manager: '#10b981' };

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
                  <td><div className="customer-name"><div className="avatar-sm" style={{ backgroundColor: roleColors[u.role] + '20', color: roleColors[u.role], border: '1px solid ' + roleColors[u.role] + '40' }}>{u.name.charAt(0).toUpperCase()}</div><strong>{u.name}</strong></div></td>
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
          <h2>Centers & AI Receptionist Widget</h2>
          <div className="cards-grid">
            {centers.map(c => (
              <div key={c._id} className="service-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0 }}>{c.name}</h3>
                  <span className="badge" style={{ backgroundColor: '#10b98120', color: '#10b981' }}>Active</span>
                </div>
                {c.address && <p style={{ margin: '4px 0', color: '#94a3b8' }}>{c.address}</p>}
                {c.gstNumber && <p style={{ margin: '2px 0' }}>GST: {c.gstNumber} ({c.gstRate || 18}%)</p>}
                <div style={{ marginTop: '8px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#38bdf8', fontWeight: 600, marginBottom: '4px' }}>
                    Claude AI Widget Key (Public)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <code style={{ fontSize: '12px', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.widgetKey || 'Auto-generated on save'}
                    </code>
                    {c.widgetKey && (
                      <button
                        type="button"
                        className="btn-secondary sm"
                        onClick={() => {
                          navigator.clipboard.writeText(c.widgetKey);
                          alert('Widget Key copied to clipboard!');
                        }}
                      >
                        Copy
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
                    Chairs: <strong>{c.chairCount || 3}</strong> | Timezone: <strong>{c.timeZone || 'Asia/Kolkata'}</strong>
                  </div>
                  {c.allowedDomains && c.allowedDomains.length > 0 && (
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                      Allowed Domains: {c.allowedDomains.join(', ')}
                    </div>
                  )}
                </div>
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
