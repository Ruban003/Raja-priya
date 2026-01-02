import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import { FaLock, FaUser } from 'react-icons/fa';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/login', { username, password });
      if (res.data.success) {
        login({ username, role: res.data.role });
        toast.success(`Welcome back!`);
      }
    } catch (err) {
      toast.error("Invalid Credentials");
    }
  };

  return (
    <div style={{ 
        height: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)', // Royal Blue Gradient
        position: 'relative',
        overflow: 'hidden'
    }}>
      
      {/* Background Decor */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '500px', height: '500px', background: '#3b82f6', filter: 'blur(150px)', opacity: 0.1, borderRadius: '50%' }}></div>
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '500px', height: '500px', background: '#fbbf24', filter: 'blur(150px)', opacity: 0.05, borderRadius: '50%' }}></div>

      <form onSubmit={handleSubmit} style={{ 
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '40px 50px', 
          borderRadius: '16px', 
          width: '400px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800 tracking-widest mb-1">
                GLAM<span style={{color:'#fbbf24'}}>PRO</span>
            </h1>
            <p className="text-slate-400 text-xs uppercase tracking-[2px] font-semibold">Salon Management System</p>
        </div>

        <div className="mb-4 relative">
            <FaUser className="absolute left-3 top-4 text-slate-400" />
            <input 
                style={{ paddingLeft: '35px', borderColor: '#e2e8f0', background: '#f8fafc' }}
                placeholder="Username" 
                onChange={e => setUsername(e.target.value)} 
            />
        </div>

        <div className="mb-6 relative">
            <FaLock className="absolute left-3 top-4 text-slate-400" />
            <input 
                type="password"
                style={{ paddingLeft: '35px', borderColor: '#e2e8f0', background: '#f8fafc' }}
                placeholder="Password" 
                onChange={e => setPassword(e.target.value)} 
            />
        </div>
        
        <button className="btn w-full py-3 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
            style={{ background: '#2563eb' }}>
            Login
        </button>
      </form>
    </div>
  );
};

export default Login;