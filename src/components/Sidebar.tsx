import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Layers, 
  Banknote, 
  Receipt, 
  BarChart3, 
  ShieldAlert, 
  Building2,
  CheckCircle2
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  pendingApprovals: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab, pendingApprovals }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'borrowers', label: 'Borrowers', icon: Users },
    { id: 'products', label: 'Loan Products', icon: Layers },
    { id: 'loans', label: 'Loan Management', icon: Banknote, badge: pendingApprovals > 0 ? pendingApprovals : null },
    { id: 'repayments', label: 'Repayments', icon: Receipt },
    { id: 'reports', label: 'Reports & Audit', icon: BarChart3 },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 border-r border-slate-800 flex flex-col justify-between select-none">
      <div>
        {/* Header Branding */}
        <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-base text-white tracking-wide">MicroFinance Pro</h1>
            <p className="text-xs text-slate-400">Admin & Staff Console</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                )}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-400")} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="bg-amber-500 text-slate-950 font-bold text-xs px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info / Offline Database Indicator */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 p-2.5 rounded-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="truncate">
            <p className="font-semibold">Local SQLite DB</p>
            <p className="text-[10px] text-emerald-500/80">Encrypted & Synchronized</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
