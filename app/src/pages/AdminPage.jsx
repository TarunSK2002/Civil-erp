import React, { useState, useEffect } from 'react';
import { Shield, UserPlus, Trash2, Key, Users, Loader2, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import api from '../api/axios';
import { useSortableData } from '../hooks/useSortableData';

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const { items: sortedUsers, requestSort, sortConfig } = useSortableData(users);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getSortIcon = (key) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown size={14} style={{ marginLeft: '6px', opacity: 0.5, verticalAlign: 'middle' }} />;
    }
    return sortConfig.direction === 'ascending' 
      ? <ArrowUp size={14} style={{ marginLeft: '6px', color: 'var(--accent)', verticalAlign: 'middle' }} />
      : <ArrowDown size={14} style={{ marginLeft: '6px', color: 'var(--accent)', verticalAlign: 'middle' }} />;
  };
  const [formData, setFormData] = useState({
    Username: '',
    Password: '',
    FullName: '',
    Role: 'EMP'
  });

  useEffect(() => {
    fetchUsers();
    fetchLogs();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const response = await api.get('/admin/logs');
      setLogs(response.data);
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', formData);
      setIsModalOpen(false);
      setFormData({ Username: '', Password: '', FullName: '', Role: 'EMP' });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to create user');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await api.delete(`/admin/users/${id}`);
        fetchUsers();
      } catch (err) {
        alert(err.response?.data?.msg || 'Failed to delete user');
      }
    }
  };

  const getActionColor = (actionType) => {
    switch (actionType) {
      case 'Pay': case 'PayAll': return '#4CAF50';
      case 'Unpay': case 'Delete': return '#F44336';
      case 'CellEdit': case 'DiscountChange': return '#FF9800';
      case 'Skip': return '#9E9E9E';
      case 'ExtraPayment': return '#9C27B0';
      case 'SplitPay': return '#2196F3';
      default: return 'var(--accent)';
    }
  };

  return (
    <div className="data-page" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Admin Control Center & System Audit Log</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Manage system users, roles, and review action audit trail logs.</p>
        </div>
        {activeTab === 'users' && (
          <button 
            onClick={() => setIsModalOpen(true)}
            style={{ backgroundColor: 'var(--accent)', color: '#0F0F1A', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <UserPlus size={20} /> Add New Employee
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '700',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'users' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'users' ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: 'pointer'
          }}
        >
          Employee Users ({users.length})
        </button>
        <button
          onClick={() => { setActiveTab('logs'); fetchLogs(); }}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '700',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'logs' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'logs' ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: 'pointer'
          }}
        >
          Action Log Audit Table ({logs.length})
        </button>
      </div>

      {activeTab === 'users' ? (
        <div className="data-table-scroll" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                <th onClick={() => requestSort('FullName')} style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>FULL NAME {getSortIcon('FullName')}</th>
                <th onClick={() => requestSort('Username')} style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>USERNAME {getSortIcon('Username')}</th>
                <th onClick={() => requestSort('Role')} style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>ROLE {getSortIcon('Role')}</th>
                <th onClick={() => requestSort('CreatedAt')} style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>CREATED AT {getSortIcon('CreatedAt')}</th>
                <th style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center' }}><Loader2 className="animate-spin" color="var(--accent)" /></td></tr>
              ) : sortedUsers.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No users found</td></tr>
              ) : sortedUsers.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                        <Users size={16} />
                      </div>
                      <strong>{u.FullName}</strong>
                    </div>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{u.Username}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ 
                      padding: '4px 8px', borderRadius: '4px', 
                      backgroundColor: u.Role === 'ADMIN' ? 'rgba(255,179,0,0.1)' : 'rgba(255,255,255,0.05)', 
                      color: u.Role === 'ADMIN' ? 'var(--accent)' : 'var(--text-secondary)',
                      fontSize: '11px', fontWeight: '800'
                    }}>
                      {u.Role}
                    </span>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    {new Date(u.CreatedAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button onClick={() => handleDelete(u.id)} style={{ background: 'none', border: 'none', color: 'var(--error)', visibility: u.Username === 'admin' ? 'hidden' : 'visible' }}>
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Action Log Audit Table */
        <div className="data-table-scroll" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>TIMESTAMP</th>
                <th style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>ACTION TYPE</th>
                <th style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>ENTITY TYPE</th>
                <th style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>PAY SHEET</th>
                <th style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>USER</th>
                <th style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {logsLoading ? (
                <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center' }}><Loader2 className="animate-spin" color="var(--accent)" /></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No audit action logs recorded yet</td></tr>
              ) : logs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    {new Date(log.CreatedAt).toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      padding: '4px 10px', borderRadius: '6px',
                      backgroundColor: `${getActionColor(log.ActionType)}15`,
                      color: getActionColor(log.ActionType),
                      fontSize: '12px', fontWeight: '800'
                    }}>
                      {log.ActionType}
                    </span>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>
                    {log.EntityType} #{log.EntityId}
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    {log.Sheet?.Title || `Sheet #${log.WeeklyPaySheetId}`}
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>
                    {log.User ? `${log.User.FullName || log.User.Username} (${log.User.Role})` : 'System / Admin'}
                  </td>
                  <td style={{ padding: '16px' }}>
                    {log.IsUndone ? (
                      <span style={{ color: 'var(--error)', fontSize: '12px', fontWeight: '700' }}>Undone</span>
                    ) : (
                      <span style={{ color: '#4CAF50', fontSize: '12px', fontWeight: '700' }}>Active</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '32px', borderRadius: '16px', width: '400px', border: '1px solid var(--border)' }} className="fade-in">
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px' }}>Add New Employee</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Full Name</label>
                <input type="text" value={formData.FullName} onChange={(e) => setFormData({...formData, FullName: e.target.value})} required style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Username</label>
                <input type="text" value={formData.Username} onChange={(e) => setFormData({...formData, Username: e.target.value})} required style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Password</label>
                <input type="password" value={formData.Password} onChange={(e) => setFormData({...formData, Password: e.target.value})} required style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Role</label>
                <select value={formData.Role} onChange={(e) => setFormData({...formData, Role: e.target.value})} style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}>
                  <option value="EMP">Employee</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'none', color: 'var(--text-primary)' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--accent)', color: '#0F0F1A', fontWeight: 'bold' }}>Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
