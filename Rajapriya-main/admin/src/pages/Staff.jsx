// src/pages/Staff.jsx
import { useEffect, useState } from 'react';
import api from '../api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { FaUserPlus, FaTrash, FaPhone } from 'react-icons/fa';

const Staff = () => {
  const [staff, setStaff] = useState([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', role: 'Stylist', phone: '', color: '#3498db' });

  const loadStaff = async () => {
    const res = await api.get('/staff');
    setStaff(res.data);
  };

  useEffect(() => { loadStaff(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post('/staff', form);
    toast.success('Staff Added');
    setModalOpen(false);
    loadStaff();
  };

  const handleDelete = async (id) => {
    if(confirm('Are you sure?')) {
        await api.delete(`/staff/${id}`);
        loadStaff();
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
            <h2 className="text-2xl font-bold">Team Members</h2>
            <p className="text-gray-500 text-sm">Manage your stylists and schedule colors</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn btn-primary flex items-center gap-2">
            <FaUserPlus /> Add New Staff
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {staff.map(s => (
          <div key={s._id} className="card relative group hover:shadow-lg transition-all border-l-4" style={{ borderLeftColor: s.color }}>
             <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-lg">{s.name}</h3>
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-1 rounded mt-1 inline-block">
                        {s.role}
                    </span>
                </div>
                <div className="h-3 w-3 rounded-full shadow-sm" style={{ background: s.color }}></div>
             </div>
             
             <div className="mt-4 text-sm text-gray-500 flex items-center gap-2">
                <FaPhone className="text-gray-300"/> {s.phone || 'No Phone'}
             </div>

             <button onClick={() => handleDelete(s._id)} 
                className="absolute bottom-4 right-4 text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:text-red-600">
                <FaTrash />
             </button>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="Add Team Member">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input placeholder="Full Name" required onChange={e => setForm({...form, name: e.target.value})} />
            <select onChange={e => setForm({...form, role: e.target.value})}>
                <option>Senior Stylist</option>
                <option>Junior Stylist</option>
                <option>Manager</option>
            </select>
            <input placeholder="Phone Number" onChange={e => setForm({...form, phone: e.target.value})} />
            <div className="flex items-center gap-3 border p-3 rounded bg-gray-50">
                <span className="text-sm text-gray-500">Calendar Color:</span>
                <input type="color" value={form.color} onChange={e => setForm({...form, color: e.target.value})} className="h-8 w-16 p-0 border-0" />
            </div>
            <button className="btn btn-primary mt-2">Save Member</button>
        </form>
      </Modal>
    </div>
  );
};

export default Staff;