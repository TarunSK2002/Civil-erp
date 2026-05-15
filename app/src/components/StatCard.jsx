import React from 'react';

const StatCard = ({ title, value, icon: Icon, color, subValue }) => {
  return (
    <div style={{ 
      backgroundColor: 'var(--bg-card)',
      borderRadius: '12px',
      padding: '20px',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative colored bar at top */}
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '4px', 
        backgroundColor: color || 'var(--accent)' 
      }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ 
          backgroundColor: `${color}20` || 'rgba(255, 179, 0, 0.1)',
          padding: '10px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color || 'var(--accent)'
        }}>
          <Icon size={24} />
        </div>
        <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>{title}</p>
      </div>

      <div>
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{value}</h2>
        {subValue && (
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{subValue}</p>
        )}
      </div>
    </div>
  );
};

export default StatCard;
