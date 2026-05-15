import React, { useState, useEffect } from 'react';
import { ClipboardList, CheckCircle2, Clock, AlertCircle, Search, Filter } from 'lucide-react';
import api from '../api/axios';

const SiteStatusPage = () => {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    fetchSites();
  }, [filter]);

  const fetchSites = async () => {
    try {
      const response = await api.get(`/sites?status=${filter}`);
      setSites(response.data);
    } catch (err) {
      console.error('Failed to fetch sites', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'Completed': return <CheckCircle2 size={24} color="var(--success)" />;
      case 'In Progress': return <Clock size={24} color="var(--info)" />;
      case 'Upcoming': return <AlertCircle size={24} color="var(--warning)" />;
      default: return <ClipboardList size={24} color="var(--text-muted)" />;
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Site Status Tracker</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Monitor the progress and current phase of all active projects.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {['All', 'Upcoming', 'In Progress', 'Completed'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              style={{ 
                padding: '8px 16px', 
                borderRadius: '8px', 
                border: '1px solid var(--border)', 
                background: filter === f ? 'var(--accent)' : 'var(--bg-card)',
                color: filter === f ? '#0F0F1A' : 'var(--text-primary)',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '20px' }}>
        {sites.map(site => (
          <div key={site.id} style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', padding: '24px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(255,179,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {getStatusIcon(site.Status)}
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>{site.SiteName}</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Client: {site.Client?.Name}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: site.Status === 'Completed' ? 'var(--success)' : 'var(--info)' }}>
                  {site.Status === 'Completed' ? '100%' : `${site.Progress || 0}%`} Complete
                </span>
                <div style={{ width: '80px', height: '4px', backgroundColor: 'var(--bg-primary)', borderRadius: '2px', marginTop: '6px' }}>
                  <div style={{ width: site.Status === 'Completed' ? '100%' : `${site.Progress || 0}%`, height: '100%', backgroundColor: site.Status === 'Completed' ? 'var(--success)' : 'var(--accent)', borderRadius: '2px' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ padding: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: '8px' }}>
                <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>LABOURS</p>
                <p style={{ fontSize: '14px', fontWeight: 'bold' }}>{site.ActiveLabourCount || 0} Active</p>
              </div>
              <div style={{ padding: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: '8px' }}>
                <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>MATERIALS</p>
                <p style={{ fontSize: '14px', fontWeight: 'bold' }}>{site.MaterialItemCount || 0} Items</p>
              </div>
              <div style={{ padding: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: '8px' }}>
                <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>BUDGET</p>
                <p style={{ fontSize: '14px', fontWeight: 'bold' }}>₹{(parseFloat(site.SiteValue) / 100000).toFixed(1)}L</p>
              </div>
            </div>

            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              <strong>Next Milestone:</strong> {site.NextMilestone || 'No milestone set'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SiteStatusPage;
