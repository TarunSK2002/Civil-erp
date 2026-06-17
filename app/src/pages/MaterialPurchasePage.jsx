import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Package, Home, Loader2, ShoppingCart, Edit2, IndianRupee, Ruler, Layers } from 'lucide-react';
import api from '../api/axios';

const UNITS = [
  'nos', 'unit', 'kg', 'litr', 'running feet', 'ton', 'bill',
  'cu ft', 'sq ft', 'cu m', 'sq m', 'meter', 'running meter', 'box',
  'PVC door', 'PVC Window', 'UPVC door', 'UPVC window',
  'Aluminium door', 'aluminium window', 'steel door', 'steel window',
  'wpc door', 'teekwood door', 'flush door', 'mahakani door',
  'wood Ventilator', 'upvc ventilator'
];

const MaterialPurchasePage = () => {
  const [purchases, setPurchases] = useState([]);
  const [sites, setSites] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [materialTypes, setMaterialTypes] = useState([]);
  
  // Site-specific dropdowns
  const [sections, setSections] = useState([]);
  const [projects, setProjects] = useState([]);
  
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    SiteId: '',
    MaterialId: '',
    Quantity: '',
    Unit: 'nos',
    Amount: '',
    DealerName: '',
    PurchaseDate: new Date().toISOString().split('T')[0],
    Length: '',
    Breadth: '',
    SqFt: '',
    WastagePercent: '0',
    RatePerUnit: '',
    CalculationMode: 'Manual',
    SectionId: '',
    ProjectId: ''
  });
  
  const uniqueDealers = [...new Set(purchases.map(p => p.DealerName).filter(Boolean))];

  useEffect(() => {
    fetchPurchases();
    fetchDropdowns();
  }, []);

  // Fetch sections and projects when SiteId changes
  useEffect(() => {
    if (formData.SiteId) {
      fetchSiteDetails(formData.SiteId);
    } else {
      setSections([]);
      setProjects([]);
    }
  }, [formData.SiteId]);

  // Handle calculations based on CalculationMode and inputs
  useEffect(() => {
    const selectedMatType = materialTypes.find(t => String(t.id) === String(formData.MaterialId));
    if (!selectedMatType) return;

    const calcMode = selectedMatType.CalculationMode || 'Manual';
    
    setFormData(prev => {
      const rate = prev.RatePerUnit !== '' ? parseFloat(prev.RatePerUnit) : parseFloat(selectedMatType.Price || 0);
      const updates = { 
        CalculationMode: calcMode,
        RatePerUnit: prev.RatePerUnit !== '' ? prev.RatePerUnit : String(selectedMatType.Price || 0)
      };

      if (calcMode === 'SqFtRate') {
        const len = parseFloat(prev.Length || 0);
        const brd = parseFloat(prev.Breadth || 0);
        const wastage = parseFloat(prev.WastagePercent || 0);
        
        const sqFt = len * brd;
        updates.SqFt = sqFt > 0 ? sqFt.toFixed(2) : '';
        
        const billableSqFt = sqFt * (1 + wastage / 100);
        updates.Quantity = billableSqFt > 0 ? billableSqFt.toFixed(2) : '';
        
        const computedAmount = billableSqFt * rate;
        updates.Amount = computedAmount > 0 ? computedAmount.toFixed(2) : '';
      } else if (calcMode === 'QuantityRate') {
        const qty = parseFloat(prev.Quantity || 0);
        const computedAmount = qty * rate;
        updates.Amount = computedAmount > 0 ? computedAmount.toFixed(2) : '';
      } else {
        // Manual mode: simple multiplication if quantity is provided
        const qty = parseFloat(prev.Quantity || 0);
        if (qty > 0 && rate > 0) {
          updates.Amount = (qty * rate).toFixed(2);
        }
      }

      // Prevent infinite loop by checking if updates actually change state
      let hasChange = false;
      for (const k in updates) {
        if (prev[k] !== updates[k]) {
          hasChange = true;
          break;
        }
      }

      return hasChange ? { ...prev, ...updates } : prev;
    });
  }, [formData.MaterialId, formData.Quantity, formData.Length, formData.Breadth, formData.WastagePercent, formData.RatePerUnit, materialTypes]);

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
      const [sitesRes, materialsRes, typesRes] = await Promise.all([
        api.get('/sites'),
        api.get('/materials'),
        api.get('/material-types')
      ]);
      setSites(sitesRes.data);
      setMaterials(materialsRes.data);
      setMaterialTypes(typesRes.data);
    } catch (err) {
      console.error('Failed to fetch dropdown data', err);
    }
  };

  const fetchSiteDetails = async (siteId) => {
    try {
      const [secRes, projRes] = await Promise.all([
        api.get(`/site-sections/site/${siteId}`),
        api.get(`/site-projects/site/${siteId}`)
      ]);
      setSections(secRes.data);
      setProjects(projRes.data);
    } catch (err) {
      console.error('Failed to fetch site sections and projects', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSubmit = { ...formData };
      // Convert empty select values to null
      if (!dataToSubmit.SectionId) dataToSubmit.SectionId = null;
      if (!dataToSubmit.ProjectId) dataToSubmit.ProjectId = null;
      if (!dataToSubmit.Length) dataToSubmit.Length = null;
      if (!dataToSubmit.Breadth) dataToSubmit.Breadth = null;
      if (!dataToSubmit.SqFt) dataToSubmit.SqFt = null;

      if (editingId) {
        await api.put(`/site-materials/${editingId}`, dataToSubmit);
      } else {
        await api.post('/site-materials', dataToSubmit);
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
      Quantity: String(purchase.Quantity),
      Unit: purchase.Unit,
      Amount: String(purchase.Amount),
      DealerName: purchase.DealerName || '',
      PurchaseDate: purchase.PurchaseDate.split('T')[0],
      Length: purchase.Length ? String(purchase.Length) : '',
      Breadth: purchase.Breadth ? String(purchase.Breadth) : '',
      SqFt: purchase.SqFt ? String(purchase.SqFt) : '',
      WastagePercent: purchase.WastagePercent ? String(purchase.WastagePercent) : '0',
      RatePerUnit: purchase.RatePerUnit ? String(purchase.RatePerUnit) : '',
      CalculationMode: purchase.CalculationMode || 'Manual',
      SectionId: purchase.SectionId || '',
      ProjectId: purchase.ProjectId || ''
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      SiteId: '',
      MaterialId: '',
      Quantity: '',
      Unit: 'nos',
      Amount: '',
      DealerName: '',
      PurchaseDate: new Date().toISOString().split('T')[0],
      Length: '',
      Breadth: '',
      SqFt: '',
      WastagePercent: '0',
      RatePerUnit: '',
      CalculationMode: 'Manual',
      SectionId: '',
      ProjectId: ''
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

  const selectedMatType = materialTypes.find(t => String(t.id) === String(formData.MaterialId));
  const currentCalcMode = selectedMatType?.CalculationMode || 'Manual';

  return (
    <div className="data-page" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Material Purchase</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Record and track material procurement for specific sites, floors, and projects.</p>
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
            gap: '8px',
            cursor: 'pointer'
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
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>SITE & SCOPE</th>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>QUANTITY / DIMENSION</th>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>AMOUNT</th>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ padding: '40px', textAlign: 'center' }}><Loader2 className="animate-spin" color="var(--accent)" /></td></tr>
            ) : purchases.length === 0 ? (
              <tr><td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No purchase records found</td></tr>
            ) : purchases.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '16px', fontSize: '13px' }}>
                  {new Date(p.PurchaseDate).toLocaleDateString('en-IN')}
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Home size={14} color="var(--text-muted)" />
                      <span style={{ fontWeight: 500 }}>{p.Site?.SiteName}</span>
                    </div>
                    {p.SectionId && (
                      <span style={{ fontSize: '11px', color: '#9C27B0', display: 'flex', alignItems: 'center', gap: '4px', paddingLeft: '20px' }}>
                        <Ruler size={10} /> Floor: {p.Section?.Name || `Floor #${p.SectionId}`}
                      </span>
                    )}
                    {p.ProjectId && (
                      <span style={{ fontSize: '11px', color: 'var(--info)', display: 'flex', alignItems: 'center', gap: '4px', paddingLeft: '20px' }}>
                        <Layers size={10} /> Project: {p.Project?.ProjectName || `Project #${p.ProjectId}`}
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '16px' }}>
                  {p.CalculationMode === 'SqFtRate' ? (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: '500' }}>{p.SqFt} sq ft</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {p.Length}′ × {p.Breadth}′ (Wastage: {p.WastagePercent}%)
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontWeight: '500' }}>{p.Quantity} {p.Unit}</span>
                  )}
                </td>
                <td style={{ padding: '16px', fontWeight: 'bold' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>₹{parseFloat(p.Amount || 0).toLocaleString('en-IN')}</span>
                    {p.Discount > 0 && (
                      <span style={{ fontSize: '11px', color: 'var(--success)' }}>Discount: -₹{parseFloat(p.Discount).toLocaleString('en-IN')}</span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '16px', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center', minHeight: '60px' }}>
                  <button onClick={() => handleEdit(p)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer' }}>
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDelete(p.id)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer' }}>
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '32px', borderRadius: '16px', width: '560px', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto' }} className="fade-in">
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px' }}>{editingId ? 'Edit Purchase Record' : 'Record Purchase'}</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Site *</label>
                <select 
                  value={formData.SiteId}
                  onChange={(e) => setFormData({...formData, SiteId: e.target.value, SectionId: '', ProjectId: ''})}
                  required
                  style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                >
                  <option value="">Select Site</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.SiteName}</option>)}
                </select>
              </div>

              {formData.SiteId && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Floor / Section (Optional)</label>
                    <select
                      value={formData.SectionId}
                      onChange={(e) => setFormData({...formData, SectionId: e.target.value})}
                      style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                    >
                      <option value="">Select Floor/Section</option>
                      {sections.map(sec => <option key={sec.id} value={sec.id}>{sec.Name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Project / Work Order (Optional)</label>
                    <select
                      value={formData.ProjectId}
                      onChange={(e) => setFormData({...formData, ProjectId: e.target.value})}
                      style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                    >
                      <option value="">Select Project</option>
                      {projects.map(proj => <option key={proj.id} value={proj.id}>{proj.ProjectName}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Material *</label>
                <select 
                  value={formData.MaterialId}
                  onChange={(e) => {
                    const typeId = e.target.value;
                    const matType = materialTypes.find(t => String(t.id) === String(typeId));
                    setFormData(prev => ({ 
                      ...prev, 
                      MaterialId: typeId, 
                      Unit: matType?.DefaultUnit || 'nos',
                      Length: '',
                      Breadth: '',
                      SqFt: '',
                      WastagePercent: '0',
                      RatePerUnit: matType ? String(matType.Price) : '',
                      Amount: ''
                    }));
                  }}
                  required
                  style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                >
                  <option value="">Select Material</option>
                  {materialTypes.map(m => <option key={m.id} value={m.id}>{m.Name}</option>)}
                </select>
                {selectedMatType && (
                  <div style={{ marginTop: 6, padding: '6px 10px', background: 'rgba(124,77,255,0.08)', borderRadius: 6, fontSize: 12, color: '#7C4DFF', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <IndianRupee size={12} />
                    <span>Calculation Mode: <strong>{currentCalcMode}</strong> (Rate: ₹{parseFloat(selectedMatType.Price).toLocaleString('en-IN')} per {selectedMatType.DefaultUnit || 'nos'})</span>
                  </div>
                )}
              </div>

              {/* Conditional SqFt inputs */}
              {currentCalcMode === 'SqFtRate' ? (
                <div style={{ border: '1px dashed var(--border)', padding: '16px', borderRadius: '8px', marginBottom: '16px', backgroundColor: 'rgba(255, 255, 255, 0.01)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Length (ft) *</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={formData.Length}
                        onChange={(e) => setFormData({...formData, Length: e.target.value})}
                        required
                        style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Breadth (ft) *</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={formData.Breadth}
                        onChange={(e) => setFormData({...formData, Breadth: e.target.value})}
                        required
                        style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Calculated Area (SqFt)</label>
                      <input 
                        type="text" 
                        disabled
                        value={formData.SqFt}
                        style={{ width: '100%', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-muted)', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Wastage %</label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={formData.WastagePercent}
                        onChange={(e) => setFormData({...formData, WastagePercent: e.target.value})}
                        style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Quantity *</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={formData.Quantity}
                      onChange={(e) => setFormData({...formData, Quantity: e.target.value})}
                      required
                      style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Unit *</label>
                    <select
                      value={formData.Unit}
                      onChange={(e) => setFormData({...formData, Unit: e.target.value})}
                      style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                    >
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Dealer / Vendor *</label>
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
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    {currentCalcMode === 'SqFtRate' ? 'Rate per SqFt (₹) *' : 'Rate per Unit (₹) *'}
                  </label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={formData.RatePerUnit}
                    onChange={(e) => setFormData({...formData, RatePerUnit: e.target.value})}
                    placeholder="Rate"
                    required
                    style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Total Amount (₹) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={formData.Amount}
                    onChange={(e) => setFormData({...formData, Amount: e.target.value})}
                    placeholder="Total cost (auto-calculated)"
                    required
                    style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Purchase Date *</label>
                  <input 
                    type="date" 
                    value={formData.PurchaseDate}
                    onChange={(e) => setFormData({...formData, PurchaseDate: e.target.value})}
                    style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--accent)', color: '#0F0F1A', fontWeight: 'bold', cursor: 'pointer' }}>
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
