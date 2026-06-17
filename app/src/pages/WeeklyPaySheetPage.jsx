import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Table2, ChevronDown, Check, X, Loader2, Trash2,
  Calendar, CreditCard, FileSpreadsheet, Users, Building2,
  IndianRupee, Clock, CheckCircle2, AlertCircle, Package, Tag, RotateCcw
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
  const [splitMode, setSplitMode] = useState(false);
  const [splitAmount, setSplitAmount] = useState('');
  const [showExtraPaymentModal, setShowExtraPaymentModal] = useState(false);
  const [extraPayForm, setExtraPayForm] = useState({ SiteId: '', Amount: '', Description: '' });

  // Material Details & Discounts
  const [popupDiscounts, setPopupDiscounts] = useState({});
  const [purchaseDetailsOpen, setPurchaseDetailsOpen] = useState(true);
  const [savingPopupDiscounts, setSavingPopupDiscounts] = useState(false);
  const [toast, setToast] = useState(null); // { message, type }

  // Material Discount Popup
  const [materialPopup, setMaterialPopup] = useState(null); // { siteId, siteName }
  const [materialDiscounts, setMaterialDiscounts] = useState({}); // { [itemId]: discountValue }
  const [savingDiscounts, setSavingDiscounts] = useState(false);

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

  // Helper to parse/get purchase items for a supplier cell
  const getCellPurchaseItems = useCallback((cell, sId) => {
    if (!cell || !cell.sourceMaterialIds || !sheetData?.materialData?.[sId]?.items) return [];
    try {
      const ids = typeof cell.sourceMaterialIds === 'string' ? JSON.parse(cell.sourceMaterialIds) : cell.sourceMaterialIds;
      if (!Array.isArray(ids)) return [];
      return sheetData.materialData[sId].items.filter(item => ids.includes(item.id));
    } catch (e) {
      console.error('Failed to parse sourceMaterialIds', e);
      return [];
    }
  }, [sheetData]);

  // Sync popupDiscounts state when payment modal opens for a supplier cell
  useEffect(() => {
    if (showPayModal && showPayModal !== 'all') {
      const cellData = sheetData?.grid?.[showPayModal];
      if (cellData && cellData.sourceType === 'Material') {
        const siteId = parseInt(showPayModal.split('_')[1]);
        const items = getCellPurchaseItems(cellData, siteId);
        const initDiscounts = {};
        items.forEach(it => {
          initDiscounts[it.id] = it.discount;
        });
        setPopupDiscounts(initDiscounts);
        setPurchaseDetailsOpen(true);
      }
    } else {
      setPopupDiscounts({});
    }
  }, [showPayModal, sheetData, getCellPurchaseItems]);

  // Toast Helper
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Toast Auto-clear
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Undo triggers
  const triggerUndo = async () => {
    if (!selectedSheetId) return;
    try {
      const res = await api.post('/undo/latest', { WeeklyPaySheetId: selectedSheetId });
      showToast(res.data.msg || 'Action undone successfully!', 'success');
      fetchSheetData(selectedSheetId);
      fetchSheets();
    } catch (err) {
      console.error('Undo error:', err);
      showToast(err.response?.data?.msg || 'Nothing to undo', 'error');
    }
  };

  // Ctrl+Z handler
  useEffect(() => {
    const handleKeyDown = async (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
          return;
        }
        e.preventDefault();
        await triggerUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSheetId]);

  // Update discounts inside the payment popup
  const handleSavePopupDiscounts = async (items) => {
    setSavingPopupDiscounts(true);
    try {
      const updates = items.map(item => {
        const disc = parseFloat(popupDiscounts[item.id]) || 0;
        return api.patch(`/site-materials/${item.id}/discount`, { Discount: disc });
      });
      await Promise.all(updates);
      // Refresh sheet data: will automatically sync dealer cell amounts
      await fetchSheetData(selectedSheetId);
      showToast('Discounts updated successfully', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.msg || 'Failed to update discounts', 'error');
    } finally {
      setSavingPopupDiscounts(false);
    }
  };

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

  const handleCloseWeek = async () => {
    if (!selectedSheetId) return;
    if (!window.confirm("Are you sure you want to CLOSE this weekly sheet? Closing the sheet will calculate weekly profits/losses, snapshot it to Petty Cash ledger, and lock the sheet from edits. This cannot be undone.")) return;
    try {
      const res = await api.post(`/petty-cash/close-week/${selectedSheetId}`);
      alert(res.data.msg);
      fetchSheetData(selectedSheetId);
      fetchSheets();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to close week');
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
    if (sheetData?.sheet?.Status === 'Closed') return;
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
    if (sheetData?.sheet?.Status === 'Closed') return;
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
    if (sheetData?.sheet?.Status === 'Closed') return; // Read-only
    const key = payeeId ? `${payeeId}_${siteId}` : `income_${siteId}`;
    const cellData = sheetData?.grid?.[key];

    const payee = sheetData?.payees?.find(p => p.id === payeeId);
    if (payee?.Type === 'Supplier') {
      if (cellData && cellData.amount > 0) {
        setShowPayModal(key);
      }
      return;
    }

    if (cellData?.status === 'Paid') return; // Don't edit paid cells
    setEditingCell(key);
    setEditValue(cellData?.amount > 0 ? String(cellData.amount) : '');
  };

  const handleCellSave = async (payeeId, siteId) => {
    if (sheetData?.sheet?.Status === 'Closed') return;
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
    if (sheetData?.sheet?.Status === 'Closed') return;
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

  const handleSkipItem = async (itemId) => {
    if (!window.confirm('Skip this payment to next week? The full amount will be carried over.')) return;
    try {
      await api.post(`/weekly-pay-sheets/items/${itemId}/skip`);
      setShowPayModal(null);
      fetchSheetData(selectedSheetId);
      fetchSheets();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to skip');
    }
  };

  const handleSplitPay = async (itemId) => {
    const amt = parseFloat(splitAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid partial amount');
      return;
    }
    try {
      await api.post(`/weekly-pay-sheets/items/${itemId}/split-pay`, {
        PaidAmount: amt,
        PaymentDate: payFormData.PaymentDate,
        PaymentMode: payFormData.PaymentMode,
        Notes: payFormData.Notes
      });
      setShowPayModal(null);
      setSplitMode(false);
      setSplitAmount('');
      setPayFormData({ PaymentDate: new Date().toISOString().split('T')[0], PaymentMode: 'Cash', Notes: '' });
      fetchSheetData(selectedSheetId);
      fetchSheets();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to process split payment');
    }
  };

  const handleAddExtraPayment = async (e) => {
    e.preventDefault();
    if (!extraPayForm.SiteId || !extraPayForm.Amount || parseFloat(extraPayForm.Amount) <= 0) {
      alert('Please select a site and enter a valid amount');
      return;
    }
    try {
      await api.post(`/weekly-pay-sheets/${selectedSheetId}/extra-payment`, {
        SiteId: parseInt(extraPayForm.SiteId),
        Amount: parseFloat(extraPayForm.Amount),
        Description: extraPayForm.Description
      });
      setShowExtraPaymentModal(false);
      setExtraPayForm({ SiteId: '', Amount: '', Description: '' });
      fetchSheetData(selectedSheetId);
      fetchSheets();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to add extra payment');
    }
  };

  // ---- Computed Values ----
  const getRowTotal = (payeeId) => {
    if (!sheetData?.grid || !sheetData?.sites) return 0;
    return sheetData.sites.reduce((sum, site) => {
      const key = `${payeeId}_${site.id}`;
      const cell = sheetData.grid[key];
      // Exclude skipped items from row total
      if (cell?.isSkipped) return sum;
      return sum + (cell?.amount || 0);
    }, 0);
  };

  const getColTotal = (siteId) => {
    if (!sheetData?.grid || !sheetData?.payees) return 0;
    return sheetData.payees.reduce((sum, payee) => {
      const key = `${payee.id}_${siteId}`;
      const cell = sheetData.grid[key];
      // Exclude skipped items from col total
      if (cell?.isSkipped) return sum;
      return sum + (cell?.amount || 0);
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

  // ---- Material Helpers ----
  const getMaterialNet = (siteId) => sheetData?.materialData?.[siteId]?.net || 0;
  const getMaterialGross = (siteId) => sheetData?.materialData?.[siteId]?.gross || 0;
  const getMaterialDiscount = (siteId) => sheetData?.materialData?.[siteId]?.discount || 0;
  const getTotalMaterialNet = () =>
    (sheetData?.sites || []).reduce((sum, s) => sum + getMaterialNet(s.id), 0);
  const getTotalMaterialGross = () =>
    (sheetData?.sites || []).reduce((sum, s) => sum + getMaterialGross(s.id), 0);
  const getTotalMaterialDiscount = () =>
    (sheetData?.sites || []).reduce((sum, s) => sum + getMaterialDiscount(s.id), 0);

  // ---- Material Discount Save ----
  const openMaterialPopup = (siteId, siteName) => {
    if (sheetData?.sheet?.Status === 'Closed') return;
    const items = sheetData?.materialData?.[siteId]?.items || [];
    if (items.length === 0) return;
    // Pre-fill discount inputs with existing values
    const initDiscounts = {};
    items.forEach(it => { initDiscounts[it.id] = it.discount; });
    setMaterialDiscounts(initDiscounts);
    setMaterialPopup({ siteId, siteName });
  };

  const handleSaveDiscounts = async () => {
    setSavingDiscounts(true);
    try {
      const updates = Object.entries(materialDiscounts).map(([itemId, discount]) =>
        api.patch(`/site-materials/${itemId}/discount`, { Discount: parseFloat(discount) || 0 })
      );
      await Promise.all(updates);
      setMaterialPopup(null);
      setMaterialDiscounts({});
      fetchSheetData(selectedSheetId);
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to save discounts');
    } finally {
      setSavingDiscounts(false);
    }
  };

  // ---- Filter payees ----
  const getFilteredPayees = () => {
    if (!sheetData?.payees) return [];
    
    let list = sheetData.payees;
    if (statusFilter === 'Labour') {
      list = list.filter(payee => payee.Type !== 'Supplier');
    } else if (statusFilter === 'Supplier') {
      list = list.filter(payee => payee.Type === 'Supplier');
    }

    if (statusFilter === 'All' || statusFilter === 'Labour' || statusFilter === 'Supplier') {
      return list;
    }

    return list.filter(payee => {
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
            <div className="wps-summary-label">Payee Total</div>
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
          <div className="wps-summary-card material">
            <div className="wps-summary-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Package size={12} /> Material Cost
            </div>
            <div className="wps-summary-value" style={{ color: '#9C27B0' }}>{fmt(getTotalMaterialNet()) || '—'}</div>
            {getTotalMaterialDiscount() > 0 && (
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: 2 }}>
                Gross {fmt(getTotalMaterialGross())} · Saved {fmt(getTotalMaterialDiscount())}
              </div>
            )}
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
            {sheetData?.sheet?.Status === 'Closed' ? (
              <span style={{
                background: 'rgba(244, 67, 54, 0.12)',
                color: '#F44336',
                border: '1px solid rgba(244, 67, 54, 0.25)',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                🔒 Archived (Closed)
              </span>
            ) : (
              <>
                {sheetData && getPendingTotal() > 0 && (
                  <button className="wps-btn wps-btn-success wps-btn-sm" onClick={() => setShowPayModal('all')} style={{ background: '#4CAF50', color: 'white' }}>
                    <CheckCircle2 size={14} /> Pay All
                  </button>
                )}
                <button 
                  className="wps-btn wps-btn-secondary wps-btn-sm" 
                  onClick={triggerUndo}
                  title="Undo last action (Ctrl+Z)"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <RotateCcw size={14} /> Undo
                </button>
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
                <button 
                  className="wps-btn wps-btn-sm"
                  onClick={handleCloseWeek}
                  style={{ background: 'rgba(255, 152, 0, 0.15)', color: '#FF9800', border: '1px solid rgba(255, 152, 0, 0.3)' }}
                >
                  🔒 Close Week
                </button>
                <button className="wps-btn wps-btn-danger wps-btn-sm" onClick={handleDeleteSheet}>
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </>
        )}

        {/* Filters */}
        <div className="wps-filters">
          {['All', 'Labour', 'Supplier', 'Pending', 'Paid'].map(f => (
            <button
              key={f}
              className={`wps-filter-chip ${statusFilter === f ? 'active' : ''}`}
              onClick={() => setStatusFilter(f)}
            >
              {f === 'Paid' && <CheckCircle2 size={12} />}
              {f === 'Pending' && <Clock size={12} />}
              {f === 'Labour' && <Users size={12} />}
              {f === 'Supplier' && <Package size={12} />}
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
                      {site.Client && (
                        <span className="wps-site-value" style={{ color: '#00BCD4', fontSize: '10px' }}>
                          {site.Client.Name}
                        </span>
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
                    const isSkipped = cellData?.isSkipped;

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
                            className={`wps-cell ${amt > 0 ? (isPaid ? 'paid' : (isSkipped ? 'skipped' : 'pending has-value')) : 'empty'}`}
                            onClick={() => !isSkipped && handleCellClick(payee.id, site.id)}
                            style={isSkipped ? {
                              background: 'rgba(255, 152, 0, 0.08)',
                              border: '1px dashed rgba(255, 152, 0, 0.4)',
                              color: '#FF9800',
                              fontSize: '11px',
                              cursor: 'not-allowed',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              alignItems: 'center',
                              minHeight: '38px'
                            } : undefined}
                          >
                            {isSkipped ? (
                              <>
                                <span style={{ fontWeight: 700 }}>SKIPPED</span>
                                <span style={{ fontSize: 9 }}>{fmt(amt)}</span>
                              </>
                            ) : (
                              <>
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
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}

                  {/* Row Total */}
                  <td>{fmt(getRowTotal(payee.id))}</td>
                </tr>
              ))}

              {/* EXTRA BILLABLES Row */}
              <tr className="wps-extra-row" style={{ background: 'rgba(76, 175, 80, 0.05)' }}>
                <td style={{ fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px' }}>
                    <span>EXTRA BILLABLES</span>
                    <button
                      className="wps-btn wps-btn-xs"
                      style={{ padding: '2px 6px', fontSize: 10, background: '#4CAF50', color: 'white', borderRadius: 4, border: 'none', cursor: 'pointer' }}
                      onClick={() => {
                        setExtraPayForm({ SiteId: '', Amount: '', Description: '' });
                        setShowExtraPaymentModal(true);
                      }}
                    >
                      + Add
                    </button>
                  </div>
                </td>
                {sheetData.sites.map(site => {
                  const siteExtra = sheetData.extraPaymentData?.[site.id];
                  const totalExtra = siteExtra?.total || 0;
                  return (
                    <td key={site.id} style={{ cursor: 'pointer' }} onClick={() => {
                      setExtraPayForm({ SiteId: String(site.id), Amount: '', Description: '' });
                      setShowExtraPaymentModal(true);
                    }}>
                      <div className="wps-cell" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '38px' }}>
                        <span style={{ fontWeight: 700, color: totalExtra > 0 ? '#4CAF50' : 'var(--text-muted)' }}>
                          {fmt(totalExtra)}
                        </span>
                        {siteExtra?.items?.length > 0 && (
                          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                            ({siteExtra.items.length} items)
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
                <td>
                  {fmt(sheetData.sites.reduce((sum, site) => sum + (sheetData.extraPaymentData?.[site.id]?.total || 0), 0))}
                </td>
              </tr>
              {/* SITE TOTAL (EXPENSES) Row */}
              <tr className="wps-total-row">
                <td>SITE TOTAL (EXPENSES)</td>
                {sheetData.sites.map(site => {
                  const totalExpense = getColTotal(site.id) + (sheetData.extraPaymentData?.[site.id]?.total || 0);
                  return (
                    <td key={site.id}>{fmt(totalExpense)}</td>
                  );
                })}
                <td>
                  {fmt(getGrandTotal() + sheetData.sites.reduce((sum, site) => sum + (sheetData.extraPaymentData?.[site.id]?.total || 0), 0))}
                </td>
              </tr>

              {/* QUOTED AMOUNT (SITE TOTAL VALUE) Row */}
              <tr className="wps-quoted-row" style={{ background: 'rgba(0, 188, 212, 0.05)', borderTop: '2px solid rgba(0, 188, 212, 0.2)' }}>
                <td style={{ fontWeight: 700, color: '#00BCD4' }}>TOTAL SITE QUOTED VALUE</td>
                {sheetData.sites.map(site => (
                  <td key={site.id} style={{ fontWeight: 700, color: '#00BCD4' }}>
                    {fmt(site.SiteValue)}
                  </td>
                ))}
                <td style={{ fontWeight: 700, color: '#00BCD4' }}>
                  {fmt(sheetData.sites.reduce((sum, site) => sum + parseFloat(site.SiteValue || 0), 0))}
                </td>
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
                          style={{ minHeight: '38px' }}
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
                  
                  // Cumulative income up to this week's end date
                  const cumulativeCollected = sheetData.cumulativeIncomeData?.[site.id] || 0;
                  const projectedCumulativeIncome = cumulativeCollected + pending;
                  
                  const siteValue = parseFloat(site.SiteValue) || 0;
                  const balance = siteValue - projectedCumulativeIncome;
                  
                  return (
                    <td key={site.id} style={{ color: balance <= 0 ? '#4CAF50' : '#FF9800' }}>
                      {fmt(balance)}
                    </td>
                  );
                })}
                <td>
                   {fmt(sheetData.sites.reduce((sum, site) => {
                     const key = `income_${site.id}`;
                     const cellData = sheetData.grid?.[key];
                     const pending = cellData?.status === 'Pending' ? cellData.amount : 0;
                     const cumulativeCollected = sheetData.cumulativeIncomeData?.[site.id] || 0;
                     const projectedCumulativeIncome = cumulativeCollected + pending;
                     const siteValue = parseFloat(site.SiteValue) || 0;
                     return sum + (siteValue - projectedCumulativeIncome);
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
                  const expense = getColTotal(site.id) + (sheetData.extraPaymentData?.[site.id]?.total || 0);
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
                    const expense = getColTotal(site.id) + (sheetData.extraPaymentData?.[site.id]?.total || 0);
                    return sum + (income - expense);
                  }, 0))}
                </td>
              </tr>

            </tbody>
          </table>
        </div>
      )}

      {/* ==================== MATERIAL DISCOUNT POPUP ==================== */}
      {materialPopup && (() => {
        const { siteId, siteName } = materialPopup;
        const items = sheetData?.materialData?.[siteId]?.items || [];
        const totalGross = items.reduce((s, it) => s + it.gross, 0);
        const totalDiscount = items.reduce((s, it) => s + (parseFloat(materialDiscounts[it.id]) || 0), 0);
        const totalNet = Math.max(0, totalGross - totalDiscount);
        return (
          <div className="wps-modal-overlay" onClick={() => setMaterialPopup(null)}>
            <div className="wps-material-popup" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Package size={18} color="#9C27B0" />
                  <h3 style={{ margin: 0, fontSize: 16 }}>Materials — {siteName}</h3>
                </div>
                <button onClick={() => setMaterialPopup(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                <Tag size={11} style={{ marginRight: 4 }} />
                Enter any negotiated discount per item. Net amount will flow into the weekly sheet totals.
              </p>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '8px 6px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Material</th>
                      <th style={{ padding: '8px 6px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Dealer</th>
                      <th style={{ padding: '8px 6px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>Bill (₹)</th>
                      <th style={{ padding: '8px 6px', textAlign: 'center', color: '#FF9800', fontWeight: 600 }}>Discount (₹)</th>
                      <th style={{ padding: '8px 6px', textAlign: 'right', color: '#9C27B0', fontWeight: 600 }}>Net (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => {
                      const disc = parseFloat(materialDiscounts[item.id]) || 0;
                      const net = Math.max(0, item.gross - disc);
                      const isOver = disc > item.gross;
                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '10px 6px' }}>
                            <div style={{ fontWeight: 600 }}>{item.materialName}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.quantity} {item.unit}</div>
                          </td>
                          <td style={{ padding: '10px 6px', color: 'var(--text-secondary)', fontSize: 12 }}>{item.dealerName}</td>
                          <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 500 }}>₹{item.gross.toLocaleString('en-IN')}</td>
                          <td style={{ padding: '10px 6px' }}>
                            <input
                              type="number"
                              min="0"
                              max={item.gross}
                              value={materialDiscounts[item.id] ?? 0}
                              onChange={e => setMaterialDiscounts(prev => ({ ...prev, [item.id]: e.target.value }))}
                              style={{
                                width: '100%',
                                backgroundColor: 'var(--bg-input)',
                                border: `1px solid ${isOver ? '#f44336' : 'rgba(255,152,0,0.4)'}`,
                                borderRadius: 6,
                                padding: '6px 8px',
                                color: isOver ? '#f44336' : '#FF9800',
                                textAlign: 'right',
                                outline: 'none',
                                fontSize: 13
                              }}
                            />
                            {isOver && <div style={{ fontSize: 10, color: '#f44336', marginTop: 2 }}>Exceeds bill amount!</div>}
                          </td>
                          <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700, color: '#9C27B0' }}>
                            ₹{net.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid rgba(156,39,176,0.25)', background: 'rgba(156,39,176,0.05)' }}>
                      <td colSpan={2} style={{ padding: '10px 6px', fontWeight: 700 }}>TOTAL</td>
                      <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700 }}>₹{totalGross.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700, color: '#FF9800' }}>
                        {totalDiscount > 0 ? `-₹${totalDiscount.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 800, color: '#9C27B0', fontSize: 15 }}>
                        ₹{totalNet.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <button
                  onClick={() => setMaterialPopup(null)}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDiscounts}
                  disabled={savingDiscounts}
                  style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: '#9C27B0', color: 'white', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  {savingDiscounts ? <Loader2 size={16} className="wps-spinner" /> : <Check size={16} />}
                  {savingDiscounts ? 'Saving...' : 'Save Discounts'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
        <div className="wps-modal-overlay" onClick={() => { setShowPayModal(null); setSplitMode(false); setSplitAmount(''); }}>
          <div className="wps-modal" onClick={e => e.stopPropagation()} style={{ width: '520px', maxWidth: '95vw', height: 'fit-content', maxHeight: '90vh', overflowY: 'auto', margin: 'auto' }}>
            {(() => {
              if (showPayModal === 'all') {
                return (
                  <>
                    <h2>Confirm Payment</h2>
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
                  </>
                );
              }

              const cellData = sheetData?.grid?.[showPayModal];
              const isIncome = showPayModal.startsWith('income_');
              const payeeId = isIncome ? null : parseInt(showPayModal.split('_')[0]);
              const siteId = isIncome ? parseInt(showPayModal.split('_')[1]) : parseInt(showPayModal.split('_')[1]);
              const payee = isIncome ? { Name: 'Client' } : sheetData?.payees?.find(p => p.id === payeeId);
              const site = sheetData?.sites?.find(s => s.id === siteId);
              const isPaid = cellData?.status === 'Paid';
              const purchaseItems = getCellPurchaseItems(cellData, siteId);

              return (
                <>
                  <h2>{isPaid ? 'Payment Details' : (splitMode ? 'Partial Payment' : 'Confirm Payment')}</h2>
                  
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

                  {/* Purchase Details Section for Supplier items */}
                  {cellData?.sourceType === 'Material' && purchaseItems.length > 0 && (
                    <div className="wps-popup-purchase-details" style={{ marginBottom: 20 }}>
                      <button
                        type="button"
                        className="wps-details-toggle"
                        onClick={() => setPurchaseDetailsOpen(!purchaseDetailsOpen)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          width: '100%',
                          background: 'rgba(156, 39, 176, 0.08)',
                          border: '1px solid rgba(156, 39, 176, 0.2)',
                          borderRadius: 10,
                          padding: '10px 14px',
                          color: '#CE93D8',
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: 700,
                          marginBottom: purchaseDetailsOpen ? 12 : 0,
                          outline: 'none'
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Package size={14} /> 📦 Purchase Details ({purchaseItems.length})
                        </span>
                        <ChevronDown
                          size={16}
                          style={{ transform: purchaseDetailsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                        />
                      </button>
                      {purchaseDetailsOpen && (
                        <div className="wps-details-content" style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, background: 'rgba(0,0,0,0.2)' }}>
                          <table className="wps-details-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                <th style={{ textAlign: 'left', padding: '6px 4px', color: 'var(--text-muted)' }}>Item</th>
                                <th style={{ textAlign: 'right', padding: '6px 4px', color: 'var(--text-muted)' }}>Bill</th>
                                <th style={{ textAlign: 'center', padding: '6px 4px', color: '#FF9800' }}>Discount</th>
                                <th style={{ textAlign: 'right', padding: '6px 4px', color: '#9C27B0' }}>Net</th>
                              </tr>
                            </thead>
                            <tbody>
                              {purchaseItems.map(item => {
                                const disc = popupDiscounts[item.id] ?? item.discount;
                                const net = Math.max(0, item.gross - (parseFloat(disc) || 0));
                                return (
                                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '8px 4px' }}>
                                      <div style={{ fontWeight: 600 }}>{item.materialName}</div>
                                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.quantity} {item.unit}</div>
                                    </td>
                                    <td style={{ textAlign: 'right', padding: '8px 4px' }}>₹{item.gross.toLocaleString('en-IN')}</td>
                                    <td style={{ padding: '8px 4px', width: 100 }}>
                                      <input
                                        type="number"
                                        min="0"
                                        max={item.gross}
                                        value={disc}
                                        disabled={isPaid}
                                        onChange={e => setPopupDiscounts(prev => ({ ...prev, [item.id]: e.target.value }))}
                                        style={{
                                          width: '100%',
                                          background: 'var(--bg-input)',
                                          border: '1px solid rgba(255,152,0,0.3)',
                                          borderRadius: 6,
                                          padding: '4px 6px',
                                          color: '#FF9800',
                                          textAlign: 'right',
                                          fontSize: 12
                                        }}
                                      />
                                    </td>
                                    <td style={{ textAlign: 'right', padding: '8px 4px', fontWeight: 700, color: '#9C27B0' }}>
                                      ₹{net.toLocaleString('en-IN')}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          {!isPaid && (
                            <button
                              type="button"
                              className="wps-btn wps-btn-secondary wps-btn-xs"
                              onClick={() => handleSavePopupDiscounts(purchaseItems)}
                              disabled={savingPopupDiscounts}
                              style={{ marginTop: 10, width: '100%', padding: '6px', fontSize: 11, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}
                            >
                              {savingPopupDiscounts ? <Loader2 size={12} className="wps-spinner" /> : <Check size={12} />}
                              Update & Re-calculate Discounts
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {isPaid ? (
                    <div style={{
                      background: 'rgba(76, 175, 80, 0.08)',
                      border: '1px solid rgba(76, 175, 80, 0.2)',
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 20
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Paid On</div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                            {cellData.paymentDate ? new Date(cellData.paymentDate).toLocaleDateString('en-IN') : '—'}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Payment Mode</div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                            {cellData.paymentMode || '—'}
                          </div>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <div style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Notes</div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                            {cellData.paymentNotes || '—'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Split Pay option for single payee cells */}
                      {!isIncome && (
                        <div style={{ marginBottom: 16 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                            <input
                              type="checkbox"
                              checked={splitMode}
                              onChange={(e) => {
                                  setSplitMode(e.target.checked);
                                  if (!e.target.checked) setSplitAmount('');
                              }}
                              style={{ width: 'auto', margin: 0 }}
                            />
                            Split Payment / Pay Partial Amount
                          </label>
                        </div>
                      )}

                      {splitMode && (
                        <div className="wps-modal-field">
                          <label>Amount to Pay Now (₹)</label>
                          <input
                            type="number"
                            placeholder="Enter partial amount"
                            value={splitAmount}
                            onChange={e => setSplitAmount(e.target.value)}
                          />
                        </div>
                      )}

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
                    </>
                  )}

                  <div className="wps-modal-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      {/* Skip button on the left for non-all payee pending payments */}
                      {!isIncome && !isPaid && (
                        <button
                          className="wps-btn wps-btn-warning"
                          type="button"
                          onClick={() => {
                            if (cellData) handleSkipItem(cellData.id);
                          }}
                          style={{ background: '#FF9800', color: 'white' }}
                        >
                          SKIP
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="wps-btn wps-btn-secondary" onClick={() => { setShowPayModal(null); setSplitMode(false); setSplitAmount(''); }}>
                        {isPaid ? 'Close' : 'Cancel'}
                      </button>
                      {isPaid ? (
                        <button
                          className="wps-btn wps-btn-danger"
                          onClick={() => {
                            setShowPayModal(null);
                            handleUnpay(cellData.id);
                          }}
                        >
                          Revert Payment
                        </button>
                      ) : splitMode ? (
                        <button
                          className="wps-btn wps-btn-success"
                          onClick={() => {
                            if (cellData) handleSplitPay(cellData.id);
                          }}
                        >
                          Split & Pay
                        </button>
                      ) : (
                        <button className="wps-btn wps-btn-success" onClick={handleMarkPaid}>
                          <Check size={16} /> Confirm Payment
                        </button>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Extra Payment Modal */}
      {showExtraPaymentModal && (
        <div className="wps-modal-overlay" onClick={() => setShowExtraPaymentModal(false)}>
          <div className="wps-modal" onClick={e => e.stopPropagation()}>
            <h2>Add Extra Payment</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
              Add a client-billable extra cost for the selected site (e.g. additional works, materials bought outside quotation).
            </p>
            <form onSubmit={handleAddExtraPayment}>
              <div className="wps-modal-field">
                <label>Select Site</label>
                <select
                  value={extraPayForm.SiteId}
                  onChange={e => setExtraPayForm({ ...extraPayForm, SiteId: e.target.value })}
                  required
                >
                  <option value="">— Select Site —</option>
                  {sheetData?.sites?.map(s => (
                    <option key={s.id} value={s.id}>{s.SiteName}</option>
                  ))}
                </select>
              </div>
              <div className="wps-modal-field">
                <label>Amount (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  value={extraPayForm.Amount}
                  onChange={e => setExtraPayForm({ ...extraPayForm, Amount: e.target.value })}
                  required
                />
              </div>
              <div className="wps-modal-field">
                <label>Description / Work Details</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Centering extra wood work, tiles extra design charges"
                  value={extraPayForm.Description}
                  onChange={e => setExtraPayForm({ ...extraPayForm, Description: e.target.value })}
                  style={{ resize: 'none' }}
                  required
                />
              </div>
              <div className="wps-modal-actions">
                <button type="button" className="wps-btn wps-btn-secondary" onClick={() => setShowExtraPaymentModal(false)}>Cancel</button>
                <button type="submit" className="wps-btn wps-btn-primary">Add Extra Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`wps-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default WeeklyPaySheetPage;
