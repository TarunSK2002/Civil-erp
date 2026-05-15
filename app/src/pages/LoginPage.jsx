import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HardHat, User, Lock, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { username, password });
      login(response.data);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.msg || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: 'var(--bg-primary)',
      backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255, 179, 0, 0.05) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(33, 150, 243, 0.05) 0%, transparent 40%)'
    }}>
      <div style={{ 
        width: '400px', 
        backgroundColor: 'var(--bg-card)', 
        borderRadius: '20px', 
        padding: '40px',
        border: '1px solid var(--border)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        textAlign: 'center'
      }} className="fade-in">
        
        {/* Logo */}
        <div style={{ 
          backgroundColor: 'var(--accent)', 
          width: '64px', 
          height: '64px', 
          borderRadius: '16px', 
          margin: '0 auto 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 15px -3px rgba(255, 179, 0, 0.3)'
        }}>
          <HardHat size={32} color="#0F0F1A" />
        </div>

        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '8px' }}>Welcome Back</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '32px' }}>Login to Jeeva Construction Manager</p>

        {error && (
          <div style={{ 
            backgroundColor: 'rgba(255, 82, 82, 0.1)', 
            border: '1px solid var(--error)', 
            borderRadius: '8px', 
            padding: '12px', 
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: 'var(--error)',
            fontSize: '13px'
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px', textAlign: 'left' }}>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '500' }}>Username</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                style={{ 
                  width: '100%', 
                  backgroundColor: 'var(--bg-input)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '10px', 
                  padding: '12px 12px 12px 40px', 
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '32px', textAlign: 'left' }}>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '500' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ 
                  width: '100%', 
                  backgroundColor: 'var(--bg-input)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '10px', 
                  padding: '12px 12px 12px 40px', 
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%', 
              backgroundColor: 'var(--accent)', 
              color: '#0F0F1A', 
              border: 'none', 
              borderRadius: '10px', 
              padding: '14px', 
              fontWeight: '700', 
              fontSize: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 4px 14px 0 rgba(255, 179, 0, 0.3)',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : (
              <>
                <span>Login</span>
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
