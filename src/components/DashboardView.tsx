import React from 'react';
import { 
  Users, 
  Banknote, 
  TrendingUp, 
  AlertTriangle, 
  ShieldCheck, 
  PlusCircle, 
  Receipt, 
  ArrowUpRight,
  DollarSign
} from 'lucide-react';
import { DashboardStats } from '../types';
import { formatCurrency } from '../lib/utils';

interface DashboardViewProps {
  stats: DashboardStats | null;
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ stats, onNavigate }) => {
  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 font-medium">
        Loading financial analytics...
      </div>
    );
  }

  const kpis = [
    {
      title: 'Active Portfolio Value',
      value: formatCurrency(stats.total_portfolio_value),
      subtext: `${stats.total_active_loans} Active Loans`,
      icon: Banknote,
      color: 'bg-blue-50 text-blue-600 border-blue-200',
    },
    {
      title: 'Outstanding Balance',
      value: formatCurrency(stats.total_outstanding_balance),
      subtext: 'Principal & Interest Due',
      icon: DollarSign,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    },
    {
      title: 'Collected Revenue',
      value: formatCurrency(stats.total_collected_revenue),
      subtext: 'Total Repayments Received',
      icon: TrendingUp,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    },
    {
      title: 'Portfolio at Risk (PAR 30)',
      value: `${stats.par_30}%`,
      subtext: `${stats.overdue_loans_count} Overdue Loans`,
      icon: AlertTriangle,
      color: stats.par_30 > 5 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-amber-50 text-amber-600 border-amber-200',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Overview */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-xs p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Financial Portfolio Dashboard</h2>
            <p className="text-slate-300 text-sm mt-1">
              Real-time portfolio analytics, risk indicators, and operational metrics.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('loans')}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-4 py-2.5 rounded-xs shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              New Loan Application
            </button>
            <button
              onClick={() => onNavigate('repayments')}
              className="bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm px-4 py-2.5 rounded-xs flex items-center gap-2 transition-all"
            >
              <Receipt className="w-4 h-4" />
              Record Repayment
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="bg-white rounded-xs p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{kpi.title}</span>
                <div className={`p-2.5 rounded-xs border ${kpi.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-bold text-slate-900">{kpi.value}</h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
                  {kpi.subtext}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Hub & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Action Hub */}
        <div className="lg:col-span-2 bg-white rounded-xs border border-slate-200/80 p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            Operational Quick Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => onNavigate('borrowers')}
              className="p-4 rounded-xs border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left group"
            >
              <Users className="w-6 h-6 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
              <div className="font-semibold text-slate-800 text-sm">Borrower Directory</div>
              <div className="text-xs text-slate-500 mt-1">Register & manage borrower profiles</div>
            </button>

            <button
              onClick={() => onNavigate('products')}
              className="p-4 rounded-xs border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left group"
            >
              <Banknote className="w-6 h-6 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
              <div className="font-semibold text-slate-800 text-sm">Loan Product Studio</div>
              <div className="text-xs text-slate-500 mt-1">Configure interest rates & terms</div>
            </button>

            <button
              onClick={() => onNavigate('reports')}
              className="p-4 rounded-xs border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left group"
            >
              <TrendingUp className="w-6 h-6 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
              <div className="font-semibold text-slate-800 text-sm">Reports & Audit</div>
              <div className="text-xs text-slate-500 mt-1">Export transaction logs & CSVs</div>
            </button>
          </div>
        </div>

        {/* Portfolio Health Overview */}
        <div className="bg-white rounded-xs border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center justify-between">
              <span>Portfolio Health</span>
              <span className="text-xs font-normal text-slate-500">Live Status</span>
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                  <span>Registered Borrowers</span>
                  <span className="font-bold text-slate-900">{stats.total_borrowers}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-xs overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-xs" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                  <span>Pending Loan Approvals</span>
                  <span className="font-bold text-amber-600">{stats.pending_approvals_count}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-xs overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-xs" style={{ width: `${Math.min(stats.pending_approvals_count * 20, 100)}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                  <span>Collection Efficiency</span>
                  <span className="font-bold text-emerald-600">97.5%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-xs overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-xs" style={{ width: '97.5%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>All Systems Operational</span>
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </div>
    </div>
  );
};
