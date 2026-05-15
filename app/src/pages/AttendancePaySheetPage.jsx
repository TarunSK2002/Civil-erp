import React, { useState, useEffect, useRef } from 'react';
import { Plus, Table2, Check, X, Loader2, Trash2, Calendar, FileSpreadsheet, Users, Building2, IndianRupee, Clock, CheckCircle2, PlusCircle } from 'lucide-react';
import api from '../api/axios';
import AttendanceEntryPanel, { MiscPanel } from './AttendanceEntryPanel';
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
  const [showMiscPanel, setShowMiscPanel] = useState(null);

  const [allPayees, setAllPayees] = useState([]);
  const [allSites, setAllSites] = useState([]);
  const [selectedPayeeIds, setSelectedPayeeIds] = useState([]);
  const [selectedSiteIds, setSelectedSiteIds] = useState([]);
  const [payeeSearch, setPayeeSearch] = useState('');
  const [siteSearch, setSiteSearch] = useState('');

  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [entrySiteId, setEntrySiteId] = useState('');
  const [entryPayeeId, setEntryPayeeId] = useState('');

  const newSheetTitleRef = useRef(null);
  const [newSheetForm, setNewSheetForm] = useState({
    Title: '', WeekStartDate: new Date().toISOString().split('T')[0],
    WeekEndDate: (() => { const d = new Date(); d.setDate(d.getDate() + 6); return d.toISOString().split('T')[0]; })()
  });

  useEffect(() => { fetchSheets(); fetchAllPayees(); fetchAllSites(); fetchShiftTypes(); }, []);
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

  const getRowTotal = (payeeId) => {
    if (!sheetData?.grid || !sheetData?.sites) return 0;
    return sheetData.sites.reduce((sum, site) => {
      const key = `${payeeId}_${site.id}`;
      return sum + (sheetData.grid[key]?.totalAmount || 0);
    }, 0);
  };

  const getMiscTotal = (payeeId) => sheetData?.miscData?.[payeeId]?.total || 0;
  const getRowGrand = (payeeId) => getRowTotal(payeeId) + getMiscTotal(payeeId);

  const getColTotal = (siteId) => {
    if (!sheetData?.grid || !sheetData?.payees) return 0;
    return sheetData.payees.reduce((sum, p) => {
      const key = `${p.id}_${siteId}`;
      const attendanceAmt = sheetData.grid[key]?.totalAmount || 0;
      const miscAmt = sheetData.miscData?.[p.id]?.siteTotals?.[siteId] || 0;
      return sum + attendanceAmt + miscAmt;
    }, 0);
  };

  const getGrandTotal = () => {
    if (!sheetData?.payees) return 0;
    return sheetData.payees.reduce((sum, p) => sum + getRowGrand(p.id), 0);
  };

  const getTotalAttendance = () => {
    if (!sheetData?.payees) return 0;
    return sheetData.payees.reduce((sum, p) => sum + getRowTotal(p.id), 0);
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

  return (
    <div className="aps-container">
      <div className="aps-header">
        <div><h1>Attendance Pay Sheet</h1><p>Track daily attendance with shift-based salary calculation</p></div>
        <div className="aps-header-actions">
          <button className="aps-btn aps-btn-primary" onClick={() => setShowNewSheetModal(true)}><Plus size={18} /> New Sheet</button>
        </div>
      </div>

      {sheetData && (
        <div className="aps-summary">
          <div className="aps-summary-card total"><div className="aps-summary-label">Grand Total</div><div className="aps-summary-value">{fmt(getGrandTotal())}</div></div>
          <div className="aps-summary-card attendance"><div className="aps-summary-label">Attendance</div><div className="aps-summary-value" style={{color:'#7C4DFF'}}>{fmt(getTotalAttendance())}</div></div>
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
              <th style={{ color: '#00BCD4' }}>MISC</th>
              <th>TOTAL</th>
            </tr></thead>
            <tbody>
              {sheetData.payees.map(payee => (
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
                    const key = `${payee.id}_${site.id}`;
                    const cellData = sheetData.grid?.[key];
                    const attendanceAmt = cellData?.totalAmount || 0;
                    const miscAmt = sheetData.miscData?.[payee.id]?.siteTotals?.[site.id] || 0;
                    const totalAmt = attendanceAmt + miscAmt;
                    const recordCount = cellData?.records?.length || 0;
                    
                    return (
                      <td key={site.id}>
                        <div className={`aps-cell ${totalAmt > 0 ? 'has-value' : 'empty'}`} onClick={() => handleCellClick(payee.id, site.id)}>
                          {totalAmt > 0 ? <>
                            <span className="aps-cell-amount">{fmt(totalAmt)}</span>
                            {attendanceAmt > 0 && <span className="aps-cell-detail">{recordCount} entries</span>}
                            {miscAmt > 0 && <span className="aps-cell-detail" style={{color:'#00BCD4'}}>+ {fmt(miscAmt)} misc</span>}
                          </> : <span>—</span>}
                        </div>
                      </td>
                    );
                  })}
                  <td>
                    <div className="aps-misc-cell" onClick={() => setShowMiscPanel({ payeeId: payee.id, payeeName: payee.Name })}>
                      {/* Only show general MIS here (those without siteId) */}
                      {(() => {
                        const generalMisc = (sheetData.miscData?.[payee.id]?.items || []).filter(m => !m.siteId);
                        const generalTotal = generalMisc.reduce((s, m) => s + m.amount, 0);
                        return generalTotal > 0 ? <span className="aps-misc-badge">{fmt(generalTotal)}</span> : <PlusCircle size={14} color="var(--text-muted)" />;
                      })()}
                    </div>
                  </td>
                  <td>{fmt(getRowGrand(payee.id))}</td>
                </tr>
              ))}
              <tr className="aps-total-row">
                <td>SITE TOTAL</td>
                {sheetData.sites.map(site => <td key={site.id}>{fmt(getColTotal(site.id))}</td>)}
                <td style={{ color: '#00BCD4' }}>{fmt(getTotalMisc())}</td>
                <td>{fmt(getGrandTotal())}</td>
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

      {/* Attendance Entry Panel */}
      {showEntryPanel && (
        <div className="aps-modal-overlay" onClick={() => setShowEntryPanel(null)}>
          <div onClick={e => e.stopPropagation()}>
            <AttendanceEntryPanel
              sheetId={selectedSheetId} payeeId={showEntryPanel.payeeId} siteId={showEntryPanel.siteId}
              payeeName={showEntryPanel.payeeName} siteName={showEntryPanel.siteName} date={showEntryPanel.date}
              records={showEntryPanel.records} shiftTypes={shiftTypes}
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

      {/* Misc Panel */}
      {showMiscPanel && (
        <div className="aps-modal-overlay" onClick={() => setShowMiscPanel(null)}>
          <div onClick={e => e.stopPropagation()}>
            <MiscPanel
              sheetId={selectedSheetId} payeeId={showMiscPanel.payeeId} payeeName={showMiscPanel.payeeName}
              miscItems={sheetData?.miscData?.[showMiscPanel.payeeId]?.items || []}
              onClose={() => setShowMiscPanel(null)}
              onSaved={() => { fetchSheetData(selectedSheetId); }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendancePaySheetPage;
