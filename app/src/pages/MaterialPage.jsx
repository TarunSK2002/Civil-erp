import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, X, Store, Phone, CreditCard, Loader2, Package, Check, IndianRupee, Pencil } from 'lucide-react';
import api from '../api/axios';

const UNITS = [
  'nos', 'unit', 'kg', 'litr', 'running feet', 'ton', 'bill',
  'cu ft', 'sq ft', 'cu m', 'sq m', 'meter', 'running meter', 'box',
  'PVC door', 'PVC Window', 'UPVC door', 'UPVC window',
  'Aluminium door', 'aluminium window', 'steel door', 'steel window',
  'wpc door', 'teekwood door', 'flush door', 'mahakani door',
  'wood Ventilator', 'upvc ventilator'
];

const MaterialPage = () => {
  const location = useLocation();
  const [dealers, setDealers] = useState([]);
  const [materialTypes, setMaterialTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDealer, setEditingDealer] = useState(null);
  const [showMaterialTypeModal, setShowMaterialTypeModal] = useState(false);
  const [newMaterialType, setNewMaterialType] = useState('');
  const [newMaterialPrice, setNewMaterialPrice] = useState('');
  const [newMaterialUnit, setNewMaterialUnit] = useState('nos');
  const [newMaterialCalcMode, setNewMaterialCalcMode] = useState('Manual');

  // Edit state for material types
  const [editingTypeId, setEditingTypeId] = useState(null);
  const [editTypeName, setEditTypeName] = useState('');
  const [editTypePrice, setEditTypePrice] = useState('');
  const [editTypeUnit, setEditTypeUnit] = useState('nos');
  const [editTypeCalcMode, setEditTypeCalcMode] = useState('Manual');

  useEffect(() => {
    if (new URLSearchParams(location.search).get('action') === 'add') {
      setIsModalOpen(true);
    }
  }, [location]);

  // Form State
  const [formData, setFormData] = useState({
    Name: '',
    DealerName: '',
    MobileNo: '',
    AccountNo: '',
    MaterialTypeId: ''
  });

  useEffect(() => {
    fetchDealers();
    fetchMaterialTypes();
  }, [searchTerm]);

  const fetchDealers = async () => {
    try {
      const response = await api.get(`/materials?search=${searchTerm}`);
      setDealers(response.data);
    } catch (err) {
      console.error('Failed to fetch dealers', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterialTypes = async () => {
    try {
      const res = await api.get('/material-types');
      setMaterialTypes(res.data);
      if (res.data.length === 0) {
        await api.post('/material-types/seed');
        const seeded = await api.get('/material-types');
        setMaterialTypes(seeded.data);
      }
    } catch (err) {
      console.error('Failed to fetch material types', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        MaterialTypeId: formData.MaterialTypeId ? parseInt(formData.MaterialTypeId) : null
      };
      if (editingDealer) {
        await api.put(`/materials/${editingDealer.id}`, payload);
      } else {
        await api.post('/materials', payload);
      }
      setIsModalOpen(false);
      setEditingDealer(null);
      resetForm();
      fetchDealers();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to save dealer');
    }
  };

  const resetForm = () => {
    setFormData({
      Name: '',
      DealerName: '',
      MobileNo: '',
      AccountNo: '',
      MaterialTypeId: ''
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this dealer?')) {
      try {
        await api.delete(`/materials/${id}`);
        fetchDealers();
      } catch (err) {
        alert(err.response?.data?.msg || 'Failed to delete dealer');
      }
    }
  };

  const openEditModal = (dealer) => {
    setEditingDealer(dealer);
    setFormData({
      Name: dealer.Name || '',
      DealerName: dealer.DealerName || '',
      MobileNo: dealer.MobileNo || '',
      AccountNo: dealer.AccountNo || '',
      MaterialTypeId: dealer.MaterialTypeId || ''
    });
    setIsModalOpen(true);
  };

  const handleAddMaterialType = async () => {
    if (!newMaterialType.trim()) return;
    try {
      await api.post('/material-types', {
        Name: newMaterialType.trim(),
        Price: parseFloat(newMaterialPrice) || 0,
        DefaultUnit: newMaterialUnit,
        CalculationMode: newMaterialCalcMode
      });
      setNewMaterialType('');
      setNewMaterialPrice('');
      setNewMaterialUnit('nos');
      setNewMaterialCalcMode('Manual');
      fetchMaterialTypes();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to add material type');
    }
  };

  const handleDeleteMaterialType = async (id) => {
    if (!window.confirm('Delete this material type?')) return;
    try {
      await api.delete(`/material-types/${id}`);
      fetchMaterialTypes();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to delete');
    }
  };

  const startEditType = (t) => {
    setEditingTypeId(t.id);
    setEditTypeName(t.Name);
    setEditTypePrice(t.Price || '');
    setEditTypeUnit(t.DefaultUnit || 'nos');
    setEditTypeCalcMode(t.CalculationMode || 'Manual');
  };

  const handleUpdateMaterialType = async (id) => {
    if (!editTypeName.trim()) return;
    try {
      await api.put(`/material-types/${id}`, {
        Name: editTypeName.trim(),
        Price: parseFloat(editTypePrice) || 0,
        DefaultUnit: editTypeUnit,
        CalculationMode: editTypeCalcMode
      });
      setEditingTypeId(null);
      fetchMaterialTypes();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to update');
    }
  };

  const filteredDealers = typeFilter === 'All'
    ? dealers
    : dealers.filter(d => d.MaterialTypeId === parseInt(typeFilter));

  return (
    <div className="data-page" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Dealer Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Directory of material dealers and suppliers.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setShowMaterialTypeModal(true)}
            style={{
              backgroundColor: 'transparent',
              color: 'var(--accent)',
              border: '1px solid var(--accent)',
              borderRadius: '8px',
              padding: '10px 16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            <Package size={16} /> Material Types
          </button>
          <button
            onClick={() => { setEditingDealer(null); resetForm(); setIsModalOpen(true); }}
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
            <Plus size={20} /> Add New Dealer
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '16px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by name, dealer name, or mobile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '12px 12px 12px 40px',
              color: 'var(--text-primary)',
              outline: 'none'
            }}
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '0 12px',
            color: 'var(--text-primary)',
            outline: 'none',
            minWidth: '180px'
          }}
        >
          <option value="All">All Material Types</option>
          {materialTypes.map(t => <option key={t.id} value={t.id}>{t.Name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="data-table-scroll" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>SHOP NAME</th>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>DEALER NAME</th>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>MATERIAL TYPE</th>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>MOBILE NO</th>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>ACCOUNT NO</th>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center' }}><Loader2 className="animate-spin" color="var(--accent)" /></td></tr>
            ) : filteredDealers.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No dealers found</td></tr>
            ) : filteredDealers.map(dealer => (
              <tr key={dealer.id} style={{ borderBottom: '1px solid var(--border)', transition: 'var(--transition)' }}>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(0, 150, 136, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#009688' }}>
                      <Store size={16} />
                    </div>
                    <span style={{ fontWeight: '600' }}>{dealer.Name}</span>
                  </div>
                </td>
                <td style={{ padding: '16px', fontWeight: 500 }}>{dealer.DealerName || '—'}</td>
                <td style={{ padding: '16px' }}>
                  {dealer.MaterialType ? (
                    <div>
                      <span style={{
                        padding: '4px 8px', borderRadius: '4px', backgroundColor: 'rgba(0, 150, 136, 0.08)',
                        color: '#4DB6AC', fontSize: '12px', fontWeight: '600', border: '1px solid rgba(0, 150, 136, 0.2)'
                      }}>
                        {dealer.MaterialType.Name}
                      </span>
                      {dealer.MaterialType.Price > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                          ₹{parseFloat(dealer.MaterialType.Price).toLocaleString('en-IN')} / {dealer.MaterialType.DefaultUnit || 'nos'}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                  )}
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                    <Phone size={14} color="var(--text-muted)" /> {dealer.MobileNo || 'Not provided'}
                  </div>
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                    <CreditCard size={14} color="var(--text-muted)" /> {dealer.AccountNo || 'Not provided'}
                  </div>
                </td>
                <td style={{ padding: '16px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => openEditModal(dealer)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><Edit2 size={18} /></button>
                    <button onClick={() => handleDelete(dealer.id)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer' }}><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Dealer Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '32px', borderRadius: '16px', width: '480px', border: '1px solid var(--border)' }} className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>{editingDealer ? 'Edit Dealer' : 'Add New Dealer'}</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Shop / Company Name *</label>
                <input
                  type="text"
                  value={formData.Name}
                  onChange={(e) => setFormData({ ...formData, Name: e.target.value })}
                  required
                  placeholder="e.g. Sri Lakshmi Cement Works"
                  style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Dealer Name</label>
                <input
                  type="text"
                  value={formData.DealerName}
                  onChange={(e) => setFormData({ ...formData, DealerName: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Material Type</label>
                <select
                  value={formData.MaterialTypeId}
                  onChange={(e) => setFormData({ ...formData, MaterialTypeId: e.target.value })}
                  style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                >
                  <option value="">Select material type...</option>
                  {materialTypes.filter(t => t.IsActive).map(t => (
                    <option key={t.id} value={t.id}>
                      {t.Name}{t.Price > 0 ? ` — ₹${parseFloat(t.Price).toLocaleString('en-IN')}/${t.DefaultUnit || 'nos'}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Mobile Number</label>
                <input
                  type="text"
                  value={formData.MobileNo}
                  onChange={(e) => setFormData({ ...formData, MobileNo: e.target.value })}
                  placeholder="Optional"
                  style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Bank Account Number</label>
                <input
                  type="text"
                  value={formData.AccountNo}
                  onChange={(e) => setFormData({ ...formData, AccountNo: e.target.value })}
                  placeholder="Optional"
                  style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--accent)', color: '#0F0F1A', fontWeight: 'bold', cursor: 'pointer' }}>
                  {editingDealer ? 'Update Dealer' : 'Save Dealer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Material Types Management Modal */}
      {showMaterialTypeModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100
        }} onClick={() => setShowMaterialTypeModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'var(--bg-card)', padding: '32px', borderRadius: '16px', width: '520px', border: '1px solid var(--border)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} className="fade-in">
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>Material Types</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 16 }}>Manage material categories with their default price and unit. These auto-fill the purchase form when selected.</p>

            {/* Add new material type */}
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 14, marginBottom: 16, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 10 }}>Add New Material Type</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  type="text"
                  value={newMaterialType}
                  onChange={e => setNewMaterialType(e.target.value)}
                  placeholder="Material type name..."
                  onKeyDown={e => e.key === 'Enter' && handleAddMaterialType()}
                  style={{
                    flex: 2, backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)',
                    borderRadius: '8px', padding: '9px', color: 'var(--text-primary)', outline: 'none', fontSize: 13
                  }}
                />
                <input
                  type="number"
                  value={newMaterialPrice}
                  onChange={e => setNewMaterialPrice(e.target.value)}
                  placeholder="Price (₹)"
                  style={{
                    flex: 1, backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)',
                    borderRadius: '8px', padding: '9px', color: 'var(--text-primary)', outline: 'none', fontSize: 13
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={newMaterialUnit}
                  onChange={e => setNewMaterialUnit(e.target.value)}
                  style={{
                    flex: 1, backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)',
                    borderRadius: '8px', padding: '9px', color: 'var(--text-primary)', outline: 'none', fontSize: 13
                  }}
                >
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <select
                  value={newMaterialCalcMode}
                  onChange={e => setNewMaterialCalcMode(e.target.value)}
                  style={{
                    flex: 1, backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)',
                    borderRadius: '8px', padding: '9px', color: 'var(--text-primary)', outline: 'none', fontSize: 13
                  }}
                >
                  <option value="Manual">Manual</option>
                  <option value="QuantityRate">Qty × Rate</option>
                  <option value="SqFtRate">SqFt × Rate</option>
                </select>
                <button
                  onClick={handleAddMaterialType}
                  style={{
                    flex: 1, backgroundColor: 'var(--accent)', color: '#0F0F1A', border: 'none',
                    borderRadius: '8px', padding: '9px 16px', fontWeight: '600', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                  }}
                >
                  <Plus size={16} /> Add
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {materialTypes.map(t => (
                <div key={t.id} style={{
                  borderRadius: 8,
                  border: '1px solid var(--border)', marginBottom: 6,
                  background: 'var(--bg-secondary)',
                  overflow: 'hidden'
                }}>
                  {editingTypeId === t.id ? (
                    /* Edit mode */
                    <div style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <input
                          type="text"
                          value={editTypeName}
                          onChange={e => setEditTypeName(e.target.value)}
                          autoFocus
                          style={{
                            flex: 2, backgroundColor: 'var(--bg-input)', border: '1px solid var(--accent)',
                            borderRadius: '6px', padding: '7px 10px', color: 'var(--text-primary)', outline: 'none', fontSize: 13, fontWeight: 600
                          }}
                        />
                        <input
                          type="number"
                          value={editTypePrice}
                          onChange={e => setEditTypePrice(e.target.value)}
                          placeholder="Price (₹)"
                          style={{
                            flex: 1, backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)',
                            borderRadius: '6px', padding: '7px 10px', color: 'var(--text-primary)', outline: 'none', fontSize: 13
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <select
                          value={editTypeUnit}
                          onChange={e => setEditTypeUnit(e.target.value)}
                          style={{
                            flex: 1, backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)',
                            borderRadius: '6px', padding: '7px 10px', color: 'var(--text-primary)', outline: 'none', fontSize: 13
                          }}
                        >
                          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <select
                          value={editTypeCalcMode}
                          onChange={e => setEditTypeCalcMode(e.target.value)}
                          style={{
                            flex: 1, backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)',
                            borderRadius: '6px', padding: '7px 10px', color: 'var(--text-primary)', outline: 'none', fontSize: 13
                          }}
                        >
                          <option value="Manual">Manual</option>
                          <option value="QuantityRate">Qty × Rate</option>
                          <option value="SqFtRate">SqFt × Rate</option>
                        </select>
                        <button
                          onClick={() => handleUpdateMaterialType(t.id)}
                          style={{ flex: 1, backgroundColor: 'var(--accent)', color: '#0F0F1A', border: 'none', borderRadius: '6px', padding: '7px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                        >
                          <Check size={14} /> Save
                        </button>
                        <button
                          onClick={() => setEditingTypeId(null)}
                          style={{ padding: '7px 10px', borderRadius: '6px', background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.2)', color: '#F44336', cursor: 'pointer', fontSize: 12 }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View mode */
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                        <Package size={14} color="#4DB6AC" />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{t.Name}</div>
                          {(t.Price > 0 || t.DefaultUnit || t.CalculationMode) && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                              {t.Price > 0 && (
                                <span style={{ background: 'rgba(76,175,80,0.1)', color: '#4CAF50', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                                  ₹{parseFloat(t.Price).toLocaleString('en-IN')}
                                </span>
                              )}
                              {t.DefaultUnit && (
                                <span style={{ background: 'rgba(0,188,212,0.1)', color: '#00BCD4', padding: '1px 6px', borderRadius: 4 }}>
                                  {t.DefaultUnit}
                                </span>
                              )}
                              {t.CalculationMode && (
                                <span style={{ background: 'rgba(156,39,176,0.1)', color: '#9C27B0', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                                  {t.CalculationMode}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => startEditType(t)}
                          style={{ background: 'rgba(124,77,255,0.1)', border: '1px solid rgba(124,77,255,0.2)', color: '#7C4DFF', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                        >
                          <Pencil size={12} /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteMaterialType(t.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: 4 }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowMaterialTypeModal(false)}
              style={{
                marginTop: 16, padding: '12px', borderRadius: '8px',
                border: '1px solid var(--border)', background: 'none',
                color: 'var(--text-primary)', cursor: 'pointer', width: '100%'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialPage;
