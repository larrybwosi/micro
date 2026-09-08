import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { BorrowerManagement } from './components/BorrowerManagement';
import { LoanProductsConfigurator } from './components/LoanProductsConfigurator';
import { LoanManagement } from './components/LoanManagement';
import { RepaymentsProcessing } from './components/RepaymentsProcessing';
import { ExpensesPettyCash } from './components/ExpensesPettyCash';
import { ReportsAudit } from './components/ReportsAudit';
import { SettingsCustomizations } from './components/SettingsCustomizations';
import { SyncEngineView } from './components/SyncEngineView';
import { LoginView } from './components/LoginView';

import { Borrower, LoanProduct, Loan, DashboardStats, User, PlatformSettings } from './types';
import { api } from './services/api';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('scryme_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);

  const loadData = async () => {
    if (!currentUser) return;
    try {
      const [s, b, p, l, setts] = await Promise.all([
        api.getDashboardStats(),
        api.getBorrowers(),
        api.getLoanProducts(),
        api.getLoans(),
        api.getSettings(),
      ]);
      setStats(s);
      setBorrowers(b);
      setProducts(p);
      setLoans(l);
      if (setts) setPlatformSettings(setts);
    } catch (err) {
      console.error('Failed to load application data:', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('scryme_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('scryme_user');
  };

  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const pendingCount = loans.filter((l) => l.status === 'PENDING_APPROVAL').length;

  const isAdmin = currentUser.role === 'ADMIN';

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-100 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        pendingApprovals={pendingCount}
        currentUser={currentUser}
        platformSettings={platformSettings}
        onLogout={handleLogout}
      />

      {/* Main View Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {currentTab === 'dashboard' && <DashboardView stats={stats} onNavigate={setCurrentTab} />}
          {currentTab === 'borrowers' && <BorrowerManagement borrowers={borrowers} onRefresh={loadData} />}
          {currentTab === 'products' && (
            isAdmin ? (
              <LoanProductsConfigurator products={products} currentUser={currentUser} onRefresh={loadData} />
            ) : (
              <div className="bg-white p-8 rounded-xs text-center text-slate-500 border border-slate-200">
                Access Restricted: Only Administrators can view or manage the loan configurator.
              </div>
            )
          )}
          {currentTab === 'loans' && (
            <LoanManagement loans={loans} borrowers={borrowers} products={products} onRefresh={loadData} currentUser={currentUser} />
          )}
          {currentTab === 'repayments' && <RepaymentsProcessing loans={loans} onRefresh={loadData} />}
          {currentTab === 'expenses' && (
            <ExpensesPettyCash currentUser={currentUser} platformSettings={platformSettings} />
          )}
          {currentTab === 'reports' && <ReportsAudit loans={loans} borrowers={borrowers} />}
          {currentTab === 'sync' && <SyncEngineView onSyncComplete={loadData} />}
          {currentTab === 'settings' && (
            isAdmin ? (
              <SettingsCustomizations
                currentUser={currentUser}
                onSettingsUpdated={(setts) => setPlatformSettings(setts)}
              />
            ) : (
              <div className="bg-white p-8 rounded-xs text-center text-slate-500 border border-slate-200">
                Access Restricted: Only Administrators can view or manage platform settings.
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
