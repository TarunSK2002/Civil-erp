import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Edit3, Loader2, UserCheck, X, Check } from 'lucide-react';
import api from '../api/axios';

const PAYEE_TYPES = ['Labour', 'Contractor', 'Supplier', 'Material', 'Advance', 'Site Cash', 'Other'];

const TYPE_COLORS = {
  Labour: { bg: 'rgba(156, 39, 176, 0.12)', color: '#CE93D8' },
  Contractor: { bg: 'rgba(33, 150, 243, 0.12)', color: '#64B5F6' },
  Supplier: { bg: 'rgba(0, 150, 136, 0.12)', color: '#4DB6AC' },
  Material: { bg: 'rgba(255, 152, 0, 0.12)', color: '#FFB74D' },
  Advance: { bg: 'rgba(244, 67, 54, 0.12)', color: '#EF5350' },
  'Site Cash': { bg: 'rgba(255, 179, 0, 0.12)', color: '#FFB300' },
  Other: { bg: 'rgba(158, 158, 158, 0.12)', color: '#BDBDBD' }
};

const PayeePage = () => {
  const [payees, setPayees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    Name: '',
    Type: 'Labour',
    MobileNo: '',
    AccountNo: '',
    Notes: ''
  });

  useEffect(() => {
    fetchPayees();
  }, [typeFilter]);

  const fetchPayees = async () => {
    try {
      const res = await api.get(`/payees?type=${typeFilter}`);
      setPayees(res.data);
    } catch (err) {
      console.error('Failed to fetch payees', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/payees/${editingId}`, formData);
      } else {
        await api.post('/payees', formData);
      }
      setIsModalOpen(false);
      setEditingId(null);
      resetForm();
      fetchPayees();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to save payee');
    }
  };

  const handleEdit = (payee) => {
    setEditingId(payee.id);
    setFormData({
      Name: payee.Name,
      Type: payee.Type,
      MobileNo: payee.MobileNo || '',
      AccountNo: payee.AccountNo || '',
      Notes: payee.Notes || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this payee?')) return;
    try {
      await api.delete(`/payees/${id}`);
      fetchPayees();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to delete payee');
    }
  };

  const resetForm = () => {
    setFormData({ Name: '', Type: 'Labour', MobileNo: '', AccountNo: '', Notes: '' });
  };

  const filtered = payees.filter(p =>
    p.Name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="data-page" style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Payees</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            Manage all payment recipients — labour, contractors, suppliers, materials, and more.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setEditingId(null); setIsModalOpen(true); }}
          style={{
            backgroundColor: 'var(--accent)',
            color: '#0F0F1A',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 20px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px'
          }}
        >
          <Plus size={18} /> Add Payee
        </button>
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: 'var(--bg-card)',
        padding: '16px 20px',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        marginBottom: '20px',
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search payees..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '10px 10px 10px 38px',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>

        {/* Type Filter Chips */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['All', ...PAYEE_TYPES].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: `1px solid ${typeFilter === t ? 'var(--accent)' : 'var(--border)'}`,
                background: typeFilter === t ? 'rgba(255, 179, 0, 0.15)' : 'transparent',
                color: typeFilter === t ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="data-table-scroll" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '14px 16px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', letterSpacing: '0.8px', textTransform: 'uppercase' }}>NAME</th>
              <th style={{ padding: '14px 16px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', letterSpacing: '0.8px', textTransform: 'uppercase' }}>TYPE</th>
              <th style={{ padding: '14px 16px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', letterSpacing: '0.8px', textTransform: 'uppercase' }}>MOBILE</th>
              <th style={{ padding: '14px 16px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', letterSpacing: '0.8px', textTransform: 'uppercase' }}>ACCOUNT</th>
              <th style={{ padding: '14px 16px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', letterSpacing: '0.8px', textTransform: 'uppercase' }}>NOTES</th>
              <th style={{ padding: '14px 16px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', letterSpacing: '0.8px', textTransform: 'uppercase', textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center' }}><Loader2 className="animate-spin" color="var(--accent)" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No payees found</td></tr>
            ) : filtered.map(payee => {
              const tc = TYPE_COLORS[payee.Type] || TYPE_COLORS.Other;
              return (
                <tr key={payee.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: tc.bg, color: tc.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: '800', fontSize: '13px'
                      }}>
                        {payee.Name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: '600', fontSize: '14px' }}>{payee.Name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '4px 10px', borderRadius: '6px',
                      background: tc.bg, color: tc.color,
                      fontSize: '11px', fontWeight: '700'
                    }}>
                      {payee.Type}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>{payee.MobileNo || '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>{payee.AccountNo || '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{payee.Notes || '—'}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button onClick={() => handleEdit(payee)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', padding: 4 }}>
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => handleDelete(payee.id)} style={{ background: 'none', border: 'none', color: 'var(--error)', padding: 4 }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '32px', borderRadius: '16px', width: '480px', border: '1px solid var(--border)' }} className="fade-in">
            <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '24px' }}>
              {editingId ? 'Edit Payee' : 'Add New Payee'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name *</label>
                <input
                  type="text"
                  value={formData.Name}
                  onChange={e => setFormData({ ...formData, Name: e.target.value })}
                  required
                  autoFocus
                  placeholder="e.g. SARATHY, RAMESH GRILL WORK"
                  style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Type *</label>
                <select
                  value={formData.Type}
                  onChange={e => setFormData({ ...formData, Type: e.target.value })}
                  style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px' }}
                >
                  {PAYEE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mobile No</label>
                  <input
                    type="text"
                    value={formData.MobileNo}
                    onChange={e => setFormData({ ...formData, MobileNo: e.target.value })}
                    placeholder="Optional"
                    style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Account No</label>
                  <input
                    type="text"
                    value={formData.AccountNo}
                    onChange={e => setFormData({ ...formData, AccountNo: e.target.value })}
                    placeholder="Optional"
                    style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px' }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notes</label>
                <textarea
                  value={formData.Notes}
                  onChange={e => setFormData({ ...formData, Notes: e.target.value })}
                  rows={2}
                  placeholder="Any remarks..."
                  style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', color: 'var(--text-primary)', outline: 'none', resize: 'none', fontSize: '14px', fontFamily: 'inherit' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingId(null); }} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'none', color: 'var(--text-primary)', fontWeight: '600', fontSize: '14px' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: 'var(--accent)', color: '#0F0F1A', fontWeight: '700', fontSize: '14px' }}>
                  {editingId ? 'Update' : 'Add Payee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayeePage;
