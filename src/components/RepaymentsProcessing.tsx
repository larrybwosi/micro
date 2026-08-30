import React, { useState } from 'react';
import { 
  Receipt, 
  DollarSign, 
  Printer, 
  CheckCircle2, 
  ArrowRight, 
  History, 
  CreditCard,
  Download
} from 'lucide-react';
import { Loan, Transaction } from '../types';
import { api } from '../services/api';
import { formatCurrency, formatDate } from '../lib/utils';

interface RepaymentsProcessingProps {
  loans: Loan[];
  onRefresh: () => void;
}

export const RepaymentsProcessing: React.FC<RepaymentsProcessingProps> = ({ loans, onRefresh }) => {
  const activeLoans = loans.filter((l) => l.status === 'ACTIVE' || l.status === 'OVERDUE');

  const [selectedLoanId, setSelectedLoanId] = useState<number>(activeLoans[0]?.id || 0);
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<Transaction['payment_method']>('BANK_TRANSFER');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [lastReceipt, setLastReceipt] = useState<Transaction | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedLoan = loans.find((l) => l.id === selectedLoanId);

  const handleSelectLoan = async (loanId: number) => {
    setSelectedLoanId(loanId);
    setLastReceipt(null);
    const selected = loans.find((l) => l.id === loanId);
    if (selected) {
      setAmount(selected.balance_remaining ? Math.min(444, selected.balance_remaining) : 100);
      try {
        const txs = await api.getLoanTransactions(loanId);
        setRecentTransactions(txs);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleRecordRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanId || amount <= 0) {
      alert('Please select a valid loan and enter repayment amount');
      return;
    }

    setIsProcessing(true);
    try {
      const tx = await api.recordRepayment(
        selectedLoanId,
        amount,
        paymentMethod,
        reference || `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        notes || 'Regular installment payment',
        paymentDate
      );
      setLastReceipt(tx);
      setRecentTransactions((prev) => [tx, ...prev]);
      onRefresh();
    } catch (err) {
      alert('Repayment recording failed: ' + err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xs border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Repayment Processing & Receipt Generator</h2>
          <p className="text-slate-500 text-xs mt-0.5">Collect loan payments, auto-allocate principal & interest, and issue printable receipts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Payment Entry Form & History */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-xs border border-slate-200/80 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Record New Repayment
            </h3>

            {activeLoans.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No active or overdue loans currently available for repayment.
              </div>
            ) : (
              <form onSubmit={handleRecordRepayment} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Select Active Loan</label>
                  <select
                    value={selectedLoanId}
                    onChange={(e) => handleSelectLoan(parseInt(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xs bg-white focus:ring-2 focus:ring-emerald-500/20 font-semibold"
                  >
                    {activeLoans.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.loan_number} — {l.borrower_name} ({formatCurrency(l.balance_remaining || 0)} balance remaining)
                      </option>
                    ))}
                  </select>
                </div>

                {selectedLoan && (
                  <div className="bg-slate-50 p-4 rounded-xs border border-slate-200/70 grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500">Borrower:</span>
                      <p className="font-bold text-slate-900">{selectedLoan.borrower_name}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Product:</span>
                      <p className="font-bold text-slate-900">{selectedLoan.product_name}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Total Outstanding Balance:</span>
                      <p className="font-bold text-indigo-600 text-sm">{formatCurrency(selectedLoan.balance_remaining || 0)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Interest Calculation Engine:</span>
                      <p className="font-semibold text-slate-700">{selectedLoan.interest_method}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Repayment Amount ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min={1}
                      value={amount}
                      onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xs focus:ring-2 focus:ring-emerald-500/20 font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as Transaction['payment_method'])}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xs bg-white focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="BANK_TRANSFER">Bank Transfer / Wire</option>
                      <option value="MOBILE_MONEY">Mobile Money</option>
                      <option value="CASH">Cash</option>
                      <option value="CHECK">Check</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Date</label>
                    <input
                      type="date"
                      required
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xs focus:ring-2 focus:ring-emerald-500/20 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction Ref / Cheque #</label>
                    <input
                      type="text"
                      placeholder="e.g. TXN-990182"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xs focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Officer Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. Early payment received"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xs focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm py-3 rounded-xs shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    {isProcessing ? 'Processing Transaction...' : 'Process Payment & Issue Receipt'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Recent Repayment History */}
          <div className="bg-white rounded-xs border border-slate-200/80 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-slate-500" />
              Recent Repayments Log
            </h3>
            <div className="space-y-3">
              {recentTransactions.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No transactions recorded for this loan yet.</p>
              ) : (
                recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3.5 rounded-xs border border-slate-100 bg-slate-50/50 text-xs">
                    <div>
                      <div className="font-bold font-mono text-slate-900">{tx.receipt_number}</div>
                      <div className="text-slate-400 text-[11px] mt-0.5">
                        {tx.transaction_date} via {tx.payment_method} ({tx.reference})
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-600 text-sm">{formatCurrency(tx.amount)}</div>
                      <div className="text-[10px] text-slate-400">
                        P: {formatCurrency(tx.principal_component)} | I: {formatCurrency(tx.interest_component)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Receipt Display & Printable Voucher */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-xs border border-slate-200/80 p-6 shadow-sm sticky top-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                Printable Official Receipt
              </h3>
              {lastReceipt && (
                <button
                  onClick={handlePrintReceipt}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-xs flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Receipt
                </button>
              )}
            </div>

            {lastReceipt ? (
              <div id="printable-receipt" className="border-2 border-dashed border-slate-300 rounded-xs p-5 bg-slate-50/40 space-y-4 font-mono text-xs">
                <div className="text-center border-b border-slate-200 pb-3">
                  <h4 className="font-bold text-base text-slate-900 uppercase">MicroFinance Pro MFI</h4>
                  <p className="text-[10px] text-slate-500">Official Payment Receipt & Voucher</p>
                  <div className="mt-2 inline-block bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-xs text-[10px]">
                    STATUS: PAYMENT SUCCESSFUL
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Receipt No:</span>
                    <span className="font-bold text-slate-900">{lastReceipt.receipt_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date & Time:</span>
                    <span className="text-slate-900">{lastReceipt.transaction_date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Borrower:</span>
                    <span className="font-bold text-slate-900">{selectedLoan?.borrower_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Loan Number:</span>
                    <span className="text-slate-900">{selectedLoan?.loan_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment Method:</span>
                    <span className="text-slate-900">{lastReceipt.payment_method}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Reference:</span>
                    <span className="text-slate-900">{lastReceipt.reference}</span>
                  </div>
                </div>

                <div className="border-t border-b border-slate-200 py-3 space-y-1.5">
                  <div className="flex justify-between font-bold text-slate-900 text-sm">
                    <span>TOTAL RECEIVED:</span>
                    <span className="text-emerald-600">{formatCurrency(lastReceipt.amount)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Principal Component:</span>
                    <span>{formatCurrency(lastReceipt.principal_component)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Interest Component:</span>
                    <span>{formatCurrency(lastReceipt.interest_component)}</span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 text-center pt-2">
                  <p>Thank you for your payment!</p>
                  <p className="mt-0.5">System Generated Electronic Receipt — Authorized Copy</p>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-200 rounded-xs p-12 text-center text-slate-400 font-medium text-xs">
                Process a repayment above to generate and inspect the official receipt.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
