import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Package, Home, Calendar, Loader2, ShoppingCart, Ruler, Edit2 } from 'lucide-react';
import api from '../api/axios';

const MaterialPurchasePage = () => {
  const [purchases, setPurchases] = useState([]);
  const [sites, setSites] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form State (for adding)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    SiteId: '',
    MaterialId: '',
    Quantity: '',
    Unit: 'Units',
    Amount: '',
    DealerName: '',
    PurchaseDate: new Date().toISOString().split('T')[0]
  });
  
  // Extract unique dealers for suggestions
  const uniqueDealers = [...new Set(purchases.map(p => p.DealerName).filter(Boolean))];

  useEffect(() => {
    fetchPurchases();
    fetchDropdowns();
  }, []);

  const fetchPurchases = async () => {
    try {
      const response = await api.get('/site-materials');
      setPurchases(response.data);
    } catch (err) {
      console.error('Failed to fetch purchases', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [sitesRes, materialsRes] = await Promise.all([
        api.get('/sites'),
        api.get('/materials')
      ]);
      setSites(sitesRes.data);
      setMaterials(materialsRes.data);
    } catch (err) {
      console.error('Failed to fetch dropdown data', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/site-materials/${editingId}`, formData);
      } else {
        await api.post('/site-materials', formData);
      }
      setIsModalOpen(false);
      resetForm();
      fetchPurchases();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to save purchase');
    }
  };

  const handleEdit = (purchase) => {
    setEditingId(purchase.id);
    setFormData({
      SiteId: purchase.SiteId,
      MaterialId: purchase.MaterialId,
      Quantity: purchase.Quantity,
      Unit: purchase.Unit,
      Amount: purchase.Amount,
      DealerName: purchase.DealerName,
      PurchaseDate: purchase.PurchaseDate.split('T')[0]
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      SiteId: '',
      MaterialId: '',
      Quantity: '',
      Unit: 'Units',
      Amount: '',
      DealerName: '',
      PurchaseDate: new Date().toISOString().split('T')[0]
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to remove this purchase record?')) {
      try {
        await api.delete(`/site-materials/${id}`);
        fetchPurchases();
      } catch (err) {
        alert(err.response?.data?.msg || 'Failed to delete record');
      }
    }
  };

  return (
    <div className="data-page" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Material Purchase</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Record and track material procurement for specific sites.</p>
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
          <ShoppingCart size={20} /> Record New Purchase
        </button>
      </div>

      {/* Table */}
      <div className="data-table-scroll" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>DATE</th>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>MATERIAL</th>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>DEALER</th>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>SITE</th>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>QUANTITY</th>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>AMOUNT</th>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center' }}><Loader2 className="animate-spin" color="var(--accent)" /></td></tr>
            ) : purchases.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No purchase records found</td></tr>
            ) : purchases.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '16px', fontSize: '13px' }}>
                  {new Date(p.PurchaseDate).toLocaleDateString()}
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Package size={16} color="var(--accent)" />
                    <span style={{ fontWeight: '600' }}>{p.Material?.Name}</span>
                  </div>
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{p.DealerName || '—'}</span>
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Home size={16} color="var(--text-muted)" />
                    <span>{p.Site?.SiteName}</span>
                  </div>
                </td>
                <td style={{ padding: '16px', fontWeight: '500' }}>
                  {p.Quantity} {p.Unit}
                </td>
                <td style={{ padding: '16px', fontWeight: 'bold' }}>
                  ₹{parseFloat(p.Amount || 0).toLocaleString('en-IN')}
                </td>
                <td style={{ padding: '16px', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={() => handleEdit(p)} style={{ background: 'none', border: 'none', color: 'var(--accent)' }}>
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDelete(p.id)} style={{ background: 'none', border: 'none', color: 'var(--error)' }}>
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '32px', borderRadius: '16px', width: '500px', border: '1px solid var(--border)' }} className="fade-in">
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px' }}>{editingId ? 'Edit Purchase Record' : 'Record Purchase'}</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Site</label>
                <select 
                  value={formData.SiteId}
                  onChange={(e) => setFormData({...formData, SiteId: e.target.value})}
                  required
                  style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                >
                  <option value="">Select Site</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.SiteName}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Material</label>
                <select 
                  value={formData.MaterialId}
                  onChange={(e) => setFormData({...formData, MaterialId: e.target.value})}
                  required
                  style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                >
                  <option value="">Select Material</option>
                  {materials.map(m => <option key={m.id} value={m.id}>{m.Name}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Quantity</label>
                  <input 
                    type="number" 
                    value={formData.Quantity}
                    onChange={(e) => setFormData({...formData, Quantity: e.target.value})}
                    required
                    style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Unit</label>
                  <input 
                    type="text" 
                    value={formData.Unit}
                    onChange={(e) => setFormData({...formData, Unit: e.target.value})}
                    placeholder="e.g. Bags, Units"
                    style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Dealer / Vendor</label>
                  <input 
                    type="text" 
                    list="dealers"
                    value={formData.DealerName}
                    onChange={(e) => setFormData({...formData, DealerName: e.target.value})}
                    placeholder="Enter or select dealer"
                    required
                    style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                  />
                  <datalist id="dealers">
                    {uniqueDealers.map(d => <option key={d} value={d} />)}
                  </datalist>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Total Amount (₹)</label>
                  <input 
                    type="number" 
                    value={formData.Amount}
                    onChange={(e) => setFormData({...formData, Amount: e.target.value})}
                    placeholder="Total cost"
                    required
                    style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Purchase Date</label>
                <input 
                  type="date" 
                  value={formData.PurchaseDate}
                  onChange={(e) => setFormData({...formData, PurchaseDate: e.target.value})}
                  style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'none', color: 'var(--text-primary)' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--accent)', color: '#0F0F1A', fontWeight: 'bold' }}>
                  {editingId ? 'Update Record' : 'Record Purchase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialPurchasePage;
