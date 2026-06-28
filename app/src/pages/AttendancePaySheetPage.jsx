import React, { useState, useEffect, useRef } from 'react';
import { Plus, Table2, Check, X, Loader2, Trash2, Calendar, FileSpreadsheet, Users, Building2, IndianRupee, Clock, CheckCircle2, PlusCircle, Settings, Coffee, ChevronDown, Eye, EyeOff } from 'lucide-react';
import api from '../api/axios';
import AttendanceEntryPanel from './AttendanceEntryPanel';
import './AttendancePaySheetPage.css';

const AttendancePaySheetPage = () => {
  const [sheets, setSheets] = useState([]);
  const [selectedSheetId, setSelectedSheetId] = useState(null);
  const [sheetData, setSheetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gridLoading, setGridLoading] = useState(false);
  const [shiftTypes, setShiftTypes] = useState([]);

  const [showNewSheetModal, setShowNewSheetModal] = useState(false);
  const [showAddPayeeModal, setShowAddPayeeModal] = useState(false);
  const [showAddSiteModal, setShowAddSiteModal] = useState(false);
  const [showEntryPanel, setShowEntryPanel] = useState(null);
  const [showMasterSettings, setShowMasterSettings] = useState(false);

  // Summary display preference
  const [showSummary, setShowSummary] = useState(() => {
    const saved = localStorage.getItem('aps_show_summary');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [allPayees, setAllPayees] = useState([]);
  const [allSites, setAllSites] = useState([]);
  const [selectedPayeeIds, setSelectedPayeeIds] = useState([]);
  const [selectedSiteIds, setSelectedSiteIds] = useState([]);
  const [payeeSearch, setPayeeSearch] = useState('');
  const [siteSearch, setSiteSearch] = useState('');

  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [entrySiteId, setEntrySiteId] = useState('');
  const [entryPayeeId, setEntryPayeeId] = useState('');

  // Master settings (Tea + Bus expense per labour per day, App Version, Update Link)
  const [masterSettings, setMasterSettings] = useState({ TeaExpense: '20', BusExpense: '50', LatestAppVersion: '2.5.0', UpdateLink: 'https://drive.google.com' });
  const [editingMaster, setEditingMaster] = useState({ TeaExpense: '', BusExpense: '', LatestAppVersion: '', UpdateLink: '' });
  const [savingMaster, setSavingMaster] = useState(false);

  const [showLiftingRatesModal, setShowLiftingRatesModal] = useState(false);
  const [editingLiftingRates, setEditingLiftingRates] = useState({});
  const [savingLiftingRates, setSavingLiftingRates] = useState(false);

  const newSheetTitleRef = useRef(null);
  const [newSheetForm, setNewSheetForm] = useState({
    Title: '', WeekStartDate: new Date().toISOString().split('T')[0],
    WeekEndDate: (() => { const d = new Date(); d.setDate(d.getDate() + 6); return d.toISOString().split('T')[0]; })()
  });

  useEffect(() => { fetchSheets(); fetchAllPayees(); fetchAllSites(); fetchShiftTypes(); fetchMasterSettings(); }, []);
  useEffect(() => { if (selectedSheetId) fetchSheetData(selectedSheetId); }, [selectedSheetId]);
  useEffect(() => { if (showNewSheetModal) setTimeout(() => newSheetTitleRef.current?.focus(), 150); }, [showNewSheetModal]);
  useEffect(() => { if (showAddPayeeModal && sheetData?.selectedPayeeIds) setSelectedPayeeIds(sheetData.selectedPayeeIds); }, [showAddPayeeModal, sheetData]);
  useEffect(() => { if (showAddSiteModal && sheetData?.selectedSiteIds) setSelectedSiteIds(sheetData.selectedSiteIds); }, [showAddSiteModal, sheetData]);

  const fetchSheets = async () => {
    try { const res = await api.get('/attendance-sheets'); setSheets(res.data); if (res.data.length > 0 && !selectedSheetId) setSelectedSheetId(res.data[0].id); }
    catch (err) { console.error(err); } finally { setLoading(false); }
  };
  const fetchSheetData = async (id) => {
    setGridLoading(true);
    try { const res = await api.get(`/attendance-sheets/${id}`); setSheetData(res.data); }
    catch (err) { console.error(err); } finally { setGridLoading(false); }
  };
  const fetchAllPayees = async () => { try { const r = await api.get('/payees'); setAllPayees(r.data); } catch(e) { console.error(e); } };
  const fetchAllSites = async () => { try { const r = await api.get('/sites'); setAllSites(r.data); } catch(e) { console.error(e); } };
  const fetchShiftTypes = async () => { try { const r = await api.get('/shift-master'); setShiftTypes(r.data); } catch(e) { console.error(e); } };
  const fetchMasterSettings = async () => {
    try {
      const r = await api.get('/master-settings');
      setMasterSettings({
        TeaExpense: r.data.TeaExpense || '20',
        BusExpense: r.data.BusExpense || '50',
        LatestAppVersion: r.data.LatestAppVersion || '2.5.0',
        UpdateLink: r.data.UpdateLink || 'https://drive.google.com'
      });
      setEditingMaster({
        TeaExpense: r.data.TeaExpense || '20',
        BusExpense: r.data.BusExpense || '50',
        LatestAppVersion: r.data.LatestAppVersion || '2.5.0',
        UpdateLink: r.data.UpdateLink || 'https://drive.google.com'
      });
    } catch(e) {
      console.error(e);
    }
  };

  const handleSaveMasterSettings = async () => {
    setSavingMaster(true);
    try {
      await Promise.all([
        api.put('/master-settings/TeaExpense', { value: editingMaster.TeaExpense }),
        api.put('/master-settings/BusExpense', { value: editingMaster.BusExpense }),
        api.put('/master-settings/LatestAppVersion', { value: editingMaster.LatestAppVersion }),
        api.put('/master-settings/UpdateLink', { value: editingMaster.UpdateLink })
      ]);
      setMasterSettings({ ...editingMaster });
      setShowMasterSettings(false);
    } catch(e) {
      alert('Failed to save settings');
    } finally {
      setSavingMaster(false);
    }
  };

  const fetchLiftingRates = async () => {
    try {
      const res = await api.get('/attendance-sheets/lifting/rates');
      const ratesMap = {};
      res.data.forEach(r => {
        ratesMap[`${r.MaterialType}_${r.Floor}`] = r.Rate;
      });
      setEditingLiftingRates(ratesMap);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveLiftingRates = async () => {
    setSavingLiftingRates(true);
    try {
      const mats = ['M.Sand', 'Jally', 'Sengal'];
      const floors = ['G.Floor', '1st floor', '2nd floor', '3rd floor'];
      const promises = [];
      mats.forEach(mat => {
        floors.forEach(floor => {
          const key = `${mat}_${floor}`;
          const rate = editingLiftingRates[key] !== undefined ? parseFloat(editingLiftingRates[key]) : 0;
          promises.push(
            api.post('/attendance-sheets/lifting/rates', {
              MaterialType: mat,
              Floor: floor,
              Rate: rate
            })
          );
        });
      });
      await Promise.all(promises);
      setShowLiftingRatesModal(false);
      if (selectedSheetId) fetchSheetData(selectedSheetId);
    } catch (e) {
      alert('Failed to save lifting rates');
    } finally {
      setSavingLiftingRates(false);
    }
  };

  const handleCreateSheet = async () => {
    if (!newSheetForm.Title.trim()) return;
    try {
      const res = await api.post('/attendance-sheets', newSheetForm);
      setShowNewSheetModal(false);
      setNewSheetForm({ Title: '', WeekStartDate: new Date().toISOString().split('T')[0], WeekEndDate: (() => { const d = new Date(); d.setDate(d.getDate()+6); return d.toISOString().split('T')[0]; })() });
      await fetchSheets(); setSelectedSheetId(res.data.id);
    } catch (err) { alert(err.response?.data?.msg || 'Failed'); }
  };

  const handleDeleteSheet = async () => {
    if (!selectedSheetId || !window.confirm('Delete this sheet and all attendance data?')) return;
    try { await api.delete(`/attendance-sheets/${selectedSheetId}`); setSelectedSheetId(null); setSheetData(null); fetchSheets(); }
    catch (err) { alert(err.response?.data?.msg || 'Failed'); }
  };

  const handleAddPayees = async () => {
    if (!selectedSheetId) return;
    try { await api.post(`/attendance-sheets/${selectedSheetId}/sync-payees`, { payeeIds: selectedPayeeIds }); setShowAddPayeeModal(false); setPayeeSearch(''); fetchSheetData(selectedSheetId); fetchSheets(); }
    catch (err) { alert(err.response?.data?.msg || 'Failed'); }
  };

  const handleAddSites = async () => {
    if (!selectedSheetId) return;
    try { await api.post(`/attendance-sheets/${selectedSheetId}/sync-sites`, { siteIds: selectedSiteIds }); setShowAddSiteModal(false); setSiteSearch(''); fetchSheetData(selectedSheetId); fetchSheets(); }
    catch (err) { alert(err.response?.data?.msg || 'Failed'); }
  };

  // ---- Computed values (DATE-SPECIFIC for selected entryDate) ----

  // Get total attendance for a payee+site for the SELECTED DATE
  const getDateCellAmount = (payeeId, siteId) => {
    if (!sheetData?.grid) return 0;
    const key = `${payeeId}_${siteId}`;
    const records = sheetData.grid[key]?.records || [];
    const baseAmt = records
      .filter(r => r.date === entryDate)
      .reduce((sum, r) => sum + r.calculatedAmount, 0);

    const liftingAmt = (sheetData.liftingRecords || [])
      .filter(l => l.PayeeId === payeeId && l.SiteId === siteId && l.LiftingDate === entryDate)
      .reduce((sum, l) => sum + parseFloat(l.Amount || 0), 0);

    return baseAmt + liftingAmt;
  };

  // Get total labour count for a payee+site for the SELECTED DATE (for tea/bus calculation)
  const getDateLabourCount = (payeeId, siteId) => {
    if (!sheetData?.grid) return 0;
    const key = `${payeeId}_${siteId}`;
    const records = sheetData.grid[key]?.records || [];
    return records
      .filter(r => r.date === entryDate)
      .reduce((sum, r) => sum + r.labourCount, 0);
  };

  // Total attendance for a payee across all sites for selected date (no tea/bus)
  const getDateRowAttendance = (payeeId) => {
    if (!sheetData?.sites) return 0;
    return sheetData.sites.reduce((sum, site) => sum + getDateCellAmount(payeeId, site.id), 0);
  };

  // Column total for selected date
  const getDateColTotal = (siteId) => {
    if (!sheetData?.payees) return 0;
    return sheetData.payees.reduce((sum, p) => sum + getDateCellAmount(p.id, siteId), 0);
  };

  // Total attendance for all payees for selected date (no tea/bus)
  const getTotalDateAttendance = () => {
    if (!sheetData?.payees) return 0;
    return sheetData.payees.reduce((sum, p) => sum + getDateRowAttendance(p.id), 0);
  };

  const getPayeeWeeklyAttendance = (payeeId) => {
    if (!sheetData?.grid) return 0;
    let total = 0;
    Object.keys(sheetData.grid).forEach(key => {
      if (key.startsWith(`${payeeId}_`)) {
        const records = sheetData.grid[key].records || [];
        records.forEach(r => {
          total += r.calculatedAmount || 0;
        });
      }
    });

    const liftingTotal = (sheetData.liftingRecords || [])
      .filter(l => l.PayeeId === payeeId)
      .reduce((sum, l) => sum + parseFloat(l.Amount || 0), 0);

    return total + liftingTotal;
  };

  const getPayeeWeeklyLabourCount = (payeeId) => {
    if (!sheetData?.grid) return 0;
    let count = 0;
    Object.keys(sheetData.grid).forEach(key => {
      if (key.startsWith(`${payeeId}_`)) {
        const records = sheetData.grid[key].records || [];
        records.forEach(r => {
          count += r.labourCount || 0;
        });
      }
    });
    return count;
  };

  const getWeeklySiteLabourCount = (payeeId, siteId) => {
    if (!sheetData?.grid) return 0;
    const key = `${payeeId}_${siteId}`;
    const records = sheetData.grid[key]?.records || [];
    return records.reduce((sum, r) => sum + (r.labourCount || 0), 0);
  };

  const getMiscTotal = (payeeId) => sheetData?.miscData?.[payeeId]?.total || 0;
  const getRowGrand = (payeeId) => getDateRowAttendance(payeeId) + getMiscTotal(payeeId);

  const getGrandTotal = () => {
    if (!sheetData?.payees) return 0;
    return sheetData.payees.reduce((sum, p) => sum + getRowGrand(p.id), 0);
  };

  const getTotalAttendance = () => {
    if (!sheetData?.payees) return 0;
    return sheetData.payees.reduce((sum, p) => sum + getDateRowAttendance(p.id), 0);
  };

  const getTotalMisc = () => {
    if (!sheetData?.payees) return 0;
    return sheetData.payees.reduce((sum, p) => sum + getMiscTotal(p.id), 0);
  };

  const fmt = (num) => { if (!num || num === 0) return '—'; return '₹' + parseFloat(num).toLocaleString('en-IN'); };

  const handleOpenEntry = () => {
    if (!entrySiteId || !entryPayeeId || !entryDate) { alert('Select Site, Mason and Date first'); return; }
    const site = sheetData?.sites?.find(s => s.id === parseInt(entrySiteId));
    const payee = sheetData?.payees?.find(p => p.id === parseInt(entryPayeeId));
    const key = `${entryPayeeId}_${entrySiteId}`;
    const cellRecords = (sheetData?.grid?.[key]?.records || []).filter(r => r.date === entryDate);
    setShowEntryPanel({ payeeId: parseInt(entryPayeeId), siteId: parseInt(entrySiteId), payeeName: payee?.Name, siteName: site?.SiteName, date: entryDate, records: cellRecords });
  };

  const handleCellClick = (payeeId, siteId) => {
    setEntrySiteId(String(siteId));
    setEntryPayeeId(String(payeeId));
    const key = `${payeeId}_${siteId}`;
    const payee = sheetData?.payees?.find(p => p.id === payeeId);
    const site = sheetData?.sites?.find(s => s.id === siteId);
    const cellRecords = sheetData?.grid?.[key]?.records || [];
    const dateRecords = cellRecords.filter(r => r.date === entryDate);
    setShowEntryPanel({ payeeId, siteId, payeeName: payee?.Name, siteName: site?.SiteName, date: entryDate, records: dateRecords });
  };

  if (loading) return <div className="aps-container"><div className="aps-loading"><Loader2 size={32} className="aps-spinner" /></div></div>;

  const totalAttendanceOnly = getTotalDateAttendance();

  return (
    <div className="aps-container">
      <div className="aps-header">
        <div><h1>Attendance Pay Sheet</h1><p>Track daily attendance with shift-based salary calculation</p></div>
        <div className="aps-header-actions">
          <button
            className="aps-btn aps-btn-secondary"
            onClick={() => { fetchLiftingRates(); setShowLiftingRatesModal(true); }}
            style={{ background: 'rgba(233,30,99,0.1)', color: '#E91E63', border: '1px solid rgba(233,30,99,0.3)', marginRight: '8px' }}
          >
            <IndianRupee size={16} /> Lifting Rates
          </button>
          <button
            className="aps-btn aps-btn-secondary"
            onClick={() => { setEditingMaster({ ...masterSettings }); setShowMasterSettings(true); }}
            style={{ background: 'rgba(255,152,0,0.1)', color: '#FF9800', border: '1px solid rgba(255,152,0,0.3)', marginRight: '8px' }}
          >
            <Settings size={16} /> Master Settings
          </button>
          {sheetData && (
            <button
              className="aps-btn aps-btn-secondary"
              onClick={() => setShowSummary(prev => {
                const next = !prev;
                localStorage.setItem('aps_show_summary', JSON.stringify(next));
                return next;
              })}
              style={{ marginRight: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              {showSummary ? <EyeOff size={16} /> : <Eye size={16} />}
              {showSummary ? 'Hide Summary' : 'Show Summary'}
            </button>
          )}
          <button className="aps-btn aps-btn-primary" onClick={() => setShowNewSheetModal(true)}><Plus size={18} /> New Sheet</button>
        </div>
      </div>

      {sheetData && showSummary && (
        <div className="aps-summary">
          <div className="aps-summary-card total"><div className="aps-summary-label">Date Attendance</div><div className="aps-summary-value">{fmt(totalAttendanceOnly)}</div></div>
          <div className="aps-summary-card misc"><div className="aps-summary-label">Misc Charges</div><div className="aps-summary-value" style={{color:'#00BCD4'}}>{fmt(getTotalMisc())}</div></div>
          <div className="aps-summary-card info"><div className="aps-summary-label">Sites × Masons</div><div className="aps-summary-value">{sheetData.sites?.length||0} × {sheetData.payees?.length||0}</div></div>
        </div>
      )}

      <div className="aps-sheet-bar">
        <FileSpreadsheet size={18} color="var(--accent)" />
        <select className="aps-sheet-select" value={selectedSheetId||''} onChange={e => setSelectedSheetId(e.target.value ? parseInt(e.target.value) : null)}>
          <option value="">— Select Sheet —</option>
          {sheets.map(s => <option key={s.id} value={s.id}>{s.Title} ({new Date(s.WeekStartDate).toLocaleDateString('en-IN')} - {new Date(s.WeekEndDate).toLocaleDateString('en-IN')})</option>)}
        </select>
        {selectedSheetId && <>
          <button className="aps-btn aps-btn-secondary aps-btn-sm" onClick={() => setShowAddPayeeModal(true)}><Users size={14} /> Masons</button>
          <button className="aps-btn aps-btn-secondary aps-btn-sm" onClick={() => setShowAddSiteModal(true)}><Building2 size={14} /> Sites</button>
          <button className="aps-btn aps-btn-danger aps-btn-sm" onClick={handleDeleteSheet}><Trash2 size={14} /></button>
        </>}
      </div>

      {/* Attendance Entry Bar */}
      {selectedSheetId && sheetData?.payees?.length > 0 && sheetData?.sites?.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexShrink: 0, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)' }}>Date</label>
            <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)' }}>1. Site</label>
            <select value={entrySiteId} onChange={e => setEntrySiteId(e.target.value)}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text-primary)', fontSize: 13, outline: 'none', minWidth: 160 }}>
              <option value="">Select site...</option>
              {sheetData.sites.map(s => <option key={s.id} value={s.id}>{s.SiteName}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)' }}>2. Mason</label>
            <select value={entryPayeeId} onChange={e => setEntryPayeeId(e.target.value)}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text-primary)', fontSize: 13, outline: 'none', minWidth: 160 }}>
              <option value="">Select mason...</option>
              {sheetData.payees.map(p => <option key={p.id} value={p.id}>{p.Name}</option>)}
            </select>
          </div>
          <button className="aps-btn aps-btn-primary aps-btn-sm" onClick={handleOpenEntry} style={{ background: '#7C4DFF', marginBottom: 1 }}>
            <PlusCircle size={14} /> Mark Attendance
          </button>
          {/* Date info badge */}
          <div style={{ marginLeft: 'auto', background: 'rgba(124,77,255,0.1)', border: '1px solid rgba(124,77,255,0.2)', borderRadius: 8, padding: '4px 12px', fontSize: 11, color: '#7C4DFF', fontWeight: 700, alignSelf: 'flex-end', marginBottom: 1 }}>
            📅 Showing data for: {new Date(entryDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </div>
      )}

      {/* Grid or Empty */}
      {!selectedSheetId ? (
        <div className="aps-empty">
          <div className="aps-empty-icon"><Table2 size={36} /></div>
          <h3>No Sheet Selected</h3><p>Select or create an attendance sheet.</p>
          <button className="aps-btn aps-btn-primary" onClick={() => setShowNewSheetModal(true)}><Plus size={18} /> Create Sheet</button>
        </div>
      ) : gridLoading ? (
        <div className="aps-loading"><Loader2 size={32} className="aps-spinner" /></div>
      ) : !sheetData?.payees?.length || !sheetData?.sites?.length ? (
        <div className="aps-empty">
          <div className="aps-empty-icon"><Table2 size={36} /></div>
          <h3>{!sheetData?.payees?.length && !sheetData?.sites?.length ? 'Empty Sheet' : !sheetData?.sites?.length ? 'No Sites' : 'No Masons'}</h3>
          <p>Add sites and masons to build the attendance grid.</p>
          <div style={{ display: 'flex', gap: 12 }}>
            {!sheetData?.sites?.length && <button className="aps-btn aps-btn-secondary" onClick={() => setShowAddSiteModal(true)}><Building2 size={18} /> Add Sites</button>}
            {!sheetData?.payees?.length && <button className="aps-btn aps-btn-primary" onClick={() => setShowAddPayeeModal(true)}><Users size={18} /> Add Masons</button>}
          </div>
        </div>
      ) : (
        <div className="aps-grid-wrapper">
          <table className="aps-grid">
            <thead><tr>
              <th>Mason</th>
              {sheetData.sites.map(site => <th key={site.id}><div className="aps-site-header"><span className="aps-site-name">{site.SiteName}</span></div></th>)}
              <th>TOTAL</th>
            </tr></thead>
            <tbody>
              {sheetData.payees.map(payee => {
                const rowAttendance = getDateRowAttendance(payee.id);
                const miscTotal = getMiscTotal(payee.id);

                return (
                  <tr key={payee.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="aps-payee-name">
                          <div className={`aps-payee-badge ${payee.Type}`}>{payee.Name.charAt(0)}</div>
                          <div><div className="aps-payee-label">{payee.Name}</div><div className="aps-payee-type">{payee.Type}</div></div>
                        </div>
                      </div>
                    </td>
                    {sheetData.sites.map(site => {
                      const dateAmt = getDateCellAmount(payee.id, site.id);
                      const labourCount = getDateLabourCount(payee.id, site.id);

                      return (
                        <td key={site.id}>
                          <div className={`aps-cell ${dateAmt > 0 ? 'has-value' : 'empty'}`} onClick={() => handleCellClick(payee.id, site.id)}>
                            {dateAmt > 0 ? <>
                              <span className="aps-cell-amount">{fmt(dateAmt)}</span>
                              {labourCount > 0 && <span className="aps-cell-detail">{labourCount} workers</span>}
                            </> : <span>—</span>}
                          </div>
                        </td>
                      );
                    })}
                    <td>{fmt(rowAttendance)}</td>
                  </tr>
                );
              })}
              <tr className="aps-total-row">
                <td>DATE TOTAL</td>
                {sheetData.sites.map(site => <td key={site.id}>{fmt(getDateColTotal(site.id))}</td>)}
                <td>{fmt(getTotalDateAttendance())}</td>
              </tr>
            </tbody>
          </table>




        </div>
      )}

      {/* New Sheet Modal */}
      {showNewSheetModal && (
        <div className="aps-modal-overlay" onClick={() => setShowNewSheetModal(false)}>
          <div className="aps-modal" onClick={e => e.stopPropagation()} style={{ height: 'fit-content', margin: 'auto' }}>
            <h2>Create Attendance Sheet</h2>
            <div className="aps-modal-field"><label>Title</label>
              <input ref={newSheetTitleRef} type="text" placeholder="e.g. Week 12.05.2026" value={newSheetForm.Title}
                onChange={e => setNewSheetForm({...newSheetForm, Title: e.target.value})} onKeyDown={e => e.key === 'Enter' && handleCreateSheet()} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="aps-modal-field" style={{ flex: 1 }}><label>Week Start</label>
                <input type="date" value={newSheetForm.WeekStartDate} onChange={e => setNewSheetForm({...newSheetForm, WeekStartDate: e.target.value})} />
              </div>
              <div className="aps-modal-field" style={{ flex: 1 }}><label>Week End</label>
                <input type="date" value={newSheetForm.WeekEndDate} onChange={e => setNewSheetForm({...newSheetForm, WeekEndDate: e.target.value})} />
              </div>
            </div>
            <div className="aps-modal-actions">
              <button className="aps-btn aps-btn-secondary" onClick={() => setShowNewSheetModal(false)}>Cancel</button>
              <button className="aps-btn aps-btn-primary" onClick={handleCreateSheet}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Payees Modal */}
      {showAddPayeeModal && (
        <div className="aps-modal-overlay" onClick={() => { setShowAddPayeeModal(false); setPayeeSearch(''); }}>
          <div className="aps-modal" onClick={e => e.stopPropagation()} style={{ height: 'fit-content', maxHeight: '90vh', overflowY: 'auto', margin: 'auto' }}>
            <h2>Add Masons</h2>
            <div style={{ marginBottom: 12 }}>
              <input type="text" placeholder="Search masons..." value={payeeSearch} onChange={e => setPayeeSearch(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none', fontSize: 13 }} />
            </div>
            <div className="aps-multi-select">
              {allPayees.filter(p => p.Name.toLowerCase().includes(payeeSearch.toLowerCase())).map(p => {
                const isSel = selectedPayeeIds.includes(p.id);
                return (
                  <div key={p.id} className="aps-multi-select-item" onClick={() => setSelectedPayeeIds(prev => isSel ? prev.filter(id => id !== p.id) : [...prev, p.id])}>
                    <div className={`aps-checkbox ${isSel ? 'checked' : ''}`}>{isSel && <Check size={12} color="#0F0F1A" />}</div>
                    <div className={`aps-payee-badge ${p.Type}`} style={{ width: 24, height: 24, fontSize: 10 }}>{p.Name.charAt(0)}</div>
                    <div><div style={{ fontSize: 13, fontWeight: 600 }}>{p.Name}</div><div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.Type}</div></div>
                  </div>
                );
              })}
            </div>
            <div className="aps-modal-actions">
              <button className="aps-btn aps-btn-secondary" onClick={() => { setShowAddPayeeModal(false); setPayeeSearch(''); }}>Cancel</button>
              <button className="aps-btn aps-btn-primary" onClick={handleAddPayees}>Update Masons</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Sites Modal */}
      {showAddSiteModal && (
        <div className="aps-modal-overlay" onClick={() => { setShowAddSiteModal(false); setSiteSearch(''); }}>
          <div className="aps-modal" onClick={e => e.stopPropagation()} style={{ height: 'fit-content', maxHeight: '90vh', overflowY: 'auto', margin: 'auto' }}>
            <h2>Add Sites</h2>
            <div style={{ marginBottom: 12 }}>
              <input type="text" placeholder="Search sites..." value={siteSearch} onChange={e => setSiteSearch(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none', fontSize: 13 }} />
            </div>
            <div className="aps-multi-select">
              {allSites.filter(s => s.SiteName.toLowerCase().includes(siteSearch.toLowerCase())).map(s => {
                const isSel = selectedSiteIds.includes(s.id);
                return (
                  <div key={s.id} className="aps-multi-select-item" onClick={() => setSelectedSiteIds(prev => isSel ? prev.filter(id => id !== s.id) : [...prev, s.id])}>
                    <div className={`aps-checkbox ${isSel ? 'checked' : ''}`}>{isSel && <Check size={12} color="#0F0F1A" />}</div>
                    <Building2 size={16} color="var(--text-muted)" />
                    <div><div style={{ fontSize: 13, fontWeight: 600 }}>{s.SiteName}</div></div>
                  </div>
                );
              })}
            </div>
            <div className="aps-modal-actions">
              <button className="aps-btn aps-btn-secondary" onClick={() => { setShowAddSiteModal(false); setSiteSearch(''); }}>Cancel</button>
              <button className="aps-btn aps-btn-primary" onClick={handleAddSites}>Update Sites</button>
            </div>
          </div>
        </div>
      )}

      {/* Master Settings Modal */}
      {showMasterSettings && (
        <div className="aps-modal-overlay" onClick={() => setShowMasterSettings(false)}>
          <div className="aps-modal" onClick={e => e.stopPropagation()} style={{ height: 'fit-content', margin: 'auto', maxWidth: 420 }}>
            <h2>Master Settings</h2>
            
            <h3 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.5px', marginTop: 12, marginBottom: 12 }}>Expenses Settings</h3>
            <div className="aps-modal-field">
              <label>Tea Expense per Labour (₹/day)</label>
              <input
                type="number"
                value={editingMaster.TeaExpense}
                onChange={e => setEditingMaster({ ...editingMaster, TeaExpense: e.target.value })}
                placeholder="e.g. 20"
              />
            </div>
            <div className="aps-modal-field">
              <label>Bus Expense per Labour (₹/day)</label>
              <input
                type="number"
                value={editingMaster.BusExpense}
                onChange={e => setEditingMaster({ ...editingMaster, BusExpense: e.target.value })}
                placeholder="e.g. 50"
              />
            </div>
            <div style={{ background: 'rgba(255,152,0,0.08)', border: '1px solid rgba(255,152,0,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#FF9800', marginBottom: 16 }}>
              Total per worker per day: ₹{(parseFloat(editingMaster.TeaExpense)||0) + (parseFloat(editingMaster.BusExpense)||0)}
            </div>

            <h3 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.5px', marginTop: 16, marginBottom: 12, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16 }}>App Updates</h3>
            <div className="aps-modal-field">
              <label>Latest App Version (e.g. 2.5.0)</label>
              <input
                type="text"
                value={editingMaster.LatestAppVersion}
                onChange={e => setEditingMaster({ ...editingMaster, LatestAppVersion: e.target.value })}
                placeholder="e.g. 2.5.0"
              />
            </div>
            <div className="aps-modal-field">
              <label>Download Link for Updates</label>
              <input
                type="text"
                value={editingMaster.UpdateLink}
                onChange={e => setEditingMaster({ ...editingMaster, UpdateLink: e.target.value })}
                placeholder="e.g. https://drive.google.com/..."
              />
            </div>

            <div className="aps-modal-actions" style={{ marginTop: 20 }}>
              <button className="aps-btn aps-btn-secondary" onClick={() => setShowMasterSettings(false)}>Cancel</button>
              <button className="aps-btn aps-btn-primary" onClick={handleSaveMasterSettings} disabled={savingMaster}>
                {savingMaster ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Entry Panel */}
      {showEntryPanel && (
        <div className="aps-modal-overlay" onClick={() => setShowEntryPanel(null)}>
          <div onClick={e => e.stopPropagation()}>
            <AttendanceEntryPanel
              sheetId={selectedSheetId} payeeId={showEntryPanel.payeeId} siteId={showEntryPanel.siteId}
              payeeName={showEntryPanel.payeeName} siteName={showEntryPanel.siteName} date={showEntryPanel.date}
              records={showEntryPanel.records} shiftTypes={shiftTypes}
              masterSettings={masterSettings}
              weeklySiteAttendance={(sheetData?.grid?.[`${showEntryPanel.payeeId}_${showEntryPanel.siteId}`]?.records || []).reduce((sum, r) => sum + parseFloat(r.calculatedAmount || 0), 0)}
              weeklySiteLabourCount={getWeeklySiteLabourCount(showEntryPanel.payeeId, showEntryPanel.siteId)}
              onClose={() => setShowEntryPanel(null)}
              onSaved={() => { fetchSheetData(selectedSheetId); const key = `${showEntryPanel.payeeId}_${showEntryPanel.siteId}`;
                api.get(`/attendance-sheets/${selectedSheetId}`).then(res => {
                  setSheetData(res.data);
                  const recs = (res.data.grid?.[key]?.records || []).filter(r => r.date === showEntryPanel.date);
                  setShowEntryPanel(prev => ({...prev, records: recs}));
                });
              }}
            />
          </div>
        </div>
      )}

      {/* Lifting Rates Modal */}
      {showLiftingRatesModal && (
        <div className="aps-modal-overlay" onClick={() => setShowLiftingRatesModal(false)}>
          <div className="aps-modal" onClick={e => e.stopPropagation()} style={{ height: 'fit-content', margin: 'auto', maxWidth: 650 }}>
            <h2>Master Lifting Rates Matrix</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
              Set the standard rate for lifting each material to different floor levels. These rates populate automatically when logging lifting work.
            </p>
            <div style={{ overflowX: 'auto', marginBottom: 20 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--text-muted)' }}>Floor</th>
                    <th style={{ textAlign: 'right', padding: '10px 14px', color: 'var(--text-muted)' }}>M.Sand (₹/load)</th>
                    <th style={{ textAlign: 'right', padding: '10px 14px', color: 'var(--text-muted)' }}>Jally (₹/load)</th>
                    <th style={{ textAlign: 'right', padding: '10px 14px', color: 'var(--text-muted)' }}>Sengal (₹/piece)</th>
                  </tr>
                </thead>
                <tbody>
                  {['G.Floor', '1st floor', '2nd floor', '3rd floor'].map(floor => (
                    <tr key={floor} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>{floor === 'G.Floor' ? 'Ground Floor' : floor}</td>
                      <td style={{ padding: '6px 14px', textAlign: 'right' }}>
                        <input
                          type="number"
                          step="0.01"
                          style={{
                            width: 100,
                            padding: '6px 8px',
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-primary)',
                            borderRadius: 6,
                            textAlign: 'right'
                          }}
                          value={editingLiftingRates[`M.Sand_${floor}`] || ''}
                          onChange={e => setEditingLiftingRates({
                            ...editingLiftingRates,
                            [`M.Sand_${floor}`]: e.target.value
                          })}
                        />
                      </td>
                      <td style={{ padding: '6px 14px', textAlign: 'right' }}>
                        <input
                          type="number"
                          step="0.01"
                          style={{
                            width: 100,
                            padding: '6px 8px',
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-primary)',
                            borderRadius: 6,
                            textAlign: 'right'
                          }}
                          value={editingLiftingRates[`Jally_${floor}`] || ''}
                          onChange={e => setEditingLiftingRates({
                            ...editingLiftingRates,
                            [`Jally_${floor}`]: e.target.value
                          })}
                        />
                      </td>
                      <td style={{ padding: '6px 14px', textAlign: 'right' }}>
                        <input
                          type="number"
                          step="0.01"
                          style={{
                            width: 100,
                            padding: '6px 8px',
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-primary)',
                            borderRadius: 6,
                            textAlign: 'right'
                          }}
                          value={editingLiftingRates[`Sengal_${floor}`] || ''}
                          onChange={e => setEditingLiftingRates({
                            ...editingLiftingRates,
                            [`Sengal_${floor}`]: e.target.value
                          })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="aps-modal-actions">
              <button className="aps-btn aps-btn-secondary" onClick={() => setShowLiftingRatesModal(false)}>Cancel</button>
              <button className="aps-btn aps-btn-primary" onClick={handleSaveLiftingRates} disabled={savingLiftingRates}>
                {savingLiftingRates ? 'Saving...' : 'Save Rates'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendancePaySheetPage;
