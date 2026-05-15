import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';

const MainLayout = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Sidebar expanded={isSidebarExpanded} />
      
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden',
        backgroundColor: 'var(--bg-primary)'
      }}>
        <TopBar onToggleSidebar={() => setIsSidebarExpanded(!isSidebarExpanded)} />
        
        <main style={{ 
          flex: 1, 
          minHeight: 0,
          overflowY: 'auto', 
          scrollBehavior: 'smooth',
          position: 'relative'
        }}>
          <div className="fade-in" style={{ height: '100%', minHeight: 0 }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
