import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, Building2, UserCheck, Clock, IndianRupee, HardHat, Coffee, TrendingUp, Package } from 'lucide-react';
import api from '../api/axios';

const AttendanceEntryPanel = ({ sheetId, payeeId, siteId, payeeName, siteName, date, records, shiftTypes, masterSettings = { TeaExpense: '20', BusExpense: '50' }, weeklySiteAttendance = 0, weeklySiteLabourCount = 0, onClose, onSaved }) => {
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' or 'misc'
  const [localRecords, setLocalRecords] = useState(records || []);
  const [miscItems, setMiscItems] = useState([]);
  const [personTypes, setPersonTypes] = useState([]);
  const [newShift, setNewShift] = useState({ personType: '', shiftId: '', labourCount: 1 });
  const [newMisc, setNewMisc] = useState({ name: '', amount: '' });
  
  const [calcMode, setCalcMode] = useState('Shift'); // 'Shift' or 'SqFt'
  const [siteSections, setSiteSections] = useState([]);
  const [sqFtEntry, setSqFtEntry] = useState({
    sectionId: '',
    length: '',
    breadth: '',
    ratePerSqFt: '',
    labourCount: 1
  });

  useEffect(() => {
    if (siteId) {
      fetchSiteSections();
    }
  }, [siteId]);

  const fetchSiteSections = async () => {
    try {
      const res = await api.get(`/site-sections/site/${siteId}`);
      setSiteSections(res.data);
    } catch (e) {
      console.error('Failed to fetch site sections', e);
    }
  };

  const [liftingRates, setLiftingRates] = useState([]);
  const [localLiftingRecords, setLocalLiftingRecords] = useState([]);
  const [newLifting, setNewLifting] = useState({ materialType: 'M.Sand', floor: 'G.Floor', quantity: '1', rate: '' });

  useEffect(() => {
    fetchLiftingRates();
    fetchLiftingRecords();
  }, [sheetId, payeeId, siteId, date]);

  useEffect(() => {
    if (liftingRates.length > 0) {
      const matchedRate = liftingRates.find(r => 
        r.MaterialType === newLifting.materialType && 
        r.Floor === newLifting.floor
      );
      setNewLifting(prev => ({
        ...prev,
        rate: matchedRate ? String(matchedRate.Rate) : ''
      }));
    }
  }, [liftingRates]);

  const fetchLiftingRates = async () => {
    try {
      const res = await api.get('/attendance-sheets/lifting/rates');
      setLiftingRates(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLiftingRecords = async () => {
    try {
      const res = await api.get(`/attendance-sheets/${sheetId}/lifting-records`);
      const filtered = res.data.filter(r => 
        r.PayeeId === payeeId && 
        r.SiteId === siteId && 
        r.LiftingDate === date
      );
      setLocalLiftingRecords(filtered);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLiftingChange = (field, val) => {
    setNewLifting(prev => {
      const updated = { ...prev, [field]: val };
      if (field === 'materialType' || field === 'floor') {
        const matchedRate = liftingRates.find(r => 
          r.MaterialType === updated.materialType && 
          r.Floor === updated.floor
        );
        updated.rate = matchedRate ? String(matchedRate.Rate) : '';
      }
      return updated;
    });
  };

  const handleAddLifting = async () => {
    if (!newLifting.materialType || !newLifting.floor || !newLifting.quantity || !newLifting.rate) {
      alert('All lifting fields are required');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/attendance-sheets/${sheetId}/lifting-records`, {
        PayeeId: payeeId,
        SiteId: siteId,
        MaterialType: newLifting.materialType,
        Floor: newLifting.floor,
        Quantity: parseFloat(newLifting.quantity),
        Rate: parseFloat(newLifting.rate),
        LiftingDate: date
      });
      const defaultMatchedRate = liftingRates.find(r => 
        r.MaterialType === newLifting.materialType && 
        r.Floor === newLifting.floor
      );
      setNewLifting({ 
        materialType: newLifting.materialType, 
        floor: newLifting.floor, 
        quantity: '1', 
        rate: defaultMatchedRate ? String(defaultMatchedRate.Rate) : '' 
      });
      await fetchLiftingRecords();
      onSaved();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to add lifting record');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLifting = async (liftingId) => {
    if (!window.confirm('Delete this lifting record?')) return;
    try {
      await api.delete(`/attendance-sheets/${sheetId}/lifting-records/${liftingId}`);
      await fetchLiftingRecords();
      onSaved();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to delete lifting record');
    }
  };

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
    setSaving(true);
    try {
      if (calcMode === 'Shift') {
        if (!selectedShift || !newShift.labourCount || !newShift.personType) {
          setSaving(false);
          return;
        }
        await api.post(`/attendance-sheets/${sheetId}/records`, {
          PayeeId: payeeId, SiteId: siteId, AttendanceDate: date,
          PersonType: newShift.personType,
          ShiftType: selectedShift.ShiftType,
          ShiftMultiplier: selectedShift.ShiftMultiplier,
          LabourCount: parseInt(newShift.labourCount),
          CalculationMode: 'Shift'
        });
        setNewShift({ personType: newShift.personType, shiftId: '', labourCount: 1 });
      } else {
        if (!newShift.personType || !sqFtEntry.sectionId || !sqFtEntry.ratePerSqFt) {
          alert('Person Type, Floor/Section and Rate per SqFt are required.');
          setSaving(false);
          return;
        }
        await api.post(`/attendance-sheets/${sheetId}/records`, {
          PayeeId: payeeId, SiteId: siteId, AttendanceDate: date,
          PersonType: newShift.personType,
          CalculationMode: 'SqFt',
          SectionId: parseInt(sqFtEntry.sectionId),
          Length: sqFtEntry.length ? parseFloat(sqFtEntry.length) : null,
          Breadth: sqFtEntry.breadth ? parseFloat(sqFtEntry.breadth) : null,
          RatePerSqFt: parseFloat(sqFtEntry.ratePerSqFt),
          LabourCount: parseInt(sqFtEntry.labourCount || 1)
        });
        setSqFtEntry({ sectionId: '', length: '', breadth: '', ratePerSqFt: '', labourCount: 1 });
      }
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
        <button 
          onClick={() => setActiveTab('lifting')}
          style={{ 
            padding: '8px 16px', fontSize: 12, fontWeight: 600, background: 'none', border: 'none', borderBottom: activeTab === 'lifting' ? '2px solid #E91E63' : '2px solid transparent',
            color: activeTab === 'lifting' ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
          }}
        >
          <Package size={14} /> Material Lifting
        </button>
      </div>

      {activeTab === 'attendance' && (
        <>
          <div className="aps-shift-rows">
            {localRecords.length === 0 && (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No entries for this date.</div>
            )}
            {localRecords.map(rec => {
              const sec = siteSections.find(s => s.id === rec.sectionId);
              const floorName = sec ? sec.Name : `Floor (ID: ${rec.sectionId})`;
              return (
                <div key={rec.id} className="aps-shift-row">
                  <span className="shift-person-type">{rec.personType || 'Mason'}</span>
                  {rec.calculationMode === 'SqFt' ? (
                    <span className="shift-label" style={{ color: '#9C27B0', fontSize: '11px', fontWeight: 600 }}>
                      {floorName}: {rec.length && rec.breadth ? `${rec.length}×${rec.breadth} ft` : `${rec.sqFt || 0} SqFt`} @ ₹{rec.ratePerSqFt}
                    </span>
                  ) : (
                    <span className="shift-label">{rec.shiftType}</span>
                  )}
                  <span className="shift-count">×{rec.labourCount}</span>
                  <span className="shift-amount">{fmt(rec.calculatedAmount)}</span>
                  <button className="shift-delete" onClick={() => handleDeleteRecord(rec.id)}><Trash2 size={14} /></button>
                </div>
              );
            })}
          </div>

          {/* Mode Switcher */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 14, background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', textTransform: 'uppercase', letterSpacing: 0.5 }}>Mode:</span>
            <button 
              onClick={() => setCalcMode('Shift')}
              style={{
                flex: 1, padding: '4px 8px', fontSize: 11, fontWeight: 700, borderRadius: 6, cursor: 'pointer',
                background: calcMode === 'Shift' ? 'var(--accent)' : 'none',
                color: calcMode === 'Shift' ? '#0F0F1A' : 'var(--text-muted)',
                border: 'none', transition: 'all 0.2s ease'
              }}
            >
              Shift
            </button>
            <button 
              onClick={() => setCalcMode('SqFt')}
              style={{
                flex: 1, padding: '4px 8px', fontSize: 11, fontWeight: 700, borderRadius: 6, cursor: 'pointer',
                background: calcMode === 'SqFt' ? '#9C27B0' : 'none',
                color: calcMode === 'SqFt' ? 'white' : 'var(--text-muted)',
                border: 'none', transition: 'all 0.2s ease'
              }}
            >
              Sq-Ft
            </button>
          </div>

          {calcMode === 'Shift' ? (
            <>
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
                  <label>Count</label>
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
            </>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px 12px', background: 'rgba(255,255,255,0.01)', padding: 12, borderRadius: 8, border: '1px dashed var(--border)', marginBottom: 12 }}>
                <div className="field">
                  <label>Person Type</label>
                  <select value={newShift.personType} onChange={e => setNewShift({ ...newShift, personType: e.target.value })}>
                    <option value="">Select type...</option>
                    {personTypes.map(pt => <option key={pt.id} value={pt.Name}>{pt.Name}</option>)}
                  </select>
                </div>
                
                <div className="field">
                  <label>Count</label>
                  <input type="number" min="1" value={sqFtEntry.labourCount} onChange={e => setSqFtEntry({ ...sqFtEntry, labourCount: e.target.value })} />
                </div>

                <div className="field" style={{ gridColumn: 'span 2' }}>
                  <label>Floor / Section (Option C)</label>
                  <select 
                    value={sqFtEntry.sectionId} 
                    onChange={e => {
                      const secId = e.target.value;
                      const sec = siteSections.find(s => String(s.id) === String(secId));
                      setSqFtEntry({ 
                        ...sqFtEntry, 
                        sectionId: secId, 
                        ratePerSqFt: sec && sec.RatePerSqFt ? String(sec.RatePerSqFt) : '' 
                      });
                    }}
                  >
                    <option value="">Select Floor/Section...</option>
                    {siteSections.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.Name} {s.RatePerSqFt ? `(Rate: ₹${s.RatePerSqFt})` : '(No Rate set)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field" style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 9 }}>Length (ft)</label>
                    <input type="number" step="0.01" style={{ width: '100%', padding: '4px 8px', fontSize: 12 }} placeholder="L" value={sqFtEntry.length} onChange={e => setSqFtEntry({ ...sqFtEntry, length: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: 9 }}>Breadth (ft)</label>
                    <input type="number" step="0.01" style={{ width: '100%', padding: '4px 8px', fontSize: 12 }} placeholder="B" value={sqFtEntry.breadth} onChange={e => setSqFtEntry({ ...sqFtEntry, breadth: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: 9 }}>Rate / SqFt</label>
                    <input type="number" step="0.01" style={{ width: '100%', padding: '4px 8px', fontSize: 12 }} placeholder="₹" value={sqFtEntry.ratePerSqFt} onChange={e => setSqFtEntry({ ...sqFtEntry, ratePerSqFt: e.target.value })} onKeyDown={e => e.key === 'Enter' && handleAddRecord()} />
                  </div>
                </div>

                <button 
                  className="aps-add-shift-btn" 
                  onClick={handleAddRecord} 
                  disabled={saving} 
                  style={{ gridColumn: 'span 2', width: '100%', background: '#9C27B0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4 }}
                >
                  <Plus size={14} /> Add Sq-Ft Work
                </button>
              </div>

              {sqFtEntry.ratePerSqFt && (
                <div style={{ padding: '6px 12px', marginBottom: 8, borderRadius: 8, background: 'rgba(156,39,176,0.08)', border: '1px solid rgba(156,39,176,0.15)', fontSize: 11, color: '#BA68C8', display: 'flex', justifyContent: 'space-between' }}>
                  <span>
                    Estimate: {sqFtEntry.length && sqFtEntry.breadth ? `${sqFtEntry.length}×${sqFtEntry.breadth} = ` : ''} 
                    {sqFtEntry.length && sqFtEntry.breadth ? (parseFloat(sqFtEntry.length) * parseFloat(sqFtEntry.breadth)).toFixed(2) : '1'} SqFt × ₹{sqFtEntry.ratePerSqFt} × {sqFtEntry.labourCount || 1}
                  </span>
                  <span style={{ fontWeight: 700 }}>
                    {(() => {
                      const area = sqFtEntry.length && sqFtEntry.breadth ? (parseFloat(sqFtEntry.length) * parseFloat(sqFtEntry.breadth)) : 1;
                      const rate = parseFloat(sqFtEntry.ratePerSqFt || 0);
                      const count = parseInt(sqFtEntry.labourCount || 1);
                      return fmt(area * rate * count);
                    })()}
                  </span>
                </div>
              )}
            </>
          )}

          <div className="aps-entry-total">
            <span className="total-label">Day Total Earnings</span>
            <span className="total-value">{fmt(localRecords.reduce((s, r) => s + r.calculatedAmount, 0))}</span>
          </div>
        </>
      )}

      {activeTab === 'misc' && (
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

      {activeTab === 'lifting' && (
        <>
          <div className="aps-shift-rows">
            {localLiftingRecords.length === 0 && (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No material lifting logged for this date.</div>
            )}
            {localLiftingRecords.map(rec => (
              <div key={rec.id} className="aps-shift-row" style={{ borderColor: 'rgba(233, 30, 99, 0.2)' }}>
                <span className="shift-person-type" style={{ color: '#E91E63' }}>{rec.MaterialType}</span>
                <span className="shift-label">{rec.Floor}</span>
                <span className="shift-count">×{rec.Quantity}</span>
                <span className="shift-amount" style={{ color: '#E91E63' }}>{fmt(rec.Amount)}</span>
                <button className="shift-delete" onClick={() => handleDeleteLifting(rec.id)}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 8, background: 'rgba(233, 30, 99, 0.03)', padding: 12, borderRadius: 8, border: '1px dashed rgba(233, 30, 99, 0.2)', marginBottom: 12 }}>
            <div className="field">
              <label style={{ fontSize: 9 }}>Material</label>
              <select value={newLifting.materialType} onChange={e => handleLiftingChange('materialType', e.target.value)} style={{ padding: '4px 6px', fontSize: 11 }}>
                <option value="M.Sand">M.Sand</option>
                <option value="Jally">Jally</option>
                <option value="Sengal">Sengal</option>
              </select>
            </div>
            <div className="field">
              <label style={{ fontSize: 9 }}>Floor</label>
              <select value={newLifting.floor} onChange={e => handleLiftingChange('floor', e.target.value)} style={{ padding: '4px 6px', fontSize: 11 }}>
                <option value="G.Floor">G.Floor</option>
                <option value="1st floor">1st floor</option>
                <option value="2nd floor">2nd floor</option>
                <option value="3rd floor">3rd floor</option>
              </select>
            </div>
            <div className="field">
              <label style={{ fontSize: 9 }}>Qty / Pcs</label>
              <input type="number" step="0.01" value={newLifting.quantity} onChange={e => handleLiftingChange('quantity', e.target.value)} style={{ width: '100%', padding: '4px 6px', fontSize: 11 }} />
            </div>
            <div className="field">
              <label style={{ fontSize: 9 }}>Rate (₹)</label>
              <input type="number" step="0.01" value={newLifting.rate} onChange={e => handleLiftingChange('rate', e.target.value)} style={{ width: '100%', padding: '4px 6px', fontSize: 11 }} onKeyDown={e => e.key === 'Enter' && handleAddLifting()} />
            </div>

            <button 
              className="aps-add-shift-btn" 
              onClick={handleAddLifting} 
              disabled={saving} 
              style={{ gridColumn: 'span 4', width: '100%', background: '#E91E63', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, height: 28, fontSize: 11, padding: 0 }}
            >
              <Plus size={12} /> Log Lifting Work
            </button>
          </div>

          {newLifting.rate && (
            <div style={{ padding: '6px 12px', marginBottom: 8, borderRadius: 8, background: 'rgba(233,30,99,0.06)', border: '1px solid rgba(233,30,99,0.12)', fontSize: 10, color: '#F48FB1', display: 'flex', justifyContent: 'space-between' }}>
              <span>Calculation: {newLifting.quantity || 0} units/pcs × ₹{newLifting.rate}</span>
              <span style={{ fontWeight: 700 }}>{fmt(parseFloat(newLifting.quantity || 0) * parseFloat(newLifting.rate || 0))}</span>
            </div>
          )}

          <div className="aps-entry-total" style={{ background: 'rgba(233, 30, 99, 0.08)', borderColor: 'rgba(233, 30, 99, 0.2)' }}>
            <span className="total-label">Day Lifting Total</span>
            <span className="total-value" style={{ color: '#E91E63' }}>{fmt(localLiftingRecords.reduce((s, r) => s + r.Amount, 0))}</span>
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
