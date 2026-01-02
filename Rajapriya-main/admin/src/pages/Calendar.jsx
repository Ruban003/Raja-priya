import { useState, useEffect } from 'react';
import api from '../api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { FaPlus, FaCheckCircle, FaExclamationTriangle, FaMoneyBillWave, FaUserClock } from 'react-icons/fa';

// --- CONFIGURATION ---
const START_HOUR = 9;
const HOURS_COUNT = 13;
const SLOT_WIDTH = 160;
const STAFF_COL_WIDTH = 180; 

const TIME_SLOTS = Array.from({ length: HOURS_COUNT }, (_, i) => {
    const h = START_HOUR + i;
    return `${h.toString().padStart(2, '0')}:00`;
});

const Calendar = () => {
  const [staff, setStaff] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  
  const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [currentTimePos, setCurrentTimePos] = useState(null);

  const [isModalOpen, setModalOpen] = useState(false);
  const [isSlotAvailable, setIsSlotAvailable] = useState(true);
  
  const [formData, setFormData] = useState({
      clientName: '', clientPhone: '', serviceName: '', price: '',
      staffName: '', time: '', date: '', color: '#3498db'
  });

  // --- LOAD DATA ---
  const loadData = async () => {
    try {
        const [staffRes, apptRes, srvRes] = await Promise.all([
            api.get('/staff'),
            api.get('/appointments'),
            api.get('/services')
        ]);
        setStaff(staffRes.data);
        setAppointments(apptRes.data);
        setServices(srvRes.data);
    } catch (err) { console.error(err); }
  };

  // --- TIME LINE ---
  const updateTimeLine = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();

      if (now.getDate() === new Date(viewDate).getDate() && 
          currentHour >= START_HOUR && 
          currentHour < START_HOUR + HOURS_COUNT) {
          
          const minutesPassed = ((currentHour - START_HOUR) * 60) + currentMin;
          const pixelOffset = (minutesPassed / 60) * SLOT_WIDTH;
          setCurrentTimePos(STAFF_COL_WIDTH + pixelOffset);
      } else {
          setCurrentTimePos(null);
      }
  };

  useEffect(() => {
    loadData();
    updateTimeLine();
    const interval = setInterval(() => { loadData(); updateTimeLine(); }, 10000); 
    return () => clearInterval(interval);
  }, [viewDate]);

  // --- ACTIONS ---
  const getBooking = (staffName, time) => {
    return appointments.find(a => 
      a.staffName === staffName && a.time === time && a.date === viewDate && a.status !== 'Cancelled'
    );
  };

  const openBookingModal = (staffName, time) => {
    const conflict = getBooking(staffName, time);
    setIsSlotAvailable(!conflict);
    setFormData({
        clientName: '', clientPhone: '', serviceName: '', price: '',
        staffName: staffName, time: time, date: viewDate,
        color: staff.find(s => s.name === staffName)?.color || '#3498db'
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isSlotAvailable) return toast.error("Slot Busy!");
    try {
        setLoading(true);
        await api.post('/bookings', { ...formData, status: 'Confirmed', paymentStatus: 'Unpaid' });
        toast.success(`Booked!`);
        setModalOpen(false);
        loadData();
    } catch (err) { toast.error("Failed"); } 
    finally { setLoading(false); }
  };

  // --- NEW: MARK AS DONE FUNCTION ---
  const handleMarkDone = async (apptId, currentStatus) => {
      if(currentStatus === 'Completed') return; // Already done

      if(window.confirm("Mark this appointment as COMPLETED?")) {
          try {
              await api.put(`/appointments/${apptId}`, { status: 'Completed' });
              toast.success("Appointment Completed!");
              loadData(); // Refresh UI
          } catch (err) {
              toast.error("Could not update status");
          }
      }
  };

  // Stats
  const dailyApps = appointments.filter(a => a.date === viewDate && a.status !== 'Cancelled');
  const revenue = dailyApps.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);

  return (
    <div className="h-full flex flex-col bg-white">
      
      {/* HEADER */}
      <div className="flex justify-between items-end mb-4 px-4 pt-4 pb-2 border-b border-gray-200">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">Daily Schedule</h2>
            <div className="flex gap-4 mt-1 text-sm text-gray-500">
                <span className="flex items-center gap-1"><FaCheckCircle className="text-green-500"/> {dailyApps.length} Appts</span>
                <span className="flex items-center gap-1"><FaMoneyBillWave className="text-blue-500"/> ₹{revenue}</span>
            </div>
        </div>
        <div className="flex gap-3 items-center">
            <input type="date" value={viewDate} onChange={e => setViewDate(e.target.value)} className="border p-2 rounded text-gray-700 font-medium" />
            <button onClick={() => setModalOpen(true)} className="btn btn-primary flex items-center gap-2">
                <FaPlus /> New Booking
            </button>
        </div>
      </div>

      {/* CALENDAR GRID */}
      <div className="flex-1 overflow-auto relative bg-white scrollbar-thin">
        
        {/* RED TIME LINE */}
        {currentTimePos && (
             <div style={{ left: currentTimePos, top: 0, bottom: 0, zIndex: 50 }} className="absolute w-0.5 bg-red-600 pointer-events-none">
                <div className="w-2 h-2 bg-red-600 rounded-full -mt-1 -ml-[3px]"></div>
             </div>
        )}

        {/* TIME HEADER */}
        <div className="flex min-w-max sticky top-0 z-20 bg-gray-50 border-b border-gray-200">
          <div className="sticky left-0 z-30 bg-gray-50 border-r border-gray-200 text-gray-500 font-bold text-xs uppercase p-4 flex items-center justify-center" style={{ width: STAFF_COL_WIDTH }}>Stylist</div>
          {TIME_SLOTS.map(t => (
            <div key={t} className="p-3 text-center border-r border-gray-100 text-gray-400 font-medium text-sm" style={{ width: SLOT_WIDTH }}>{t}</div>
          ))}
        </div>

        {/* STAFF ROWS */}
        <div className="min-w-max">
            {staff.map(s => (
            <div key={s._id} className="flex border-b border-gray-100 h-24">
                
                {/* Staff Column */}
                <div className="sticky left-0 z-10 bg-white border-r border-gray-200 flex flex-col justify-center px-4 shadow-[4px_0_10px_-5px_rgba(0,0,0,0.05)]" style={{ width: STAFF_COL_WIDTH }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm" style={{ background: s.color }}>{s.name.charAt(0).toUpperCase()}</div>
                        <div>
                            <strong className="block text-gray-800 text-sm leading-tight">{s.name}</strong>
                            <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">{s.role}</span>
                        </div>
                    </div>
                </div>
                
                {/* Time Slots */}
                {TIME_SLOTS.map(time => {
                    const appt = getBooking(s.name, time);
                    
                    // --- LOGIC FOR "DONE" COLOR ---
                    const isDone = appt?.status === 'Completed';
                    // If done, use Green (#059669), else use Staff/Appt color
                    const bgColor = isDone ? '#059669' : (appt?.color || s.color);

                    return (
                        <div key={time} className="border-r border-gray-100 relative group" style={{ width: SLOT_WIDTH }}>
                            {appt ? (
                                // APPOINTMENT CARD
                                <div className={`absolute inset-1 rounded-md p-2 text-white shadow-md text-xs flex flex-col justify-center cursor-pointer hover:scale-[1.02] transition-transform z-10 ${isDone ? 'opacity-90' : ''}`}
                                    style={{ background: bgColor }}
                                    // Clicking calls the Mark Done function
                                    onClick={() => handleMarkDone(appt._id, appt.status)}
                                    title={isDone ? "Completed" : "Click to mark as Done"}
                                >
                                    {/* Checkmark icon if done */}
                                    {isDone && <FaCheckCircle className="absolute top-2 right-2 text-white/70" size={14} />}

                                    <div className="font-bold text-sm truncate flex items-center gap-1">
                                        <FaUserClock className="opacity-80"/> {appt.clientName}
                                    </div>
                                    <div className="opacity-90 truncate mt-1">{appt.serviceName}</div>
                                </div>
                            ) : (
                                // EMPTY SLOT
                                <div className="h-full w-full cursor-pointer hover:bg-blue-50/50 transition-colors" onClick={() => openBookingModal(s.name, time)}></div>
                            )}
                        </div>
                    );
                })}
            </div>
            ))}
        </div>
      </div>

      {/* BOOKING MODAL (Unchanged) */}
      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="New Appointment">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="bg-gray-50 p-3 rounded border flex justify-between items-center text-sm">
                <div><span className="text-gray-500">Stylist:</span> <strong>{formData.staffName}</strong></div>
                <div><span className="text-gray-500">Time:</span> <strong>{formData.time}</strong></div>
                <div>{isSlotAvailable ? <span className="text-green-600 font-bold flex items-center gap-1"><FaCheckCircle/> Open</span> : <span className="text-red-500 font-bold flex items-center gap-1"><FaExclamationTriangle/> Busy</span>}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <input placeholder="Client Name" required className="border p-2 rounded" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} />
                <input placeholder="Phone" className="border p-2 rounded" value={formData.clientPhone} onChange={e => setFormData({...formData, clientPhone: e.target.value})} />
            </div>
            <select required className="border p-2 rounded" value={formData.serviceName} onChange={e => {
                const s = services.find(srv => srv.name === e.target.value);
                setFormData({...formData, serviceName: e.target.value, price: s?.price || ''});
            }}>
                <option value="">Select Service</option>
                {services.map(s => <option key={s._id} value={s.name}>{s.name} - ₹{s.price}</option>)}
            </select>
            <button disabled={!isSlotAvailable || loading} className="btn btn-primary w-full py-2">{loading ? 'Booking...' : 'Confirm Appointment'}</button>
        </form>
      </Modal>
    </div>
  );
};

export default Calendar;