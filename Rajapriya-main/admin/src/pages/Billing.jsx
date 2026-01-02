import { useEffect, useState, useRef } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { FaPrint, FaTrash } from 'react-icons/fa';

const Billing = () => {
  const [queue, setQueue] = useState([]);
  const [activeBill, setActiveBill] = useState(null); // The selected appointment
  const [services, setServices] = useState([]);
  
  // Bill State
  const [billItems, setBillItems] = useState([]);
  const [payments, setPayments] = useState({ cash: 0, upi: 0 });

  const printRef = useRef(); // For printing

  // Load Queue & Services
  useEffect(() => {
    const init = async () => {
        const appRes = await api.get('/appointments');
        setQueue(appRes.data.filter(a => a.paymentStatus === 'Unpaid'));
        
        const srvRes = await api.get('/services');
        setServices(srvRes.data);
    };
    init();
  }, []);

  // Select a Client from Queue
  const selectClient = (appt) => {
    setActiveBill(appt);
    setBillItems([{ name: appt.serviceName, price: appt.price }]);
    setPayments({ cash: 0, upi: 0 });
  };

  // Add Item to Bill
  const addItem = (e) => {
    const serviceName = e.target.value;
    if(!serviceName) return;
    const s = services.find(srv => srv.name === serviceName);
    setBillItems([...billItems, { name: s.name, price: s.price }]);
  };

  // Calculations
  const subtotal = billItems.reduce((sum, item) => sum + item.price, 0);
  const gst = Math.round(subtotal * 0.05);
  const total = subtotal + gst;
  const balance = total - (parseInt(payments.cash || 0) + parseInt(payments.upi || 0));

  // Complete Bill
  const handleComplete = async () => {
    if(balance !== 0) return toast.error("Balance must be 0");
    
    // Save to DB
    await api.put(`/appointments/${activeBill._id}`, {
        paymentStatus: 'Paid',
        status: 'Completed',
        totalAmount: total,
        paymentMethod: payments.cash === total ? 'Cash' : (payments.upi === total ? 'UPI' : 'Split'),
        cashAmount: payments.cash,
        upiAmount: payments.upi,
        serviceName: billItems.map(i => i.name).join(' + ') // Update full service string
    });

    // Trigger Print
    handlePrint();

    // Reset UI
    toast.success("Bill Saved!");
    setActiveBill(null);
    const appRes = await api.get('/appointments'); // Refresh Queue
    setQueue(appRes.data.filter(a => a.paymentStatus === 'Unpaid'));
  };

  const handlePrint = () => {
     const content = printRef.current.innerHTML;
     const printWindow = window.open('', '', 'height=600,width=800');
     printWindow.document.write('<html><head><title>Print</title>');
     printWindow.document.write('<style>body{font-family:monospace; padding:20px; text-align:center;} table{width:100%; text-align:left;} .right{text-align:right;}</style>');
     printWindow.document.write('</head><body>');
     printWindow.document.write(content);
     printWindow.document.write('</body></html>');
     printWindow.document.close();
     printWindow.print();
  };

  return (
    <div className="flex h-full gap-4">
      
      {/* LEFT: QUEUE */}
      <div className="w-1/3 bg-white p-4 rounded shadow overflow-y-auto">
        <h3 className="font-bold mb-4 text-gray-700">Pending Bills</h3>
        {queue.length === 0 && <p className="text-gray-400 text-center mt-10">No pending clients</p>}
        {queue.map(q => (
            <div key={q._id} onClick={() => selectClient(q)} 
                 className={`p-3 border-b cursor-pointer hover:bg-blue-50 ${activeBill?._id === q._id ? 'bg-blue-100 border-l-4 border-blue-500' : ''}`}>
                <div className="font-bold">{q.clientName}</div>
                <div className="text-xs text-gray-500">{q.serviceName}</div>
            </div>
        ))}
      </div>

      {/* RIGHT: BILLING PANEL */}
      {activeBill ? (
          <div className="w-2/3 bg-white p-6 rounded shadow flex flex-col">
             <div className="flex justify-between items-center border-b pb-4 mb-4">
                 <div>
                    <h2 className="text-xl font-bold uppercase">{activeBill.clientName}</h2>
                    <p className="text-sm text-gray-500">Invoice #{activeBill._id.slice(-4).toUpperCase()}</p>
                 </div>
                 <select onChange={addItem} className="border p-2 rounded">
                    <option value="">+ Add Service</option>
                    {services.map(s => <option key={s._id} value={s.name}>{s.name} - ₹{s.price}</option>)}
                 </select>
             </div>

             {/* Items Table */}
             <div className="flex-1 overflow-y-auto">
                 <table className="w-full">
                    <tbody>
                        {billItems.map((item, idx) => (
                            <tr key={idx} className="border-b">
                                <td className="py-2">{item.name}</td>
                                <td className="py-2 text-right">₹{item.price}</td>
                                <td className="py-2 text-right text-red-500 cursor-pointer w-10" 
                                    onClick={() => setBillItems(billItems.filter((_, i) => i !== idx))}><FaTrash/></td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
             </div>

             {/* Totals */}
             <div className="bg-gray-50 p-4 rounded mt-4">
                 <div className="flex justify-between text-sm"><span>Subtotal</span><span>₹{subtotal}</span></div>
                 <div className="flex justify-between text-sm"><span>GST (5%)</span><span>₹{gst}</span></div>
                 <div className="flex justify-between font-bold text-xl mt-2 border-t pt-2"><span>Total</span><span>₹{total}</span></div>
             </div>

             {/* Payment */}
             <div className="flex gap-4 mt-4">
                 <div className="flex-1">
                    <label className="text-xs font-bold">Cash</label>
                    <input type="number" className="border w-full p-2 rounded" value={payments.cash} 
                           onChange={e => setPayments({...payments, cash: parseInt(e.target.value)||0})} />
                 </div>
                 <div className="flex-1">
                    <label className="text-xs font-bold">UPI</label>
                    <input type="number" className="border w-full p-2 rounded" value={payments.upi} 
                           onChange={e => setPayments({...payments, upi: parseInt(e.target.value)||0})} />
                 </div>
             </div>

             <button disabled={balance !== 0} onClick={handleComplete}
                className={`w-full mt-4 text-white py-3 rounded font-bold ${balance === 0 ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}>
                {balance === 0 ? `Complete Bill & Print` : `Balance: ₹${balance}`}
             </button>

             {/* HIDDEN PRINT TEMPLATE */}
             <div style={{display:'none'}}>
                <div ref={printRef} style={{padding: '20px', fontFamily: 'monospace'}}>
                    <h2 style={{textAlign:'center', margin:0}}>GLAM PRO</h2>
                    <p style={{textAlign:'center', margin:0}}>Luxury Salon</p>
                    <hr style={{margin:'10px 0', borderStyle:'dashed'}} />
                    <p>Client: {activeBill.clientName}</p>
                    <p>Date: {new Date().toLocaleDateString()}</p>
                    <hr style={{margin:'10px 0', borderStyle:'dashed'}} />
                    <table style={{width:'100%'}}>
                        {billItems.map((i,x) => <tr key={x}><td>{i.name}</td><td style={{textAlign:'right'}}>{i.price}</td></tr>)}
                    </table>
                    <hr style={{margin:'10px 0', borderStyle:'dashed'}} />
                    <div style={{textAlign:'right'}}>
                        <p>Sub: {subtotal}</p>
                        <p>GST: {gst}</p>
                        <h3>TOTAL: {total}</h3>
                    </div>
                    <p style={{textAlign:'center', marginTop:'20px'}}>Thank You!</p>
                </div>
             </div>

          </div>
      ) : (
          <div className="w-2/3 flex justify-center items-center text-gray-400">Select a client to bill</div>
      )}
    </div>
  );
};

export default Billing;