import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { BorrowerManagement } from './components/BorrowerManagement';
import { LoanProductsConfigurator } from './components/LoanProductsConfigurator';
import { LoanManagement } from './components/LoanManagement';
import { RepaymentsProcessing } from './components/RepaymentsProcessing';
import { ReportsAudit } from './components/ReportsAudit';

import { Borrower, LoanProduct, Loan, DashboardStats } from './types';
import { api } from './services/api';

export function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);

  const loadData = async () => {
    try {
      const [s, b, p, l] = await Promise.all([
        api.getDashboardStats(),
        api.getBorrowers(),
        api.getLoanProducts(),
        api.getLoans(),
      ]);
      setStats(s);
      setBorrowers(b);
      setProducts(p);
      setLoans(l);
    } catch (err) {
      console.error('Failed to load application data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingCount = loans.filter((l) => l.status === 'PENDING_APPROVAL').length;

  return (
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} pendingApprovals={pendingCount} />

      {/* Main View Area */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto">
          {currentTab === 'dashboard' && <DashboardView stats={stats} onNavigate={setCurrentTab} />}
          {currentTab === 'borrowers' && <BorrowerManagement borrowers={borrowers} onRefresh={loadData} />}
          {currentTab === 'products' && <LoanProductsConfigurator products={products} onRefresh={loadData} />}
          {currentTab === 'loans' && <LoanManagement loans={loans} borrowers={borrowers} products={products} onRefresh={loadData} />}
          {currentTab === 'repayments' && <RepaymentsProcessing loans={loans} onRefresh={loadData} />}
          {currentTab === 'reports' && <ReportsAudit loans={loans} borrowers={borrowers} />}
        </div>
      </main>
    </div>
  );
}

export default App;
