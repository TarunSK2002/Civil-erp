import React, { useEffect, useState } from 'react';
import { Edit2, Loader2, Plus, Trash2 } from 'lucide-react';
import api from '../api/axios';
import SlidePanel from '../components/SlidePanel';

const PaymentPage = () => {
  const [payments, setPayments] = useState([]);
  const [sites, setSites] = useState([]);
  const [labours, setLabours] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [payees, setPayees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    PaymentCategory: 'Labour',
    SiteId: '',
    LabourId: '',
    MaterialId: '',
    PayeeId: '',
    Amount: '',
    PaymentMode: 'Cash',
    Notes: '',
    PaymentDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchPayments();
    fetchDropdowns();
  }, [category, fromDate, toDate]);

  const fetchPayments = async () => {
    try {
      const response = await api.get(`/payments?category=${category}&fromDate=${fromDate}&toDate=${toDate}`);
      setPayments(response.data);
    } catch (err) {
      console.error('Failed to fetch payments', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [sitesRes, laboursRes, materialsRes, payeesRes] = await Promise.all([
        api.get('/sites'),
        api.get('/labours'),
        api.get('/materials'),
        api.get('/payees')
      ]);
      setSites(sitesRes.data);
      setLabours(laboursRes.data);
      setMaterials(materialsRes.data);
      setPayees(payeesRes.data);
    } catch (err) {
      console.error('Failed to fetch dropdown data', err);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      PaymentCategory: 'Labour',
      SiteId: '',
      LabourId: '',
      MaterialId: '',
      PayeeId: '',
      Amount: '',
      PaymentMode: 'Cash',
      Notes: '',
      PaymentDate: new Date().toISOString().split('T')[0]
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const selectedPayee = payees.find(payee => String(payee.id) === String(formData.PayeeId));
    const matchedLabour = selectedPayee
      ? labours.find(labour => labour.Name?.toLowerCase() === selectedPayee.Name?.toLowerCase())
      : null;
    const matchedMaterial = selectedPayee
      ? materials.find(material => material.Name?.toLowerCase() === selectedPayee.Name?.toLowerCase())
      : null;
    const payload = {
      ...formData,
      LabourId: formData.PaymentCategory === 'Labour' ? matchedLabour?.id || null : null,
      MaterialId: formData.PaymentCategory === 'Material' ? matchedMaterial?.id || null : null
    };

    try {
      if (editingId) {
        await api.put(`/payments/${editingId}`, payload);
      } else {
        await api.post('/payments', payload);
      }
      setIsModalOpen(false);
      resetForm();
      fetchPayments();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to save payment');
    }
  };

  const handleEdit = (payment) => {
    setEditingId(payment.id);
    setFormData({
      PaymentCategory: payment.PaymentCategory,
      SiteId: payment.SiteId,
      LabourId: payment.LabourId || '',
      MaterialId: payment.MaterialId || '',
      PayeeId: payment.PayeeId || '',
      Amount: payment.Amount,
      PaymentMode: payment.PaymentMode,
      Notes: payment.Notes || '',
      PaymentDate: payment.PaymentDate?.split('T')[0] || new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this payment record?')) {
      try {
        await api.delete(`/payments/${id}`);
        fetchPayments();
      } catch (err) {
        alert(err.response?.data?.msg || 'Failed to delete payment');
      }
    }
  };

  const filteredPayees = payees.filter((payee) => {
    if (formData.PaymentCategory === 'Labour') return payee.Type === 'Labour' || payee.Type === 'Contractor';
    if (formData.PaymentCategory === 'Material') return payee.Type === 'Material' || payee.Type === 'Supplier';
    return true;
  });

  const tableHeaderStyle = {
    padding: '16px',
    fontSize: '13px',
    color: 'var(--text-muted)',
    position: 'sticky',
    top: 0,
    zIndex: 1,
    backgroundColor: 'var(--bg-secondary)'
  };

  return (
    <div className="data-page" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Payment Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Track all financial transactions for sites, labour, and materials.</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          style={{
            backgroundColor: 'var(--accent)',
            color: '#0F0F1A',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Plus size={20} /> Add New Payment
        </button>
      </div>

      <div style={{
        backgroundColor: 'var(--bg-card)',
        padding: '20px',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        marginBottom: '24px',
        display: 'flex',
        gap: '20px',
        alignItems: 'flex-end'
      }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
          >
            <option value="All">All Categories</option>
            <option value="Collection">Collections (Income)</option>
            <option value="Labour">Labour (Expense)</option>
            <option value="Material">Materials (Expense)</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
          />
        </div>
        <button
          onClick={() => { setCategory('All'); setFromDate(''); setToDate(''); }}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 16px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          Reset
        </button>
      </div>

      <div style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        overflow: 'auto',
        flex: 1,
        minHeight: 0
      }}>
        <table style={{ width: '100%', minWidth: '980px', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
              <th style={tableHeaderStyle}>DATE</th>
              <th style={tableHeaderStyle}>CATEGORY</th>
              <th style={tableHeaderStyle}>SITE NAME</th>
              <th style={tableHeaderStyle}>PAYEE / RECIPIENT</th>
              <th style={tableHeaderStyle}>AMOUNT</th>
              <th style={tableHeaderStyle}>MODE</th>
              <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ padding: '40px', textAlign: 'center' }}><Loader2 className="animate-spin" color="var(--accent)" /></td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No payment records found</td></tr>
            ) : payments.map(payment => (
              <tr key={payment.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '16px', fontSize: '13px' }}>
                  {new Date(payment.PaymentDate).toLocaleDateString()}
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: payment.PaymentCategory === 'Collection' ? 'rgba(0, 200, 83, 0.1)' :
                      payment.PaymentCategory === 'Labour' ? 'rgba(74, 20, 140, 0.1)' : 'rgba(0, 96, 100, 0.1)',
                    color: payment.PaymentCategory === 'Collection' ? '#00C853' :
                      payment.PaymentCategory === 'Labour' ? '#9C27B0' : '#00ACC1',
                    fontSize: '11px',
                    fontWeight: '800'
                  }}>
                    {payment.PaymentCategory.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '16px', fontWeight: '500' }}>{payment.Site?.SiteName}</td>
                <td style={{ padding: '16px' }}>
                  <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                    {payment.Payee?.Name ||
                      payment.SheetItem?.Payee?.Name ||
                      (payment.PaymentCategory === 'Labour' ? payment.Labour?.Name : payment.Material?.Name) ||
                      (payment.Notes?.includes('Weekly sheet payment - ') ? payment.Notes.replace('Weekly sheet payment - ', '') : 'N/A')}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {payment.PaymentCategory === 'Collection' ? 'From Client' :
                      payment.PaymentCategory === 'Labour' ? 'Labour' : 'Material'}
                  </div>
                </td>
                <td style={{ padding: '16px', fontWeight: 'bold', color: 'var(--accent)' }}>
                  Rs {parseFloat(payment.Amount).toLocaleString('en-IN')}
                </td>
                <td style={{ padding: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>{payment.PaymentMode}</td>
                <td style={{ padding: '16px', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={() => handleEdit(payment)} style={{ background: 'none', border: 'none', color: 'var(--accent)' }}>
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDelete(payment.id)} style={{ background: 'none', border: 'none', color: 'var(--error)' }}>
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SlidePanel
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Payment Record' : 'Add New Payment'}
        width={520}
        footer={
          <>
            <button type="button" className="sp-btn-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button 
              type="button" 
              className="sp-btn-submit" 
              onClick={(e) => {
                e.preventDefault();
                const form = document.getElementById('payment-form');
                if (form.checkValidity()) {
                  handleSubmit(e);
                } else {
                  form.reportValidity();
                }
              }}
            >
              {editingId ? 'Update Record' : 'Record Payment'}
            </button>
          </>
        }
      >
        <form id="payment-form" onSubmit={handleSubmit}>
          <div className="sp-row">
            <div className="sp-field">
              <label>Category</label>
              <select
                value={formData.PaymentCategory}
                onChange={(e) => setFormData({ ...formData, PaymentCategory: e.target.value, LabourId: '', MaterialId: '', PayeeId: '' })}
              >
                <option value="Collection">Collection (Income)</option>
                <option value="Labour">Labour (Expense)</option>
                <option value="Material">Material (Expense)</option>
              </select>
            </div>
            <div className="sp-field">
              <label>Date</label>
              <input
                type="date"
                value={formData.PaymentDate}
                onChange={(e) => setFormData({ ...formData, PaymentDate: e.target.value })}
              />
            </div>
          </div>

          <div className="sp-field">
            <label>Site</label>
            <select
              value={formData.SiteId}
              onChange={(e) => setFormData({ ...formData, SiteId: e.target.value })}
              required
            >
              <option value="">Select Site</option>
              {sites.map(site => <option key={site.id} value={site.id}>{site.SiteName}</option>)}
            </select>
          </div>

          {formData.PaymentCategory !== 'Collection' && (
            <div className="sp-field">
              <label>Payee</label>
              <select
                value={formData.PayeeId}
                onChange={(e) => setFormData({ ...formData, PayeeId: e.target.value })}
                required
              >
                <option value="">Select Person</option>
                {filteredPayees.map(payee => <option key={payee.id} value={payee.id}>{payee.Name} ({payee.Type})</option>)}
              </select>
              <p style={{ margin: '6px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                {formData.PaymentCategory === 'Labour' ? 'Showing Labours & Contractors' :
                  formData.PaymentCategory === 'Material' ? 'Showing Suppliers & Materials' : 'Showing all payees'}
              </p>
            </div>
          )}

          {formData.PaymentCategory === 'Collection' && (
            <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(0, 200, 83, 0.05)', border: '1px solid rgba(0, 200, 83, 0.2)' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#00C853', fontWeight: '600' }}>
                Recording income received from the client for this site.
              </p>
            </div>
          )}

          <div className="sp-row">
            <div className="sp-field">
              <label>Amount (Rs)</label>
              <input
                type="number"
                value={formData.Amount}
                onChange={(e) => setFormData({ ...formData, Amount: e.target.value })}
                required
              />
            </div>
            <div className="sp-field">
              <label>Payment Mode</label>
              <select
                value={formData.PaymentMode}
                onChange={(e) => setFormData({ ...formData, PaymentMode: e.target.value })}
              >
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
          </div>

          <div className="sp-field">
            <label>Notes</label>
            <textarea
              value={formData.Notes}
              onChange={(e) => setFormData({ ...formData, Notes: e.target.value })}
              rows="3"
            />
          </div>
        </form>
      </SlidePanel>
    </div>
  );
};

export default PaymentPage;
