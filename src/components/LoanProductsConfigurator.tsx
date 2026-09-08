import React, { useState } from 'react';
import { 
  PlusCircle, 
  Edit3, 
  Trash2, 
  X, 
  Percent, 
  Calendar, 
  DollarSign, 
  AlertCircle
} from 'lucide-react';
import { LoanProduct, User } from '../types';
import { api } from '../services/api';
import { formatCurrency } from '../lib/utils';
import { parseApiError } from '../lib/errorUtils';

interface LoanProductsConfiguratorProps {
  products: LoanProduct[];
  currentUser?: User | null;
  onRefresh: () => void;
}

export const LoanProductsConfigurator: React.FC<LoanProductsConfiguratorProps> = ({ products, currentUser, onRefresh }) => {
  const isAdmin = currentUser?.role === 'ADMIN';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<LoanProduct | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<LoanProduct>>({
    name: '',
    code: '',
    description: '',
    interest_method: 'REDUCING_BALANCE',
    annual_interest_rate: 12.0,
    interest_rate_type: 'ANNUAL',
    min_amount: 500.0,
    max_amount: 10000.0,
    min_term_months: 3,
    max_term_months: 24,
    payment_frequency: 'MONTHLY',
    origination_fee_percent: 1.5,
    late_fee_percent: 2.0,
    fixed_penalty_fee: 0.0,
    penalty_interest_rate: 0.0,
    penalty_type: 'PERCENTAGE',
    grace_period_days: 5,
  });

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setErrorMessage(null);

    // Auto-generate a guaranteed non-colliding code
    let codeNum = products.length + 1;
    let autoCode = `LP-${String(codeNum).padStart(2, '0')}`;
    while (products.some((p) => p.code.toUpperCase() === autoCode.toUpperCase())) {
      codeNum++;
      autoCode = `LP-${String(codeNum).padStart(2, '0')}`;
    }

    setFormData({
      name: '',
      code: autoCode,
      description: '',
      interest_method: 'REDUCING_BALANCE',
      annual_interest_rate: 12.0,
      interest_rate_type: 'ANNUAL',
      min_amount: 500.0,
      max_amount: 10000.0,
      min_term_months: 3,
      max_term_months: 24,
      payment_frequency: 'MONTHLY',
      origination_fee_percent: 1.5,
      late_fee_percent: 2.0,
      fixed_penalty_fee: 0.0,
      penalty_interest_rate: 0.0,
      penalty_type: 'PERCENTAGE',
      grace_period_days: 5,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: LoanProduct) => {
    setEditingProduct(product);
    setErrorMessage(null);
    setFormData({ ...product });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedCode = (formData.code || '').trim();
    const duplicate = products.find(
      (p) => p.code.trim().toLowerCase() === trimmedCode.toLowerCase() && p.id !== editingProduct?.id
    );

    if (duplicate) {
      setErrorMessage(`A loan product with code '${trimmedCode}' already exists.`);
      return;
    }

    try {
      if (editingProduct) {
        await api.updateLoanProduct({ ...formData, code: trimmedCode } as LoanProduct);
      } else {
        await api.createLoanProduct({ ...formData, code: trimmedCode } as LoanProduct);
      }
      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      setErrorMessage(parseApiError(err));
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this loan product configuration?')) {
      try {
        await api.deleteLoanProduct(id);
        onRefresh();
      } catch (err) {
        alert('Failed to delete loan product: ' + parseApiError(err));
      }
    }
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'FLAT_RATE':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-2.5 py-1 rounded-xs">Flat Rate</span>;
      case 'REDUCING_BALANCE':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-2.5 py-1 rounded-xs">Reducing Balance (EMI)</span>;
      case 'INTEREST_ONLY':
        return <span className="bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold px-2.5 py-1 rounded-xs">Interest Only / Bullet</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-xs">{method}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xs border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Loan Product Configurator</h2>
          <p className="text-slate-500 text-xs mt-0.5">Customize loan products, interest calculation methods, limits, and fee structures</p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenCreateModal}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-xs shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            Create New Product
          </button>
        )}
      </div>

      {/* Loan Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((p) => (
          <div key={p.id} className="bg-white rounded-xs border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-xs">
                    {p.code}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">{p.name}</h3>
                </div>
                {getMethodBadge(p.interest_method)}
              </div>

              <p className="text-xs text-slate-500 mb-5 line-clamp-2 min-h-[32px]">{p.description}</p>

              <div className="space-y-3 border-t border-b border-slate-100 py-4 text-xs font-medium">
                <div className="flex justify-between items-center text-slate-600">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Percent className="w-3.5 h-3.5 text-slate-400" /> Interest Rate
                  </span>
                  <span className="font-bold text-slate-900">
                    {p.annual_interest_rate}% {p.interest_rate_type === 'MONTHLY' ? 'per month' : 'p.a. (APR)'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" /> Principal Range
                  </span>
                  <span className="font-bold text-slate-900">
                    {formatCurrency(p.min_amount)} - {formatCurrency(p.max_amount)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Loan Tenure Limit
                  </span>
                  <span className="font-bold text-slate-900">
                    {p.min_term_months} to {p.max_term_months} Months ({p.payment_frequency.toLowerCase()})
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-100">
                  <span className="text-slate-400">Fees & Grace Period</span>
                  <span className="text-slate-700">
                    Orig: {p.origination_fee_percent}% | Late: {p.late_fee_percent}% ({p.grace_period_days}d grace)
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-slate-400">Penalty Rule</span>
                  <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-xs text-[11px]">
                    {p.penalty_type === 'FIXED'
                      ? `Fixed ${formatCurrency(p.fixed_penalty_fee || 0)}`
                      : p.penalty_type === 'DAILY_RATE'
                      ? `Penalty Int: ${p.penalty_interest_rate}%`
                      : p.penalty_type === 'COMBINED'
                      ? `${p.late_fee_percent}% + ${formatCurrency(p.fixed_penalty_fee || 0)}`
                      : p.penalty_type === 'NONE'
                      ? 'No Late Penalty'
                      : `${p.late_fee_percent}% Rate`}
                  </span>
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  onClick={() => handleOpenEditModal(p)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xs transition-colors flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit Config
                </button>
                <button
                  onClick={() => handleDelete(p.id!)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xs transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Configuration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xs max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingProduct ? 'Configure Loan Product' : 'Create Custom Loan Product'}
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Product Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Micro Business Loan"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Product Code</label>
                  <input
                    type="text"
                    required
                    placeholder="MBL-01"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Target demographic, purpose, and terms summary..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xs border border-slate-200/60">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Interest Engine</label>
                  <select
                    value={formData.interest_method}
                    onChange={(e) => setFormData({ ...formData, interest_method: e.target.value as LoanProduct['interest_method'] })}
                    className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-xs bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                  >
                    <option value="REDUCING_BALANCE">Reducing Balance (EMI)</option>
                    <option value="FLAT_RATE">Flat Rate (Simple)</option>
                    <option value="INTEREST_ONLY">Interest-Only Bullet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Interest Rate Type</label>
                  <select
                    value={formData.interest_rate_type}
                    onChange={(e) => setFormData({ ...formData, interest_rate_type: e.target.value as 'ANNUAL' | 'MONTHLY' })}
                    className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-xs bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-blue-700"
                  >
                    <option value="ANNUAL">Annual (Fixed APR)</option>
                    <option value="MONTHLY">Monthly Rate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rate ({formData.interest_rate_type === 'MONTHLY' ? '% / Month' : '% APR'})</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.annual_interest_rate}
                    onChange={(e) => setFormData({ ...formData, annual_interest_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xs bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Min Principal Amount ($)</label>
                  <input
                    type="number"
                    required
                    value={formData.min_amount}
                    onChange={(e) => setFormData({ ...formData, min_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Max Principal Amount ($)</label>
                  <input
                    type="number"
                    required
                    value={formData.max_amount}
                    onChange={(e) => setFormData({ ...formData, max_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Min Term (Months)</label>
                  <input
                    type="number"
                    required
                    value={formData.min_term_months}
                    onChange={(e) => setFormData({ ...formData, min_term_months: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Max Term (Months)</label>
                  <input
                    type="number"
                    required
                    value={formData.max_term_months}
                    onChange={(e) => setFormData({ ...formData, max_term_months: parseInt(e.target.value) || 12 })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Frequency</label>
                  <select
                    value={formData.payment_frequency}
                    onChange={(e) => setFormData({ ...formData, payment_frequency: e.target.value as LoanProduct['payment_frequency'] })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xs bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="BIWEEKLY">Bi-Weekly</option>
                    <option value="WEEKLY">Weekly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Origination Fee (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.origination_fee_percent}
                    onChange={(e) => setFormData({ ...formData, origination_fee_percent: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Penalty Calculation Type</label>
                  <select
                    value={formData.penalty_type || 'PERCENTAGE'}
                    onChange={(e) => setFormData({ ...formData, penalty_type: e.target.value as LoanProduct['penalty_type'] })}
                    className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-xs bg-white font-semibold"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount ($)</option>
                    <option value="DAILY_RATE">Penalty Rate (%)</option>
                    <option value="COMBINED">Combined (Fixed + %)</option>
                    <option value="NONE">No Penalty</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Grace Period (Days)</label>
                  <input
                    type="number"
                    value={formData.grace_period_days}
                    onChange={(e) => setFormData({ ...formData, grace_period_days: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-amber-50/50 p-3.5 rounded-xs border border-amber-200/80">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Late Fee Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.late_fee_percent}
                    onChange={(e) => setFormData({ ...formData, late_fee_percent: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 bg-white rounded-xs focus:ring-2 focus:ring-blue-500/20 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fixed Penalty Fee ($)</label>
                  <input
                    type="number"
                    step="1"
                    value={formData.fixed_penalty_fee || 0}
                    onChange={(e) => setFormData({ ...formData, fixed_penalty_fee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 bg-white rounded-xs focus:ring-2 focus:ring-blue-500/20 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Penalty Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.penalty_interest_rate || 0}
                    onChange={(e) => setFormData({ ...formData, penalty_interest_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 bg-white rounded-xs focus:ring-2 focus:ring-blue-500/20 font-bold"
                  />
                </div>
              </div>

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
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xs shadow-md shadow-blue-600/20 transition-all"
                >
                  {editingProduct ? 'Save Product Config' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
