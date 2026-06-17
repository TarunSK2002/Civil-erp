import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IndianRupee, TrendingDown, Calendar, Search, Home, ArrowUpRight } from 'lucide-react';
import api from '../api/axios';

const SitePaymentSummaryPage = () => {
  const [sites, setSites] = useState([]);
  const [todayPayments, setTodayPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sitesRes, paymentsRes] = await Promise.all([
        api.get('/sites'),
        api.get('/payments?fromDate=' + new Date().toISOString().split('T')[0])
      ]);
      setSites(sitesRes.data);
      setTodayPayments(paymentsRes.data);
    } catch (err) {
      console.error('Failed to fetch site payment data', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSites = sites.filter(s => 
    searchTerm === '' || s.SiteName?.toLowerCase().includes(searchTerm.toLowerCase()) || s.Client?.Name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="data-page" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Site Payment Summary</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Detailed financial standing for each project and daily collections.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', flex: 1, minHeight: 0 }}>
        {/* Today's Collection Card */}
        <div style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(0,200,83,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
              <IndianRupee size={20} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Today's Collection</h3>
          </div>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--success)', marginBottom: '8px' }}>
            ₹{todayPayments.reduce((acc, p) => acc + parseFloat(p.Amount), 0).toLocaleString('en-IN')}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{todayPayments.length} Transactions captured today.</p>
          
          <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
             {todayPayments.slice(0, 3).map(p => (
               <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                 <p style={{ fontSize: '13px' }}>{p.Site?.SiteName}</p>
                 <p style={{ fontSize: '13px', fontWeight: 'bold' }}>₹{parseFloat(p.Amount).toLocaleString()}</p>
               </div>
             ))}
          </div>
        </div>

        {/* Site-wise Breakdown */}
        <div className="data-table-scroll" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>All Site Financial Standing</h3>
            <div style={{ position: 'relative' }}>
               <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
               <input 
                 type="text" 
                 placeholder="Search site..." 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px 6px 30px', fontSize: '12px', color: 'var(--text-primary)', outline: 'none' }} 
               />
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '16px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>SITE NAME</th>
                <th style={{ padding: '16px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>SITE VALUE</th>
                <th style={{ padding: '16px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>RECEIVED</th>
                <th style={{ padding: '16px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>BALANCE</th>
                <th style={{ padding: '16px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>COLLECTION %</th>
                <th style={{ padding: '16px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredSites.map(site => {
                const siteValue = parseFloat(site.SiteValue || 0);
                const received = parseFloat(site.ReceivedAmount || 0);
                const balance = parseFloat(site.BalanceAmount || 0);
                const pct = siteValue > 0 ? Math.min((received / siteValue) * 100, 100) : 0;
                return (
                <tr key={site.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '16px' }}>
                    <p style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>{site.SiteName}</p>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Client: {site.Client?.Name}</span>
                  </td>
                  <td style={{ padding: '16px', fontWeight: '500' }}>₹{siteValue.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '16px', color: 'var(--success)', fontWeight: 'bold' }}>₹{received.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '16px', color: balance > 0 ? 'var(--error)' : 'var(--success)', fontWeight: 'bold' }}>₹{balance.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <div style={{ flex: 1, height: '4px', backgroundColor: 'var(--bg-primary)', borderRadius: '2px' }}>
                         <div style={{ width: `${pct}%`, height: '100%', backgroundColor: pct >= 100 ? 'var(--success)' : 'var(--accent)', borderRadius: '2px', transition: 'width 0.5s ease' }} />
                       </div>
                       <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '35px' }}>{pct.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button 
                      onClick={() => navigate(`/sites/${site.id}`)}
                      style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'none', color: 'var(--text-primary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto', cursor: 'pointer' }}
                    >
                      Details <ArrowUpRight size={14} />
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SitePaymentSummaryPage;
