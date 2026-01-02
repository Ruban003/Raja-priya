// src/pages/Services.jsx
import { useEffect, useState } from 'react';
import api from '../api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { FaTags, FaCut, FaPlus } from 'react-icons/fa';

const Services = () => {
  const [services, setServices] = useState([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'Hair', price: '', type: 'single' });

  const loadServices = async () => {
    const res = await api.get('/services');
    setServices(res.data);
  };

  useEffect(() => { loadServices(); }, []);

  const handleDelete = async (id) => {
    if(confirm('Delete service?')) {
        await api.delete(`/services/${id}`);
        loadServices();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post('/services', form);
    toast.success('Service Created');
    setModalOpen(false);
    loadServices();
  };

  return (
    <div>
       <div className="flex justify-between items-center mb-6">
        <div>
            <h2 className="text-2xl font-bold">Service Menu</h2>
            <p className="text-gray-500 text-sm">Manage prices and categories</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn btn-primary flex items-center gap-2">
            <FaPlus /> Add Item
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full">
            <thead className="bg-gray-50">
                <tr>
                    <th className="p-4 text-left">Service Name</th>
                    <th className="p-4 text-left">Category</th>
                    <th className="p-4 text-left">Type</th>
                    <th className="p-4 text-right">Price</th>
                    <th className="p-4"></th>
                </tr>
            </thead>
            <tbody>
                {services.map(s => (
                    <tr key={s._id} className="border-b hover:bg-gray-50 transition">
                        <td className="p-4 font-medium text-gray-800">{s.name}</td>
                        <td className="p-4">
                            <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-bold uppercase">{s.category}</span>
                        </td>
                        <td className="p-4 text-gray-500 text-sm">
                            {s.type === 'package' ? <span className="flex items-center gap-1 text-purple-500"><FaTags/> Package</span> : 'Single'}
                        </td>
                        <td className="p-4 text-right font-bold font-mono">₹{s.price}</td>
                        <td className="p-4 text-right">
                            <button onClick={() => handleDelete(s._id)} className="text-red-400 hover:text-red-600 text-sm">Delete</button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="New Service">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex gap-4 p-2 bg-gray-50 rounded mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="type" checked={form.type === 'single'} onChange={() => setForm({...form, type: 'single'})} /> Single Service
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="type" checked={form.type === 'package'} onChange={() => setForm({...form, type: 'package'})} /> Package
                </label>
            </div>
            <input placeholder="Service Name (e.g. Gold Facial)" required onChange={e => setForm({...form, name: e.target.value})} />
            <input placeholder="Category (e.g. Skin, Hair)" required onChange={e => setForm({...form, category: e.target.value})} />
            <input type="number" placeholder="Price (₹)" required onChange={e => setForm({...form, price: e.target.value})} />
            <button className="btn btn-primary mt-2">Save Item</button>
        </form>
      </Modal>
    </div>
  );
};

export default Services;