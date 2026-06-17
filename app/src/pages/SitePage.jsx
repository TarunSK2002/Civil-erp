import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Home, Users, Ruler, MapPin, Loader2, Eye, IndianRupee, CheckCircle2, Clock } from 'lucide-react';
import api from '../api/axios';
import SlidePanel from '../components/SlidePanel';

const SitePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sites, setSites] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  
  useEffect(() => {
    if (new URLSearchParams(location.search).get('action') === 'add') {
      setIsModalOpen(true);
    }
  }, [location]);
  // Form State
  const [formData, setFormData] = useState({
    SiteName: '',
    ClientId: '',
    SiteValue: '',
    Length: '',
    Breadth: '',
    Facing: '',
    Status: 'Upcoming',
    Progress: 0,
    NextMilestone: ''
  });

  useEffect(() => {
    fetchSites();
    fetchClients();
  }, [searchTerm, statusFilter]);

  const fetchSites = async () => {
    try {
      const response = await api.get(`/sites?search=${searchTerm}&status=${statusFilter}`);
      setSites(response.data);
    } catch (err) {
      console.error('Failed to fetch sites', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await api.get('/clients');
      setClients(response.data);
    } catch (err) {
      console.error('Failed to fetch clients', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSite) {
        await api.put(`/sites/${editingSite.id}`, formData);
      } else {
        await api.post('/sites', formData);
      }
      setIsModalOpen(false);
      setEditingSite(null);
      resetForm();
      fetchSites();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to save site');
    }
  };

  const resetForm = () => {
    setFormData({
      SiteName: '',
      ClientId: '',
      SiteValue: '',
      Length: '',
      Breadth: '',
      Facing: '',
      Status: 'Upcoming',
      Progress: 0,
      NextMilestone: ''
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this site?')) {
      try {
        await api.delete(`/sites/${id}`);
        fetchSites();
      } catch (err) {
        alert(err.response?.data?.msg || 'Failed to delete site');
      }
    }
  };

  const openEditModal = (site) => {
    if (!site) return;
    setEditingSite(site);
    setFormData({
      SiteName: site.SiteName || '',
      ClientId: site.ClientId || '',
      SiteValue: site.SiteValue || 0,
      Length: site.Length || 0,
      Breadth: site.Breadth || 0,
      Facing: site.Facing || '',
      Status: site.Status || 'Upcoming',
      Progress: site.Progress || 0,
      NextMilestone: site.NextMilestone || ''
    });
    setIsModalOpen(true);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Completed': return 'var(--success)';
      case 'In Progress': return 'var(--info)';
      case 'Upcoming': return 'var(--warning)';
      default: return 'var(--text-muted)';
    }
  };

  const totalSiteValue = sites.reduce((sum, site) => sum + parseFloat(site.SiteValue || 0), 0);

  return (
    <div className="data-page" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Site Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Manage construction sites, measurements, and budgets.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '10px 16px',
            minWidth: '220px'
          }}>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Site Value</p>
            <p style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: '900', color: 'var(--accent)' }}>Rs {totalSiteValue.toLocaleString('en-IN')}</p>
          </div>
          <button 
            onClick={() => { setEditingSite(null); resetForm(); setIsModalOpen(true); }}
            style={{ 
              backgroundColor: 'var(--accent)', 
              color: '#0F0F1A', 
              border: 'none', 
              borderRadius: '8px', 
              padding: '10px 20px', 
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Plus size={20} /> Add New Site
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '16px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search sites..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', 
              backgroundColor: 'var(--bg-card)', 
              border: '1px solid var(--border)', 
              borderRadius: '8px', 
              padding: '12px 12px 12px 40px', 
              color: 'var(--text-primary)',
              outline: 'none'
            }}
          />
        </div>
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ 
            backgroundColor: 'var(--bg-card)', 
            border: '1px solid var(--border)', 
            borderRadius: '8px', 
            padding: '0 12px', 
            color: 'var(--text-primary)',
            outline: 'none',
            minWidth: '150px'
          }}
        >
          <option value="All">All Status</option>
          <option value="Upcoming">Upcoming</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      <div className="data-table-scroll" style={{ paddingRight: '4px' }}>
        {/* Grid of Site Cards */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Loader2 className="animate-spin" color="var(--accent)" />
          </div>
        ) : sites.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No sites found</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {sites.map(site => (
              <div key={site.id} style={{ 
                backgroundColor: 'var(--bg-card)', 
                borderRadius: '16px', 
                border: '1px solid var(--border)', 
                overflow: 'hidden',
                boxShadow: 'var(--shadow)',
                position: 'relative',
                transition: 'var(--transition)'
              }} className="fade-in">
                <div style={{ 
                  height: '4px', 
                  backgroundColor: getStatusColor(site.Status)
                }} />
                
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{site.SiteName}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                        <Users size={14} /> {site.Client?.Name}
                      </div>
                    </div>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      fontSize: '10px', 
                      fontWeight: '800', 
                      backgroundColor: `${getStatusColor(site.Status)}20`,
                      color: getStatusColor(site.Status),
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {site.Status}
                    </span>
                  </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Ruler size={16} color="var(--text-muted)" />
                    <div>
                      <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Area</p>
                      <p style={{ fontSize: '14px', fontWeight: 'bold' }}>{(parseFloat(site.Length || 0) * parseFloat(site.Breadth || 0)).toLocaleString('en-IN')} Sq.ft</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={16} color="var(--text-muted)" />
                    <div>
                      <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Facing</p>
                      <p style={{ fontSize: '14px', fontWeight: 'bold' }}>{site.Facing || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>ESTIMATED BUDGET</p>
                  <p style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent)' }}>₹{parseFloat(site.SiteValue || 0).toLocaleString('en-IN')}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
                  <div style={{ backgroundColor: 'var(--bg-primary)', padding: '10px', borderRadius: '8px' }}>
                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={10} /> RECEIVED
                    </p>
                    <p style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--success)' }}>
                      ₹{parseFloat(site.ReceivedAmount || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg-primary)', padding: '10px', borderRadius: '8px' }}>
                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={10} /> BALANCE
                    </p>
                    <p style={{ fontSize: '14px', fontWeight: 'bold', color: parseFloat(site.BalanceAmount || 0) > 0 ? 'var(--error)' : 'var(--success)' }}>
                      ₹{parseFloat(site.BalanceAmount || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                  <button 
                    onClick={() => navigate(`/sites/${site.id}`)}
                    style={{ background: 'var(--accent)', border: 'none', borderRadius: '6px', padding: '6px 12px', color: '#0F0F1A', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                  >
                    <Eye size={14} /> View
                  </button>
                  <button 
                    onClick={() => openEditModal(site)}
                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(site.id)}
                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 12px', color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Slide Panel */}
      <SlidePanel
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSite ? 'Edit Site' : 'Add New Site'}
        width={480}
        footer={
          <>
            <button type="button" className="sp-btn-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button 
              type="button" 
              className="sp-btn-submit" 
              onClick={(e) => {
                e.preventDefault();
                const form = document.getElementById('site-form');
                if (form.checkValidity()) {
                  handleSubmit(e);
                } else {
                  form.reportValidity();
                }
              }}
            >
              {editingSite ? 'Update Site' : 'Save Site'}
            </button>
          </>
        }
      >
        <form id="site-form" onSubmit={handleSubmit}>
          <div className="sp-field">
            <label>Site Name</label>
            <input 
              type="text" 
              value={formData.SiteName}
              onChange={(e) => setFormData({...formData, SiteName: e.target.value})}
              required
            />
          </div>
          <div className="sp-field">
            <label>Client</label>
            <select 
              value={formData.ClientId}
              onChange={(e) => setFormData({...formData, ClientId: e.target.value})}
              required
            >
              <option value="">Select a client</option>
              {Array.isArray(clients) && clients.map(c => <option key={c.id} value={c.id}>{c.Name}</option>)}
            </select>
          </div>
          <div className="sp-row">
            <div className="sp-field">
              <label>Length (ft)</label>
              <input 
                type="number" 
                value={formData.Length}
                onChange={(e) => setFormData({...formData, Length: e.target.value})}
                required
              />
            </div>
            <div className="sp-field">
              <label>Breadth (ft)</label>
              <input 
                type="number" 
                value={formData.Breadth}
                onChange={(e) => setFormData({...formData, Breadth: e.target.value})}
                required
              />
            </div>
          </div>
          <div className="sp-row">
            <div className="sp-field">
              <label>Facing</label>
              <input 
                type="text" 
                value={formData.Facing}
                onChange={(e) => setFormData({...formData, Facing: e.target.value})}
                placeholder="e.g. North"
              />
            </div>
            <div className="sp-field">
              <label>Site Value (₹)</label>
              <input 
                type="number" 
                value={formData.SiteValue}
                onChange={(e) => setFormData({...formData, SiteValue: e.target.value})}
                required
              />
            </div>
          </div>
          <div className="sp-row">
            <div className="sp-field">
              <label>Status</label>
              <select 
                value={formData.Status}
                onChange={(e) => setFormData({...formData, Status: e.target.value})}
              >
                <option value="Upcoming">Upcoming</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <div className="sp-field">
              <label>Progress (%)</label>
              <input 
                type="number" 
                min="0"
                max="100"
                value={formData.Progress}
                onChange={(e) => setFormData({...formData, Progress: e.target.value})}
                required
              />
            </div>
          </div>
          <div className="sp-field">
            <label>Next Milestone</label>
            <input 
              type="text" 
              value={formData.NextMilestone}
              onChange={(e) => setFormData({...formData, NextMilestone: e.target.value})}
              placeholder="e.g. Roof Slab Casting"
            />
          </div>
        </form>
      </SlidePanel>
    </div>
  );
};

export default SitePage;
