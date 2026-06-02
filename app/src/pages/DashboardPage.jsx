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
  Loader2,
  Coins,
  Briefcase,
  Clock,
  Settings,
  ShoppingCart,
  ClipboardList,
  FileSpreadsheet,
  Wallet,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../components/StatCard';
import api from '../api/axios';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const navigate = useNavigate();

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

  const masterDataCards = [
    { title: 'Clients', count: stats.totalClients, path: '/clients', icon: Users, color: '#4f46e5', desc: 'Manage client details & site ownership' },
    { title: 'Sites', count: (stats.activeSites || 0) + (stats.completedSites || 0) + (stats.upcomingSites || 0), path: '/sites', icon: Home, color: '#16a34a', desc: 'Track construction site status' },
    { title: 'Labour Master', count: stats.totalLabours, path: '/labour', icon: HardHat, color: '#9333ea', desc: 'Manage construction worker database' },
    { title: 'Material Dealers', count: stats.totalMaterials, path: '/materials', icon: Package, color: '#0891b2', desc: 'Dealers & materials catalog' },
    { title: 'Payees (Masons)', count: stats.totalPayees, path: '/payees', icon: Coins, color: '#eab308', desc: 'Masons, sub-contractors and payees' },
    { title: 'Person Types', count: stats.totalPersonTypes, path: '/person-type-master', icon: Briefcase, color: '#ec4899', desc: 'Labour category & daily wage settings' },
    { title: 'Shift Master', count: stats.totalShiftTypes, path: '/shift-master', icon: Clock, color: '#f97316', desc: 'Manage work shifts & timing' },
    { title: 'Material Types', count: stats.totalMaterialTypes, path: '/materials', icon: Settings, color: '#3b82f6', desc: 'Material category units & rates' },
    { title: 'Material Purchases', count: stats.totalPurchases, path: '/materials/purchase', icon: ShoppingCart, color: '#10b981', desc: 'Log material procurement records' },
    { title: 'Attendance Pay Sheets', count: stats.totalAttendanceSheets, path: '/attendance-pay-sheet', icon: ClipboardList, color: '#f43f5e', desc: 'Manage daily attendance sheets' },
    { title: 'Weekly Pay Sheets', count: stats.totalWeeklySheets, path: '/weekly-pay-sheet', icon: FileSpreadsheet, color: '#8b5cf6', desc: 'Weekly wages & billing summaries' },
    { title: 'Petty Cash', count: stats.totalPettyCash, path: '/personal-expenses', icon: Wallet, color: '#14b8a6', desc: 'Record personal and office expenses' },
  ];

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
          <button 
            onClick={() => navigate('/reports')}
            style={{ 
              marginTop: '16px',
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer'
            }}
          >
            View Full Report <ArrowUpRight size={14} />
          </button>
        </div>
      </div>

      {/* Master Data Quick Access Section */}
      <div style={{ marginTop: '32px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '16px' }}>Master Data & Management Modules</h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '16px'
        }}>
          {masterDataCards.map((card, idx) => {
            const Icon = card.icon;
            const isHovered = hoveredCard === idx;
            return (
              <div 
                key={card.title}
                onClick={() => navigate(card.path)}
                onMouseEnter={() => setHoveredCard(idx)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '12px',
                  padding: '18px',
                  border: isHovered ? `1px solid ${card.color}` : '1px solid var(--border)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  transition: 'all 0.2s ease-in-out',
                  transform: isHovered ? 'translateY(-2px)' : 'none',
                  boxShadow: isHovered ? `0 4px 12px ${card.color}15` : 'none'
                }}
              >
                <div style={{ 
                  backgroundColor: `${card.color}15`, 
                  color: card.color, 
                  borderRadius: '10px', 
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}>
                  <Icon size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.title}</span>
                    <span style={{ 
                      fontSize: '11px', 
                      fontWeight: 'bold', 
                      backgroundColor: 'var(--bg-secondary)', 
                      padding: '2px 8px', 
                      borderRadius: '12px',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border)'
                    }}>
                      {card.count !== undefined ? card.count : 0}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.desc}</p>
                </div>
                <div style={{ 
                  color: isHovered ? card.color : 'var(--text-muted)', 
                  transition: 'all 0.2s ease',
                  transform: isHovered ? 'translateX(2px)' : 'none'
                }}>
                  <ChevronRight size={18} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
