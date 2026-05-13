import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Billing() {
  const { user } = useAuth();
  const [bills, setBills] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewBill, setViewBill] = useState(null);
  const [items, setItems] = useState([]);
  const [clientInfo, setClientInfo] = useState({ clientName: '', clientPhone: '', customerId: '' });
  const [payment, setPayment] = useState({ method: 'cash', cashAmount: 0, upiAmount: 0, cardAmount: 0 });
  const [gstRate, setGstRate] = useState(18);
  const centerId = user?.centerId;

  const fetchData = async () => {
    try {
      const params = centerId ? `?centerId=${centerId}` : '';
      const [b, sv, st, ca, cu] = await Promise.all([
        api.get(`/billing${params}`),
        api.get(`/services${params}`),
        api.get(`/staff${params}`),
        api.get(`/campaigns/active${params}`),
        api.get(`/customers${params}`)
      ]);
      setBills(b.data); setServices(sv.data); setStaff(st.data); setCampaigns(ca.data); setCustomers(cu.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const addItem = () => setItems([...items, { serviceId: '', serviceName: '', staffId: '', staffName: '', originalPrice: 0, discountedPrice: 0, campaignId: '', campaignName: '', discountType: '', discountValue: 0 }]);

  const updateItem = (idx, field, value) => {
    const updated = [...items];
    updated[idx][field] = value;

    if (field === 'serviceId') {
      const svc = services.find(s => s._id === value);
      if (svc) {
        updated[idx].serviceName = svc.name;
        updated[idx].originalPrice = svc.price;
        updated[idx].discountedPrice = svc.price;

        // Auto-apply campaign
        const now = new Date();
        const activeCampaign = campaigns.find(c => {
          const appliesToService = c.applicableServices.length === 0 || c.applicableServices.some(s => (s._id || s) === value);
          return appliesToService;
        });
        if (activeCampaign) {
          updated[idx].campaignId = activeCampaign._id;
          updated[idx].campaignName = activeCampaign.name;
          updated[idx].discountType = activeCampaign.discountType;
          updated[idx].discountValue = activeCampaign.discountValue;
          if (activeCampaign.discountType === 'percentage') {
            updated[idx].discountedPrice = svc.price - (svc.price * activeCampaign.discountValue / 100);
          } else {
            updated[idx].discountedPrice = svc.price - activeCampaign.discountValue;
          }
        }
      }
    }

    if (field === 'staffId') {
      const st = staff.find(s => s._id === value);
      if (st) updated[idx].staffName = st.name;
    }

    setItems(updated);
  };

  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  const subtotal = items.reduce((s, i) => s + (i.discountedPrice || i.originalPrice || 0), 0);
  const totalDiscount = items.reduce((s, i) => s + ((i.originalPrice || 0) - (i.discountedPrice || i.originalPrice || 0)), 0);
  const gstAmount = subtotal * gstRate / 100;
  const grandTotal = subtotal + gstAmount;

  const handleBillSubmit = async () => {
    if (items.length === 0) return alert('Add at least one service');
    if (!clientInfo.clientName) return alert('Enter client name');
    try {
      await api.post('/billing', {
        ...clientInfo, centerId, items, subtotal, totalDiscount,
        gstRate, gstAmount, grandTotal,
        paymentMethod: payment.method,
        cashAmount: payment.cashAmount, upiAmount: payment.upiAmount, cardAmount: payment.cardAmount,
        paymentStatus: 'paid'
      });
      setShowModal(false); setItems([]); setClientInfo({ clientName: '', clientPhone: '', customerId: '' });
      fetchData();
    } catch (e) { alert('Error creating bill'); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Billing</h1>
          <p>{bills.length} bills today</p>
        </div>
        <button className="btn-primary" onClick={() => { setItems([]); setClientInfo({ clientName: '', clientPhone: '' }); setShowModal(true); }}>
          + New Bill
        </button>
      </div>

      {loading ? <div className="page-loading">Loading...</div> : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr><th>Bill No</th><th>Client</th><th>Items</th><th>Discount</th><th>GST</th><th>Total</th><th>Payment</th><th>Time</th></tr>
            </thead>
            <tbody>
              {bills.map(b => (
                <tr key={b._id} onClick={() => setViewBill(b)} style={{ cursor: 'pointer' }}>
                  <td><strong>{b.billNumber}</strong></td>
                  <td>{b.clientName}</td>
                  <td>{b.items?.length} services</td>
                  <td className="discount">-₹{b.totalDiscount?.toLocaleString() || 0}</td>
                  <td>₹{b.gstAmount?.toLocaleString() || 0}</td>
                  <td><strong>₹{b.grandTotal?.toLocaleString()}</strong></td>
                  <td><span className="badge">{b.paymentMethod}</span></td>
                  <td>{new Date(b.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {bills.length === 0 && <div className="empty-state">No bills today</div>}
        </div>
      )}

      {/* New Bill Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Bill</h2>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="bill-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Client Name *</label>
                  <input value={clientInfo.clientName} onChange={e => setClientInfo({ ...clientInfo, clientName: e.target.value })} placeholder="Client name" />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input value={clientInfo.clientPhone} onChange={e => setClientInfo({ ...clientInfo, clientPhone: e.target.value })} placeholder="9876543210" />
                </div>
              </div>

              <div className="bill-items-header">
                <h3>Services</h3>
                <button className="btn-secondary sm" onClick={addItem}>+ Add Service</button>
              </div>

              {items.map((item, idx) => (
                <div key={idx} className="bill-item-row">
                  <select value={item.serviceId} onChange={e => updateItem(idx, 'serviceId', e.target.value)}>
                    <option value="">Select service</option>
                    {services.map(s => <option key={s._id} value={s._id}>{s.name} — ₹{s.price}</option>)}
                  </select>
                  <select value={item.staffId} onChange={e => updateItem(idx, 'staffId', e.target.value)}>
                    <option value="">Any staff</option>
                    {staff.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                  <div className="item-pricing">
                    {item.campaignName && <span className="campaign-tag">🏷 {item.campaignName}</span>}
                    {item.originalPrice > 0 && item.originalPrice !== item.discountedPrice && (
                      <span className="original-price">₹{item.originalPrice}</span>
                    )}
                    <span className="final-price">₹{item.discountedPrice || item.originalPrice || 0}</span>
                  </div>
                  <button className="btn-delete sm" onClick={() => removeItem(idx)}>✕</button>
                </div>
              ))}

              {items.length === 0 && <div className="empty-items">Click "+ Add Service" to start billing</div>}

              <div className="bill-summary">
                <div className="summary-row-item"><span>Subtotal</span><span>₹{subtotal.toLocaleString()}</span></div>
                {totalDiscount > 0 && <div className="summary-row-item discount"><span>Discount</span><span>-₹{totalDiscount.toLocaleString()}</span></div>}
                <div className="summary-row-item"><span>GST ({gstRate}%)</span><span>₹{gstAmount.toFixed(2)}</span></div>
                <div className="summary-row-item total"><span>Grand Total</span><span>₹{grandTotal.toFixed(2)}</span></div>
              </div>

              <div className="payment-section">
                <h3>Payment</h3>
                <div className="payment-methods">
                  {['cash', 'upi', 'card', 'split'].map(m => (
                    <button key={m} className={`payment-btn ${payment.method === m ? 'active' : ''}`} onClick={() => setPayment({ ...payment, method: m })}>
                      {m.toUpperCase()}
                    </button>
                  ))}
                </div>
                {payment.method === 'split' && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>Cash ₹</label>
                      <input type="number" value={payment.cashAmount} onChange={e => setPayment({ ...payment, cashAmount: +e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>UPI ₹</label>
                      <input type="number" value={payment.upiAmount} onChange={e => setPayment({ ...payment, upiAmount: +e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Card ₹</label>
                      <input type="number" value={payment.cardAmount} onChange={e => setPayment({ ...payment, cardAmount: +e.target.value })} />
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn-primary" onClick={handleBillSubmit}>Generate Bill — ₹{grandTotal.toFixed(2)}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Bill Modal */}
      {viewBill && (
        <div className="modal-overlay" onClick={() => setViewBill(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Bill — {viewBill.billNumber}</h2>
              <button onClick={() => setViewBill(null)}>✕</button>
            </div>
            <div className="bill-view">
              <p><strong>Client:</strong> {viewBill.clientName}</p>
              {viewBill.clientPhone && <p><strong>Phone:</strong> {viewBill.clientPhone}</p>}
              <table className="data-table">
                <thead><tr><th>Service</th><th>Staff</th><th>Original</th><th>Discount</th><th>Final</th></tr></thead>
                <tbody>
                  {viewBill.items?.map((item, i) => (
                    <tr key={i}>
                      <td>{item.serviceName}{item.campaignName && <span className="campaign-tag">🏷 {item.campaignName}</span>}</td>
                      <td>{item.staffName}</td>
                      <td>₹{item.originalPrice}</td>
                      <td className="discount">-₹{(item.originalPrice - item.discountedPrice).toFixed(0)}</td>
                      <td><strong>₹{item.discountedPrice}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="bill-summary">
                <div className="summary-row-item"><span>Subtotal</span><span>₹{viewBill.subtotal?.toLocaleString()}</span></div>
                {viewBill.totalDiscount > 0 && <div className="summary-row-item discount"><span>Discount</span><span>-₹{viewBill.totalDiscount?.toLocaleString()}</span></div>}
                <div className="summary-row-item"><span>GST ({viewBill.gstRate}%)</span><span>₹{viewBill.gstAmount?.toFixed(2)}</span></div>
                <div className="summary-row-item total"><span>Grand Total</span><span>₹{viewBill.grandTotal?.toFixed(2)}</span></div>
              </div>
              <p><strong>Payment:</strong> {viewBill.paymentMethod?.toUpperCase()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
