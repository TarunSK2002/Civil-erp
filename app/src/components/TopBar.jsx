import { Menu, Sun, Moon, LogOut } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import SyncStatus from './SyncStatus';

const TopBar = ({ onToggleSidebar }) => {
  const { theme, toggleTheme } = useTheme();
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header style={{ 
      height: '64px', 
      backgroundColor: 'var(--bg-secondary)', 
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      zIndex: 10
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          onClick={onToggleSidebar}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Menu size={24} />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginRight: '16px', paddingRight: '16px', borderRight: '1px solid var(--border)' }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            borderRadius: '50%', 
            backgroundColor: 'var(--bg-primary)', 
            border: '2px solid var(--accent)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: 'var(--accent)', 
            fontWeight: 'bold',
            fontSize: '14px'
          }}>
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div style={{ lineHeight: 1 }}>
            <p style={{ fontSize: '13px', fontWeight: '700', margin: 0 }}>{user?.username}</p>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>{user?.role}</span>
          </div>
        </div>

        <SyncStatus />

        <button 
          onClick={toggleTheme}
          style={{ 
            background: 'var(--bg-primary)', 
            border: '1px solid var(--border)', 
            borderRadius: '8px',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent)'
          }}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        
        <button 
          onClick={handleLogout}
          style={{ 
            background: 'rgba(255, 82, 82, 0.1)', 
            border: 'none', 
            borderRadius: '8px',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#FF5252',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 82, 82, 0.2)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 82, 82, 0.1)'}
        >
          <LogOut size={18} /> Logout
        </button>
      </div>
    </header>
  );
};

export default TopBar;
