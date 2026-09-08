import React, { useState, useEffect } from 'react';
import {
  PlusCircle,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  Wallet,
  TrendingDown,
  ArrowUpRight,
  Trash2,
  Check,
  X,
  DollarSign
} from 'lucide-react';
import { Expense, PettyCashSummary, User, PlatformSettings } from '../types';
import { api } from '../services/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { exportExpensesCSV } from '../lib/exportUtils';
import { parseApiError } from '../lib/errorUtils';

interface ExpensesPettyCashProps {
  currentUser?: User | null;
  platformSettings?: PlatformSettings | null;
}

export const ExpensesPettyCash: React.FC<ExpensesPettyCashProps> = ({ currentUser, platformSettings }) => {
  const isAdmin = currentUser?.role === 'ADMIN';

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pettyCashSummary, setPettyCashSummary] = useState<PettyCashSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTopUpMode, setIsTopUpMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Expense>>({
    category: 'OFFICE_SUPPLIES',
    description: '',
    amount: 100,
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'CASH',
    reference: '',
  });

  const loadExpensesData = async () => {
    setLoading(true);
    try {
      const [expList, pcSummary] = await Promise.all([
        api.getExpenses(),
        api.getPettyCashSummary(),
      ]);
      setExpenses(expList);
      setPettyCashSummary(pcSummary);
    } catch (err) {
      console.error('Failed to load expenses data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpensesData();
  }, []);

  const handleOpenExpenseModal = (isTopUp: boolean) => {
    setIsTopUpMode(isTopUp);
    setErrorMessage(null);
    setFormData({
      category: isTopUp ? 'PETTY_CASH_TOPUP' : 'OFFICE_SUPPLIES',
      description: isTopUp ? 'Petty cash float replenishment' : '',
      amount: isTopUp ? 500 : 100,
      expense_date: new Date().toISOString().split('T')[0],
      payment_method: isTopUp ? 'BANK_TRANSFER' : 'CASH',
      reference: '',
    });
    setIsModalOpen(true);
  };

  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const threshold = platformSettings?.expense_approval_threshold || 10000;
    const amount = formData.amount || 0;

    // Automatically determine status
    const autoStatus = amount > threshold && !isAdmin ? 'PENDING_APPROVAL' : 'APPROVED';

    const payload: Expense = {
      category: formData.category || 'MISC',
      description: formData.description || '',
      amount,
      expense_date: formData.expense_date || new Date().toISOString().split('T')[0],
      payment_method: formData.payment_method || 'CASH',
      reference: formData.reference,
      status: autoStatus,
      created_by: currentUser?.full_name || currentUser?.username || 'System',
      approved_by: autoStatus === 'APPROVED' ? (currentUser?.full_name || currentUser?.username) : undefined,
    };

    try {
      await api.createExpense(payload);
      setIsModalOpen(false);
      loadExpensesData();
    } catch (err) {
      setErrorMessage(parseApiError(err));
    }
  };

  const handleUpdateStatus = async (expenseId: number, status: string) => {
    try {
      await api.updateExpenseStatus(
        expenseId,
        status,
        currentUser?.full_name || currentUser?.username
      );
      loadExpensesData();
    } catch (err) {
      alert('Failed to update expense status: ' + parseApiError(err));
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (confirm('Are you sure you want to delete this expense entry?')) {
      try {
        await api.deleteExpense(id);
        loadExpensesData();
      } catch (err) {
        alert('Failed to delete expense: ' + parseApiError(err));
      }
    }
  };

  const handleExportCSV = () => {
    exportExpensesCSV(filteredExpenses, platformSettings?.org_name || 'MicroFinance Systems');
  };

  const filteredExpenses = expenses.filter((exp) => {
    const matchesCategory = categoryFilter === 'ALL' || exp.category === categoryFilter;
    const matchesStatus = statusFilter === 'ALL' || exp.status === statusFilter;
    const matchesSearch = `${exp.description} ${exp.category} ${exp.reference || ''} ${exp.created_by || ''}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesCategory && matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-2.5 py-0.5 rounded-xs flex items-center gap-1 w-fit"><CheckCircle2 className="w-3.5 h-3.5" /> Approved</span>;
      case 'PENDING_APPROVAL':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-2.5 py-0.5 rounded-xs flex items-center gap-1 w-fit"><Clock className="w-3.5 h-3.5" /> Pending Approval</span>;
      case 'REJECTED':
        return <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold px-2.5 py-0.5 rounded-xs flex items-center gap-1 w-fit"><XCircle className="w-3.5 h-3.5" /> Rejected</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-xs">{status}</span>;
    }
  };

  const threshold = platformSettings?.expense_approval_threshold || 10000;

  return (
    <div className="space-y-6">
      {/* Petty Cash Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xs border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs font-medium">Petty Cash Balance</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {formatCurrency(pettyCashSummary?.current_balance || 0)}
            </h3>
            <p className="text-xs text-slate-400 mt-1">Available cash float</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xs">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xs border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs font-medium">Total Petty Cash Float</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {formatCurrency(pettyCashSummary?.total_topup || 0)}
            </h3>
            <p className="text-xs text-slate-400 mt-1">Cumulative top-ups</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xs">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xs border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs font-medium">Total Cash Spent</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {formatCurrency(pettyCashSummary?.total_cash_spent || 0)}
            </h3>
            <p className="text-xs text-slate-400 mt-1">Disbursed via cash</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xs">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xs border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs font-medium">Approval Threshold</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {formatCurrency(threshold)}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {expenses.filter((e) => e.status === 'PENDING_APPROVAL').length} pending approval
            </p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xs">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xs border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Expenses & Petty Cash Ledger</h2>
          <p className="text-slate-500 text-xs mt-0.5">Record operational expenses, petty cash top-ups, and process approvals</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-xs bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Categories</option>
            <option value="PETTY_CASH_TOPUP">Petty Cash Top-Up</option>
            <option value="OFFICE_SUPPLIES">Office Supplies</option>
            <option value="RENT">Rent</option>
            <option value="UTILITIES">Utilities</option>
            <option value="SALARIES">Salaries</option>
            <option value="TRAVEL">Travel</option>
            <option value="MISC">Miscellaneous</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-xs bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xs w-48 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <button
            onClick={handleExportCSV}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-3 py-2 rounded-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all"
            title="Export Expenses CSV"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export CSV
          </button>

          <button
            onClick={() => handleOpenExpenseModal(true)}
            className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-3.5 py-2 rounded-xs shadow-md shadow-purple-600/20 flex items-center gap-1.5 transition-all"
          >
            <Wallet className="w-4 h-4" />
            Top-Up Petty Cash
          </button>

          <button
            onClick={() => handleOpenExpenseModal(false)}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-3.5 py-2 rounded-xs shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Record Expense
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xs border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">Date & Ref</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Payment Method</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Logged / Approved By</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-normal">
                    Loading expenses ledger...
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-normal">
                    No expense entries matching your filters.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{formatDate(exp.expense_date)}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{exp.reference || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-xs ${
                          exp.category === 'PETTY_CASH_TOPUP'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {exp.category.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {exp.description}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className="font-semibold text-slate-700">{exp.payment_method.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {formatCurrency(exp.amount)}
                      {exp.amount > threshold && (
                        <div className="text-[10px] text-amber-600 font-semibold flex items-center gap-0.5 mt-0.5">
                          <AlertCircle className="w-3 h-3" /> Exceeds Threshold ({formatCurrency(threshold)})
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(exp.status)}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="text-slate-800 font-medium">By: {exp.created_by || 'System'}</div>
                      {exp.approved_by && (
                        <div className="text-emerald-600 text-[11px] font-medium mt-0.5">Appr: {exp.approved_by}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isAdmin && exp.status === 'PENDING_APPROVAL' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(exp.id!, 'APPROVED')}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xs transition-colors flex items-center gap-1"
                              title="Approve Expense"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(exp.id!, 'REJECTED')}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xs transition-colors flex items-center gap-1"
                              title="Reject Expense"
                            >
                              <X className="w-3.5 h-3.5" /> Reject
                            </button>
                          </>
                        )}

                        {(isAdmin || exp.created_by === currentUser?.username) && (
                          <button
                            onClick={() => handleDeleteExpense(exp.id!)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xs transition-colors"
                            title="Delete Expense"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Expense / Top-Up Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xs max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {isTopUpMode ? 'Replenish Petty Cash Float' : 'Record Operational Expense'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xs hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xs text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmitExpense} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expense Category</label>
                  {isTopUpMode ? (
                    <input
                      type="text"
                      disabled
                      value="PETTY_CASH_TOPUP"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xs bg-slate-100 font-semibold text-purple-700"
                    />
                  ) : (
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as Expense['category'] })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xs bg-white focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="OFFICE_SUPPLIES">Office Supplies</option>
                      <option value="RENT">Rent</option>
                      <option value="UTILITIES">Utilities</option>
                      <option value="SALARIES">Salaries</option>
                      <option value="TRAVEL">Travel</option>
                      <option value="MISC">Miscellaneous</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expense Date</label>
                  <input
                    type="date"
                    required
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xs focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Memo</label>
                <input
                  type="text"
                  required
                  placeholder={isTopUpMode ? "Petty cash float replenishment..." : "Printer toner, tea supplies, internet bill..."}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xs focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={1}
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xs focus:ring-2 focus:ring-blue-500/20 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as Expense['payment_method'] })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xs bg-white focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="CASH">Cash (Petty Cash Float)</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="MOBILE_MONEY">Mobile Money</option>
                    <option value="CHECK">Check</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Voucher / Receipt Reference (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. VOUCHER-901 / Receipt #122"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xs focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Threshold Approval Notice */}
              {(formData.amount || 0) > threshold && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xs text-amber-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Approval Required:</span> This expense amount ({formatCurrency(formData.amount || 0)}) exceeds the platform approval threshold of {formatCurrency(threshold)}. {!isAdmin && 'It will be queued as PENDING_APPROVAL until reviewed by an Admin.'}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xs shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5"
                >
                  <DollarSign className="w-4 h-4" />
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
