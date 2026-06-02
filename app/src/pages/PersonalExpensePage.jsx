import React, { useState, useEffect } from 'react';
import {
  Wallet, Plus, Trash2, Loader2, Calendar, Tag, FileText, ArrowDownRight, ArrowUpRight
} from 'lucide-react';
import api from '../api/axios';
import './PersonalExpensePage.css';

const PersonalExpensePage = () => {
  const [expenses, setExpenses] = useState([]);
  const [pettyCash, setPettyCash] = useState({ currentBalance: 0, history: [] });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  
  // Expense Form State
  const [form, setForm] = useState({
    Description: '',
    Amount: '',
    ExpenseDate: new Date().toISOString().split('T')[0],
    Category: 'Office',
    Notes: ''
  });

  const categories = ['Office', 'Transport', 'Food', 'Tea/Snacks', 'Personal', 'Other'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [expenseRes, pettyRes] = await Promise.all([
        api.get('/personal-expenses'),
        api.get('/petty-cash')
      ]);
      setExpenses(expenseRes.data);
      setPettyCash(pettyRes.data);
    } catch (err) {
      console.error('Failed to fetch personal expenses or petty cash', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!form.Description.trim() || !form.Amount || parseFloat(form.Amount) <= 0) {
      alert('Please fill in a valid description and amount.');
      return;
    }

    try {
      await api.post('/personal-expenses', {
        ...form,
        Amount: parseFloat(form.Amount)
      });
      setShowAddModal(false);
      setForm({
        Description: '',
        Amount: '',
        ExpenseDate: new Date().toISOString().split('T')[0],
        Category: 'Office',
        Notes: ''
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to record expense');
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense? This will refund the amount back to the Petty Cash balance.')) return;
    try {
      await api.delete(`/personal-expenses/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to delete expense');
    }
  };

  const fmt = (val) => {
    return '₹' + parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const filteredExpenses = activeFilter === 'All'
    ? expenses
    : expenses.filter(e => e.Category === activeFilter);

  if (loading) {
    return (
      <div className="pe-loading">
        <Loader2 className="pe-spinner" size={40} />
      </div>
    );
  }

  return (
    <div className="pe-container">
      {/* Header */}
      <div className="pe-header">
        <div>
          <h1>Petty Cash & Expenses</h1>
          <p>Track personal/office overheads and weekly profit ledger entries</p>
        </div>
        <button className="pe-btn pe-btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> Log Expense
        </button>
      </div>

      {/* Stats Board */}
      <div className="pe-stats">
        <div className="pe-stat-card balance">
          <div className="pe-stat-info">
            <span className="pe-stat-label">Current Petty Cash Balance</span>
            <span className={`pe-stat-value ${pettyCash.currentBalance >= 0 ? 'pos' : 'neg'}`}>
              {fmt(pettyCash.currentBalance)}
            </span>
          </div>
          <div className="pe-stat-icon">
            <Wallet size={28} />
          </div>
        </div>

        <div className="pe-stat-card info">
          <div className="pe-stat-info">
            <span className="pe-stat-label">Total Overhead Logged</span>
            <span className="pe-stat-value expense">
              {fmt(expenses.reduce((sum, e) => sum + parseFloat(e.Amount || 0), 0))}
            </span>
          </div>
          <div className="pe-stat-icon text-red">
            <ArrowDownRight size={28} color="#F44336" />
          </div>
        </div>

        <div className="pe-stat-card info">
          <div className="pe-stat-info">
            <span className="pe-stat-label">Total Closed Profit Entries</span>
            <span className="pe-stat-value profit">
              {fmt(pettyCash.history.reduce((sum, h) => sum + Math.max(0, parseFloat(h.ProfitAmount || 0)), 0))}
            </span>
          </div>
          <div className="pe-stat-icon text-green">
            <ArrowUpRight size={28} color="#4CAF50" />
          </div>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="pe-main-grid">
        {/* Left Column - Expense History */}
        <div className="pe-left-col">
          <div className="pe-section-header">
            <h2>Expense Directory</h2>
            <div className="pe-filter-chips">
              <button
                className={`pe-chip ${activeFilter === 'All' ? 'active' : ''}`}
                onClick={() => setActiveFilter('All')}
              >
                All
              </button>
              {categories.map(c => (
                <button
                  key={c}
                  className={`pe-chip ${activeFilter === c ? 'active' : ''}`}
                  onClick={() => setActiveFilter(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="pe-list-container">
            {filteredExpenses.length === 0 ? (
              <div className="pe-empty-state">
                <FileText size={48} className="pe-empty-icon" />
                <h3>No expenses found</h3>
                <p>Click "Log Expense" above to register office overheads or transport charges.</p>
              </div>
            ) : (
              filteredExpenses.map(e => (
                <div key={e.id} className="pe-expense-item">
                  <div className="pe-expense-details">
                    <div className="pe-expense-row">
                      <span className="pe-expense-desc">{e.Description}</span>
                      <span className="pe-expense-category-badge">{e.Category}</span>
                    </div>
                    {e.Notes && <span className="pe-expense-notes">{e.Notes}</span>}
                    <div className="pe-expense-meta">
                      <Calendar size={12} />
                      <span>{e.ExpenseDate}</span>
                    </div>
                  </div>
                  <div className="pe-expense-action">
                    <span className="pe-expense-amount">{fmt(e.Amount)}</span>
                    <button className="pe-btn-delete" onClick={() => handleDeleteExpense(e.id)} title="Delete & refund balance">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column - Petty Cash Ledger / Audit Trail */}
        <div className="pe-right-col">
          <div className="pe-section-header">
            <h2>Ledger History (Audit Trail)</h2>
          </div>
          <div className="pe-ledger-container">
            {pettyCash.history.length === 0 ? (
              <div className="pe-empty-state mini">
                <Wallet size={36} className="pe-empty-icon" />
                <p>No petty cash transactions recorded yet. Week closures will appear here.</p>
              </div>
            ) : (
              pettyCash.history.map(h => (
                <div key={h.id} className="pe-ledger-item">
                  <div className="pe-ledger-info">
                    <div className="pe-ledger-title">
                      {h.WeeklyPaySheetId ? `Closed Weekly Pay Sheet` : `Personal / Office Expense`}
                    </div>
                    <div className="pe-ledger-subtitle">
                      {h.WeekDate} {h.WeeklyPaySheetId && `(Sheet #${h.WeeklyPaySheetId})`}
                    </div>
                  </div>
                  <div className="pe-ledger-values">
                    <span className={`pe-ledger-amt ${parseFloat(h.ProfitAmount) >= 0 ? 'pos' : 'neg'}`}>
                      {parseFloat(h.ProfitAmount) >= 0 ? '+' : ''}{fmt(h.ProfitAmount)}
                    </span>
                    <span className="pe-ledger-bal">Bal: {fmt(h.RunningBalance)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="pe-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="pe-modal" onClick={e => e.stopPropagation()}>
            <h2>Log Petty Cash Expense</h2>
            <form onSubmit={handleAddExpense}>
              <div className="pe-modal-field">
                <label>Description / Vendor Name</label>
                <input
                  type="text"
                  placeholder="e.g. Office stationery, diesel for site, tea snacks"
                  value={form.Description}
                  onChange={e => setForm({ ...form, Description: e.target.value })}
                  required
                />
              </div>

              <div className="pe-modal-field">
                <label>Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.Amount}
                  onChange={e => setForm({ ...form, Amount: e.target.value })}
                  required
                />
              </div>

              <div className="pe-modal-field-row">
                <div className="pe-modal-field">
                  <label>Expense Date</label>
                  <input
                    type="date"
                    value={form.ExpenseDate}
                    onChange={e => setForm({ ...form, ExpenseDate: e.target.value })}
                    required
                  />
                </div>

                <div className="pe-modal-field">
                  <label>Category</label>
                  <select
                    value={form.Category}
                    onChange={e => setForm({ ...form, Category: e.target.value })}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pe-modal-field">
                <label>Notes (optional)</label>
                <textarea
                  rows={3}
                  placeholder="Add details, bill numbers, etc."
                  value={form.Notes}
                  onChange={e => setForm({ ...form, Notes: e.target.value })}
                  style={{ resize: 'none' }}
                />
              </div>

              <div className="pe-modal-actions">
                <button type="button" className="pe-btn pe-btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="pe-btn pe-btn-primary">
                  Log Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalExpensePage;
