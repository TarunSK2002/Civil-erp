import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, ChevronDown, Check, HardHat } from 'lucide-react';
import api from '../api/axios';

const fmt = (num) => {
  if (!num && num !== 0) return '—';
  return '₹' + parseFloat(num).toLocaleString('en-IN');
};

const LabourReportView = ({ sites }) => {
  const [labours, setLabours] = useState([]);
  const [selectedLabourId, setSelectedLabourId] = useState('');
  const [scope, setScope] = useState('specific'); // specific | multiple | overall
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [selectedSiteIds, setSelectedSiteIds] = useState([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSiteDropdown, setShowSiteDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchLabours();
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowSiteDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchLabours = async () => {
    try {
      const res = await api.get('/labours');
      setLabours(res.data);
    } catch (err) { console.error(err); }
  };

  const handleGenerate = async () => {
    if (!selectedLabourId) return alert('Please select a labour');
    setLoading(true);
    try {
      let siteParam = 'all';
      if (scope === 'specific' && selectedSiteId) siteParam = selectedSiteId;
      else if (scope === 'multiple' && selectedSiteIds.length > 0) siteParam = selectedSiteIds.join(',');

      const params = new URLSearchParams();
      params.append('siteIds', siteParam);
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);

      const res = await api.get(`/reports/labour/${selectedLabourId}?${params.toString()}`);
      setReportData(res.data);
    } catch (err) {
      console.error(err);
      alert('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const toggleSiteId = (id) => {
    setSelectedSiteIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <>
      {/* Controls */}
      <div className="report-controls" style={{ flexWrap: 'wrap', gap: 14 }}>
        <span className="report-label">Labour:</span>
        <select className="report-select" value={selectedLabourId} onChange={e => { setSelectedLabourId(e.target.value); setReportData(null); }}>
          <option value="">— Select Labour —</option>
          {labours.map(l => <option key={l.id} value={l.id}>{l.Name} ({l.LabourType})</option>)}
        </select>
      </div>

      <div className="report-controls" style={{ flexWrap: 'wrap', gap: 14 }}>
        <span className="report-label">Scope:</span>
        <div className="report-scope-group">
          {[{ key: 'specific', label: 'Specific Site' }, { key: 'multiple', label: 'Multiple Sites' }, { key: 'overall', label: 'Overall' }].map(s => (
            <div key={s.key} className={`report-scope-radio ${scope === s.key ? 'active' : ''}`} onClick={() => { setScope(s.key); setReportData(null); }}>
              <div className={`report-scope-dot ${scope === s.key ? 'active' : ''}`}></div>
              {s.label}
            </div>
          ))}
        </div>
      </div>

      {scope === 'specific' && (
        <div className="report-controls">
          <span className="report-label">Site:</span>
          <select className="report-select" value={selectedSiteId} onChange={e => setSelectedSiteId(e.target.value)}>
            <option value="">— All Sites —</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.SiteName}</option>)}
          </select>
        </div>
      )}

      {scope === 'multiple' && (
        <div className="report-controls">
          <span className="report-label">Sites:</span>
          <div className="report-multi-select" ref={dropdownRef}>
            <div className="report-multi-trigger" onClick={() => setShowSiteDropdown(!showSiteDropdown)}>
              <span style={{ color: selectedSiteIds.length ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {selectedSiteIds.length ? `${selectedSiteIds.length} site(s) selected` : 'Select sites...'}
              </span>
              <ChevronDown size={16} />
            </div>
            {showSiteDropdown && (
              <div className="report-multi-dropdown">
                {sites.map(s => (
                  <div key={s.id} className="report-multi-option" onClick={() => toggleSiteId(s.id)}>
                    <div className={`report-checkbox ${selectedSiteIds.includes(s.id) ? 'checked' : ''}`}>
                      {selectedSiteIds.includes(s.id) && <Check size={11} color="#0F0F1A" />}
                    </div>
                    {s.SiteName}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="report-controls">
        <span className="report-label">From:</span>
        <input type="date" className="report-input" value={fromDate} onChange={e => setFromDate(e.target.value)} />
        <span className="report-label" style={{ marginLeft: 8 }}>To:</span>
        <input type="date" className="report-input" value={toDate} onChange={e => setToDate(e.target.value)} />
        <button className="report-btn-generate" onClick={handleGenerate} disabled={loading} style={{ marginLeft: 8 }}>
          {loading ? <Loader2 size={16} className="report-spinner" /> : <Search size={16} />}
          Generate Report
        </button>
      </div>

      {/* Empty State */}
      {!reportData && !loading && (
        <div className="report-empty">
          <div className="report-empty-icon"><HardHat size={28} /></div>
          <h3>Select a Labour</h3>
          <p>Choose a labour person, set scope & date range, then click Generate Report.</p>
        </div>
      )}

      {loading && <div className="report-loading"><Loader2 size={32} className="report-spinner" /></div>}

      {/* Results */}
      {reportData && !loading && (
        <div className="report-content">
          {/* Labour Summary Card */}
          <div className="labour-summary-card">
            <div className="labour-summary-avatar">{reportData.labour.name.charAt(0)}</div>
            <div className="labour-summary-info">
              <h2>{reportData.labour.name}</h2>
              <span className="type-badge">{reportData.labour.type}</span>
              {reportData.labour.mobile && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 10 }}>{reportData.labour.mobile}</span>}
            </div>
            <div className="labour-summary-stats">
              <div className="labour-stat">
                <div className="stat-value">{fmt(reportData.grandTotal)}</div>
                <div className="stat-label">Total Paid</div>
              </div>
              <div className="labour-stat">
                <div className="stat-value">{reportData.totalPayments}</div>
                <div className="stat-label">Payments</div>
              </div>
              <div className="labour-stat">
                <div className="stat-value">{reportData.siteBreakdown.length}</div>
                <div className="stat-label">Sites</div>
              </div>
            </div>
          </div>

          {/* Site-wise Breakdown */}
          {reportData.siteBreakdown.length > 0 && (
            <div className="report-section">
              <div className="report-section-header"><h3>Site-wise Breakdown</h3></div>
              <div className="site-breakdown-grid">
                {reportData.siteBreakdown.map(sb => (
                  <div key={sb.siteId} className="site-breakdown-item">
                    <span className="site-name">{sb.siteName}</span>
                    <span className="site-amount">{fmt(sb.totalPaid)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment History Table */}
          <div className="report-section">
            <div className="report-section-header"><h3>Payment History</h3></div>
            <table className="report-table">
              <thead><tr><th>Date</th><th>Site</th><th style={{ textAlign: 'right' }}>Amount</th><th>Mode</th><th>Notes</th></tr></thead>
              <tbody>
                {reportData.payments.map(p => (
                  <tr key={p.id}>
                    <td>{new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td style={{ fontWeight: 500 }}>{p.siteName}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(p.amount)}</td>
                    <td><span style={{ fontSize: 12, background: 'var(--bg-secondary)', padding: '3px 8px', borderRadius: 5, color: 'var(--text-muted)' }}>{p.mode}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.notes || '—'}</td>
                  </tr>
                ))}
                {reportData.payments.length > 0 && (
                  <tr className="total-row"><td colSpan={2}>TOTAL</td><td style={{ textAlign: 'right' }}>{fmt(reportData.grandTotal)}</td><td colSpan={2}></td></tr>
                )}
                {reportData.payments.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No payments found for the selected criteria.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};

export default LabourReportView;
