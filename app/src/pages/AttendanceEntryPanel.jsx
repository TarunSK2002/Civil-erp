import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, Building2, UserCheck, Clock, IndianRupee, HardHat, Coffee, TrendingUp } from 'lucide-react';
import api from '../api/axios';

const AttendanceEntryPanel = ({ sheetId, payeeId, siteId, payeeName, siteName, date, records, shiftTypes, masterSettings = { TeaExpense: '20', BusExpense: '50' }, weeklySiteAttendance = 0, weeklySiteLabourCount = 0, onClose, onSaved }) => {
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' or 'misc'
  const [localRecords, setLocalRecords] = useState(records || []);
  const [miscItems, setMiscItems] = useState([]);
  const [personTypes, setPersonTypes] = useState([]);
  const [newShift, setNewShift] = useState({ personType: '', shiftId: '', labourCount: 1 });
  const [newMisc, setNewMisc] = useState({ name: '', amount: '' });
  const [saving, setSaving] = useState(false);
  const [profitPercent, setProfitPercent] = useState('');
  const [profitAmount, setProfitAmount] = useState('');
  const [savingProfit, setSavingProfit] = useState(false);

  const profitItem = (miscItems || []).find(m => m.name.startsWith('Mason Profit'));

  useEffect(() => {
    if (profitItem) {
      const match = profitItem.name.match(/Mason Profit \((\d+(\.\d+)?)\%\)/);
      setProfitPercent(match ? match[1] : '');
      setProfitAmount(String(profitItem.amount));
    } else {
      setProfitPercent('');
      setProfitAmount('');
    }
  }, [miscItems]);

  const handlePercentChange = (val) => {
    setProfitPercent(val);
    const p = parseFloat(val);
    if (!isNaN(p)) {
      const computed = (weeklySiteAttendance * p) / 100;
      setProfitAmount(computed.toFixed(2));
    } else {
      setProfitAmount('');
    }
  };

  const handleSaveProfit = async () => {
    const amt = parseFloat(profitAmount);
    if (isNaN(amt) || amt <= 0) {
      if (profitItem) {
        setSavingProfit(true);
        try {
          await api.delete(`/attendance-sheets/${sheetId}/misc/${profitItem.id}`);
          fetchMisc();
          onSaved();
        } catch (err) {
          alert('Failed to remove profit');
        } finally {
          setSavingProfit(false);
        }
      }
      return;
    }

    setSavingProfit(true);
    try {
      if (profitItem) {
        await api.delete(`/attendance-sheets/${sheetId}/misc/${profitItem.id}`);
      }

      const name = profitPercent ? `Mason Profit (${profitPercent}%)` : 'Mason Profit';
      await api.post(`/attendance-sheets/${sheetId}/misc`, {
        PayeeId: payeeId,
        SiteId: siteId,
        MiscName: name,
        Amount: amt
      });
      
      fetchMisc();
      onSaved();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to save profit');
    } finally {
      setSavingProfit(false);
    }
  };

  const handleRemoveProfit = async () => {
    if (!profitItem) return;
    setSavingProfit(true);
    try {
      await api.delete(`/attendance-sheets/${sheetId}/misc/${profitItem.id}`);
      setProfitPercent('');
      setProfitAmount('');
      fetchMisc();
      onSaved();
    } catch (err) {
      alert('Failed to remove profit');
    } finally {
      setSavingProfit(false);
    }
  };

  useEffect(() => { setLocalRecords(records || []); }, [records]);
  useEffect(() => { fetchMisc(); }, [payeeId, siteId]);
  useEffect(() => { fetchPersonTypes(); }, []);

  const fetchPersonTypes = async () => {
    try {
      let res = await api.get('/person-types');
      if (res.data.length === 0) {
        await api.post('/person-types/seed');
        res = await api.get('/person-types');
      }
      const activeTypes = res.data.filter(t => t.IsActive);
      setPersonTypes(activeTypes);
      if (activeTypes.length > 0 && !newShift.personType) {
        setNewShift(prev => ({ ...prev, personType: activeTypes[0].Name }));
      }
    } catch (e) { console.error(e); }
  };

  const fetchMisc = async () => {
    try {
      const res = await api.get(`/attendance-sheets/${sheetId}`);
      // Filter miscs for this payee and site
      const payeeMisc = res.data.miscData?.[payeeId]?.items || [];
      const siteMisc = payeeMisc.filter(m => m.siteId === siteId);
      setMiscItems(siteMisc);
    } catch (e) { console.error(e); }
  };

  const selectedShift = shiftTypes.find(s => String(s.id) === String(newShift.shiftId));
  const selectedPersonType = personTypes.find(pt => pt.Name === newShift.personType);
  const estimatedAmount = selectedShift && selectedPersonType
    ? parseFloat(selectedPersonType.DailyRate || 0) * parseFloat(selectedShift.ShiftMultiplier) * parseInt(newShift.labourCount || 1)
    : 0;

  const handleAddRecord = async () => {
    if (!selectedShift || !newShift.labourCount || !newShift.personType) return;
    setSaving(true);
    try {
      await api.post(`/attendance-sheets/${sheetId}/records`, {
        PayeeId: payeeId, SiteId: siteId, AttendanceDate: date,
        PersonType: newShift.personType,
        ShiftType: selectedShift.ShiftType,
        ShiftMultiplier: selectedShift.ShiftMultiplier,
        LabourCount: parseInt(newShift.labourCount)
      });
      setNewShift({ personType: newShift.personType, shiftId: '', labourCount: 1 });
      onSaved();
    } catch (err) { alert(err.response?.data?.msg || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDeleteRecord = async (recordId) => {
    try {
      await api.delete(`/attendance-sheets/${sheetId}/records/${recordId}`);
      onSaved();
    } catch (err) { alert(err.response?.data?.msg || 'Failed'); }
  };

  const handleAddMisc = async () => {
    if (!newMisc.name.trim() || !newMisc.amount) return;
    setSaving(true);
    try {
      await api.post(`/attendance-sheets/${sheetId}/misc`, {
        PayeeId: payeeId, SiteId: siteId, MiscName: newMisc.name, Amount: parseFloat(newMisc.amount)
      });
      setNewMisc({ name: '', amount: '' });
      fetchMisc();
      onSaved();
    } catch (err) { alert(err.response?.data?.msg || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDeleteMisc = async (miscId) => {
    try {
      await api.delete(`/attendance-sheets/${sheetId}/misc/${miscId}`);
      fetchMisc();
      onSaved();
    } catch (err) { alert(err.response?.data?.msg || 'Failed'); }
  };

  // Total misc excluding profit
  const otherMiscItems = (miscItems || []).filter(m => !m.name.startsWith('Mason Profit'));
  const totalMisc = miscItems.reduce((s, m) => s + m.amount, 0);
  const fmt = n => '₹' + parseFloat(n || 0).toLocaleString('en-IN');

  return (
    <div className="aps-entry-panel">
      <div className="aps-entry-header">
        <h2>Entry Panel</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
      </div>

      <div className="aps-entry-meta">
        <div className="aps-entry-meta-item">
          <div className="label"><Building2 size={10} style={{ display: 'inline', marginRight: 4 }} />Site</div>
          <div className="value">{siteName}</div>
        </div>
        <div className="aps-entry-meta-item">
          <div className="label"><UserCheck size={10} style={{ display: 'inline', marginRight: 4 }} />Payee</div>
          <div className="value">{payeeName}</div>
        </div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Date: {new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
        <button 
          onClick={() => setActiveTab('attendance')}
          style={{ 
            padding: '8px 16px', fontSize: 12, fontWeight: 600, background: 'none', border: 'none', borderBottom: activeTab === 'attendance' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'attendance' ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
          }}
        >
          <Clock size={14} /> Attendance
        </button>
        <button 
          onClick={() => setActiveTab('misc')}
          style={{ 
            padding: '8px 16px', fontSize: 12, fontWeight: 600, background: 'none', border: 'none', borderBottom: activeTab === 'misc' ? '2px solid #00BCD4' : '2px solid transparent',
            color: activeTab === 'misc' ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
          }}
        >
          <IndianRupee size={14} /> Misc Charges
        </button>
      </div>

      {activeTab === 'attendance' ? (
        <>
          <div className="aps-shift-rows">
            {localRecords.length === 0 && (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No shift entries for this date.</div>
            )}
            {localRecords.map(rec => (
              <div key={rec.id} className="aps-shift-row">
                <span className="shift-person-type">{rec.personType || 'Mason'}</span>
                <span className="shift-label">{rec.shiftType}</span>
                <span className="shift-count">×{rec.labourCount}</span>
                <span className="shift-amount">{fmt(rec.calculatedAmount)}</span>
                <button className="shift-delete" onClick={() => handleDeleteRecord(rec.id)}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>

          <div className="aps-add-shift">
            <div className="field" style={{ flex: 2 }}>
              <label>Person Type</label>
              <select value={newShift.personType} onChange={e => setNewShift({ ...newShift, personType: e.target.value })}>
                <option value="">Select type...</option>
                {personTypes.map(pt => <option key={pt.id} value={pt.Name}>{pt.Name}</option>)}
              </select>
            </div>
            <div className="field" style={{ flex: 2 }}>
              <label>Shift Type</label>
              <select value={newShift.shiftId} onChange={e => setNewShift({ ...newShift, shiftId: e.target.value })}>
                <option value="">Select shift...</option>
                {shiftTypes.map(s => <option key={s.id} value={s.id}>{s.ShiftType} ({s.ShiftMultiplier}x)</option>)}
              </select>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Person Count</label>
              <input type="number" min="1" value={newShift.labourCount} onChange={e => setNewShift({ ...newShift, labourCount: e.target.value })} onKeyDown={e => e.key === 'Enter' && handleAddRecord()} />
            </div>
            <button className="aps-add-shift-btn" onClick={handleAddRecord} disabled={saving}><Plus size={14} /> Add</button>
          </div>

          {selectedShift && selectedPersonType && (
            <div style={{ padding: '6px 12px', marginBottom: 8, borderRadius: 8, background: 'rgba(255,179,0,0.08)', border: '1px solid rgba(255,179,0,0.15)', fontSize: 11, color: 'var(--accent)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Estimate: {selectedPersonType.Name} × {selectedShift.ShiftType} × {newShift.labourCount || 1}</span>
              <span style={{ fontWeight: 700 }}>{fmt(estimatedAmount)}</span>
            </div>
          )}

          <div className="aps-entry-total">
            <span className="total-label">Day Attendance</span>
            <span className="total-value">{fmt(localRecords.reduce((s, r) => s + r.calculatedAmount, 0))}</span>
          </div>
        </>
      ) : (
        <>
          {/* Mason Salary Profit Section (Editable) */}
          <div style={{ 
            background: 'rgba(76,175,80,0.05)', 
            border: '1px solid rgba(76,175,80,0.15)', 
            borderRadius: 10, 
            padding: '12px 14px', 
            marginBottom: 16 
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#4CAF50', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <TrendingUp size={14} /> Mason Salary Profit for this Site
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Weekly Site Attendance:</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(weeklySiteAttendance)}</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Profit (%)</label>
                <input 
                  type="number" 
                  placeholder="e.g. 10" 
                  value={profitPercent} 
                  onChange={e => handlePercentChange(e.target.value)}
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontWeight: 600 }} 
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Profit Value (₹) (Editable)</label>
                <input 
                  type="number" 
                  placeholder="e.g. 300" 
                  value={profitAmount} 
                  onChange={e => setProfitAmount(e.target.value)}
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontWeight: 600 }} 
                />
              </div>
            </div>

            {profitPercent && !isNaN(parseFloat(profitPercent)) && (
              <div style={{ fontSize: 10, color: '#4CAF50', marginBottom: 10, fontStyle: 'italic' }}>
                Calculation: {fmt(weeklySiteAttendance)} × {profitPercent}% = {fmt((weeklySiteAttendance * parseFloat(profitPercent)) / 100)}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                onClick={handleSaveProfit} 
                disabled={savingProfit}
                style={{ 
                  flex: 1, 
                  backgroundColor: '#4CAF50', 
                  color: '#0F0F1A', 
                  border: 'none', 
                  borderRadius: '6px', 
                  padding: '8px 12px', 
                  fontSize: '12px', 
                  fontWeight: '700', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4
                }}
              >
                {savingProfit ? 'Saving...' : 'Save Profit'}
              </button>
              {profitItem && (
                <button 
                  onClick={handleRemoveProfit} 
                  disabled={savingProfit}
                  style={{ 
                    backgroundColor: 'rgba(244,67,54,0.1)', 
                    color: '#F44336', 
                    border: '1px solid rgba(244,67,54,0.2)', 
                    borderRadius: '6px', 
                    padding: '8px 12px', 
                    fontSize: '12px', 
                    fontWeight: '600', 
                    cursor: 'pointer' 
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          <div className="aps-shift-rows">
            {otherMiscItems.length === 0 && (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No other misc charges for this site.</div>
            )}
            {otherMiscItems.map(m => (
              <div key={m.id} className="aps-shift-row" style={{ borderColor: 'rgba(0,188,212,0.2)' }}>
                <span className="shift-label">{m.name}</span>
                <span className="shift-amount" style={{ color: '#00BCD4' }}>{fmt(m.amount)}</span>
                <button className="shift-delete" onClick={() => handleDeleteMisc(m.id)}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>

          {/* Site-specific Tea & Bus calculation */}
          {(() => {
            const teaRate = parseFloat(masterSettings?.TeaExpense) || 0;
            const busRate = parseFloat(masterSettings?.BusExpense) || 0;
            const teaTotal = weeklySiteLabourCount * teaRate;
            const busTotal = weeklySiteLabourCount * busRate;
            
            const isTeaAdded = miscItems.some(m => m.name === 'Tea Charges');
            const isBusAdded = miscItems.some(m => m.name === 'Bus Charges');

            if (weeklySiteLabourCount > 0 && (!isTeaAdded || !isBusAdded)) {
              return (
                <div style={{ 
                  background: 'rgba(255,152,0,0.05)', 
                  border: '1px solid rgba(255,152,0,0.15)', 
                  borderRadius: 8, 
                  padding: '12px', 
                  marginBottom: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#FF9800', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Coffee size={12} /> Auto-calculated Allowances (Weekly: {weeklySiteLabourCount} workers)
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                    {!isTeaAdded && (
                      <button 
                        onClick={async () => {
                          setSaving(true);
                          try {
                            await api.post(`/attendance-sheets/${sheetId}/misc`, {
                              PayeeId: payeeId, SiteId: siteId, MiscName: 'Tea Charges', Amount: teaTotal
                            });
                            fetchMisc();
                            onSaved();
                          } catch (err) { alert(err.response?.data?.msg || 'Failed'); }
                          finally { setSaving(false); }
                        }}
                        disabled={saving}
                        style={{
                          flex: 1,
                          backgroundColor: '#FF9800',
                          color: '#0F0F1A',
                          border: 'none',
                          borderRadius: 6,
                          padding: '6px 10px',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Add Tea ({fmt(teaTotal)})
                      </button>
                    )}
                    {!isBusAdded && (
                      <button 
                        onClick={async () => {
                          setSaving(true);
                          try {
                            await api.post(`/attendance-sheets/${sheetId}/misc`, {
                              PayeeId: payeeId, SiteId: siteId, MiscName: 'Bus Charges', Amount: busTotal
                            });
                            fetchMisc();
                            onSaved();
                          } catch (err) { alert(err.response?.data?.msg || 'Failed'); }
                          finally { setSaving(false); }
                        }}
                        disabled={saving}
                        style={{
                          flex: 1,
                          backgroundColor: '#FF9800',
                          color: '#0F0F1A',
                          border: 'none',
                          borderRadius: 6,
                          padding: '6px 10px',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Add Bus ({fmt(busTotal)})
                      </button>
                    )}
                  </div>
                </div>
              );
            }
            return null;
          })()}

          <div className="aps-add-shift">
            <div className="field" style={{ flex: 2 }}>
              <label>Description</label>
              <input type="text" placeholder="e.g. Travel, Tea" value={newMisc.name} onChange={e => setNewMisc({ ...newMisc, name: e.target.value })} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Amount</label>
              <input type="number" placeholder="0" value={newMisc.amount} onChange={e => setNewMisc({ ...newMisc, amount: e.target.value })} onKeyDown={e => e.key === 'Enter' && handleAddMisc()} />
            </div>
            <button className="aps-add-shift-btn" onClick={handleAddMisc} disabled={saving} style={{ background: '#00BCD4' }}><Plus size={14} /> Add</button>
          </div>

          <div className="aps-entry-total" style={{ background: 'rgba(0,188,212,0.08)', borderColor: 'rgba(0,188,212,0.2)' }}>
            <span className="total-label">Site Misc Total</span>
            <span className="total-value" style={{ color: '#00BCD4' }}>{fmt(totalMisc)}</span>
          </div>
        </>
      )}

      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '2px dashed var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Combined Site Total</span>
        <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>{fmt(weeklySiteAttendance + totalMisc)}</span>
      </div>
    </div>
  );
};

export default AttendanceEntryPanel;
