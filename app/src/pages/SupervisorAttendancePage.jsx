import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Clock, 
  Building2, 
  UserCheck, 
  Users, 
  Layers, 
  FileSpreadsheet,
  Zap,
  Loader2,
  X,
  PlusCircle
} from 'lucide-react';
import './SupervisorAttendancePage.css';

const SupervisorAttendancePage = () => {
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyData, setDailyData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Reference data for entry modal
  const [allSites, setAllSites] = useState([]);
  const [allPayees, setAllPayees] = useState([]);
  const [shiftTypes, setShiftTypes] = useState([]);
  const [personTypes, setPersonTypes] = useState([]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    siteId: '',
    payeeId: '',
    calculationMode: 'Shift',
    personType: 'Mason',
    shiftId: '',
    labourCount: 1,
    hours: '',
    ratePerHour: '',
    length: '',
    breadth: '',
    sqFt: '',
    deductionSqFt: 0,
    ratePerSqFt: '',
    workDescription: ''
  });

  useEffect(() => {
    fetchReferenceData();
  }, []);

  useEffect(() => {
    fetchDailyData(currentDate);
  }, [currentDate]);

  const fetchReferenceData = async () => {
    try {
      const [sitesRes, payeesRes, shiftsRes, personsRes] = await Promise.all([
        api.get('/sites'),
        api.get('/payees'),
        api.get('/shift-master'),
        api.get('/person-types')
      ]);
      setAllSites(sitesRes.data || []);
      setAllPayees(payeesRes.data || []);
      setShiftTypes(shiftsRes.data || []);
      setPersonTypes(personsRes.data || []);

      if (shiftsRes.data?.length > 0) {
        setForm(f => ({ ...f, shiftId: String(shiftsRes.data[0].id) }));
      }
    } catch (err) {
      console.error('Failed to load reference data:', err);
    }
  };

  const fetchDailyData = async (dateStr) => {
    setLoading(true);
    try {
      const res = await api.get(`/attendance-sheets/daily?date=${dateStr}`);
      setDailyData(res.data);
    } catch (err) {
      console.error('Failed to load daily attendance data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Date Navigators
  const changeDateBy = (days) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + days);
    setCurrentDate(d.toISOString().split('T')[0]);
  };

  const goToToday = () => {
    setCurrentDate(new Date().toISOString().split('T')[0]);
  };

  // Calculations for preview
  const getShiftDetails = () => {
    return shiftTypes.find(s => String(s.id) === String(form.shiftId)) || shiftTypes[0] || {};
  };

  const getPersonTypeDailyRate = () => {
    const pt = personTypes.find(p => p.Name === form.personType);
    let rate = pt ? parseFloat(pt.DailyRate || 0) : 0;
    if (pt && pt.RateUnit === 'Hour') {
      rate = rate * 8;
    }
    return rate;
  };

  const calculateEstimate = () => {
    if (form.calculationMode === 'Shift') {
      const dailyRate = getPersonTypeDailyRate();
      const mult = parseFloat(getShiftDetails().ShiftMultiplier || 1);
      const count = parseInt(form.labourCount || 1);
      return dailyRate * mult * count;
    } else if (form.calculationMode === 'Hour') {
      const hr = parseFloat(form.hours || 0);
      const r = parseFloat(form.ratePerHour || 0);
      const count = parseInt(form.labourCount || 1);
      return hr * r * count;
    } else {
      const l = parseFloat(form.length || 0);
      const b = parseFloat(form.breadth || 0);
      const gross = (l > 0 && b > 0) ? (l * b) : (parseFloat(form.sqFt) || 0);
      const ded = parseFloat(form.deductionSqFt || 0);
      const net = Math.max(0, gross - ded);
      const r = parseFloat(form.ratePerSqFt || 0);
      const count = parseInt(form.labourCount || 1);
      return (net || 1) * r * count;
    }
  };

  const handleOpenAddModal = (siteId = '') => {
    setForm(f => ({
      ...f,
      siteId: siteId ? String(siteId) : (allSites[0]?.id ? String(allSites[0].id) : ''),
      payeeId: '',
      calculationMode: 'Shift',
      personType: personTypes[0]?.Name || 'Mason',
      shiftId: shiftTypes[0]?.id ? String(shiftTypes[0].id) : '',
      labourCount: 1,
      hours: '',
      ratePerHour: '',
      length: '',
      breadth: '',
      sqFt: '',
      deductionSqFt: 0,
      ratePerSqFt: '',
      workDescription: ''
    }));
    setShowModal(true);
  };

  const handleSaveEntry = async (addNext = false) => {
    if (!form.siteId) {
      alert('Please select a site');
      return;
    }
    if (!form.payeeId) {
      alert('Please select a labour');
      return;
    }

    setSaving(true);
    try {
      // Find or create active sheet for this date if needed
      let sheetId = dailyData?.sheet?.id;
      if (!sheetId) {
        // Auto-create a weekly sheet for this date
        const d = new Date(currentDate);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        const sunday = new Date(monday);
        sunday.setDate(sunday.getDate() + 6);
        const startStr = monday.toISOString().split('T')[0];
        const endStr = sunday.toISOString().split('T')[0];

        const newSheetRes = await api.post('/attendance-sheets', {
          Title: `Week ${startStr} - ${endStr}`,
          WeekStartDate: startStr,
          WeekEndDate: endStr
        });
        sheetId = newSheetRes.data.id;
      }

      const shift = getShiftDetails();
      const payload = {
        PayeeId: parseInt(form.payeeId),
        SiteId: parseInt(form.siteId),
        AttendanceDate: currentDate,
        PersonType: form.personType,
        CalculationMode: form.calculationMode,
        ShiftType: form.calculationMode === 'Shift' ? shift.ShiftType : null,
        ShiftMultiplier: form.calculationMode === 'Shift' ? parseFloat(shift.ShiftMultiplier || 1) : null,
        LabourCount: parseInt(form.labourCount || 1),
        Hours: form.calculationMode === 'Hour' ? parseFloat(form.hours || 0) : null,
        RatePerHour: form.calculationMode === 'Hour' ? parseFloat(form.ratePerHour || 0) : null,
        Length: form.calculationMode === 'SqFt' && form.length ? parseFloat(form.length) : null,
        Breadth: form.calculationMode === 'SqFt' && form.breadth ? parseFloat(form.breadth) : null,
        SqFt: form.calculationMode === 'SqFt' && form.sqFt ? parseFloat(form.sqFt) : null,
        DeductionSqFt: form.calculationMode === 'SqFt' ? parseFloat(form.deductionSqFt || 0) : 0,
        RatePerSqFt: form.calculationMode === 'SqFt' ? parseFloat(form.ratePerSqFt || 0) : null,
        WorkDescription: form.calculationMode === 'SqFt' ? form.workDescription : null
      };

      await api.post(`/attendance-sheets/${sheetId}/records`, payload);

      // Refresh data
      await fetchDailyData(currentDate);

      if (addNext) {
        // Keep siteId, reset labour and specific values for fast 1-by-1 feeding
        setForm(f => ({
          ...f,
          payeeId: '',
          labourCount: 1,
          hours: '',
          ratePerHour: '',
          length: '',
          breadth: '',
          sqFt: '',
          deductionSqFt: 0,
          ratePerSqFt: '',
          workDescription: ''
        }));
      } else {
        setShowModal(false);
      }
    } catch (err) {
      console.error('Save entry error:', err);
      alert(err.response?.data?.msg || err.message || 'Failed to save attendance record');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm('Are you sure you want to delete this attendance entry?')) return;
    const sheetId = dailyData?.sheet?.id;
    if (!sheetId) return;

    try {
      await api.delete(`/attendance-sheets/${sheetId}/records/${recordId}`);
      fetchDailyData(currentDate);
    } catch (err) {
      console.error('Delete record error:', err);
      alert(err.response?.data?.msg || 'Failed to delete record');
    }
  };

  const fmt = (num) => '₹' + (Number(num) || 0).toLocaleString('en-IN');

  const formattedDate = new Date(currentDate + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const isToday = currentDate === new Date().toISOString().split('T')[0];

  return (
    <div className="sap-container">
      {/* Header & Date Navigation */}
      <div className="sap-header">
        <div className="sap-title-section">
          <div className="sap-title">
            <UserCheck size={22} color="var(--accent, #FFB300)" />
            Daily Attendance
          </div>
          <div className="sap-subtitle">
            Site-wise daily worker logging and supervisor entries
          </div>
        </div>

        {/* Date Navigator */}
        <div className="sap-date-nav">
          <button className="sap-nav-btn" onClick={() => changeDateBy(-1)}>
            <ChevronLeft size={16} /> Prev
          </button>
          <button className={`sap-nav-btn today ${isToday ? 'active' : ''}`} onClick={goToToday}>
            Today
          </button>
          <input 
            type="date" 
            className="sap-date-input" 
            value={currentDate} 
            onChange={(e) => setCurrentDate(e.target.value)} 
          />
          <button className="sap-nav-btn" onClick={() => changeDateBy(1)}>
            Next <ChevronRight size={16} />
          </button>
        </div>

        {/* Header Action & Sheet Link */}
        <div className="sap-header-actions">
          {dailyData?.sheet && (
            <div className="sap-sheet-badge">
              <FileSpreadsheet size={14} />
              {dailyData.sheet.title}
            </div>
          )}
          <button className="sap-add-btn" onClick={() => handleOpenAddModal()}>
            <Plus size={16} /> Add Attendance Entry
          </button>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="sap-fresh-empty">
          <Loader2 size={36} className="aps-spinner" color="var(--accent, #FFB300)" />
          <div style={{ marginTop: 12, color: 'var(--text-muted)' }}>Loading entries...</div>
        </div>
      ) : !dailyData || dailyData.siteGroups.length === 0 ? (
        /* Fresh Day Empty State */
        <div className="sap-fresh-empty">
          <div className="sap-fresh-icon">
            <Calendar size={40} />
          </div>
          <div className="sap-fresh-title">Fresh Day — No Attendance Recorded</div>
          <div className="sap-fresh-desc">
            No entries have been recorded for <strong>{formattedDate}</strong> yet. Click the button below to start entering attendance site-by-site.
          </div>
          <button className="sap-fresh-btn" onClick={() => handleOpenAddModal()}>
            <PlusCircle size={20} /> Create First Entry
          </button>
        </div>
      ) : (
        /* Site-Wise Grouped Cards List */
        <div className="sap-site-list">
          {dailyData.siteGroups.map(group => (
            <div key={group.siteId} className="sap-site-card">
              <div className="sap-site-card-header">
                <div className="sap-site-card-title">
                  <div className="sap-site-icon-box">
                    <Building2 size={18} />
                  </div>
                  <span className="sap-site-name-text">{group.siteName}</span>
                  {group.constructionType === 'Contract' && (
                    <span className="sap-site-tag contract">
                      <Zap size={10} /> Contract
                    </span>
                  )}
                </div>

                <div className="sap-site-header-stats">
                  <span className="sap-site-stat-workers">
                    <Users size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
                    {group.workerCount} {group.workerCount === 1 ? 'worker' : 'workers'}
                  </span>
                  <div className="sap-site-subtotal">
                    {fmt(group.totalAmount)}
                  </div>
                  <button 
                    className="sap-nav-btn today" 
                    onClick={() => handleOpenAddModal(group.siteId)}
                    style={{ fontSize: 11, padding: '4px 10px' }}
                  >
                    <Plus size={13} /> Add
                  </button>
                </div>
              </div>

              {/* Table of Entries for this site */}
              <table className="sap-entries-table">
                <thead>
                  <tr>
                    <th>Labour / Payee</th>
                    <th>Type / Role</th>
                    <th>Details</th>
                    <th>Workers</th>
                    <th>Amount</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {group.entries.map((entry) => (
                    <tr key={`${entry.type}_${entry.id}`} className="sap-entry-row">
                      <td>
                        <div className="sap-labour-cell">
                          <div className={`sap-avatar-badge ${entry.payeeType}`}>
                            {entry.payeeName.charAt(0)}
                          </div>
                          <div>
                            <div className="sap-labour-name">{entry.payeeName}</div>
                            <div className="sap-labour-role">{entry.payeeType}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>
                          {entry.personType || entry.miscName || 'Labour'}
                        </span>
                      </td>
                      <td>
                        {entry.type === 'misc' ? (
                          <span className="sap-pill misc">{entry.miscName}</span>
                        ) : entry.calculationMode === 'Hour' ? (
                          <span className="sap-pill hour">
                            <Clock size={12} /> {entry.hours} Hrs @ ₹{entry.ratePerHour}/hr
                          </span>
                        ) : entry.calculationMode === 'SqFt' ? (
                          <span className="sap-pill sqft">
                            <Layers size={12} /> {entry.sqFt} SqFt @ ₹{entry.ratePerSqFt}/sqft
                          </span>
                        ) : (
                          <span className="sap-pill shift">
                            {entry.shiftType} ({entry.shiftMultiplier}x)
                          </span>
                        )}
                      </td>
                      <td>
                        {entry.labourCount ? (
                          <span style={{ fontWeight: 600, fontSize: 13 }}>
                            {entry.labourCount}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="sap-amount-cell">
                        {fmt(entry.calculatedAmount)}
                      </td>
                      <td className="sap-action-cell">
                        {entry.type === 'attendance' && (
                          <button 
                            className="sap-delete-btn" 
                            onClick={() => handleDeleteRecord(entry.id)}
                            title="Delete entry"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Sticky Day Summary */}
      {dailyData && dailyData.siteGroups.length > 0 && (
        <div className="sap-day-summary">
          <div className="sap-summary-stats">
            <div className="sap-stat-block">
              <span className="sap-stat-label">Total Day Payout</span>
              <span className="sap-stat-value highlight">{fmt(dailyData.totalAmount)}</span>
            </div>
            <div className="sap-stat-block">
              <span className="sap-stat-label">Total Workers</span>
              <span className="sap-stat-value">{dailyData.totalWorkers}</span>
            </div>
            <div className="sap-stat-block">
              <span className="sap-stat-label">Active Sites</span>
              <span className="sap-stat-value">{dailyData.sitesCount}</span>
            </div>
          </div>

          <button className="sap-add-btn" onClick={() => handleOpenAddModal()}>
            <Plus size={16} /> Add Entry
          </button>
        </div>
      )}

      {/* Entry Modal / Drawer */}
      {showModal && (
        <div className="sap-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="sap-modal" onClick={e => e.stopPropagation()}>
            <div className="sap-modal-header">
              <div className="sap-modal-title">Record Attendance</div>
              <button className="sap-modal-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Site Picker */}
            <div className="sap-form-group">
              <label className="sap-form-label">1. Site</label>
              <select 
                className="sap-form-select"
                value={form.siteId}
                onChange={e => setForm({ ...form, siteId: e.target.value })}
              >
                <option value="">Select site...</option>
                {allSites.map(s => (
                  <option key={s.id || s.Id} value={s.id || s.Id}>
                    {s.SiteName} {s.ConstructionType === 'Contract' ? '(Contract)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Labour Picker */}
            <div className="sap-form-group">
              <label className="sap-form-label">2. Labour / Mason</label>
              <select 
                className="sap-form-select"
                value={form.payeeId}
                onChange={e => setForm({ ...form, payeeId: e.target.value })}
              >
                <option value="">Select labour...</option>
                {allPayees.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.Name} ({p.Type})
                  </option>
                ))}
              </select>
            </div>

            {/* Mode Selection */}
            <div className="sap-mode-tabs">
              <button 
                className={`sap-mode-tab ${form.calculationMode === 'Shift' ? 'active' : ''}`}
                onClick={() => setForm({ ...form, calculationMode: 'Shift' })}
              >
                Shift Mode
              </button>
              <button 
                className={`sap-mode-tab ${form.calculationMode === 'Hour' ? 'active' : ''}`}
                onClick={() => setForm({ ...form, calculationMode: 'Hour' })}
              >
                Hour Mode
              </button>
              <button 
                className={`sap-mode-tab ${form.calculationMode === 'SqFt' ? 'active' : ''}`}
                onClick={() => setForm({ ...form, calculationMode: 'SqFt' })}
              >
                SqFt Mode
              </button>
            </div>

            {/* Person Type */}
            <div className="sap-form-group">
              <label className="sap-form-label">Person Type</label>
              <select 
                className="sap-form-select"
                value={form.personType}
                onChange={e => setForm({ ...form, personType: e.target.value })}
              >
                {personTypes.map(pt => (
                  <option key={pt.id} value={pt.Name}>
                    {pt.Name} {pt.DailyRate ? `(₹${pt.DailyRate})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* SHIFT MODE */}
            {form.calculationMode === 'Shift' && (
              <>
                <div className="sap-form-group">
                  <label className="sap-form-label">Shift Type</label>
                  <select 
                    className="sap-form-select"
                    value={form.shiftId}
                    onChange={e => setForm({ ...form, shiftId: e.target.value })}
                  >
                    {shiftTypes.map(st => (
                      <option key={st.id} value={st.id}>
                        {st.ShiftType} ({st.ShiftMultiplier}x)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sap-form-group">
                  <label className="sap-form-label">Labour Count</label>
                  <input 
                    type="number" 
                    min="1" 
                    className="sap-form-input"
                    value={form.labourCount}
                    onChange={e => setForm({ ...form, labourCount: e.target.value })}
                  />
                </div>
              </>
            )}

            {/* HOUR MODE */}
            {form.calculationMode === 'Hour' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="sap-form-group">
                    <label className="sap-form-label">Hours Worked</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      placeholder="e.g. 1.9" 
                      className="sap-form-input"
                      value={form.hours}
                      onChange={e => setForm({ ...form, hours: e.target.value })}
                    />
                  </div>
                  <div className="sap-form-group">
                    <label className="sap-form-label">Rate / Hour (₹)</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 800" 
                      className="sap-form-input"
                      value={form.ratePerHour}
                      onChange={e => setForm({ ...form, ratePerHour: e.target.value })}
                    />
                  </div>
                </div>
                <div className="sap-form-group">
                  <label className="sap-form-label">Labour Count</label>
                  <input 
                    type="number" 
                    min="1" 
                    className="sap-form-input"
                    value={form.labourCount}
                    onChange={e => setForm({ ...form, labourCount: e.target.value })}
                  />
                </div>
              </>
            )}

            {/* SQFT MODE */}
            {form.calculationMode === 'SqFt' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="sap-form-group">
                    <label className="sap-form-label">Length (ft)</label>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      className="sap-form-input"
                      value={form.length}
                      onChange={e => setForm({ ...form, length: e.target.value })}
                    />
                  </div>
                  <div className="sap-form-group">
                    <label className="sap-form-label">Breadth (ft)</label>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      className="sap-form-input"
                      value={form.breadth}
                      onChange={e => setForm({ ...form, breadth: e.target.value })}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="sap-form-group">
                    <label className="sap-form-label">Deduction (SqFt)</label>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      className="sap-form-input"
                      value={form.deductionSqFt}
                      onChange={e => setForm({ ...form, deductionSqFt: e.target.value })}
                    />
                  </div>
                  <div className="sap-form-group">
                    <label className="sap-form-label">Rate / SqFt (₹)</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 45" 
                      className="sap-form-input"
                      value={form.ratePerSqFt}
                      onChange={e => setForm({ ...form, ratePerSqFt: e.target.value })}
                    />
                  </div>
                </div>
                <div className="sap-form-group">
                  <label className="sap-form-label">Work Description</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Living room wall plastering" 
                    className="sap-form-input"
                    value={form.workDescription}
                    onChange={e => setForm({ ...form, workDescription: e.target.value })}
                  />
                </div>
              </>
            )}

            {/* Estimate Box */}
            <div className="sap-calc-box">
              <span className="sap-calc-label">Calculated Earnings</span>
              <span className="sap-calc-value">{fmt(calculateEstimate())}</span>
            </div>

            {/* Actions */}
            <div className="sap-modal-actions">
              <button 
                className="sap-btn-cancel" 
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                className="sap-btn-next" 
                onClick={() => handleSaveEntry(true)}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save & Add Next'}
              </button>
              <button 
                className="sap-btn-save" 
                onClick={() => handleSaveEntry(false)}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save & Done'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupervisorAttendancePage;
