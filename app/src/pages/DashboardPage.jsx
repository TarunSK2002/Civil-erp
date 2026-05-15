import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Home, 
  CreditCard, 
  AlertCircle, 
  HardHat, 
  Package, 
  Calendar,
  ArrowUpRight,
  Loader2
} from 'lucide-react';
import StatCard from '../components/StatCard';
import api from '../api/axios';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/dashboard');
        setStats(response.data);
      } catch (err) {
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={40} className="animate-spin" color="var(--accent)" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px', backgroundColor: 'rgba(255, 82, 82, 0.1)', color: 'var(--error)', borderRadius: '12px', border: '1px solid var(--error)' }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', height: '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Dashboard Overview</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Welcome back! Here's what's happening today.</p>
        </div>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          backgroundColor: 'var(--bg-secondary)', 
          padding: '8px 16px', 
          borderRadius: '8px', 
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
          fontSize: '13px'
        }}>
          <Calendar size={16} />
          {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Main Stats Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '20px',
        marginBottom: '24px'
      }}>
        <StatCard 
          title="Total Clients" 
          value={stats.totalClients} 
          icon={Users} 
          color="#1A237E" 
        />
        <StatCard 
          title="Active Sites" 
          value={stats.activeSites} 
          icon={Home} 
          color="#1B5E20" 
        />
        <StatCard 
          title="Today's Payments" 
          value={`₹${stats.todayPayments.toLocaleString('en-IN')}`} 
          icon={CreditCard} 
          color="#E65100" 
        />
        <StatCard 
          title="Pending Payments" 
          value={`₹${stats.pendingPayments.toLocaleString('en-IN')}`} 
          icon={AlertCircle} 
          color="#B71C1C" 
        />
      </div>

      {/* Second Row Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '20px',
        marginBottom: '24px'
      }}>
        <StatCard 
          title="Total Labour" 
          value={stats.totalLabours} 
          icon={HardHat} 
          color="#4A148C" 
        />
        <StatCard 
          title="Total Materials" 
          value={stats.totalMaterials} 
          icon={Package} 
          color="#006064" 
        />
        <div style={{ 
          gridColumn: 'span 2',
          backgroundColor: 'var(--bg-card)',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '16px' }}>Sites Overview</h3>
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Upcoming</span>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#FFB300' }}>{stats.upcomingSites}</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${(stats.upcomingSites / (stats.totalClients || 1)) * 100}%`, height: '100%', backgroundColor: '#FFB300' }} />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Completed</span>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#4CAF50' }}>{stats.completedSites}</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${(stats.completedSites / (stats.totalClients || 1)) * 100}%`, height: '100%', backgroundColor: '#4CAF50' }} />
                </div>
              </div>
            </div>
          </div>
          <button style={{ 
            marginTop: '16px',
            background: 'none',
            border: 'none',
            color: 'var(--accent)',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            View Full Report <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
