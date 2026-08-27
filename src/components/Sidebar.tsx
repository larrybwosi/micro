import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Layers, 
  Banknote, 
  Receipt, 
  BarChart3, 
  Settings,
  Building2,
  LogOut,
  User as UserIcon,
  Shield,
  Menu,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { PlatformSettings, User } from '../types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  pendingApprovals: number;
  currentUser: User | null;
  platformSettings: PlatformSettings | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  pendingApprovals,
  currentUser,
  platformSettings,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'borrowers', label: 'Borrowers', icon: Users },
    { id: 'products', label: 'Loan Products', icon: Layers, adminOnly: true },
    { id: 'loans', label: 'Loan Management', icon: Banknote, badge: pendingApprovals > 0 ? pendingApprovals : null },
    { id: 'repayments', label: 'Repayments', icon: Receipt },
    { id: 'reports', label: 'Reports & Audit', icon: BarChart3 },
    { id: 'settings', label: 'Settings & Customization', icon: Settings, adminOnly: true },
  ].filter((item) => !item.adminOnly || isAdmin);

  const handleTabClick = (tabId: string) => {
    setCurrentTab(tabId);
    setMobileMenuOpen(false);
  };

  const navContent = (
    <div className="flex flex-col h-full justify-between select-none">
      <div>
        {/* Header Branding */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xs bg-white overflow-hidden flex items-center justify-center shadow-md shrink-0">
              <img src="/scryme-logo.png" alt="scryme logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="font-bold text-base text-white tracking-wide truncate max-w-[150px]">
                {platformSettings?.org_name || 'scryme micro'}
              </h1>
              <p className="text-xs text-slate-400">Management Console</p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Current User Pill */}
        {currentUser && (
          <div className="mx-3 mt-4 p-3 bg-slate-800/80 rounded-xs border border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xs bg-slate-700 text-slate-200 flex items-center justify-center shrink-0">
                <UserIcon size={16} />
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-200 truncate">{currentUser.full_name}</p>
                <span className="inline-flex items-center gap-1 text-[10px] text-indigo-400 font-medium uppercase">
                  {currentUser.role === 'ADMIN' && <Shield size={10} />} {currentUser.role}
                </span>
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Sign Out"
              className="text-slate-400 hover:text-red-400 p-1 transition-colors shrink-0"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1 mt-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xs text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm font-semibold"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                )}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-400")} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="bg-amber-500 text-slate-950 font-bold text-xs px-2 py-0.5 rounded-xs">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

    </div>
  );

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 w-full">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 text-slate-300 hover:text-white bg-slate-800 rounded-xs"
          >
            <Menu size={20} />
          </button>
          <span className="font-bold text-sm truncate max-w-[200px]">
            {platformSettings?.org_name || 'scryme micro'}
          </span>
        </div>
        {currentUser && (
          <button onClick={onLogout} className="text-slate-400 hover:text-red-400 p-1">
            <LogOut size={18} />
          </button>
        )}
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-slate-200 border-r border-slate-800 flex-col shrink-0 h-screen">
        {navContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-64 max-w-full bg-slate-900 text-slate-200 flex-1 h-full shadow-2xl z-10">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};
