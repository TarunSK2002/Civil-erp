import React, { useState, useEffect } from 'react';
import { Plus, ArrowLeft, Pencil, Trash2, ChevronRight, Check, X, Loader2, HardHat, Package } from 'lucide-react';
import api from '../api/axios';

const fmt = (num) => {
  if (!num && num !== 0) return '—';
  return '₹' + parseFloat(num).toLocaleString('en-IN');
};

const SiteReportView = ({ sites }) => {
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [subView, setSubView] = useState('summary'); // summary | labour-detail | material-detail
  const [drillData, setDrillData] = useState(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const [rentalAmount, setRentalAmount] = useState(0);

  // Work value editing
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ WorkName: '', Value: '' });
  const [addingNew, setAddingNew] = useState(false);
  const [newForm, setNewForm] = useState({ WorkName: '', Value: '' });

  useEffect(() => {
    if (selectedSiteId) {
      fetchReport(selectedSiteId);
      setSubView('summary');
      setDrillData(null);
      setRentalAmount(0);
    } else {
      setReportData(null);
    }
  }, [selectedSiteId]);

  const fetchReport = async (siteId) => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/site/${siteId}`);
      setReportData(res.data);
    } catch (err) {
      console.error('Failed to fetch site report', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLabourDetail = async () => {
    setDrillLoading(true);
    try {
      const res = await api.get(`/reports/site/${selectedSiteId}/labour-detail`);
      setDrillData(res.data);
      setSubView('labour-detail');
    } catch (err) {
      console.error('Failed to fetch labour detail', err);
    } finally {
      setDrillLoading(false);
    }
  };

  const fetchMaterialDetail = async () => {
    setDrillLoading(true);
    try {
      const res = await api.get(`/reports/site/${selectedSiteId}/material-detail`);
      setDrillData(res.data);
      setSubView('material-detail');
    } catch (err) {
      console.error('Failed to fetch material detail', err);
    } finally {
      setDrillLoading(false);
    }
  };

  // CRUD for work values
  const handleAddWorkValue = async () => {
    if (!newForm.WorkName.trim() || !newForm.Value) return;
    try {
      await api.post('/reports/work-values', { SiteId: selectedSiteId, WorkName: newForm.WorkName, Value: parseFloat(newForm.Value) });
      setAddingNew(false);
      setNewForm({ WorkName: '', Value: '' });
      fetchReport(selectedSiteId);
    } catch (err) { alert('Failed to add'); }
  };

  const handleUpdateWorkValue = async (id) => {
    if (!editForm.WorkName.trim() || !editForm.Value) return;
    try {
      await api.put(`/reports/work-values/${id}`, { WorkName: editForm.WorkName, Value: parseFloat(editForm.Value) });
      setEditingId(null);
      fetchReport(selectedSiteId);
    } catch (err) { alert('Failed to update'); }
  };

  const handleDeleteWorkValue = async (id) => {
    if (!window.confirm('Delete this work item?')) return;
    try {
      await api.delete(`/reports/work-values/${id}`);
      fetchReport(selectedSiteId);
    } catch (err) { alert('Failed to delete'); }
  };

  const siteName = sites.find(s => s.id === parseInt(selectedSiteId))?.SiteName || '';
  const totalExpWithRental = (reportData?.totalExpenses || 0) + (parseFloat(rentalAmount) || 0);
  const profitWithRental = (reportData?.siteValue || 0) - totalExpWithRental;

  // ===== DRILL-DOWN: Labour Detail =====
  if (subView === 'labour-detail') {
    return (
      <div className="report-content">
        <button className="report-back-btn" onClick={() => setSubView('summary')}>
          <ArrowLeft size={16} /> Back to Summary
        </button>
        <div className="report-section-header" style={{ background: 'none', border: 'none', padding: '0' }}>
          <h3 style={{ fontSize: '18px' }}>
            <div className="section-icon" style={{ background: 'rgba(33,150,243,0.1)', color: 'var(--info)' }}><HardHat size={18} /></div>
            Labour Payments — {siteName}
          </h3>
        </div>
        <div className="report-section">
          <table className="report-table">
            <thead><tr><th>Labour Name</th><th>Type</th><th style={{ textAlign: 'right' }}>Total Paid</th><th style={{ textAlign: 'right' }}>Payments</th></tr></thead>
            <tbody>
              {drillData?.labours?.map((l, i) => (
                <tr key={i}><td style={{ fontWeight: 600 }}>{l.name}</td><td><span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '3px 8px', borderRadius: 5 }}>{l.type}</span></td><td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(l.totalPaid)}</td><td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{l.paymentCount}</td></tr>
              ))}
              {drillData?.labours?.length > 0 && (
                <tr className="total-row"><td colSpan={2}>TOTAL</td><td style={{ textAlign: 'right' }}>{fmt(drillData.grandTotal)}</td><td></td></tr>
              )}
              {(!drillData?.labours || drillData.labours.length === 0) && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No labour payments found for this site.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ===== DRILL-DOWN: Material Detail =====
  if (subView === 'material-detail') {
    return (
      <div className="report-content">
        <button className="report-back-btn" onClick={() => setSubView('summary')}>
          <ArrowLeft size={16} /> Back to Summary
        </button>
        <div className="report-section-header" style={{ background: 'none', border: 'none', padding: '0' }}>
          <h3 style={{ fontSize: '18px' }}>
            <div className="section-icon" style={{ background: 'rgba(255,152,0,0.1)', color: 'var(--warning)' }}><Package size={18} /></div>
            Material Purchase — {siteName}
          </h3>
        </div>
        <div className="report-section">
          <table className="report-table">
            <thead><tr><th>Material</th><th style={{ textAlign: 'right' }}>Total Amount</th><th style={{ textAlign: 'right' }}>Purchases</th></tr></thead>
            <tbody>
              {drillData?.materials?.map((m, i) => (
                <tr key={i}><td style={{ fontWeight: 600 }}>{m.materialName}</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(m.totalAmount)}</td><td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{m.purchaseCount}</td></tr>
              ))}
              {drillData?.materials?.length > 0 && (
                <tr className="total-row"><td>TOTAL</td><td style={{ textAlign: 'right' }}>{fmt(drillData.grandTotal)}</td><td></td></tr>
              )}
              {(!drillData?.materials || drillData.materials.length === 0) && (
                <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No material purchases found for this site.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ===== MAIN SUMMARY VIEW =====
  return (
    <>
      {/* Site Selector */}
      <div className="report-controls">
        <span className="report-label">Site:</span>
        <select className="report-select" value={selectedSiteId} onChange={e => setSelectedSiteId(e.target.value)}>
          <option value="">— Select Site —</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.SiteName}</option>)}
        </select>
      </div>

      {!selectedSiteId && (
        <div className="report-empty">
          <div className="report-empty-icon"><Package size={28} /></div>
          <h3>Select a Site</h3>
          <p>Choose a site from the dropdown above to view its financial report.</p>
        </div>
      )}

      {selectedSiteId && loading && (
        <div className="report-loading"><Loader2 size={32} className="report-spinner" /></div>
      )}

      {selectedSiteId && !loading && reportData && (
        <div className="report-content">
          {/* Work Values Table */}
          <div className="report-section">
            <div className="report-section-header">
              <h3><div className="section-icon" style={{ background: 'rgba(255,179,0,0.1)', color: 'var(--accent)' }}><Package size={16} /></div> Work Values</h3>
              <button className="report-btn-add" onClick={() => { setAddingNew(true); setNewForm({ WorkName: '', Value: '' }); }}><Plus size={14} /> Add Item</button>
            </div>
            <table className="report-table">
              <thead><tr><th>Work Name</th><th style={{ textAlign: 'right' }}>Value (₹)</th><th style={{ width: 100 }}>Action</th></tr></thead>
              <tbody>
                {reportData.workItems.map(item => (
                  editingId === item.id ? (
                    <tr key={item.id} className="work-value-edit-row">
                      <td><input value={editForm.WorkName} onChange={e => setEditForm({ ...editForm, WorkName: e.target.value })} placeholder="Work name" autoFocus /></td>
                      <td><input type="number" value={editForm.Value} onChange={e => setEditForm({ ...editForm, Value: e.target.value })} placeholder="Value" style={{ textAlign: 'right' }} /></td>
                      <td><div className="action-btns"><button className="save-btn" onClick={() => handleUpdateWorkValue(item.id)}><Check size={14} /></button><button className="cancel-btn" onClick={() => setEditingId(null)}><X size={14} /></button></div></td>
                    </tr>
                  ) : (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 500 }}>{item.WorkName}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(item.Value)}</td>
                      <td><div className="action-btns"><button className="action-btn edit" onClick={() => { setEditingId(item.id); setEditForm({ WorkName: item.WorkName, Value: item.Value }); }}><Pencil size={13} /></button><button className="action-btn" onClick={() => handleDeleteWorkValue(item.id)}><Trash2 size={13} /></button></div></td>
                    </tr>
                  )
                ))}
                {addingNew && (
                  <tr className="work-value-edit-row">
                    <td><input value={newForm.WorkName} onChange={e => setNewForm({ ...newForm, WorkName: e.target.value })} placeholder="e.g. Ground Floor" autoFocus onKeyDown={e => e.key === 'Enter' && handleAddWorkValue()} /></td>
                    <td><input type="number" value={newForm.Value} onChange={e => setNewForm({ ...newForm, Value: e.target.value })} placeholder="e.g. 2000000" style={{ textAlign: 'right' }} onKeyDown={e => e.key === 'Enter' && handleAddWorkValue()} /></td>
                    <td><div className="action-btns"><button className="save-btn" onClick={handleAddWorkValue}><Check size={14} /></button><button className="cancel-btn" onClick={() => setAddingNew(false)}><X size={14} /></button></div></td>
                  </tr>
                )}
                <tr className="total-row">
                  <td>SITE TOTAL VALUE</td>
                  <td style={{ textAlign: 'right' }}>{fmt(reportData.siteValue)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary Cards */}
          <div className="report-summary-cards">
            <div className="report-summary-card value">
              <div className="card-label">Site Total Value</div>
              <div className="card-value">{fmt(reportData.siteValue)}</div>
            </div>
            <div className="report-summary-card expense">
              <div className="card-label">Total Expenses</div>
              <div className="card-value">{fmt(totalExpWithRental)}</div>
            </div>
            <div className="report-summary-card profit">
              <div className="card-label">My Profit</div>
              <div className="card-value" style={{ color: profitWithRental >= 0 ? 'var(--success)' : 'var(--error)' }}>{fmt(profitWithRental)}</div>
            </div>
          </div>

          {/* Expense Breakdown */}
          <div className="report-section">
            <div className="report-section-header">
              <h3><div className="section-icon" style={{ background: 'rgba(255,82,82,0.1)', color: 'var(--error)' }}><Package size={16} /></div> Expense Breakdown</h3>
            </div>
            <table className="report-table">
              <thead><tr><th>Category</th><th style={{ textAlign: 'right' }}>Amount</th><th style={{ width: 100 }}></th></tr></thead>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 500 }}>Labour Payments</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(reportData.labourExpense)}</td>
                  <td><button className="view-btn" onClick={fetchLabourDetail} disabled={drillLoading}>View <ChevronRight size={14} /></button></td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 500 }}>Material Purchase</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(reportData.materialExpense)}</td>
                  <td><button className="view-btn" onClick={fetchMaterialDetail} disabled={drillLoading}>View <ChevronRight size={14} /></button></td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 500 }}>Rental Products</td>
                  <td style={{ textAlign: 'right' }}><input type="number" className="rental-input" value={rentalAmount} onChange={e => setRentalAmount(e.target.value)} placeholder="0" /></td>
                  <td></td>
                </tr>
                <tr className="total-row">
                  <td>TOTAL EXPENSES</td>
                  <td style={{ textAlign: 'right' }}>{fmt(totalExpWithRental)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};

export default SiteReportView;
