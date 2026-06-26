import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { syncApi } from '../api/syncApi';

const SyncStatus = () => {
  const [status, setStatus] = useState({ isOnline: false, pendingCount: 0, error: null });
  const [syncing, setSyncing] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchStatus = async () => {
    try {
      const data = await syncApi.getStatus();
      setStatus({ ...data, error: null });
    } catch (err) {
      console.error('Failed to fetch sync status:', err);
      // Don't show hard error UI, just keep offline state
      setStatus(prev => ({ ...prev, isOnline: false }));
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchStatus();

    // Listen to real-time IPC events from Electron Main
    if (window.electronAPI && window.electronAPI.onSyncStatusChange) {
      const unsubscribe = window.electronAPI.onSyncStatusChange((data) => {
        setStatus(data);
      });
      return () => unsubscribe();
    } else {
      // Fallback: poll every 10 seconds in browser/dev mode
      const interval = setInterval(fetchStatus, 10000);
      return () => clearInterval(interval);
    }
  }, []);

  const handleSyncNow = async (e) => {
    e.stopPropagation();
    if (syncing || !status.isOnline) return;
    setSyncing(true);
    try {
      const res = await syncApi.triggerSync();
      setStatus({ isOnline: res.isOnline, pendingCount: res.pendingCount, error: null });
    } catch (err) {
      console.error('Manual sync failed:', err);
      setStatus(prev => ({ ...prev, error: 'Sync failed: Connection issue' }));
    } finally {
      setSyncing(false);
    }
  };

  const isOnline = status.isOnline;
  const pending = status.pendingCount;

  // Select color & icon based on state
  let statusColor = 'var(--text-muted)';
  let statusBg = 'rgba(255, 255, 255, 0.05)';
  let Icon = CloudOff;
  let statusText = 'Offline';

  if (isOnline) {
    if (pending > 0) {
      statusColor = '#2196F3'; // Blue
      statusBg = 'rgba(33, 150, 243, 0.1)';
      Icon = Cloud;
      statusText = 'Pending Sync';
    } else {
      statusColor = '#4CAF50'; // Green
      statusBg = 'rgba(76, 175, 80, 0.1)';
      Icon = Cloud;
      statusText = 'Synced';
    }
  }

  return (
    <div 
      style={{ position: 'relative' }}
      onMouseEnter={() => setShowDropdown(true)}
      onMouseLeave={() => setShowDropdown(false)}
    >
      {/* TopBar Interactive Badge */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          borderRadius: '20px',
          backgroundColor: statusBg,
          border: `1px solid ${statusColor}40`,
          color: statusColor,
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          fontSize: '13px',
          fontWeight: '600'
        }}
      >
        <Icon size={18} className={syncing ? 'spin-anim' : ''} />
        <span>{isOnline ? (pending > 0 ? `${pending} Pending` : 'Synced') : 'Offline'}</span>
        
        {pending > 0 && (
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isOnline ? '#2196F3' : '#FF9800',
            display: 'inline-block',
            animation: 'pulse 1.5s infinite'
          }} />
        )}
      </div>

      {/* Glassmorphic Details Dropdown */}
      {showDropdown && (
        <div 
          className="fade-in"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            width: '260px',
            backgroundColor: 'var(--bg-secondary)',
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>CLOUD CONNECTION</span>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px',
              fontSize: '11px',
              fontWeight: 'bold',
              color: isOnline ? '#4CAF50' : '#FF9800'
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: isOnline ? '#4CAF50' : '#FF9800',
                display: 'inline-block'
              }} />
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </div>
          </div>

          <div style={{ height: '1px', backgroundColor: 'var(--border)' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Pending Changes:</span>
            <span style={{ fontWeight: 'bold', color: pending > 0 ? '#FF9800' : 'var(--text-primary)' }}>
              {pending}
            </span>
          </div>

          {status.error && (
            <div style={{ 
              display: 'flex', 
              gap: '6px', 
              fontSize: '11px', 
              color: '#FF5252', 
              backgroundColor: 'rgba(255, 82, 82, 0.1)',
              padding: '6px 8px',
              borderRadius: '6px'
            }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>{status.error}</span>
            </div>
          )}

          {pending > 0 && !isOnline && (
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Your changes are saved locally and will automatically sync when connection is restored.
            </p>
          )}

          <button
            onClick={handleSyncNow}
            disabled={syncing || !isOnline || pending === 0}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: isOnline && pending > 0 ? 'var(--accent)' : 'rgba(255, 255, 255, 0.05)',
              color: isOnline && pending > 0 ? '#000' : 'var(--text-muted)',
              cursor: isOnline && pending > 0 && !syncing ? 'pointer' : 'not-allowed',
              fontWeight: '700',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            <RefreshCw size={14} className={syncing ? 'spin-anim' : ''} />
            {syncing ? 'Synchronizing...' : 'Force Sync Now'}
          </button>
        </div>
      )}

      {/* Add custom CSS animations for pulse and spin */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(33, 150, 243, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(33, 150, 243, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(33, 150, 243, 0); }
        }
        .spin-anim {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SyncStatus;
