import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Home, Users, Ruler, MapPin, HardHat, Package,
  IndianRupee, CheckCircle2, Clock, Loader2, Calendar, FileText, RotateCcw,
  Plus, Trash2, Edit, Check, X
} from 'lucide-react';
import api from '../api/axios';
import './SiteDetailPage.css';

const fmt = (num) => {
  if (!num && num !== 0) return '—';
  return '₹' + parseFloat(num).toLocaleString('en-IN');
};

const SiteDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);

  // Tabs state
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'sections' | 'projects'

  // Payment report state
  const [paymentReport, setPaymentReport] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reportFetched, setReportFetched] = useState(false);

  // Floors / Sections state
  const [sections, setSections] = useState([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [sectionForm, setSectionForm] = useState({
    Name: '',
    Length: '',
    Breadth: '',
    Height: '',
    Area: '',
    SectionValue: '',
    RatePerSqFt: ''
  });

  // Projects state
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [projectForm, setProjectForm] = useState({
    ProjectName: '',
    WorkType: 'New Construction',
    StartDate: '',
    EndDate: '',
    Status: 'In Progress',
    QuotedValue: '',
    Notes: ''
  });

  useEffect(() => {
    fetchSiteDetail();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'sections') {
      fetchSections();
    } else if (activeTab === 'projects') {
      fetchProjects();
    }
  }, [activeTab]);

  const fetchSiteDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/sites/${id}`);
      setSite(res.data);
    } catch (err) {
      console.error('Failed to fetch site detail', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentReport = async () => {
    setPaymentLoading(true);
    try {
      let url = `/reports/site/${id}/client-payments`;
      const params = [];
      if (fromDate) params.push(`fromDate=${fromDate}`);
      if (toDate) params.push(`toDate=${toDate}`);
      if (params.length > 0) url += '?' + params.join('&');

      const res = await api.get(url);
      setPaymentReport(res.data);
      setReportFetched(true);
    } catch (err) {
      console.error('Failed to fetch payment report', err);
    } finally {
      setPaymentLoading(false);
    }
  };

  const resetFilters = () => {
    setFromDate('');
    setToDate('');
    setPaymentReport(null);
    setReportFetched(false);
  };

  // Sections CRUD
  const fetchSections = async () => {
    setSectionsLoading(true);
    try {
      const res = await api.get(`/site-sections/site/${id}`);
      setSections(res.data);
    } catch (err) {
      console.error('Failed to fetch sections', err);
    } finally {
      setSectionsLoading(false);
    }
  };

  const handleSectionFormChange = (field, value) => {
    setSectionForm(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate Area if Length & Breadth are changed
      if (field === 'Length' || field === 'Breadth') {
        const l = parseFloat(field === 'Length' ? value : updated.Length);
        const b = parseFloat(field === 'Breadth' ? value : updated.Breadth);
        if (!isNaN(l) && !isNaN(b)) {
          updated.Area = String(l * b);
        } else {
          updated.Area = '';
        }
      }
      
      // Auto-calculate SectionValue if Area & RatePerSqFt are changed
      if (field === 'Area' || field === 'RatePerSqFt' || field === 'Length' || field === 'Breadth') {
        const areaVal = parseFloat(updated.Area);
        const rate = parseFloat(updated.RatePerSqFt);
        if (!isNaN(areaVal) && !isNaN(rate)) {
          updated.SectionValue = String(areaVal * rate);
        }
      }
      return updated;
    });
  };

  const handleSaveSection = async (e) => {
    e.preventDefault();
    if (!sectionForm.Name.trim()) return;
    try {
      if (editingSectionId) {
        const res = await api.put(`/site-sections/${editingSectionId}`, sectionForm);
        setSections(sections.map(s => s.id === editingSectionId ? res.data : s));
      } else {
        const res = await api.post('/site-sections', {
          ...sectionForm,
          SiteId: id
        });
        setSections([...sections, res.data]);
      }
      setShowAddSectionModal(false);
      setSectionForm({
        Name: '',
        Length: '',
        Breadth: '',
        Height: '',
        Area: '',
        SectionValue: '',
        RatePerSqFt: ''
      });
      setEditingSectionId(null);
    } catch (err) {
      console.error('Failed to save section', err);
    }
  };

  const handleEditSectionClick = (sec) => {
    setEditingSectionId(sec.id);
    setSectionForm({
      Name: sec.Name,
      Length: sec.Length ? String(sec.Length) : '',
      Breadth: sec.Breadth ? String(sec.Breadth) : '',
      Height: sec.Height ? String(sec.Height) : '',
      Area: sec.Area ? String(sec.Area) : '',
      SectionValue: sec.SectionValue ? String(sec.SectionValue) : '',
      RatePerSqFt: sec.RatePerSqFt ? String(sec.RatePerSqFt) : ''
    });
    setShowAddSectionModal(true);
  };

  const handleDeleteSection = async (sectionId) => {
    if (!window.confirm('Are you sure you want to delete this section/floor?')) return;
    try {
      await api.delete(`/site-sections/${sectionId}`);
      setSections(sections.filter(s => s.id !== sectionId));
    } catch (err) {
      console.error('Failed to delete section', err);
    }
  };

  // Projects CRUD
  const fetchProjects = async () => {
    setProjectsLoading(true);
    try {
      const res = await api.get(`/site-projects/site/${id}`);
      setProjects(res.data);
    } catch (err) {
      console.error('Failed to fetch projects', err);
    } finally {
      setProjectsLoading(false);
    }
  };

  const handleSaveProject = async (e) => {
    e.preventDefault();
    if (!projectForm.ProjectName.trim()) return;
    try {
      if (editingProjectId) {
        const res = await api.put(`/site-projects/${editingProjectId}`, projectForm);
        setProjects(projects.map(p => p.id === editingProjectId ? res.data : p));
      } else {
        const res = await api.post('/site-projects', {
          ...projectForm,
          SiteId: id
        });
        setProjects([res.data, ...projects]);
      }
      setShowAddProjectModal(false);
      setProjectForm({
        ProjectName: '',
        WorkType: 'New Construction',
        StartDate: '',
        EndDate: '',
        Status: 'In Progress',
        QuotedValue: '',
        Notes: ''
      });
      setEditingProjectId(null);
    } catch (err) {
      console.error('Failed to save project', err);
    }
  };

  const handleEditProjectClick = (p) => {
    setEditingProjectId(p.id);
    setProjectForm({
      ProjectName: p.ProjectName,
      WorkType: p.WorkType || 'New Construction',
      StartDate: p.StartDate || '',
      EndDate: p.EndDate || '',
      Status: p.Status || 'In Progress',
      QuotedValue: String(p.QuotedValue || 0),
      Notes: p.Notes || ''
    });
    setShowAddProjectModal(true);
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      await api.delete(`/site-projects/${projectId}`);
      setProjects(projects.filter(p => p.id !== projectId));
    } catch (err) {
      console.error('Failed to delete project', err);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Completed': return 'var(--success)';
      case 'In Progress': return 'var(--info)';
      case 'Upcoming': return 'var(--warning)';
      default: return 'var(--text-muted)';
    }
  };

  if (loading) {
    return (
      <div className="site-detail-page">
        <div className="site-detail-loading">
          <Loader2 size={32} className="site-detail-spinner" />
        </div>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="site-detail-page">
        <button className="site-detail-back" onClick={() => navigate('/sites')}>
          <ArrowLeft size={16} /> Back to Sites
        </button>
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          Site not found
        </div>
      </div>
    );
  }

  const siteValue = parseFloat(site.SiteValue || 0);
  const receivedAmount = parseFloat(site.ReceivedAmount || 0);
  const balanceAmount = parseFloat(site.BalanceAmount || 0);
  const receivedPct = siteValue > 0 ? Math.min((receivedAmount / siteValue) * 100, 100) : 0;
  const area = parseFloat(site.Length || 0) * parseFloat(site.Breadth || 0);

  return (
    <div className="site-detail-page">
      {/* Back Button */}
      <button className="site-detail-back" onClick={() => navigate('/sites')}>
        <ArrowLeft size={16} /> Back to Sites
      </button>

      {/* Scrollable Content */}
      <div className="site-detail-content">
        {/* Header */}
        <div className="site-detail-header">
          <div className="site-detail-title-section">
            <div className="site-detail-icon">
              <Home size={24} />
            </div>
            <div className="site-detail-title">
              <h1>{site.SiteName}</h1>
              <div className="site-detail-client">
                <Users size={14} /> {site.Client?.Name || 'No Client'}
                {site.Client?.MobileNumber && (
                  <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>
                    • {site.Client.MobileNumber}
                  </span>
                )}
              </div>
              <div className="site-detail-meta">
                <span className="site-meta-badge" style={{ 
                  background: `${getStatusColor(site.Status)}15`,
                  color: getStatusColor(site.Status)
                }}>
                  {site.Status}
                </span>
                {site.Client?.PaymentType && (
                  <span className="site-meta-badge" style={{
                    background: 'rgba(33, 150, 243, 0.1)',
                    color: 'var(--info)'
                  }}>
                    {site.Client.PaymentType}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Financial Summary Cards */}
        <div className="site-finance-cards">
          <div className="site-finance-card total">
            <div className="card-icon">
              <IndianRupee size={18} />
            </div>
            <div className="card-label">Total Site Value</div>
            <div className="card-value">{fmt(siteValue)}</div>
          </div>
          <div className="site-finance-card received">
            <div className="card-icon">
              <CheckCircle2 size={18} />
            </div>
            <div className="card-label">Received Amount</div>
            <div className="card-value">{fmt(receivedAmount)}</div>
          </div>
          <div className="site-finance-card balance">
            <div className="card-icon">
              <Clock size={18} />
            </div>
            <div className="card-label">Balance Amount</div>
            <div className="card-value">{fmt(balanceAmount)}</div>
          </div>
        </div>

        {/* Collection Progress */}
        <div className="site-progress-section">
          <div className="site-progress-header">
            <span className="site-progress-label">Payment Collection Progress</span>
            <span className="site-progress-pct">{receivedPct.toFixed(1)}%</span>
          </div>
          <div className="site-progress-bar">
            <div className="site-progress-fill" style={{ width: `${receivedPct}%` }} />
          </div>
        </div>

        {/* Site Info Grid */}
        <div className="site-info-grid">
          <div className="site-info-item">
            <div className="info-icon"><Ruler size={16} /></div>
            <div>
              <div className="info-label">Dimensions</div>
              <div className="info-value">{site.Length} × {site.Breadth} ft</div>
            </div>
          </div>
          <div className="site-info-item">
            <div className="info-icon"><Home size={16} /></div>
            <div>
              <div className="info-label">Area</div>
              <div className="info-value">{area.toLocaleString('en-IN')} Sq.ft</div>
            </div>
          </div>
          <div className="site-info-item">
            <div className="info-icon"><MapPin size={16} /></div>
            <div>
              <div className="info-label">Facing</div>
              <div className="info-value">{site.Facing || 'N/A'}</div>
            </div>
          </div>
          <div className="site-info-item">
            <div className="info-icon"><HardHat size={16} /></div>
            <div>
              <div className="info-label">Active Labours</div>
              <div className="info-value">{site.ActiveLabourCount || 0}</div>
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="site-detail-tabs">
          <button 
            className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            Summary & Payments
          </button>
          <button 
            className={`tab-btn ${activeTab === 'sections' ? 'active' : ''}`}
            onClick={() => setActiveTab('sections')}
          >
            Floors & Sections
          </button>
          <button 
            className={`tab-btn ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => setActiveTab('projects')}
          >
            Projects & Work Orders
          </button>
        </div>

        {/* Tab Content Panels */}
        {activeTab === 'summary' && (
          <div className="site-payment-section">
            <div className="site-payment-header">
              <h3>
                <div className="section-icon"><IndianRupee size={16} /></div>
                Payment Report (Collections)
              </h3>
              <div className="site-payment-filters">
                <input 
                  type="date" 
                  value={fromDate} 
                  onChange={(e) => setFromDate(e.target.value)}
                  placeholder="From"
                />
                <input 
                  type="date" 
                  value={toDate} 
                  onChange={(e) => setToDate(e.target.value)}
                  placeholder="To"
                />
                <button 
                  className="filter-btn" 
                  onClick={fetchPaymentReport}
                  disabled={paymentLoading}
                  style={{ 
                    background: 'var(--accent)', 
                    color: '#0F0F1A', 
                    borderColor: 'var(--accent)',
                    fontWeight: 700 
                  }}
                >
                  <FileText size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                  {paymentLoading ? 'Loading...' : 'Generate Report'}
                </button>
                {reportFetched && (
                  <button className="filter-btn" onClick={resetFilters}>
                    <RotateCcw size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                    Reset
                  </button>
                )}
              </div>
            </div>

            {!reportFetched ? (
              site.RecentPayments && site.RecentPayments.length > 0 ? (
                <table className="site-payment-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Mode</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {site.RecentPayments.map((p, idx) => (
                      <tr key={p.id || p.Id || idx}>
                        <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                        <td>{new Date(p.PaymentDate).toLocaleDateString('en-IN')}</td>
                        <td style={{ fontWeight: 700, color: 'var(--success)' }}>{fmt(p.Amount)}</td>
                        <td><span className="payment-mode-badge">{p.PaymentMode}</span></td>
                        <td style={{ color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.Notes || '—'}
                        </td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td colSpan={2}>TOTAL ({site.RecentPayments.length} Payments)</td>
                      <td style={{ color: 'var(--success)' }}>{fmt(receivedAmount)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <div className="site-payment-empty">
                  No collection payments recorded for this site yet. Use the Payment page to add Collection records.
                </div>
              )
            ) : paymentLoading ? (
              <div className="site-payment-empty">
                <Loader2 size={24} className="site-detail-spinner" />
              </div>
            ) : paymentReport && paymentReport.payments.length > 0 ? (
              <table className="site-payment-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Mode</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentReport.payments.map((p, idx) => (
                    <tr key={p.id}>
                      <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td>{new Date(p.date).toLocaleDateString('en-IN')}</td>
                      <td style={{ fontWeight: 700, color: 'var(--success)' }}>{fmt(p.amount)}</td>
                      <td><span className="payment-mode-badge">{p.mode}</span></td>
                      <td style={{ color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.notes || '—'}
                      </td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td colSpan={2}>TOTAL ({paymentReport.totalPayments} Payments)</td>
                    <td style={{ color: 'var(--success)' }}>{fmt(paymentReport.totalReceived)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <div className="site-payment-empty">
                No collection payments found for the selected date range.
              </div>
            )}
          </div>
        )}
         {activeTab === 'sections' && (
          <div className="site-payment-section">
            <div className="site-payment-header">
              <h3>
                <div className="section-icon" style={{ background: 'rgba(156, 39, 176, 0.1)', color: '#9C27B0' }}><Ruler size={16} /></div>
                Floors & Sections
              </h3>
              <button 
                className="filter-btn"
                onClick={() => {
                  setEditingSectionId(null);
                  setSectionForm({
                    Name: '',
                    Length: '',
                    Breadth: '',
                    Height: '',
                    Area: '',
                    SectionValue: '',
                    RatePerSqFt: ''
                  });
                  setShowAddSectionModal(true);
                }}
                style={{
                  background: '#9C27B0',
                  color: 'white',
                  borderColor: '#9C27B0',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Plus size={14} /> New Floor
              </button>
            </div>

            {sectionsLoading ? (
              <div className="site-payment-empty">
                <Loader2 size={24} className="site-detail-spinner" />
              </div>
            ) : sections.length > 0 ? (
              <table className="site-payment-table">
                <thead>
                  <tr>
                    <th>Floor Name</th>
                    <th>Dimensions (L × B × H)</th>
                    <th>Area (SqFt)</th>
                    <th>Rate / SqFt</th>
                    <th>Value</th>
                    <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sections.map((sec) => (
                    <tr key={sec.id}>
                      <td style={{ fontWeight: 600 }}>{sec.Name}</td>
                      <td>
                        {sec.Length || sec.Breadth || sec.Height 
                          ? `${sec.Length || 0} × ${sec.Breadth || 0} × ${sec.Height || 0}`
                          : '—'
                        }
                      </td>
                      <td>{sec.Area ? `${sec.Area} SqFt` : '—'}</td>
                      <td>{sec.RatePerSqFt ? fmt(sec.RatePerSqFt) : '—'}</td>
                      <td style={{ color: 'var(--accent)', fontWeight: 700 }}>{fmt(sec.SectionValue)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '12px' }}>
                          <button 
                            className="tab-action-btn"
                            style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            onClick={() => handleEditSectionClick(sec)}
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            className="tab-action-btn"
                            style={{ color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            onClick={() => handleDeleteSection(sec.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="site-payment-empty">
                No floors/sections added yet. Click "New Floor" to track areas, values, and labor sq-ft rates.
              </div>
            )}
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="site-payment-section">
            <div className="site-payment-header">
              <h3>
                <div className="section-icon" style={{ background: 'rgba(33, 150, 243, 0.1)', color: 'var(--info)' }}><FileText size={16} /></div>
                Projects & Work Orders
              </h3>
              <button 
                className="filter-btn"
                onClick={() => {
                  setEditingProjectId(null);
                  setProjectForm({
                    ProjectName: '',
                    WorkType: 'New Construction',
                    StartDate: '',
                    EndDate: '',
                    Status: 'In Progress',
                    QuotedValue: '',
                    Notes: ''
                  });
                  setShowAddProjectModal(true);
                }}
                style={{
                  background: 'var(--info)',
                  color: 'white',
                  borderColor: 'var(--info)',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Plus size={14} /> New Project
              </button>
            </div>

            {projectsLoading ? (
              <div className="site-payment-empty">
                <Loader2 size={24} className="site-detail-spinner" />
              </div>
            ) : projects.length > 0 ? (
              <table className="site-payment-table">
                <thead>
                  <tr>
                    <th>Project Name</th>
                    <th>Type</th>
                    <th>Value</th>
                    <th>Dates</th>
                    <th>Status</th>
                    <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((proj) => (
                    <tr key={proj.id}>
                      <td style={{ fontWeight: 600 }}>{proj.ProjectName}</td>
                      <td><span className="payment-mode-badge">{proj.WorkType}</span></td>
                      <td style={{ color: 'var(--accent)', fontWeight: 700 }}>{fmt(proj.QuotedValue)}</td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {proj.StartDate ? new Date(proj.StartDate).toLocaleDateString('en-IN') : '—'} 
                        {' to '} 
                        {proj.EndDate ? new Date(proj.EndDate).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td>
                        <span className="site-meta-badge" style={{
                          background: proj.Status === 'Completed' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(33, 150, 243, 0.1)',
                          color: proj.Status === 'Completed' ? 'var(--success)' : 'var(--info)'
                        }}>
                          {proj.Status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '12px' }}>
                          <button 
                            className="tab-action-btn"
                            style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            onClick={() => handleEditProjectClick(proj)}
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            className="tab-action-btn"
                            style={{ color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            onClick={() => handleDeleteProject(proj.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="site-payment-empty">
                No repeat projects or work orders found. Click "New Project" to register repeat contracts for this site.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Project Modal */}
      {showAddProjectModal && (
        <div className="site-detail-modal-overlay">
          <div className="site-detail-modal">
            <div className="modal-header">
              <h2>{editingProjectId ? 'Edit Project' : 'New Project / Work Order'}</h2>
              <button className="close-btn" onClick={() => setShowAddProjectModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveProject} className="modal-form">
              <div className="form-group">
                <label>Project Name *</label>
                <input 
                  type="text"
                  required
                  value={projectForm.ProjectName}
                  onChange={(e) => setProjectForm({ ...projectForm, ProjectName: e.target.value })}
                  placeholder="e.g. Phase 2 Plastering, Wood Works Contract"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Work Type</label>
                  <input 
                    type="text"
                    list="workTypes"
                    value={projectForm.WorkType}
                    onChange={(e) => setProjectForm({ ...projectForm, WorkType: e.target.value })}
                    placeholder="Select or type work type..."
                  />
                  <datalist id="workTypes">
                    <option value="New Construction" />
                    <option value="Interior Works" />
                    <option value="Renovation" />
                    <option value="Painting Work" />
                    <option value="Plumbing & Electrical" />
                    <option value="Wood / Carpentry" />
                    <option value="Other" />
                  </datalist>
                </div>

                <div className="form-group">
                  <label>Quoted Value (₹) *</label>
                  <input 
                    type="number"
                    required
                    value={projectForm.QuotedValue}
                    onChange={(e) => setProjectForm({ ...projectForm, QuotedValue: e.target.value })}
                    placeholder="Quoted contract value"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input 
                    type="date"
                    value={projectForm.StartDate}
                    onChange={(e) => setProjectForm({ ...projectForm, StartDate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>End Date</label>
                  <input 
                    type="date"
                    value={projectForm.EndDate}
                    onChange={(e) => setProjectForm({ ...projectForm, EndDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Status</label>
                <select 
                  value={projectForm.Status}
                  onChange={(e) => setProjectForm({ ...projectForm, Status: e.target.value })}
                >
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea 
                  value={projectForm.Notes || ''}
                  onChange={(e) => setProjectForm({ ...projectForm, Notes: e.target.value })}
                  placeholder="Additional terms, milestones, or work specifications..."
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAddProjectModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit">Save Project</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Floor/Section Modal */}
      {showAddSectionModal && (
        <div className="site-detail-modal-overlay">
          <div className="site-detail-modal">
            <div className="modal-header">
              <h2>{editingSectionId ? 'Edit Floor / Section' : 'New Floor / Section'}</h2>
              <button className="close-btn" onClick={() => setShowAddSectionModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveSection} className="modal-form">
              <div className="form-group">
                <label>Floor/Section Name *</label>
                <input 
                  type="text"
                  required
                  value={sectionForm.Name}
                  onChange={(e) => handleSectionFormChange('Name', e.target.value)}
                  placeholder="e.g. Ground Floor, First Floor, Slab Beam"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Length (ft)</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={sectionForm.Length}
                    onChange={(e) => handleSectionFormChange('Length', e.target.value)}
                    placeholder="Length"
                  />
                </div>

                <div className="form-group">
                  <label>Breadth (ft)</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={sectionForm.Breadth}
                    onChange={(e) => handleSectionFormChange('Breadth', e.target.value)}
                    placeholder="Breadth"
                  />
                </div>

                <div className="form-group">
                  <label>Height (ft)</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={sectionForm.Height}
                    onChange={(e) => handleSectionFormChange('Height', e.target.value)}
                    placeholder="Height"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Area (SqFt) (Auto-calculated)</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={sectionForm.Area}
                    onChange={(e) => handleSectionFormChange('Area', e.target.value)}
                    placeholder="Area"
                  />
                </div>

                <div className="form-group">
                  <label>Rate per SqFt (₹)</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={sectionForm.RatePerSqFt}
                    onChange={(e) => handleSectionFormChange('RatePerSqFt', e.target.value)}
                    placeholder="e.g. 15"
                  />
                </div>

                <div className="form-group">
                  <label>Floor Value (₹) (Auto-calculated)</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={sectionForm.SectionValue}
                    onChange={(e) => handleSectionFormChange('SectionValue', e.target.value)}
                    placeholder="Value"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAddSectionModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit">Save Floor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiteDetailPage;
