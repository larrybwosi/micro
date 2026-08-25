import React, { useState } from 'react';
import { 
  BarChart3, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  ShieldCheck, 
  Search, 
  TrendingUp,
  Database
} from 'lucide-react';
import { Loan, Borrower } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';

interface ReportsAuditProps {
  loans: Loan[];
  borrowers: Borrower[];
}

export const ReportsAudit: React.FC<ReportsAuditProps> = ({ loans, borrowers }) => {
  const [reportType, setReportType] = useState<'PORTFOLIO' | 'REPAYMENTS' | 'AUDIT'>('PORTFOLIO');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLoans = loans.filter((l) =>
    `${l.loan_number} ${l.borrower_name} ${l.product_name} ${l.status}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const exportToCSV = () => {
    const headers = [
      'Loan Number',
      'Borrower Name',
      'Product Name',
      'Principal Amount',
      'Interest Rate',
      'Interest Method',
      'Term (Months)',
      'Total Payable',
      'Amount Paid',
      'Balance Remaining',
      'Status',
      'Application Date',
    ];

    const rows = loans.map((l) => [
      l.loan_number,
      `"${l.borrower_name || ''}"`,
      `"${l.product_name || ''}"`,
      l.principal_amount,
      l.annual_interest_rate,
      l.interest_method,
      l.term_months,
      l.total_payable || 0,
      l.amount_paid || 0,
      l.balance_remaining || 0,
      l.status,
      l.application_date,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `microfinance_portfolio_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJSONBackup = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ loans, borrowers }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `microfinance_system_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const totalPortfolioValue = loans.reduce((sum, l) => sum + l.principal_amount, 0);
  const totalOutstanding = loans.reduce((sum, l) => sum + (l.balance_remaining || 0), 0);
  const totalPaid = loans.reduce((sum, l) => sum + (l.amount_paid || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Financial Reports & Data Audit Log</h2>
          <p className="text-slate-500 text-xs mt-0.5">Generate portfolio analytics, audit history, and export financial datasets</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportToCSV}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export CSV Report
          </button>
          <button
            onClick={exportJSONBackup}
            className="bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all"
          >
            <Database className="w-4 h-4" /> Export System JSON Backup
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase">Gross Portfolio Value</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalPortfolioValue)}</p>
          <span className="text-xs text-slate-400 mt-1 inline-block">{loans.length} Total Loans Issued</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase">Total Collected Repayments</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(totalPaid)}</p>
          <span className="text-xs text-emerald-500/80 mt-1 inline-block">Principal & Interest Paid</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase">Current Outstanding Principal</span>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{formatCurrency(totalOutstanding)}</p>
          <span className="text-xs text-indigo-500/80 mt-1 inline-block">Active Receivables</span>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            Portfolio Financial Audit Log
          </h3>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search audit entries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <th className="px-4 py-3">Loan Number</th>
                <th className="px-4 py-3">Borrower</th>
                <th className="px-4 py-3">Interest Method</th>
                <th className="px-4 py-3">Principal</th>
                <th className="px-4 py-3">Total Payable</th>
                <th className="px-4 py-3">Total Paid</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No matching log items found.
                  </td>
                </tr>
              ) : (
                filteredLoans.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-mono font-bold text-blue-600">{l.loan_number}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{l.borrower_name}</td>
                    <td className="px-4 py-3 text-slate-500">{l.interest_method}</td>
                    <td className="px-4 py-3 font-semibold">{formatCurrency(l.principal_amount)}</td>
                    <td className="px-4 py-3">{formatCurrency(l.total_payable || 0)}</td>
                    <td className="px-4 py-3 text-emerald-600 font-semibold">{formatCurrency(l.amount_paid || 0)}</td>
                    <td className="px-4 py-3 text-indigo-600 font-bold">{formatCurrency(l.balance_remaining || 0)}</td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-100 font-bold px-2 py-0.5 rounded text-[10px] text-slate-700">
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
