import React, { useState, useEffect } from 'react';
import {
  Settings, Plus, Save, Trash2, Loader2, IndianRupee, Clock
} from 'lucide-react';
import api from '../api/axios';

const ShiftMasterPage = () => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editRate, setEditRate] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newForm, setNewForm] = useState({ ShiftType: '', ShiftMultiplier: '', Rate: '' });

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    try {
      const res = await api.get('/shift-master');
      setShifts(res.data);
      // Auto-seed if empty
      if (res.data.length === 0) {
        await api.post('/shift-master/seed');
        const seeded = await api.get('/shift-master');
        setShifts(seeded.data);
      }
    } catch (err) {
      console.error('Failed to fetch shifts', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRate = async (shift) => {
    try {
      await api.put(`/shift-master/${shift.id}`, {
        ...shift,
        Rate: parseFloat(editRate) || 0
      });
      setEditingId(null);
      fetchShifts();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to update');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this shift type?')) return;
    try {
      await api.delete(`/shift-master/${id}`);
      fetchShifts();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to delete');
    }
  };

  const handleAdd = async () => {
    if (!newForm.ShiftType.trim() || !newForm.ShiftMultiplier) return;
    try {
      await api.post('/shift-master', {
        ShiftType: newForm.ShiftType,
        ShiftMultiplier: parseFloat(newForm.ShiftMultiplier),
        Rate: parseFloat(newForm.Rate) || 0
      });
      setShowAddForm(false);
      setNewForm({ ShiftType: '', ShiftMultiplier: '', Rate: '' });
      fetchShifts();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to add');
    }
  };

  const fmt = (num) => {
    if (!num || num === 0) return '₹0';
    return '₹' + parseFloat(num).toLocaleString('en-IN');
  };

  if (loading) {
    return (
      <div style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Loader2 size={32} className="aps-spinner" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 }}>
            Shift Master
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Configure shift types and their salary rates. These rates are used to auto-calculate attendance salary.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            border: 'none', cursor: 'pointer', background: 'var(--accent)', color: '#0F0F1A',
            transition: 'all 0.2s'
          }}
        >
          <Plus size={18} /> Add Shift Type
        </button>
      </div>

      {/* Shift Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16,
        flex: 1,
        overflowY: 'auto',
        alignContent: 'start'
      }}>
        {shifts.map(shift => {
          const isEditing = editingId === shift.id;
          const multiplier = parseFloat(shift.ShiftMultiplier);
          const colors = {
            0.5: { bg: 'rgba(156, 39, 176, 0.08)', border: 'rgba(156, 39, 176, 0.2)', color: '#CE93D8', accent: '#9C27B0' },
            1.0: { bg: 'rgba(33, 150, 243, 0.08)', border: 'rgba(33, 150, 243, 0.2)', color: '#64B5F6', accent: '#2196F3' },
            1.5: { bg: 'rgba(0, 150, 136, 0.08)', border: 'rgba(0, 150, 136, 0.2)', color: '#4DB6AC', accent: '#009688' },
            2.0: { bg: 'rgba(255, 152, 0, 0.08)', border: 'rgba(255, 152, 0, 0.2)', color: '#FFB74D', accent: '#FF9800' },
            2.5: { bg: 'rgba(244, 67, 54, 0.08)', border: 'rgba(244, 67, 54, 0.2)', color: '#EF5350', accent: '#F44336' },
            3.0: { bg: 'rgba(124, 77, 255, 0.08)', border: 'rgba(124, 77, 255, 0.2)', color: '#B388FF', accent: '#7C4DFF' }
          };
          const c = colors[multiplier] || colors[1.0];

          return (
            <div key={shift.id} style={{
              background: c.bg,
              border: `1px solid ${c.border}`,
              borderRadius: 14,
              padding: '20px 24px',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.2s'
            }}>
              {/* Top accent bar */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                background: `linear-gradient(90deg, ${c.accent}, ${c.color})`
              }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{
                    fontSize: 20, fontWeight: 900, color: c.color, marginBottom: 2
                  }}>
                    {shift.ShiftType}
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: 0.5
                  }}>
                    Multiplier: ×{multiplier}
                  </div>
                </div>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: c.bg, border: `1px solid ${c.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Clock size={18} color={c.color} />
                </div>
              </div>

              {/* Rate */}
              <div style={{ marginBottom: 16 }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6
                }}>
                  Rate Per Shift
                </div>
                {isEditing ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="number"
                      value={editRate}
                      onChange={(e) => setEditRate(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveRate(shift)}
                      style={{
                        flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)',
                        borderRadius: 8, padding: '8px 12px', color: 'var(--text-primary)',
                        fontSize: 16, fontWeight: 800, outline: 'none', fontFamily: 'inherit'
                      }}
                    />
                    <button
                      onClick={() => handleSaveRate(shift)}
                      style={{
                        background: 'rgba(76, 175, 80, 0.15)', color: '#4CAF50',
                        border: '1px solid rgba(76, 175, 80, 0.3)', borderRadius: 8,
                        padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center'
                      }}
                    >
                      <Save size={16} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => { setEditingId(shift.id); setEditRate(String(shift.Rate || '')); }}
                    style={{
                      fontSize: 28, fontWeight: 900, color: 'var(--text-primary)',
                      cursor: 'pointer', transition: 'color 0.2s'
                    }}
                  >
                    {fmt(shift.Rate)}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { setEditingId(shift.id); setEditRate(String(shift.Rate || '')); }}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 12,
                    fontWeight: 600, border: `1px solid ${c.border}`, background: 'transparent',
                    color: c.color, cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  Edit Rate
                </button>
                <button
                  onClick={() => handleDelete(shift.id)}
                  style={{
                    padding: '8px 12px', borderRadius: 8, fontSize: 12,
                    border: '1px solid rgba(244, 67, 54, 0.2)', background: 'rgba(244, 67, 54, 0.08)',
                    color: '#F44336', cursor: 'pointer', display: 'flex', alignItems: 'center'
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Shift Modal */}
      {showAddForm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }} onClick={() => setShowAddForm(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 16, padding: 32, width: 420, animation: 'apsSlideIn 0.25s ease'
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Add Shift Type</h2>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                Shift Name
              </label>
              <input
                type="text"
                placeholder="e.g. 4 Shift"
                value={newForm.ShiftType}
                onChange={e => setNewForm({ ...newForm, ShiftType: e.target.value })}
                style={{
                  width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '10px 14px', color: 'var(--text-primary)',
                  fontSize: 14, outline: 'none', fontFamily: 'inherit'
                }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                Shift Multiplier
              </label>
              <input
                type="number"
                step="0.5"
                placeholder="e.g. 4"
                value={newForm.ShiftMultiplier}
                onChange={e => setNewForm({ ...newForm, ShiftMultiplier: e.target.value })}
                style={{
                  width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '10px 14px', color: 'var(--text-primary)',
                  fontSize: 14, outline: 'none', fontFamily: 'inherit'
                }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                Rate (₹)
              </label>
              <input
                type="number"
                placeholder="e.g. 800"
                value={newForm.Rate}
                onChange={e => setNewForm({ ...newForm, Rate: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                style={{
                  width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '10px 14px', color: 'var(--text-primary)',
                  fontSize: 14, outline: 'none', fontFamily: 'inherit'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button
                onClick={() => setShowAddForm(false)}
                style={{
                  flex: 1, padding: 12, borderRadius: 10, fontSize: 13, fontWeight: 600,
                  background: 'transparent', border: '1px solid var(--border)',
                  color: 'var(--text-secondary)', cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                style={{
                  flex: 1, padding: 12, borderRadius: 10, fontSize: 13, fontWeight: 600,
                  background: 'var(--accent)', border: 'none', color: '#0F0F1A', cursor: 'pointer'
                }}
              >
                Add Shift
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes apsSlideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default ShiftMasterPage;
