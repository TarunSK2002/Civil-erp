import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpeg';
import { 
  LayoutDashboard, 
  Users, 
  Home, 
  HardHat, 
  Package, 
  CreditCard, 
  ClipboardList, 
  ShoppingCart, 
  BarChart3, 
  Shield, 
  LogOut,
  ChevronRight,
  Table2,
  UserCheck,
  ClipboardCheck,
  Settings2,
  Wallet
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SidebarItem = ({ to, icon: Icon, label, expanded }) => (
  <NavLink
    to={to}
    end
    style={{ textDecoration: 'none' }}
  >
    {({ isActive }) => (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 20px',
        margin: '4px 12px',
        borderRadius: '12px',
        color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
        backgroundColor: isActive ? 'rgba(255, 179, 0, 0.1)' : 'transparent',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        justifyContent: expanded ? 'flex-start' : 'center',
        fontWeight: isActive ? '600' : '500'
      }}>
        <Icon size={22} />
        {expanded && (
          <span style={{ marginLeft: '14px', fontSize: '14px' }} className="fade-in">
            {label}
          </span>
        )}
        {expanded && isActive && (
          <div style={{ 
            marginLeft: 'auto', 
            width: '6px', 
            height: '6px', 
            borderRadius: '50%', 
            backgroundColor: 'var(--accent)' 
          }} />
        )}
      </div>
    )}
  </NavLink>
);

const Sidebar = ({ expanded }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside style={{
      width: expanded ? '260px' : '85px',
      backgroundColor: 'var(--bg-secondary)',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid var(--border)',
      transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      overflowX: 'hidden',
      zIndex: 50
    }}>
      {/* Brand */}
      <div style={{ 
        padding: '32px 24px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '14px',
        justifyContent: expanded ? 'flex-start' : 'center'
      }}>
        <div style={{ 
          minWidth: '40px', 
          height: '40px', 
          borderRadius: '12px', 
          backgroundColor: '#FFF', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: '#0F0F1A',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
          overflow: 'hidden'
        }}>
          <img src={logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        {expanded && (
          <div className="fade-in">
            <h1 style={{ fontSize: '18px', fontWeight: '900', margin: 0, color: 'var(--accent)', lineHeight: 1, letterSpacing: '0.5px' }}>JEEVA</h1>
            <p style={{ fontSize: '9px', margin: 0, color: 'var(--text-muted)', fontWeight: '800', letterSpacing: '1px' }}>CLOUD ERP</p>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '24px' }} className="custom-scrollbar">
        <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" expanded={expanded} />
        
        <div style={{ margin: '20px 0 10px', height: '1px', backgroundColor: 'var(--border)', opacity: 0.5, marginInline: '20px' }} />

        <SidebarItem to="/clients" icon={Users} label="Clients" expanded={expanded} />
        <SidebarItem to="/sites" icon={Home} label="Sites" expanded={expanded} />
        {/* <SidebarItem to="/sites/status" icon={ClipboardList} label="Site Status" expanded={expanded} /> */}
        <SidebarItem to="/materials/purchase" icon={ShoppingCart} label="Purchase" expanded={expanded} />
        <SidebarItem to="/labour" icon={HardHat} label="Labour" expanded={expanded} />
        <SidebarItem to="/materials" icon={Package} label="Dealers" expanded={expanded} />
        <SidebarItem to="/payments" icon={CreditCard} label="Payments" expanded={expanded} />
        <SidebarItem to="/reports" icon={BarChart3} label="Reports" expanded={expanded} />
        
        <div style={{ margin: '20px 0 10px', height: '1px', backgroundColor: 'var(--border)', opacity: 0.5, marginInline: '20px' }} />

        <SidebarItem to="/payees" icon={UserCheck} label="Payees" expanded={expanded} />
        <SidebarItem to="/weekly-pay-sheet" icon={Table2} label="Weekly Pay Sheet" expanded={expanded} />
        <SidebarItem to="/personal-expenses" icon={Wallet} label="Petty Cash" expanded={expanded} />
        <SidebarItem to="/attendance-pay-sheet" icon={ClipboardCheck} label="Attendance Sheet" expanded={expanded} />
        <SidebarItem to="/shift-master" icon={Settings2} label="Shift Master" expanded={expanded} />
        <SidebarItem to="/person-type-master" icon={Users} label="Person Types" expanded={expanded} />
        
        {user?.role === 'ADMIN' && (
          <SidebarItem to="/admin" icon={Shield} label="Employee MGMT" expanded={expanded} />
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
