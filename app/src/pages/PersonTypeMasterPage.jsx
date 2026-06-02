import React, { useState, useEffect } from 'react';
import {
  Users2, Plus, Trash2, Loader2, Pencil, Check, X, GripVertical, IndianRupee
} from 'lucide-react';
import api from '../api/axios';

const PERSON_TYPE_COLORS = [
  { bg: 'rgba(124, 77, 255, 0.08)', border: 'rgba(124, 77, 255, 0.2)', color: '#B388FF', accent: '#7C4DFF' },
  { bg: 'rgba(233, 30, 99, 0.08)', border: 'rgba(233, 30, 99, 0.2)', color: '#F48FB1', accent: '#E91E63' },
  { bg: 'rgba(33, 150, 243, 0.08)', border: 'rgba(33, 150, 243, 0.2)', color: '#64B5F6', accent: '#2196F3' },
  { bg: 'rgba(255, 152, 0, 0.08)', border: 'rgba(255, 152, 0, 0.2)', color: '#FFB74D', accent: '#FF9800' },
  { bg: 'rgba(0, 150, 136, 0.08)', border: 'rgba(0, 150, 136, 0.2)', color: '#4DB6AC', accent: '#009688' },
  { bg: 'rgba(156, 39, 176, 0.08)', border: 'rgba(156, 39, 176, 0.2)', color: '#CE93D8', accent: '#9C27B0' },
  { bg: 'rgba(244, 67, 54, 0.08)', border: 'rgba(244, 67, 54, 0.2)', color: '#EF5350', accent: '#F44336' },
  { bg: 'rgba(76, 175, 80, 0.08)', border: 'rgba(76, 175, 80, 0.2)', color: '#81C784', accent: '#4CAF50' },
  { bg: 'rgba(0, 188, 212, 0.08)', border: 'rgba(0, 188, 212, 0.2)', color: '#4DD0E1', accent: '#00BCD4' },
];

const PersonTypeMasterPage = () => {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editRate, setEditRate] = useState('');
  const [newRate, setNewRate] = useState('');

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    try {
      const res = await api.get('/person-types');
      setTypes(res.data);
      // Auto-seed if empty
      if (res.data.length === 0) {
        await api.post('/person-types/seed');
        const seeded = await api.get('/person-types');
        setTypes(seeded.data);
      }
    } catch (err) {
      console.error('Failed to fetch person types', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await api.post('/person-types', { Name: newName.trim(), DailyRate: parseFloat(newRate) || 0 });
      setNewName('');
      setNewRate('');
      setShowAddForm(false);
      fetchTypes();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to add');
    }
  };

  const handleUpdate = async (id) => {
    if (!editName.trim()) return;
    try {
      await api.put(`/person-types/${id}`, { Name: editName.trim(), DailyRate: parseFloat(editRate) || 0 });
      setEditingId(null);
      setEditName('');
      setEditRate('');
      fetchTypes();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to update');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this person type?')) return;
    try {
      await api.delete(`/person-types/${id}`);
      fetchTypes();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to delete');
    }
  };

  const handleUpdateRate = async (type) => {
    const newDailyRate = prompt(`Update daily rate for ${type.Name} (current: ₹${parseFloat(type.DailyRate || 0).toLocaleString('en-IN')})`, type.DailyRate || 0);
    if (newDailyRate === null) return;
    try {
      const res = await api.post(`/person-types/${type.id}/update-rate`, { DailyRate: parseFloat(newDailyRate) });
      alert(res.data.msg);
      fetchTypes();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to update rate');
    }
  };

  const handleToggleActive = async (type) => {
    try {
      await api.put(`/person-types/${type.id}`, { IsActive: !type.IsActive });
      fetchTypes();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to update');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#7C4DFF' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 }}>
            Person Type Master
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Configure worker categories used in attendance tracking. These appear in the Person Type dropdown when marking attendance.
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
          <Plus size={18} /> Add Person Type
        </button>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexShrink: 0 }}>
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14,
          padding: '14px 20px', flex: 1, position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #7C4DFF, #651FFF)' }} />
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 4 }}>Total Types</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)' }}>{types.length}</div>
        </div>
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14,
          padding: '14px 20px', flex: 1, position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #4CAF50, #388E3C)' }} />
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 4 }}>Active</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#4CAF50' }}>{types.filter(t => t.IsActive).length}</div>
        </div>
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14,
          padding: '14px 20px', flex: 1, position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #FF9800, #F57C00)' }} />
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 4 }}>Inactive</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#FF9800' }}>{types.filter(t => !t.IsActive).length}</div>
        </div>
      </div>

      {/* Person Type Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 16,
        flex: 1,
        overflowY: 'auto',
        alignContent: 'start'
      }}>
        {types.map((type, idx) => {
          const c = PERSON_TYPE_COLORS[idx % PERSON_TYPE_COLORS.length];
          const isEditing = editingId === type.id;

          return (
            <div key={type.id} style={{
              background: type.IsActive ? c.bg : 'rgba(100,100,100,0.04)',
              border: `1px solid ${type.IsActive ? c.border : 'var(--border)'}`,
              borderRadius: 14,
              padding: '20px 24px',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.2s',
              opacity: type.IsActive ? 1 : 0.6
            }}>
              {/* Top accent bar */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                background: type.IsActive
                  ? `linear-gradient(90deg, ${c.accent}, ${c.color})`
                  : 'var(--border)'
              }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                          Person Type Name
                        </label>
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          autoFocus
                          style={{
                            width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)',
                            borderRadius: 8, padding: '8px 10px', color: 'var(--text-primary)',
                            fontSize: 14, fontWeight: 600, outline: 'none', fontFamily: 'inherit'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                          Daily Rate (₹)
                        </label>
                        <input
                          type="number"
                          value={editRate}
                          onChange={e => setEditRate(e.target.value)}
                          style={{
                            width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)',
                            borderRadius: 8, padding: '8px 10px', color: 'var(--text-primary)',
                            fontSize: 14, fontWeight: 600, outline: 'none', fontFamily: 'inherit'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <button
                          onClick={() => handleUpdate(type.id)}
                          style={{
                            flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                            background: 'var(--accent)', border: 'none', color: '#0F0F1A', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                          }}
                        >
                          <Check size={14} /> Save
                        </button>
                        <button
                          onClick={() => { setEditingId(null); setEditName(''); setEditRate(''); }}
                          style={{
                            padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                            background: 'rgba(244, 67, 54, 0.1)', border: '1px solid rgba(244, 67, 54, 0.2)',
                            color: '#F44336', cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{
                        fontSize: 20, fontWeight: 900,
                        color: type.IsActive ? c.color : 'var(--text-muted)',
                        marginBottom: 2
                      }}>
                        {type.Name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <div style={{
                          fontSize: 11, fontWeight: 700,
                          color: type.IsActive ? 'rgba(76, 175, 80, 0.8)' : 'rgba(255, 152, 0, 0.8)',
                          textTransform: 'uppercase', letterSpacing: 0.5
                        }}>
                          {type.IsActive ? '● Active' : '○ Inactive'}
                        </div>
                        <div style={{
                          fontSize: 13, fontWeight: 800,
                          color: type.IsActive ? '#4CAF50' : 'var(--text-muted)',
                          background: type.IsActive ? 'rgba(76, 175, 80, 0.1)' : 'rgba(100,100,100,0.08)',
                          padding: '2px 8px', borderRadius: 6,
                          display: 'flex', alignItems: 'center', gap: 2
                        }}>
                          <IndianRupee size={11} />
                          {parseFloat(type.DailyRate || 0).toLocaleString('en-IN')}/day
                        </div>
                      </div>
                    </>
                  )}
                </div>
                {!isEditing && (
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: type.IsActive ? c.bg : 'rgba(100,100,100,0.08)',
                    border: `1px solid ${type.IsActive ? c.border : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 900, color: type.IsActive ? c.color : 'var(--text-muted)'
                  }}>
                    {type.Name.charAt(0)}
                  </div>
                )}
              </div>

              {/* Actions */}
              {!isEditing && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => { setEditingId(type.id); setEditName(type.Name); setEditRate(type.DailyRate || 0); }}
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 12,
                      fontWeight: 600, border: `1px solid ${type.IsActive ? c.border : 'var(--border)'}`,
                      background: 'transparent', color: type.IsActive ? c.color : 'var(--text-muted)',
                      cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: 4
                    }}
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    onClick={() => handleToggleActive(type)}
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 12,
                      fontWeight: 600,
                      border: type.IsActive ? '1px solid rgba(255, 152, 0, 0.3)' : '1px solid rgba(76, 175, 80, 0.3)',
                      background: type.IsActive ? 'rgba(255, 152, 0, 0.08)' : 'rgba(76, 175, 80, 0.08)',
                      color: type.IsActive ? '#FF9800' : '#4CAF50',
                      cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    {type.IsActive ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleDelete(type.id)}
                    style={{
                      padding: '8px 12px', borderRadius: 8, fontSize: 12,
                      border: '1px solid rgba(244, 67, 54, 0.2)', background: 'rgba(244, 67, 54, 0.08)',
                      color: '#F44336', cursor: 'pointer', display: 'flex', alignItems: 'center'
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Person Type Modal */}
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
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Add Person Type</h2>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                Person Type Name
              </label>
              <input
                type="text"
                placeholder="e.g. Welder, Supervisor"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                style={{
                  width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '10px 14px', color: 'var(--text-primary)',
                  fontSize: 14, outline: 'none', fontFamily: 'inherit'
                }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                Daily Rate (₹)
              </label>
              <input
                type="number"
                placeholder="e.g. 750"
                value={newRate}
                onChange={e => setNewRate(e.target.value)}
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
              onClick={() => { setShowAddForm(false); setNewName(''); setNewRate(''); }}
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
                Add Type
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

export default PersonTypeMasterPage;
