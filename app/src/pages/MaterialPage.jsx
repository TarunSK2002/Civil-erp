import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, X, Package, Currency, Loader2 } from 'lucide-react';
import api from '../api/axios';

const MaterialPage = () => {
  const location = useLocation();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  
  useEffect(() => {
    if (new URLSearchParams(location.search).get('action') === 'add') {
      setIsModalOpen(true);
    }
  }, [location]);
  // Form State
  const [formData, setFormData] = useState({
    Name: ''
  });

  useEffect(() => {
    fetchMaterials();
  }, [searchTerm]);

  const fetchMaterials = async () => {
    try {
      const response = await api.get(`/materials?search=${searchTerm}`);
      setMaterials(response.data);
    } catch (err) {
      console.error('Failed to fetch materials', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMaterial) {
        await api.put(`/materials/${editingMaterial.id}`, formData);
      } else {
        await api.post('/materials', formData);
      }
      setIsModalOpen(false);
      setEditingMaterial(null);
      setFormData({ Name: '' });
      fetchMaterials();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to save material');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this material?')) {
      try {
        await api.delete(`/materials/${id}`);
        fetchMaterials();
      } catch (err) {
        alert(err.response?.data?.msg || 'Failed to delete material');
      }
    }
  };

  return (
    <div className="data-page" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Material Inventory</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Define materials for purchase tracking.</p>
        </div>
        <button 
          onClick={() => { setEditingMaterial(null); setFormData({ Name: '' }); setIsModalOpen(true); }}
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
          <Plus size={20} /> Add New Material
        </button>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ position: 'relative', width: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search materials..." 
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

      <div className="data-table-scroll" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>MATERIAL NAME</th>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>LAST UPDATED</th>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center' }}><Loader2 className="animate-spin" color="var(--accent)" /></td></tr>
            ) : materials.length === 0 ? (
              <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No materials found</td></tr>
            ) : materials.map(material => (
              <tr key={material.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Package size={18} color="var(--accent)" />
                    <span style={{ fontWeight: '600' }}>{material.Name}</span>
                  </div>
                </td>
                <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  {new Date(material.CreatedAt).toLocaleDateString()}
                </td>
                <td style={{ padding: '16px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => { setEditingMaterial(material); setFormData({ Name: material.Name }); setIsModalOpen(true); }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)' }}
                    >
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(material.id)} style={{ background: 'none', border: 'none', color: 'var(--error)' }}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '32px', borderRadius: '16px', width: '400px', border: '1px solid var(--border)' }} className="fade-in">
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px' }}>{editingMaterial ? 'Edit Material' : 'Add Material'}</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Material Name</label>
                <input 
                  type="text" 
                  value={formData.Name}
                  onChange={(e) => setFormData({...formData, Name: e.target.value})}
                  required
                  style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'none', color: 'var(--text-primary)' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--accent)', color: '#0F0F1A', fontWeight: 'bold' }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialPage;
