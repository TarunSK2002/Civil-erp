import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, X, Check, Loader2 } from 'lucide-react';
import api from '../api/axios';

const ClientPage = () => {
  const location = useLocation();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  
  useEffect(() => {
    if (new URLSearchParams(location.search).get('action') === 'add') {
      setIsModalOpen(true);
    }
  }, [location]);
  // Form State
  const [formData, setFormData] = useState({
    Name: '',
    MobileNumber: '',
    PaymentType: 'Cash'
  });

  useEffect(() => {
    fetchClients();
  }, [searchTerm]);

  const fetchClients = async () => {
    try {
      const response = await api.get(`/clients?search=${searchTerm}`);
      setClients(response.data);
    } catch (err) {
      console.error('Failed to fetch clients', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await api.put(`/clients/${editingClient.id}`, formData);
      } else {
        await api.post('/clients', formData);
      }
      setIsModalOpen(false);
      setEditingClient(null);
      setFormData({ Name: '', MobileNumber: '', PaymentType: 'Cash' });
      fetchClients();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to save client');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        await api.delete(`/clients/${id}`);
        fetchClients();
      } catch (err) {
        alert(err.response?.data?.msg || 'Failed to delete client');
      }
    }
  };

  const openEditModal = (client) => {
    setEditingClient(client);
    setFormData({
      Name: client.Name,
      MobileNumber: client.MobileNumber,
      PaymentType: client.PaymentType
    });
    setIsModalOpen(true);
  };

  return (
    <div className="data-page" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Client Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Add and manage your construction clients.</p>
        </div>
        <button 
          onClick={() => { setEditingClient(null); setFormData({ Name: '', MobileNumber: '', PaymentType: 'Cash' }); setIsModalOpen(true); }}
          style={{ 
            backgroundColor: 'var(--accent)', 
            color: '#0F0F1A', 
            border: 'none', 
            borderRadius: '8px', 
            padding: '10px 20px', 
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Plus size={20} /> Add New Client
        </button>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '16px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search by name or mobile..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', 
              backgroundColor: 'var(--bg-card)', 
              border: '1px solid var(--border)', 
              borderRadius: '8px', 
              padding: '12px 12px 12px 40px', 
              color: 'var(--text-primary)',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="data-table-scroll" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>CLIENT NAME</th>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>MOBILE NUMBER</th>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>PAYMENT TYPE</th>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>CREATED AT</th>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ padding: '40px', textAlign: 'center' }}>
                  <Loader2 className="animate-spin" color="var(--accent)" />
                </td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No clients found</td>
              </tr>
            ) : clients.map(client => (
              <tr key={client.id} style={{ borderBottom: '1px solid var(--border)', transition: 'var(--transition)' }}>
                <td style={{ padding: '16px', fontWeight: '600' }}>{client.Name}</td>
                <td style={{ padding: '16px' }}>{client.MobileNumber}</td>
                <td style={{ padding: '16px' }}>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    backgroundColor: 'rgba(33, 150, 243, 0.1)', 
                    color: 'var(--info)',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {client.PaymentType}
                  </span>
                </td>
                <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  {new Date(client.CreatedAt).toLocaleDateString()}
                </td>
                <td style={{ padding: '16px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => openEditModal(client)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', padding: '6px' }}
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(client.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--error)', padding: '6px' }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={{ 
          position: 'fixed', 
          top: 0, left: 0, width: '100%', height: '100%', 
          backgroundColor: 'rgba(0,0,0,0.7)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          zIndex: 100 
        }}>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '32px', borderRadius: '16px', width: '450px', border: '1px solid var(--border)' }} className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>{editingClient ? 'Edit Client' : 'Add New Client'}</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Client Name</label>
                <input 
                  type="text" 
                  value={formData.Name}
                  onChange={(e) => setFormData({...formData, Name: e.target.value})}
                  required
                  style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Mobile Number</label>
                <input 
                  type="text" 
                  value={formData.MobileNumber}
                  onChange={(e) => setFormData({...formData, MobileNumber: e.target.value})}
                  required
                  style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>
              <div style={{ marginBottom: '32px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Payment Type</label>
                <select 
                  value={formData.PaymentType}
                  onChange={(e) => setFormData({...formData, PaymentType: e.target.value})}
                  style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', color: 'var(--text-primary)', outline: 'none' }}
                >
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'none', color: 'var(--text-primary)' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--accent)', color: '#0F0F1A', fontWeight: 'bold' }}
                >
                  {editingClient ? 'Update Client' : 'Save Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientPage;
