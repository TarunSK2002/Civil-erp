import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Table2, ChevronDown, Check, X, Loader2, Trash2,
  Calendar, CreditCard, FileSpreadsheet, Users, Building2,
  IndianRupee, Clock, CheckCircle2, AlertCircle
} from 'lucide-react';
import api from '../api/axios';
import './WeeklyPaySheetPage.css';

const WeeklyPaySheetPage = () => {
  // ---- State ----
  const [sheets, setSheets] = useState([]);
  const [selectedSheetId, setSelectedSheetId] = useState(null);
  const [sheetData, setSheetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gridLoading, setGridLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  // Filter
  const [statusFilter, setStatusFilter] = useState('All');

  // Editing
  const [editingCell, setEditingCell] = useState(null); // "payeeId_siteId"
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef(null);

  // Modals
  const [showNewSheetModal, setShowNewSheetModal] = useState(false);
  const [showAddPayeeModal, setShowAddPayeeModal] = useState(false);
  const [showAddSiteModal, setShowAddSiteModal] = useState(false);
  
  // Refs for focus
  const newSheetTitleRef = useRef(null);
  
  const [showPayModal, setShowPayModal] = useState(null); // item key
  const [payFormData, setPayFormData] = useState({
    PaymentDate: new Date().toISOString().split('T')[0],
    PaymentMode: 'Cash',
    Notes: ''
  });

  // New sheet form
  const [newSheetForm, setNewSheetForm] = useState({
    Title: '',
    WeekDate: new Date().toISOString().split('T')[0]
  });

  // All payees & sites for selection
  const [allPayees, setAllPayees] = useState([]);
  const [allSites, setAllSites] = useState([]);
  const [selectedPayeeIds, setSelectedPayeeIds] = useState([]);
  const [selectedSiteIds, setSelectedSiteIds] = useState([]);

  // Search states for modals
  const [payeeSearch, setPayeeSearch] = useState('');
  const [siteSearch, setSiteSearch] = useState('');

  // ---- Effects ----
  useEffect(() => {
    fetchSheets();
    fetchAllPayees();
    fetchAllSites();
  }, []);

  useEffect(() => {
    if (selectedSheetId) {
      fetchSheetData(selectedSheetId);
    }
  }, [selectedSheetId]);

  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingCell]);

  // Focus New Sheet Title when modal opens
  useEffect(() => {
    if (showNewSheetModal) {
      setTimeout(() => {
        newSheetTitleRef.current?.focus();
      }, 150);
    }
  }, [showNewSheetModal]);

  // Sync selection states when modals open
  useEffect(() => {
    if (showAddPayeeModal && sheetData?.selectedPayeeIds) {
      setSelectedPayeeIds(sheetData.selectedPayeeIds);
    }
  }, [showAddPayeeModal, sheetData]);

  useEffect(() => {
    if (showAddSiteModal && sheetData?.selectedSiteIds) {
      setSelectedSiteIds(sheetData.selectedSiteIds);
    }
  }, [showAddSiteModal, sheetData]);

  // ---- API Calls ----
  const fetchSheets = async () => {
    try {
      const res = await api.get('/weekly-pay-sheets');
      setSheets(res.data);
      if (res.data.length > 0 && !selectedSheetId) {
        setSelectedSheetId(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch sheets', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSheetData = async (id) => {
    setGridLoading(true);
    try {
      const res = await api.get(`/weekly-pay-sheets/${id}`);
      setSheetData(res.data);
    } catch (err) {
      console.error('Failed to fetch sheet data', err);
    } finally {
      setGridLoading(false);
    }
  };

  const fetchAllPayees = async () => {
    try {
      const res = await api.get('/payees');
      setAllPayees(res.data);
    } catch (err) {
      console.error('Failed to fetch payees', err);
    }
  };

  const fetchAllSites = async () => {
    try {
      const res = await api.get('/sites');
      setAllSites(res.data);
    } catch (err) {
      console.error('Failed to fetch sites', err);
    }
  };

  // ---- Sheet Operations ----
  const handleCreateSheet = async () => {
    if (!newSheetForm.Title.trim()) return;
    try {
      const res = await api.post('/weekly-pay-sheets', newSheetForm);
      setShowNewSheetModal(false);
      setNewSheetForm({ Title: '', WeekDate: new Date().toISOString().split('T')[0] });
      await fetchSheets();
      setSelectedSheetId(res.data.id);
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to create sheet');
    }
  };

  const handleImportAttendance = async () => {
    if (!selectedSheetId) return;
    if (!window.confirm('This will fetch totals from the attendance sheet for this week and pre-fill the grid. Existing amounts (if not yet marked as Paid) will be overwritten. Proceed?')) return;
    
    setImporting(true);
    try {
      const res = await api.post(`/weekly-pay-sheets/${selectedSheetId}/import-attendance`);
      alert(res.data.msg);
      fetchSheetData(selectedSheetId);
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to import attendance data');
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteSheet = async () => {
    if (!selectedSheetId) return;
    if (!window.confirm('Delete this entire weekly sheet and all its payment data?')) return;
    try {
      await api.delete(`/weekly-pay-sheets/${selectedSheetId}`);
      setSelectedSheetId(null);
      setSheetData(null);
      fetchSheets();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to delete sheet');
    }
  };

  // ---- Add Payees/Sites ----
  const handleAddPayees = async () => {
    if (!selectedSheetId) return;
    try {
      await api.post(`/weekly-pay-sheets/${selectedSheetId}/sync-payees`, {
        payeeIds: selectedPayeeIds
      });
      setShowAddPayeeModal(false);
      setPayeeSearch('');
      fetchSheetData(selectedSheetId);
      fetchSheets(); // Update summaries
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to sync payees');
    }
  };

  const handleAddSites = async () => {
    if (!selectedSheetId) return;
    try {
      await api.post(`/weekly-pay-sheets/${selectedSheetId}/sync-sites`, {
        siteIds: selectedSiteIds
      });
      setShowAddSiteModal(false);
      setSiteSearch('');
      fetchSheetData(selectedSheetId);
      fetchSheets(); // Update summaries
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to sync sites');
    }
  };

  const handleRemovePayee = async (payeeId) => {
    if (!window.confirm('Remove this payee and all their recorded amounts from this sheet?')) return;
    try {
      await api.delete(`/weekly-pay-sheets/${selectedSheetId}/payees/${payeeId}`);
      fetchSheetData(selectedSheetId);
      fetchSheets();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to remove payee');
    }
  };

  const handleRemoveSite = async (siteId) => {
    if (!window.confirm('Remove this site column and all its recorded amounts from this sheet?')) return;
    try {
      await api.delete(`/weekly-pay-sheets/${selectedSheetId}/sites/${siteId}`);
      fetchSheetData(selectedSheetId);
      fetchSheets();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to remove site');
    }
  };

  // ---- Cell Operations ----
  const handleCellClick = (payeeId, siteId) => {
    const key = payeeId ? `${payeeId}_${siteId}` : `income_${siteId}`;
    const cellData = sheetData?.grid?.[key];
    if (cellData?.status === 'Paid') return; // Don't edit paid cells
    setEditingCell(key);
    setEditValue(cellData?.amount > 0 ? String(cellData.amount) : '');
  };

  const handleCellSave = async (payeeId, siteId) => {
    const amount = parseFloat(editValue) || 0;
    setEditingCell(null);

    try {
      await api.post(`/weekly-pay-sheets/${selectedSheetId}/items`, {
        PayeeId: payeeId,
        SiteId: siteId,
        Amount: amount
      });
      fetchSheetData(selectedSheetId);
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to save');
    }
  };

  const handleCellKeyDown = (e, payeeId, siteId) => {
    if (e.key === 'Enter') {
      handleCellSave(payeeId, siteId);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleCellSave(payeeId, siteId);
      // Move to next cell
      const sites = sheetData?.sites || [];
      const currentSiteIndex = sites.findIndex(s => s.id === siteId);
      if (currentSiteIndex < sites.length - 1) {
        const nextSiteId = sites[currentSiteIndex + 1].id;
        setTimeout(() => handleCellClick(payeeId, nextSiteId), 100);
      }
    }
  };

  // ---- Pay/Unpay ----
  const handleMarkPaid = async () => {
    if (!showPayModal) return;

    if (showPayModal === 'all') {
      try {
        await api.patch(`/weekly-pay-sheets/${selectedSheetId}/pay-all`, payFormData);
        setShowPayModal(null);
        setPayFormData({ PaymentDate: new Date().toISOString().split('T')[0], PaymentMode: 'Cash', Notes: '' });
        fetchSheetData(selectedSheetId);
        fetchSheets(); // Update summaries
      } catch (err) {
        alert(err.response?.data?.msg || 'Failed to mark all as paid');
      }
      return;
    }

    const cellData = sheetData?.grid?.[showPayModal];
    if (!cellData) return;

    try {
      await api.patch(`/weekly-pay-sheets/items/${cellData.id}/pay`, payFormData);
      setShowPayModal(null);
      setPayFormData({ PaymentDate: new Date().toISOString().split('T')[0], PaymentMode: 'Cash', Notes: '' });
      fetchSheetData(selectedSheetId);
      fetchSheets(); // Update summaries
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to mark as paid');
    }
  };

  const handleUnpay = async (itemId) => {
    if (!window.confirm('Revert this payment to pending? The linked payment record will be deleted.')) return;
    try {
      await api.patch(`/weekly-pay-sheets/items/${itemId}/unpay`);
      fetchSheetData(selectedSheetId);
      fetchSheets();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to unpay');
    }
  };

  // ---- Computed Values ----
  const getRowTotal = (payeeId) => {
    if (!sheetData?.grid || !sheetData?.sites) return 0;
    return sheetData.sites.reduce((sum, site) => {
      const key = `${payeeId}_${site.id}`;
      return sum + (sheetData.grid[key]?.amount || 0);
    }, 0);
  };

  const getColTotal = (siteId) => {
    if (!sheetData?.grid || !sheetData?.payees) return 0;
    return sheetData.payees.reduce((sum, payee) => {
      const key = `${payee.id}_${siteId}`;
      return sum + (sheetData.grid[key]?.amount || 0);
    }, 0);
  };

  const getGrandTotal = () => {
    if (!sheetData?.payees) return 0;
    return sheetData.payees.reduce((sum, payee) => sum + getRowTotal(payee.id), 0);
  };

  const getPaidTotal = () => {
    if (!sheetData?.grid) return 0;
    return Object.values(sheetData.grid)
      .filter(cell => cell.status === 'Paid')
      .reduce((sum, cell) => sum + (cell.amount || 0), 0);
  };

  const getPendingTotal = () => getGrandTotal() - getPaidTotal();

  // ---- Filter payees ----
  const getFilteredPayees = () => {
    if (!sheetData?.payees) return [];
    if (statusFilter === 'All') return sheetData.payees;

    return sheetData.payees.filter(payee => {
      const sites = sheetData.sites || [];
      return sites.some(site => {
        const key = `${payee.id}_${site.id}`;
        const cell = sheetData.grid?.[key];
        if (!cell || cell.amount === 0) return false;
        if (statusFilter === 'Paid') return cell.status === 'Paid';
        if (statusFilter === 'Pending') return cell.status === 'Pending';
        return true;
      });
    });
  };

  // ---- Format ----
  const fmt = (num) => {
    if (!num || num === 0) return '—';
    return '₹' + parseFloat(num).toLocaleString('en-IN');
  };

  // ---- Render ----
  if (loading) {
    return (
      <div className="wps-container">
        <div className="wps-loading">
          <Loader2 size={32} className="wps-spinner" />
        </div>
      </div>
    );
  }

  const filteredPayees = getFilteredPayees();
  const currentSheet = sheets.find(s => s.id === selectedSheetId);

  return (
    <div className="wps-container">
      {/* Header */}
      <div className="wps-header">
        <div>
          <h1>Weekly Pay Sheet</h1>
          <p>Track and manage weekly project payments — like your Excel, but better.</p>
        </div>
        <div className="wps-header-actions">
          <button className="wps-btn wps-btn-primary" onClick={() => setShowNewSheetModal(true)}>
            <Plus size={18} /> New Sheet
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {sheetData && (
        <div className="wps-summary">
          <div className="wps-summary-card total">
            <div className="wps-summary-label">Total Amount</div>
            <div className="wps-summary-value">{fmt(getGrandTotal())}</div>
          </div>
          <div className="wps-summary-card paid">
            <div className="wps-summary-label">Paid</div>
            <div className="wps-summary-value" style={{ color: '#4CAF50' }}>{fmt(getPaidTotal())}</div>
          </div>
          <div className="wps-summary-card pending">
            <div className="wps-summary-label">Pending</div>
            <div className="wps-summary-value" style={{ color: '#FF9800' }}>{fmt(getPendingTotal())}</div>
          </div>
          <div className="wps-summary-card sites">
            <div className="wps-summary-label">Sites × Payees</div>
            <div className="wps-summary-value">
              {sheetData.sites?.length || 0} × {sheetData.payees?.length || 0}
            </div>
          </div>
        </div>
      )}

      {/* Sheet Selector Bar */}
      <div className="wps-sheet-bar">
        <FileSpreadsheet size={18} color="var(--accent)" />
        <select
          className="wps-sheet-select"
          value={selectedSheetId || ''}
          onChange={(e) => setSelectedSheetId(e.target.value ? parseInt(e.target.value) : null)}
        >
          <option value="">— Select a Sheet —</option>
          {sheets.map(s => (
            <option key={s.id} value={s.id}>
              {s.Title} ({new Date(s.WeekDate).toLocaleDateString('en-IN')})
            </option>
          ))}
        </select>

        {selectedSheetId && (
          <>
            {sheetData && getPendingTotal() > 0 && (
              <button className="wps-btn wps-btn-success wps-btn-sm" onClick={() => setShowPayModal('all')} style={{ background: '#4CAF50', color: 'white' }}>
                <CheckCircle2 size={14} /> Pay All
              </button>
            )}
            <button className="wps-btn wps-btn-secondary wps-btn-sm" onClick={() => setShowAddPayeeModal(true)}>
              <Users size={14} /> Add Payees
            </button>
            <button className="wps-btn wps-btn-secondary wps-btn-sm" onClick={() => setShowAddSiteModal(true)}>
              <Building2 size={14} /> Add Sites
            </button>
            <button 
              className="wps-btn wps-btn-sm" 
              onClick={handleImportAttendance} 
              disabled={importing}
              style={{ background: 'rgba(0,188,212,0.1)', color: '#00BCD4', border: '1px solid rgba(0,188,212,0.2)' }}
            >
              <Users size={14} /> {importing ? '...' : 'Import'}
            </button>
            <button className="wps-btn wps-btn-danger wps-btn-sm" onClick={handleDeleteSheet}>
              <Trash2 size={14} />
            </button>
          </>
        )}

        {/* Filters */}
        <div className="wps-filters">
          {['All', 'Pending', 'Paid'].map(f => (
            <button
              key={f}
              className={`wps-filter-chip ${statusFilter === f ? 'active' : ''}`}
              onClick={() => setStatusFilter(f)}
            >
              {f === 'Paid' && <CheckCircle2 size={12} />}
              {f === 'Pending' && <Clock size={12} />}
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid or Empty State */}
      {!selectedSheetId ? (
        <div className="wps-empty">
          <div className="wps-empty-icon">
            <Table2 size={36} />
          </div>
          <h3>No Sheet Selected</h3>
          <p>Select an existing weekly pay sheet or create a new one to start tracking payments.</p>
          <button className="wps-btn wps-btn-primary" onClick={() => setShowNewSheetModal(true)}>
            <Plus size={18} /> Create First Sheet
          </button>
        </div>
      ) : gridLoading ? (
        <div className="wps-loading">
          <Loader2 size={32} className="wps-spinner" />
        </div>
      ) : !sheetData?.payees?.length || !sheetData?.sites?.length ? (
        <div className="wps-empty">
          <div className="wps-empty-icon">
            <Table2 size={36} />
          </div>
          <h3>{!sheetData?.payees?.length && !sheetData?.sites?.length ? 'Empty Sheet' : 
               !sheetData?.sites?.length ? 'No Sites Added' : 'No Payees Added'}</h3>
          <p>
            {!sheetData?.payees?.length && !sheetData?.sites?.length 
              ? 'Add sites (columns) and payees (rows) to build your payment grid.'
              : !sheetData?.sites?.length 
                ? `${sheetData?.payees?.length} payee(s) added. Now add site columns to complete the grid.`
                : `${sheetData?.sites?.length} site(s) added. Now add payee rows to complete the grid.`}
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            {!sheetData?.sites?.length && (
              <button className="wps-btn wps-btn-secondary" onClick={() => setShowAddSiteModal(true)}>
                <Building2 size={18} /> Add Sites
              </button>
            )}
            {!sheetData?.payees?.length && (
              <button className="wps-btn wps-btn-primary" onClick={() => setShowAddPayeeModal(true)}>
                <Users size={18} /> Add Payees
              </button>
            )}
          </div>
        </div>
      ) : (
        /* ---- THE GRID ---- */
        <div className="wps-grid-wrapper">
          <table className="wps-grid">
            <thead>
              <tr>
                <th>Payee</th>
                {sheetData.sites.map(site => (
                  <th key={site.id}>
                    <div className="wps-site-header">
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', width: '100%' }}>
                        <span className="wps-site-name">{site.SiteName}</span>
                      </div>
                      {site.SiteValue > 0 && (
                        <span className="wps-site-value">₹{parseFloat(site.SiteValue).toLocaleString('en-IN')}</span>
                      )}
                    </div>
                  </th>
                ))}
                <th>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayees.map(payee => (
                <tr key={payee.id}>
                  {/* Payee Name */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: 16 }}></div> {/* Spacer for alignment */}
                      <div className="wps-payee-name">
                        <div className={`wps-payee-badge ${payee.Type}`}>
                          {payee.Name.charAt(0)}
                        </div>
                        <div>
                          <div className="wps-payee-label">{payee.Name}</div>
                          <div className="wps-payee-type">{payee.Type}</div>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Amount Cells */}
                  {sheetData.sites.map(site => {
                    const key = `${payee.id}_${site.id}`;
                    const cellData = sheetData.grid?.[key];
                    const isEditing = editingCell === key;
                    const amt = cellData?.amount || 0;
                    const isPaid = cellData?.status === 'Paid';

                    return (
                      <td key={site.id}>
                        {isEditing ? (
                          <input
                            ref={editInputRef}
                            type="number"
                            className="wps-cell-input"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleCellSave(payee.id, site.id)}
                            onKeyDown={(e) => handleCellKeyDown(e, payee.id, site.id)}
                          />
                        ) : (
                          <div
                            className={`wps-cell ${amt > 0 ? (isPaid ? 'paid' : 'pending has-value') : 'empty'}`}
                            onClick={() => handleCellClick(payee.id, site.id)}
                          >
                            {amt > 0 && (
                              <button
                                className={`wps-status-btn ${isPaid ? 'paid' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isPaid) {
                                    handleUnpay(cellData.id);
                                  } else {
                                    setShowPayModal(key);
                                  }
                                }}
                                title={isPaid ? 'Click to unpay' : 'Click to mark paid'}
                              >
                                {isPaid && <Check size={12} />}
                              </button>
                            )}
                            <span>{fmt(amt)}</span>
                          </div>
                        )}
                      </td>
                    );
                  })}

                  {/* Row Total */}
                  <td>{fmt(getRowTotal(payee.id))}</td>
                </tr>
              ))}

              {/* TOTAL Row */}
              <tr className="wps-total-row">
                <td>SITE TOTAL (EXPENSES)</td>
                {sheetData.sites.map(site => (
                  <td key={site.id}>{fmt(getColTotal(site.id))}</td>
                ))}
                <td>{fmt(getGrandTotal())}</td>
              </tr>

              {/* INCOME PAYMENT Row */}
              <tr className="wps-income-row">
                <td>CLIENT INCOME PAYMENT</td>
                {sheetData.sites.map(site => {
                  const key = `income_${site.id}`;
                  const cellData = sheetData.grid?.[key];
                  const isEditing = editingCell === key;
                  const incomeAmt = sheetData.incomeData?.[site.id] || 0;
                  const isPending = cellData?.status === 'Pending';
                  const displayAmt = isPending ? cellData.amount : incomeAmt;

                  return (
                    <td key={site.id}>
                      {isEditing ? (
                        <input
                          ref={editInputRef}
                          type="number"
                          className="wps-cell-input"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleCellSave(null, site.id)}
                          onKeyDown={(e) => handleCellKeyDown(e, null, site.id)}
                        />
                      ) : (
                        <div
                          className={`wps-cell ${displayAmt > 0 ? (isPending ? 'pending has-value' : 'paid') : 'empty'}`}
                          onClick={() => handleCellClick(null, site.id)}
                        >
                          {isPending && (
                            <button
                              className="wps-status-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowPayModal(key);
                              }}
                              title="Click to mark received"
                            >
                              <CheckCircle2 size={12} />
                            </button>
                          )}
                          {!isPending && displayAmt > 0 && cellData?.id && (
                            <button
                              className="wps-status-btn paid"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnpay(cellData.id);
                              }}
                              title="Click to revert collection"
                            >
                              <Check size={12} />
                            </button>
                          )}
                          <span>{fmt(displayAmt)}</span>
                        </div>
                      )}
                    </td>
                  );
                })}
                <td>{fmt(sheetData.sites.reduce((sum, site) => {
                  const key = `income_${site.id}`;
                  const cellData = sheetData.grid?.[key];
                  const pending = cellData?.status === 'Pending' ? cellData.amount : 0;
                  return sum + (sheetData.incomeData?.[site.id] || 0) + pending;
                }, 0))}</td>
              </tr>

              {/* BALANCE PAYMENT Row */}
              <tr className="wps-balance-row">
                <td>BALANCE PAYMENT</td>
                {sheetData.sites.map(site => {
                  const key = `income_${site.id}`;
                  const cellData = sheetData.grid?.[key];
                  const pending = cellData?.status === 'Pending' ? cellData.amount : 0;
                  const income = (sheetData.incomeData?.[site.id] || 0) + pending;
                  const siteValue = parseFloat(site.SiteValue) || 0;
                  const balance = income - siteValue;
                  return (
                    <td key={site.id} style={{ color: balance >= 0 ? '#4CAF50' : '#f44336' }}>
                      {fmt(balance)}
                    </td>
                  );
                })}
                <td>
                   {fmt(sheetData.sites.reduce((sum, site) => {
                     const key = `income_${site.id}`;
                     const cellData = sheetData.grid?.[key];
                     const pending = cellData?.status === 'Pending' ? cellData.amount : 0;
                     const income = (sheetData.incomeData?.[site.id] || 0) + pending;
                     const siteValue = parseFloat(site.SiteValue) || 0;
                     return sum + (income - siteValue);
                   }, 0))}
                </td>
              </tr>

              {/* GRAND TOTAL Row */}
              <tr className="wps-grand-total-row">
                <td>NET WEEKLY TALLY (Income - Expenses)</td>
                {sheetData.sites.map(site => {
                  const key = `income_${site.id}`;
                  const cellData = sheetData.grid?.[key];
                  const pending = cellData?.status === 'Pending' ? cellData.amount : 0;
                  const income = (sheetData.incomeData?.[site.id] || 0) + pending;
                  const expense = getColTotal(site.id);
                  const tally = income - expense;
                  return (
                    <td key={site.id} style={{ color: tally >= 0 ? '#4CAF50' : '#f44336' }}>
                      {fmt(tally)}
                    </td>
                  );
                })}
                <td>
                  {fmt(sheetData.sites.reduce((sum, site) => {
                    const key = `income_${site.id}`;
                    const cellData = sheetData.grid?.[key];
                    const pending = cellData?.status === 'Pending' ? cellData.amount : 0;
                    const income = (sheetData.incomeData?.[site.id] || 0) + pending;
                    const expense = getColTotal(site.id);
                    return sum + (income - expense);
                  }, 0))}
                </td>
              </tr>

            </tbody>
          </table>
        </div>
      )}

      {/* ==================== MODALS ==================== */}

      {/* New Sheet Modal */}
      {showNewSheetModal && (
        <div className="wps-modal-overlay" onClick={() => setShowNewSheetModal(false)}>
          <div className="wps-modal" onClick={e => e.stopPropagation()} style={{ height: 'fit-content', maxHeight: '90vh', overflowY: 'auto', margin: 'auto' }}>
            <h2>Create New Weekly Sheet</h2>
            <div className="wps-modal-field">
              <label>Sheet Title</label>
              <input
                ref={newSheetTitleRef}
                type="text"
                placeholder="e.g. Week 11.04.2026"
                value={newSheetForm.Title}
                onChange={e => setNewSheetForm({ ...newSheetForm, Title: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleCreateSheet()}
              />
            </div>
            <div className="wps-modal-field">
              <label>Week Date</label>
              <input
                type="date"
                value={newSheetForm.WeekDate}
                onChange={e => setNewSheetForm({ ...newSheetForm, WeekDate: e.target.value })}
              />
            </div>
            <div className="wps-modal-actions">
              <button className="wps-btn wps-btn-secondary" onClick={() => setShowNewSheetModal(false)}>Cancel</button>
              <button className="wps-btn wps-btn-primary" onClick={handleCreateSheet}>Create Sheet</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Payees Modal */}
      {showAddPayeeModal && (
        <div className="wps-modal-overlay" onClick={() => { setShowAddPayeeModal(false); setPayeeSearch(''); }}>
          <div className="wps-modal" onClick={e => e.stopPropagation()} style={{ height: 'fit-content', maxHeight: '90vh', overflowY: 'auto', margin: 'auto' }}>
            <h2>Add Payees to Sheet</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
              Select the payees you want to add as rows in this sheet.
            </p>
            <div style={{ marginBottom: 12 }}>
              <input 
                type="text" 
                placeholder="Search payees..." 
                value={payeeSearch}
                onChange={e => setPayeeSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontSize: '13px'
                }}
              />
            </div>
            <div className="wps-multi-select">
              {allPayees.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
                  No payees found. Create payees in the Payees page first.
                </div>
              ) : allPayees.filter(p => p.Name.toLowerCase().includes(payeeSearch.toLowerCase()) || p.Type.toLowerCase().includes(payeeSearch.toLowerCase())).map(p => {
                const isSelected = selectedPayeeIds.includes(p.id);
                const alreadyInSheet = sheetData?.payees?.some(sp => sp.id === p.id);
                return (
                  <div
                    key={p.id}
                    className="wps-multi-select-item"
                    onClick={() => {
                      setSelectedPayeeIds(prev =>
                        isSelected ? prev.filter(id => id !== p.id) : [...prev, p.id]
                      );
                    }}
                  >
                    <div className={`wps-checkbox ${isSelected ? 'checked' : ''}`}>
                      {isSelected && <Check size={12} color="#0F0F1A" />}
                    </div>
                    <div className={`wps-payee-badge ${p.Type}`} style={{ width: 24, height: 24, fontSize: 10 }}>
                      {p.Name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{p.Name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.Type}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="wps-modal-actions">
              <button className="wps-btn wps-btn-secondary" onClick={() => { setShowAddPayeeModal(false); setSelectedPayeeIds([]); setPayeeSearch(''); }}>Cancel</button>
              <button className="wps-btn wps-btn-primary" onClick={handleAddPayees}>
                Update Payees
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Sites Modal */}
      {showAddSiteModal && (
        <div className="wps-modal-overlay" onClick={() => { setShowAddSiteModal(false); setSiteSearch(''); }}>
          <div className="wps-modal" onClick={e => e.stopPropagation()} style={{ height: 'fit-content', maxHeight: '90vh', overflowY: 'auto', margin: 'auto' }}>
            <h2>Add Sites / Projects</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
              Select the site columns to add to this weekly sheet.
            </p>
            <div style={{ marginBottom: 12 }}>
              <input 
                type="text" 
                placeholder="Search sites..." 
                value={siteSearch}
                onChange={e => setSiteSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontSize: '13px'
                }}
              />
            </div>
            <div className="wps-multi-select">
              {allSites.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
                  No sites found. Create sites in the Sites page first.
                </div>
              ) : allSites.filter(s => s.SiteName.toLowerCase().includes(siteSearch.toLowerCase())).map(s => {
                const isSelected = selectedSiteIds.includes(s.id);
                const alreadyInSheet = sheetData?.sites?.some(ss => ss.id === s.id);
                return (
                  <div
                    key={s.id}
                    className="wps-multi-select-item"
                    onClick={() => {
                      setSelectedSiteIds(prev =>
                        isSelected ? prev.filter(id => id !== s.id) : [...prev, s.id]
                      );
                    }}
                  >
                    <div className={`wps-checkbox ${isSelected ? 'checked' : ''}`}>
                      {isSelected && <Check size={12} color="#0F0F1A" />}
                    </div>
                    <Building2 size={16} color="var(--text-muted)" />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{s.SiteName}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {s.SiteValue ? `₹${parseFloat(s.SiteValue).toLocaleString('en-IN')}` : 'No value set'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="wps-modal-actions">
              <button className="wps-btn wps-btn-secondary" onClick={() => { setShowAddSiteModal(false); setSelectedSiteIds([]); setSiteSearch(''); }}>Cancel</button>
              <button className="wps-btn wps-btn-primary" onClick={handleAddSites}>
                Update Sites
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Paid Modal */}
      {showPayModal && (
        <div className="wps-modal-overlay" onClick={() => setShowPayModal(null)}>
          <div className="wps-modal" onClick={e => e.stopPropagation()}>
            <h2>Mark as Paid</h2>
            {(() => {
              if (showPayModal === 'all') {
                return (
                  <div style={{
                    padding: 16,
                    borderRadius: 12,
                    background: 'rgba(76, 175, 80, 0.08)',
                    border: '1px solid rgba(76, 175, 80, 0.2)',
                    marginBottom: 20,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                        Pay All Pending
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#4CAF50' }}>
                        {fmt(getPendingTotal())}
                      </div>
                    </div>
                    <CheckCircle2 size={28} color="#4CAF50" />
                  </div>
                );
              }

              const cellData = sheetData?.grid?.[showPayModal];
              const isIncome = showPayModal.startsWith('income_');
              const payeeId = isIncome ? null : parseInt(showPayModal.split('_')[0]);
              const siteId = isIncome ? parseInt(showPayModal.split('_')[1]) : parseInt(showPayModal.split('_')[1]);
              const payee = isIncome ? { Name: 'Client' } : sheetData?.payees?.find(p => p.id === payeeId);
              const site = sheetData?.sites?.find(s => s.id === siteId);
              return (
                <>
                  <div style={{
                    padding: 16,
                    borderRadius: 12,
                    background: isIncome ? 'rgba(0, 200, 83, 0.08)' : 'rgba(76, 175, 80, 0.08)',
                    border: isIncome ? '1px solid rgba(0, 200, 83, 0.2)' : '1px solid rgba(76, 175, 80, 0.2)',
                    marginBottom: 20,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                        {isIncome ? `Collection for ${site?.SiteName}` : `${payee?.Name} → ${site?.SiteName}`}
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#4CAF50' }}>
                        ₹{parseFloat(cellData?.amount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <CheckCircle2 size={28} color="#4CAF50" />
                  </div>
                </>
              );
            })()}
            <div className="wps-modal-field">
              <label>Payment Date</label>
              <input
                type="date"
                value={payFormData.PaymentDate}
                onChange={e => setPayFormData({ ...payFormData, PaymentDate: e.target.value })}
              />
            </div>
            <div className="wps-modal-field">
              <label>Payment Mode</label>
              <select
                value={payFormData.PaymentMode}
                onChange={e => setPayFormData({ ...payFormData, PaymentMode: e.target.value })}
              >
                <option value="Cash">Cash</option>
                <option value="GPay">GPay</option>
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
            <div className="wps-modal-field">
              <label>Notes (optional)</label>
              <textarea
                rows={2}
                value={payFormData.Notes}
                onChange={e => setPayFormData({ ...payFormData, Notes: e.target.value })}
                placeholder="Any remarks..."
                style={{ resize: 'none' }}
              />
            </div>
            <div className="wps-modal-actions">
              <button className="wps-btn wps-btn-secondary" onClick={() => setShowPayModal(null)}>Cancel</button>
              <button className="wps-btn wps-btn-success" onClick={handleMarkPaid}>
                <Check size={16} /> Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyPaySheetPage;
