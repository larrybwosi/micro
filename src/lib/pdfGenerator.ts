import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, Loan, PlatformSettings } from '../types';
import { formatCurrency } from './utils';

export interface GenerateReceiptPDFOptions {
  transaction: Transaction;
  loan?: Loan;
  settings?: PlatformSettings;
}

export function generateReceiptPDF({ transaction, loan, settings }: GenerateReceiptPDFOptions) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const currencySymbol = settings?.currency_symbol || 'KSh';
  const orgName = settings?.org_name || 'MicroFinance Systems';
  const headerText = settings?.receipt_header_text || `${orgName} - Official Payment Voucher`;
  const footerText = settings?.receipt_footer_text || 'Thank you for your payment! System Generated Official Electronic Receipt.';

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 32, 'F');

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(orgName.toUpperCase(), 15, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(headerText, 15, 22);

  // Status Badge Right
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.roundedRect(145, 10, 50, 12, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('PAYMENT SUCCESS', 170, 17.5, { align: 'center' });

  // Metadata Box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(15, 40, 180, 48, 1, 1, 'FD');

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9);

  // Left Column
  doc.setFont('helvetica', 'bold');
  doc.text('Receipt Number:', 20, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(transaction.receipt_number, 60, 48);

  doc.setFont('helvetica', 'bold');
  doc.text('Transaction Date:', 20, 56);
  doc.setFont('helvetica', 'normal');
  doc.text(transaction.transaction_date, 60, 56);

  doc.setFont('helvetica', 'bold');
  doc.text('Payment Method:', 20, 64);
  doc.setFont('helvetica', 'normal');
  doc.text(transaction.payment_method.replace('_', ' '), 60, 64);

  doc.setFont('helvetica', 'bold');
  doc.text('Reference / Cheque #:', 20, 72);
  doc.setFont('helvetica', 'normal');
  doc.text(transaction.reference || 'N/A', 60, 72);

  doc.setFont('helvetica', 'bold');
  doc.text('Officer Notes:', 20, 80);
  doc.setFont('helvetica', 'normal');
  doc.text(transaction.notes || 'None', 60, 80);

  // Right Column
  doc.setFont('helvetica', 'bold');
  doc.text('Borrower Name:', 110, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(loan?.borrower_name || 'N/A', 150, 48);

  doc.setFont('helvetica', 'bold');
  doc.text('Loan Account #:', 110, 56);
  doc.setFont('helvetica', 'normal');
  doc.text(loan?.loan_number || 'N/A', 150, 56);

  doc.setFont('helvetica', 'bold');
  doc.text('Loan Product:', 110, 64);
  doc.setFont('helvetica', 'normal');
  doc.text(loan?.product_name || 'N/A', 150, 64);

  doc.setFont('helvetica', 'bold');
  doc.text('Loan Interest Rate:', 110, 72);
  doc.setFont('helvetica', 'normal');
  doc.text(`${loan?.annual_interest_rate || 0}% (${loan?.interest_rate_type === 'MONTHLY' ? 'Monthly' : 'Annual'})`, 150, 72);

  // Itemized Allocation Table
  const tableData = [
    ['Principal Component Paid', formatCurrency(transaction.principal_component, currencySymbol)],
    ['Interest Component Paid', formatCurrency(transaction.interest_component, currencySymbol)],
    ['Penalty / Late Fee Component Paid', formatCurrency(transaction.fee_component || 0, currencySymbol)],
    ['TOTAL PAYMENT RECEIVED', formatCurrency(transaction.amount, currencySymbol)],
  ];

  autoTable(doc, {
    startY: 96,
    margin: { left: 15, right: 15 },
    head: [['ALLOCATION BREAKDOWN', 'AMOUNT RECEIVED']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { cellWidth: 120, fontStyle: 'bold' },
      1: { cellWidth: 60, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.row.index === 3) {
        data.cell.styles.fillColor = [240, 253, 244]; // emerald-50
        data.cell.styles.textColor = [5, 150, 105]; // emerald-600
        data.cell.styles.fontSize = 11;
      }
    },
  });

  // Balance Summary Card
  const docWithAutoTable = doc as jsPDF & { lastAutoTable?: { finalY?: number } };
  const finalY = docWithAutoTable.lastAutoTable?.finalY || 150;

  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(15, finalY + 10, 180, 22, 1, 1, 'F');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('REMAINING BALANCE AFTER PAYMENT:', 22, finalY + 22);

  const remaining = Math.max(0, (loan?.balance_remaining || 0));
  doc.setTextColor(79, 70, 229); // indigo-600
  doc.setFontSize(11);
  doc.text(formatCurrency(remaining, currencySymbol), 185, finalY + 22, { align: 'right' });

  // Footer
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(footerText, 105, 275, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`Generated on ${new Date().toLocaleString()} | Official Microfinance System Record`, 105, 281, { align: 'center' });

  // Save file
  doc.save(`Receipt_${transaction.receipt_number}.pdf`);
}
