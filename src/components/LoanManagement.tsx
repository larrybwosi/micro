import React, { useState } from 'react';
import { 
  PlusCircle, 
  Search, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  DollarSign, 
  X, 
  Clock, 
  Check, 
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { Loan, Borrower, LoanProduct, ScheduleItem, User } from '../types';
import { api } from '../services/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { exportLoansCSV } from '../lib/exportUtils';
import { parseApiError } from '../lib/errorUtils';

interface LoanManagementProps {
  loans: Loan[];
  borrowers: Borrower[];
  products: LoanProduct[];
  currentUser?: User | null;
  onRefresh: () => void;
}

export const LoanManagement: React.FC<LoanManagementProps> = ({ loans, borrowers, products, currentUser, onRefresh }) => {
  const isAdmin = currentUser?.role === 'ADMIN';
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal states
  const [isNewLoanModalOpen, setIsNewLoanModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Application Form
  const [borrowerSearchTerm, setBorrowerSearchTerm] = useState('');
  const [newLoanData, setNewLoanData] = useState({
    borrower_id: borrowers[0]?.id || 0,
    loan_product_id: products[0]?.id || 0,
    principal_amount: 1000,
    term_months: 6,
    notes: '',
  });

  const [previewSchedule, setPreviewSchedule] = useState<ScheduleItem[]>([]);

  const filteredLoans = loans.filter((loan) => {
    const matchesStatus = statusFilter === 'ALL' || loan.status === statusFilter;
    const matchesSearch = `${loan.loan_number} ${loan.borrower_name} ${loan.product_name}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleOpenNewLoanModal = () => {
    const defaultBorrower = borrowers[0]?.id || 0;
    const defaultProduct = products[0]?.id || 0;
    setBorrowerSearchTerm('');
    setErrorMessage(null);
    setNewLoanData({
      borrower_id: defaultBorrower,
      loan_product_id: defaultProduct,
      principal_amount: 1000,
      term_months: 6,
      notes: '',
    });
    setIsNewLoanModalOpen(true);
    generatePreview(defaultProduct, 1000, 6);
  };

  const filteredModalBorrowers = borrowers.filter((b) => {
    const term = borrowerSearchTerm.toLowerCase();
    const fullName = `${b.first_name} ${b.last_name}`.toLowerCase();
    return (
      fullName.includes(term) ||
      b.national_id.toLowerCase().includes(term) ||
      b.email.toLowerCase().includes(term) ||
      b.phone.toLowerCase().includes(term)
    );
  });

  const generatePreview = async (productId: number, principal: number, term: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    try {
      const items = await api.calculatePreviewSchedule(
        principal,
        product.annual_interest_rate,
        product.interest_rate_type || 'ANNUAL',
        term,
        product.interest_method,
        new Date().toISOString().split('T')[0]
      );
      setPreviewSchedule(items);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateLoanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const product = products.find((p) => p.id === newLoanData.loan_product_id);
    if (!product) {
      setErrorMessage('Please select a valid loan product.');
      return;
    }

    if (!newLoanData.borrower_id) {
      setErrorMessage('Please select a valid borrower.');
      return;
    }

    const originationFee = (newLoanData.principal_amount * product.origination_fee_percent) / 100;

    const loanPayload: Loan = {
      borrower_id: newLoanData.borrower_id,
      loan_product_id: newLoanData.loan_product_id,
      loan_number: '',
      principal_amount: newLoanData.principal_amount,
      annual_interest_rate: product.annual_interest_rate,
      interest_rate_type: product.interest_rate_type || 'ANNUAL',
      interest_method: product.interest_method,
      term_months: newLoanData.term_months,
      payment_frequency: product.payment_frequency,
      origination_fee: originationFee,
      status: 'PENDING_APPROVAL',
      application_date: new Date().toISOString().split('T')[0],
      notes: newLoanData.notes,
    };

    try {
      await api.createLoan(loanPayload);
      setIsNewLoanModalOpen(false);
      onRefresh();
    } catch (err) {
      setErrorMessage(parseApiError(err));
    }
  };

  const handleUpdateStatus = async (loanId: number, status: string, notes?: string) => {
    if (confirm(`Confirm changing loan status to ${status}?`)) {
      try {
        await api.updateLoanStatus(loanId, status, notes);
        onRefresh();
      } catch (err) {
        alert('Failed to update loan status: ' + parseApiError(err));
      }
    }
  };

  const handleViewSchedule = async (loan: Loan) => {
    setSelectedLoan(loan);
    try {
      const items = await api.getLoanSchedule(loan.id!);
      setScheduleItems(items);
      setIsScheduleModalOpen(true);
    } catch (err) {
      alert('Failed to fetch loan repayment schedule: ' + parseApiError(err));
    }
  };

  const handleExportLoansCSV = () => {
    exportLoansCSV(filteredLoans);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-2.5 py-1 rounded-xs flex items-center gap-1 w-fit"><Clock className="w-3.5 h-3.5" /> Pending Approval</span>;
      case 'APPROVED':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-2.5 py-1 rounded-xs flex items-center gap-1 w-fit"><Check className="w-3.5 h-3.5" /> Approved</span>;
      case 'ACTIVE':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-2.5 py-1 rounded-xs flex items-center gap-1 w-fit"><CheckCircle2 className="w-3.5 h-3.5" /> Disbursed & Active</span>;
      case 'OVERDUE':
        return <span className="bg-red-50 text-red-700 border border-red-200 text-xs font-bold px-2.5 py-1 rounded-xs flex items-center gap-1 w-fit"><AlertCircle className="w-3.5 h-3.5" /> Overdue</span>;
      case 'CLOSED':
        return <span className="bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold px-2.5 py-1 rounded-xs flex items-center gap-1 w-fit"><CheckCircle2 className="w-3.5 h-3.5" /> Fully Closed</span>;
      case 'REJECTED':
        return <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold px-2.5 py-1 rounded-xs flex items-center gap-1 w-fit"><XCircle className="w-3.5 h-3.5" /> Rejected</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-xs">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xs border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Loan Lifecycle Management</h2>
          <p className="text-slate-500 text-xs mt-0.5">Approve, disburse, inspect repayment schedules, and manage loan lifecycles</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-xs bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="ACTIVE">Active / Disbursed</option>
            <option value="OVERDUE">Overdue</option>
            <option value="CLOSED">Closed</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search loan #, borrower..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xs w-56 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <button
            onClick={handleExportLoansCSV}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-3.5 py-2 rounded-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all"
            title="Export Loans Portfolio (CSV)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Loans CSV
          </button>

          <button
            onClick={handleOpenNewLoanModal}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-xs shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Apply For Loan
          </button>
        </div>
      </div>

      {/* Loans Table */}
      <div className="bg-white rounded-xs border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">Loan Number & Date</th>
                <th className="px-6 py-4">Borrower</th>
                <th className="px-6 py-4">Product & Engine</th>
                <th className="px-6 py-4">Principal & Term</th>
                <th className="px-6 py-4">Balance / Paid</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Lifecycle Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-normal">
                    No loan applications matching your filters.
                  </td>
                </tr>
              ) : (
                filteredLoans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold font-mono text-blue-600">{loan.loan_number}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{formatDate(loan.application_date)}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {loan.borrower_name}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{loan.product_name}</div>
                      <div className="text-xs text-slate-400 font-normal">
                        {loan.interest_method.replace('_', ' ')} @ {loan.annual_interest_rate}% {loan.interest_rate_type === 'MONTHLY' ? '/mo' : 'p.a.'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{formatCurrency(loan.principal_amount)}</div>
                      <div className="text-xs text-slate-400 font-normal">{loan.term_months} months tenure</div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="font-bold text-slate-900">
                        {formatCurrency(loan.balance_remaining || loan.total_payable || loan.principal_amount)} due
                      </div>
                      <div className="text-emerald-600 font-medium mt-0.5">
                        {formatCurrency(loan.amount_paid || 0)} paid
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(loan.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleViewSchedule(loan)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xs transition-colors flex items-center gap-1"
                          title="View Repayment Schedule"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" /> Schedule
                        </button>

                        {isAdmin && loan.status === 'PENDING_APPROVAL' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(loan.id!, 'APPROVED', 'Approved by Loan Committee')}
                              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xs transition-colors flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(loan.id!, 'REJECTED', 'Credit risk exceeded threshold')}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xs transition-colors flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" /> Reject
                            </button>
                          </>
                        )}

                        {isAdmin && loan.status === 'APPROVED' && (
                          <button
                            onClick={() => handleUpdateStatus(loan.id!, 'DISBURSED')}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xs transition-colors flex items-center gap-1 shadow-sm"
                          >
                            <DollarSign className="w-3.5 h-3.5" /> Disburse Funds
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

      {/* New Loan Application Modal */}
      {isNewLoanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xs max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-lg font-bold text-slate-900">New Loan Application</h3>
              <button
                onClick={() => setIsNewLoanModalOpen(false)}
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

            <form onSubmit={handleCreateLoanSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Select Borrower</label>
                  <div className="space-y-1.5">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search borrower by name, ID, email..."
                        value={borrowerSearchTerm}
                        onChange={(e) => setBorrowerSearchTerm(e.target.value)}
                        className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <select
                      required
                      value={newLoanData.borrower_id}
                      onChange={(e) => {
                        const bId = parseInt(e.target.value);
                        setNewLoanData({ ...newLoanData, borrower_id: bId });
                      }}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xs bg-white focus:ring-2 focus:ring-blue-500/20"
                    >
                      {filteredModalBorrowers.length === 0 ? (
                        <option value={0} disabled>No borrowers matching search</option>
                      ) : (
                        filteredModalBorrowers.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.first_name} {b.last_name} ({b.national_id})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Loan Product</label>
                  <select
                    required
                    value={newLoanData.loan_product_id}
                    onChange={(e) => {
                      const pId = parseInt(e.target.value);
                      setNewLoanData({ ...newLoanData, loan_product_id: pId });
                      generatePreview(pId, newLoanData.principal_amount, newLoanData.term_months);
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xs bg-white focus:ring-2 focus:ring-blue-500/20 font-semibold text-blue-700"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.annual_interest_rate}% APR - {p.interest_method})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Requested Principal Amount ($)</label>
                  <input
                    type="number"
                    required
                    min={50}
                    value={newLoanData.principal_amount}
                    onChange={(e) => {
                      const amt = parseFloat(e.target.value) || 0;
                      setNewLoanData({ ...newLoanData, principal_amount: amt });
                      generatePreview(newLoanData.loan_product_id, amt, newLoanData.term_months);
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xs focus:ring-2 focus:ring-blue-500/20 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Loan Term (Months)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={60}
                    value={newLoanData.term_months}
                    onChange={(e) => {
                      const term = parseInt(e.target.value) || 1;
                      setNewLoanData({ ...newLoanData, term_months: term });
                      generatePreview(newLoanData.loan_product_id, newLoanData.principal_amount, term);
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xs focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Application Notes / Purpose</label>
                <textarea
                  rows={2}
                  value={newLoanData.notes}
                  onChange={(e) => setNewLoanData({ ...newLoanData, notes: e.target.value })}
                  placeholder="Intended business purpose, collateral notes..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xs focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Live Calculation Preview */}
              {previewSchedule.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xs p-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Generated Repayment Schedule Preview</span>
                    <span className="text-blue-600 font-semibold">{previewSchedule.length} Monthly Installments</span>
                  </h4>
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xs bg-white">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 border-b text-slate-500 sticky top-0">
                        <tr>
                          <th className="p-2">#</th>
                          <th className="p-2">Due Date</th>
                          <th className="p-2">Principal</th>
                          <th className="p-2">Interest</th>
                          <th className="p-2 text-right">Total Installment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewSchedule.map((item) => (
                          <tr key={item.installment_number}>
                            <td className="p-2 font-bold">{item.installment_number}</td>
                            <td className="p-2 text-slate-500">{item.due_date}</td>
                            <td className="p-2">{formatCurrency(item.principal_due)}</td>
                            <td className="p-2">{formatCurrency(item.interest_due)}</td>
                            <td className="p-2 text-right font-bold text-slate-900">{formatCurrency(item.total_installment)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewLoanModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xs shadow-md shadow-blue-600/20 transition-all"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Detail Inspection Modal */}
      {isScheduleModalOpen && selectedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xs max-w-3xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Repayment Schedule — {selectedLoan.loan_number}
                </h3>
                <p className="text-xs text-slate-500">
                  Borrower: <span className="font-bold text-slate-800">{selectedLoan.borrower_name}</span> | Principal: {formatCurrency(selectedLoan.principal_amount)}
                </p>
              </div>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xs hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xs">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3">Principal Due</th>
                    <th className="p-3">Interest Due</th>
                    <th className="p-3">Total Installment</th>
                    <th className="p-3">Paid Amount</th>
                    <th className="p-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {scheduleItems.map((item) => {
                    const totalPaid = item.principal_paid + item.interest_paid + item.fee_paid;
                    return (
                      <tr key={item.installment_number} className="hover:bg-slate-50/60">
                        <td className="p-3 font-bold">{item.installment_number}</td>
                        <td className="p-3 text-slate-600 text-xs">{item.due_date}</td>
                        <td className="p-3">{formatCurrency(item.principal_due)}</td>
                        <td className="p-3">{formatCurrency(item.interest_due)}</td>
                        <td className="p-3 font-bold text-slate-900">{formatCurrency(item.total_installment)}</td>
                        <td className="p-3 text-emerald-600 font-semibold">{formatCurrency(totalPaid)}</td>
                        <td className="p-3 text-right">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-xs ${
                              item.status === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : item.status === 'PARTIAL'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="px-5 py-2 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xs transition-all"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
