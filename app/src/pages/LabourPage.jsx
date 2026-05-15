import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, X, HardHat, Phone, CreditCard, Loader2 } from 'lucide-react';
import api from '../api/axios';

const LabourPage = () => {
  const location = useLocation();
  const [labours, setLabours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLabour, setEditingLabour] = useState(null);

  useEffect(() => {
    if (new URLSearchParams(location.search).get('action') === 'add') {
      setIsModalOpen(true);
    }
  }, [location]);
  const labourTypes = [
    'Mason', 'Sentring', 'RR Work', 'Carpenter', 'Painter',
    'Grill', 'Centring', 'Electrician', 'Plumbing',
    'Drill & Core cutting', 'Tiles', 'Helper', 'Other'
  ];

  // Form State
  const [formData, setFormData] = useState({
    Name: '',
    MobileNo: '',
    AccountNo: '',
    LabourType: 'Mason'
  });

  useEffect(() => {
    fetchLabours();
  }, [searchTerm, typeFilter]);

  const fetchLabours = async () => {
    try {
      const response = await api.get(`/labours?search=${searchTerm}&type=${typeFilter}`);
      setLabours(response.data);
    } catch (err) {
      console.error('Failed to fetch labours', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingLabour) {
        await api.put(`/labours/${editingLabour.id}`, formData);
      } else {
        await api.post('/labours', formData);
      }
      setIsModalOpen(false);
      setEditingLabour(null);
      resetForm();
      fetchLabours();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to save labour');
    }
  };

  const resetForm = () => {
    setFormData({
      Name: '',
      MobileNo: '',
      AccountNo: '',
      LabourType: 'Mason'
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this labour record?')) {
      try {
        await api.delete(`/labours/${id}`);
        fetchLabours();
      } catch (err) {
        alert(err.response?.data?.msg || 'Failed to delete labour');
      }
    }
  };

  const openEditModal = (labour) => {
    setEditingLabour(labour);
    setFormData({
      Name: labour.Name,
      MobileNo: labour.MobileNo,
      AccountNo: labour.AccountNo,
      LabourType: labour.LabourType
    });
    setIsModalOpen(true);
  };

  return (
    <div className="data-page" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Labour Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Directory of workers and specialized contractors.</p>
        </div>
        <button
          onClick={() => { setEditingLabour(null); resetForm(); setIsModalOpen(true); }}
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
          <Plus size={20} /> Add New Labour
        </button>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '16px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by name or mobile..."
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
            minWidth: '150px'
          }}
        >
          <option value="All">All Types</option>
          {labourTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="data-table-scroll" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>NAME</th>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>LABOUR TYPE</th>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>MOBILE NUMBER</th>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>ACCOUNT NO</th>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center' }}><Loader2 className="animate-spin" color="var(--accent)" /></td></tr>
            ) : labours.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No labour records found</td></tr>
            ) : labours.map(labour => (
              <tr key={labour.id} style={{ borderBottom: '1px solid var(--border)', transition: 'var(--transition)' }}>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(255, 179, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                      <HardHat size={16} />
                    </div>
                    <span style={{ fontWeight: '600' }}>{labour.Name}</span>
                  </div>
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{
                    padding: '4px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', border: '1px solid var(--border)'
                  }}>
                    {labour.LabourType}
                  </span>
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                    <Phone size={14} color="var(--text-muted)" /> {labour.MobileNo || 'Not provided'}
                  </div>
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                    <CreditCard size={14} color="var(--text-muted)" /> {labour.AccountNo || 'Not provided'}
                  </div>
                </td>
                <td style={{ padding: '16px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => openEditModal(labour)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)' }}><Edit2 size={18} /></button>
                    <button onClick={() => handleDelete(labour.id)} style={{ background: 'none', border: 'none', color: 'var(--error)' }}><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '32px', borderRadius: '16px', width: '450px', border: '1px solid var(--border)' }} className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>{editingLabour ? 'Edit Labour' : 'Add New Labour'}</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Full Name</label>
                <input
                  type="text"
                  value={formData.Name}
                  onChange={(e) => setFormData({ ...formData, Name: e.target.value })}
                  required
                  style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Labour Type</label>
                <select
                  value={formData.LabourType}
                  onChange={(e) => setFormData({ ...formData, LabourType: e.target.value })}
                  style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                >
                  {labourTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Mobile Number</label>
                <input
                  type="text"
                  value={formData.MobileNo}
                  onChange={(e) => setFormData({ ...formData, MobileNo: e.target.value })}
                  // required
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
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'none', color: 'var(--text-primary)' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--accent)', color: '#0F0F1A', fontWeight: 'bold' }}>
                  {editingLabour ? 'Update Labour' : 'Save Labour'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabourPage;
