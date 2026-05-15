import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, Building2, UserCheck, Clock, IndianRupee } from 'lucide-react';
import api from '../api/axios';

const AttendanceEntryPanel = ({ sheetId, payeeId, siteId, payeeName, siteName, date, records, shiftTypes, onClose, onSaved }) => {
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' or 'misc'
  const [localRecords, setLocalRecords] = useState(records || []);
  const [miscItems, setMiscItems] = useState([]);
  const [newShift, setNewShift] = useState({ shiftId: '', labourCount: 1 });
  const [newMisc, setNewMisc] = useState({ name: '', amount: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { setLocalRecords(records || []); }, [records]);
  useEffect(() => { fetchMisc(); }, [payeeId, siteId]);

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

  const handleAddRecord = async () => {
    if (!selectedShift || !newShift.labourCount) return;
    setSaving(true);
    try {
      await api.post(`/attendance-sheets/${sheetId}/records`, {
        PayeeId: payeeId, SiteId: siteId, AttendanceDate: date,
        ShiftType: selectedShift.ShiftType,
        ShiftMultiplier: selectedShift.ShiftMultiplier,
        LabourCount: parseInt(newShift.labourCount)
      });
      setNewShift({ shiftId: '', labourCount: 1 });
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

  const totalAttendance = localRecords.reduce((s, r) => s + r.calculatedAmount, 0);
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
          <div className="label"><UserCheck size={10} style={{ display: 'inline', marginRight: 4 }} />Mason</div>
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
                <span className="shift-label">{rec.shiftType}</span>
                <span className="shift-count">×{rec.labourCount} labour</span>
                <span className="shift-amount">{fmt(rec.calculatedAmount)}</span>
                <button className="shift-delete" onClick={() => handleDeleteRecord(rec.id)}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>

          <div className="aps-add-shift">
            <div className="field" style={{ flex: 2 }}>
              <label>Shift Type</label>
              <select value={newShift.shiftId} onChange={e => setNewShift({ ...newShift, shiftId: e.target.value })}>
                <option value="">Select shift...</option>
                {shiftTypes.map(s => <option key={s.id} value={s.id}>{s.ShiftType} — {fmt(s.Rate)}</option>)}
              </select>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Count</label>
              <input type="number" min="1" value={newShift.labourCount} onChange={e => setNewShift({ ...newShift, labourCount: e.target.value })} onKeyDown={e => e.key === 'Enter' && handleAddRecord()} />
            </div>
            <button className="aps-add-shift-btn" onClick={handleAddRecord} disabled={saving}><Plus size={14} /> Add</button>
          </div>

          <div className="aps-entry-total">
            <span className="total-label">Day Attendance</span>
            <span className="total-value">{fmt(totalAttendance)}</span>
          </div>
        </>
      ) : (
        <>
          <div className="aps-shift-rows">
            {miscItems.length === 0 && (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No misc charges for this site.</div>
            )}
            {miscItems.map(m => (
              <div key={m.id} className="aps-shift-row" style={{ borderColor: 'rgba(0,188,212,0.2)' }}>
                <span className="shift-label">{m.name}</span>
                <span className="shift-amount" style={{ color: '#00BCD4' }}>{fmt(m.amount)}</span>
                <button className="shift-delete" onClick={() => handleDeleteMisc(m.id)}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>

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
        <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>{fmt(totalAttendance + totalMisc)}</span>
      </div>
    </div>
  );
};

export const MiscPanel = ({ sheetId, payeeId, payeeName, miscItems, onClose, onSaved }) => {
  const [newMisc, setNewMisc] = useState({ name: '', amount: '' });
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!newMisc.name.trim() || !newMisc.amount) return;
    setSaving(true);
    try {
      await api.post(`/attendance-sheets/${sheetId}/misc`, {
        PayeeId: payeeId, MiscName: newMisc.name, Amount: parseFloat(newMisc.amount)
      });
      setNewMisc({ name: '', amount: '' });
      onSaved();
    } catch (err) { alert(err.response?.data?.msg || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (miscId) => {
    try {
      await api.delete(`/attendance-sheets/${sheetId}/misc/${miscId}`);
      onSaved();
    } catch (err) { alert(err.response?.data?.msg || 'Failed'); }
  };

  const fmt = n => '₹' + parseFloat(n || 0).toLocaleString('en-IN');
  const total = (miscItems || []).reduce((s, m) => s + m.amount, 0);

  return (
    <div className="aps-entry-panel">
      <div className="aps-entry-header">
        <h2>General Misc — {payeeName}</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
      </div>

      {(miscItems || []).map(m => (
        <div key={m.id} className="aps-misc-item">
          <span className="misc-name">{m.name}</span>
          <span className="misc-amount">{fmt(m.amount)}</span>
          <button className="misc-delete" onClick={() => handleDelete(m.id)}><Trash2 size={14} /></button>
        </div>
      ))}

      {(!miscItems || miscItems.length === 0) && (
        <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No misc charges yet.</div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'flex-end' }}>
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)' }}>Name</label>
          <input type="text" placeholder="Tea, Travel" value={newMisc.name} onChange={e => setNewMisc({ ...newMisc, name: e.target.value })} 
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)' }}>Amount</label>
          <input type="number" value={newMisc.amount} onChange={e => setNewMisc({ ...newMisc, amount: e.target.value })} onKeyDown={e => e.key === 'Enter' && handleAdd()} 
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }} />
        </div>
        <button className="aps-add-shift-btn" onClick={handleAdd} disabled={saving}><Plus size={14} /> Add</button>
      </div>

      <div className="aps-entry-total" style={{ background: 'rgba(0,188,212,0.08)', borderColor: 'rgba(0,188,212,0.2)' }}>
        <span className="total-label">Misc Total</span>
        <span className="total-value" style={{ color: '#00BCD4' }}>{fmt(total)}</span>
      </div>
    </div>
  );
};

export default AttendanceEntryPanel;
