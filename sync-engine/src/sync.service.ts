import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export interface UserDto {
  id?: number;
  username: string;
  password?: string;
  full_name: string;
  role: string;
  status: string;
  created_at?: string;
}

export interface PlatformSettingsDto {
  org_name: string;
  currency_symbol: string;
  default_annual_interest_rate: number;
  default_origination_fee_percent: number;
  theme: string;
}

export interface BorrowerDto {
  id?: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  national_id: string;
  address: string;
  credit_score: number;
  status: string;
  created_at?: string;
}

export interface LoanProductDto {
  id?: number;
  name: string;
  code: string;
  description: string;
  interest_method: string;
  annual_interest_rate: number;
  min_amount: number;
  max_amount: number;
  min_term_months: number;
  max_term_months: number;
  payment_frequency: string;
  origination_fee_percent: number;
  late_fee_percent: number;
  grace_period_days: number;
  created_at?: string;
}

export interface LoanDto {
  id?: number;
  borrower_id: number;
  loan_product_id: number;
  loan_number: string;
  principal_amount: number;
  annual_interest_rate: number;
  interest_method: string;
  term_months: number;
  payment_frequency: string;
  origination_fee: number;
  status: string;
  application_date: string;
  approval_date?: string;
  disbursement_date?: string;
  maturity_date?: string;
  notes?: string;
  created_at?: string;
  borrower_name?: string;
  product_name?: string;
  total_interest?: number;
  total_payable?: number;
  amount_paid?: number;
  balance_remaining?: number;
}

export interface ScheduleItemDto {
  id?: number;
  loan_id: number;
  installment_number: number;
  due_date: string;
  principal_due: number;
  interest_due: number;
  fee_due: number;
  total_installment: number;
  principal_paid: number;
  interest_paid: number;
  fee_paid: number;
  status: string;
  paid_date?: string;
}

export interface TransactionDto {
  id?: number;
  loan_id: number;
  receipt_number: string;
  transaction_date: string;
  amount: number;
  principal_component: number;
  interest_component: number;
  fee_component: number;
  payment_method: string;
  reference: string;
  notes: string;
  created_at?: string;
}

export interface SyncPayloadDto {
  timestamp: string;
  users: UserDto[];
  settings: PlatformSettingsDto;
  borrowers: BorrowerDto[];
  loan_products: LoanProductDto[];
  loans: LoanDto[];
  schedule_items: ScheduleItemDto[];
  transactions: TransactionDto[];
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  async importSyncData(payload: SyncPayloadDto): Promise<SyncPayloadDto> {
    this.logger.log('Importing sync payload...');

    // 1. Settings
    if (payload.settings) {
      const settingsMap = {
        org_name: payload.settings.org_name,
        currency_symbol: payload.settings.currency_symbol,
        default_annual_interest_rate: String(payload.settings.default_annual_interest_rate),
        default_origination_fee_percent: String(payload.settings.default_origination_fee_percent),
        theme: payload.settings.theme,
      };

      for (const [key, value] of Object.entries(settingsMap)) {
        if (value !== undefined) {
          await this.prisma.platformSetting.upsert({
            where: { key },
            update: { value },
            create: { key, value },
          });
        }
      }
    }

    // 2. Users
    if (payload.users && Array.isArray(payload.users)) {
      for (const user of payload.users) {
        await this.prisma.user.upsert({
          where: { username: user.username },
          update: {
            fullName: user.full_name,
            role: user.role,
            status: user.status,
          },
          create: {
            username: user.username,
            passwordHash: user.password || '123456',
            fullName: user.full_name,
            role: user.role,
            status: user.status,
          },
        });
      }
    }

    // 3. Borrowers
    const borrowerIdMap = new Map<number, bigint>();
    if (payload.borrowers && Array.isArray(payload.borrowers)) {
      for (const b of payload.borrowers) {
        const saved = await this.prisma.borrower.upsert({
          where: { nationalId: b.national_id },
          update: {
            firstName: b.first_name,
            lastName: b.last_name,
            email: b.email,
            phone: b.phone,
            address: b.address,
            creditScore: b.credit_score,
            status: b.status,
          },
          create: {
            firstName: b.first_name,
            lastName: b.last_name,
            email: b.email,
            phone: b.phone,
            nationalId: b.national_id,
            address: b.address,
            creditScore: b.credit_score,
            status: b.status,
          },
        });

        if (b.id) {
          borrowerIdMap.set(b.id, saved.id);
        }
      }
    }

    // 4. Loan Products
    const loanProductIdMap = new Map<number, bigint>();
    if (payload.loan_products && Array.isArray(payload.loan_products)) {
      for (const lp of payload.loan_products) {
        const saved = await this.prisma.loanProduct.upsert({
          where: { code: lp.code },
          update: {
            name: lp.name,
            description: lp.description,
            interestMethod: lp.interest_method,
            annualInterestRate: lp.annual_interest_rate,
            minAmount: lp.min_amount,
            maxAmount: lp.max_amount,
            minTermMonths: lp.min_term_months,
            maxTermMonths: lp.max_term_months,
            paymentFrequency: lp.payment_frequency,
            originationFeePercent: lp.origination_fee_percent,
            lateFeePercent: lp.late_fee_percent,
            gracePeriodDays: lp.grace_period_days,
          },
          create: {
            name: lp.name,
            code: lp.code,
            description: lp.description,
            interestMethod: lp.interest_method,
            annualInterestRate: lp.annual_interest_rate,
            minAmount: lp.min_amount,
            maxAmount: lp.max_amount,
            minTermMonths: lp.min_term_months,
            maxTermMonths: lp.max_term_months,
            paymentFrequency: lp.payment_frequency,
            originationFeePercent: lp.origination_fee_percent,
            lateFeePercent: lp.late_fee_percent,
            gracePeriodDays: lp.grace_period_days,
          },
        });

        if (lp.id) {
          loanProductIdMap.set(lp.id, saved.id);
        }
      }
    }

    // 5. Loans
    const loanIdMap = new Map<number, bigint>();
    if (payload.loans && Array.isArray(payload.loans)) {
      for (const l of payload.loans) {
        let borrowerDbId = borrowerIdMap.get(l.borrower_id);
        if (!borrowerDbId) {
          const b = await this.prisma.borrower.findFirst({ where: { id: l.borrower_id } });
          if (b) borrowerDbId = b.id;
        }

        let productDbId = loanProductIdMap.get(l.loan_product_id);
        if (!productDbId) {
          const lp = await this.prisma.loanProduct.findFirst({ where: { id: l.loan_product_id } });
          if (lp) productDbId = lp.id;
        }

        if (borrowerDbId && productDbId) {
          const saved = await this.prisma.loan.upsert({
            where: { loanNumber: l.loan_number },
            update: {
              status: l.status,
              approvalDate: l.approval_date,
              disbursementDate: l.disbursement_date,
              maturityDate: l.maturity_date,
              notes: l.notes,
            },
            create: {
              borrowerId: borrowerDbId,
              loanProductId: productDbId,
              loanNumber: l.loan_number,
              principalAmount: l.principal_amount,
              annualInterestRate: l.annual_interest_rate,
              interestMethod: l.interest_method,
              termMonths: l.term_months,
              paymentFrequency: l.payment_frequency,
              originationFee: l.origination_fee,
              status: l.status,
              applicationDate: l.application_date,
              approvalDate: l.approval_date,
              disbursementDate: l.disbursement_date,
              maturityDate: l.maturity_date,
              notes: l.notes,
            },
          });

          if (l.id) {
            loanIdMap.set(l.id, saved.id);
          }
        }
      }
    }

    // 6. Schedule Items
    if (payload.schedule_items && Array.isArray(payload.schedule_items)) {
      for (const item of payload.schedule_items) {
        let loanDbId = loanIdMap.get(item.loan_id);
        if (!loanDbId) {
          const l = await this.prisma.loan.findFirst({ where: { id: item.loan_id } });
          if (l) loanDbId = l.id;
        }

        if (loanDbId) {
          const existing = await this.prisma.scheduleItem.findFirst({
            where: {
              loanId: loanDbId,
              installmentNumber: item.installment_number,
            },
          });

          if (existing) {
            await this.prisma.scheduleItem.update({
              where: { id: existing.id },
              data: {
                principalPaid: item.principal_paid,
                interestPaid: item.interest_paid,
                feePaid: item.fee_paid,
                status: item.status,
                paidDate: item.paid_date,
              },
            });
          } else {
            await this.prisma.scheduleItem.create({
              data: {
                loanId: loanDbId,
                installmentNumber: item.installment_number,
                dueDate: item.due_date,
                principalDue: item.principal_due,
                interestDue: item.interest_due,
                feeDue: item.fee_due,
                totalInstallment: item.total_installment,
                principalPaid: item.principal_paid,
                interestPaid: item.interest_paid,
                feePaid: item.fee_paid,
                status: item.status,
                paidDate: item.paid_date,
              },
            });
          }
        }
      }
    }

    // 7. Transactions
    if (payload.transactions && Array.isArray(payload.transactions)) {
      for (const tx of payload.transactions) {
        let loanDbId = loanIdMap.get(tx.loan_id);
        if (!loanDbId) {
          const l = await this.prisma.loan.findFirst({ where: { id: tx.loan_id } });
          if (l) loanDbId = l.id;
        }

        if (loanDbId) {
          await this.prisma.transaction.upsert({
            where: { receiptNumber: tx.receipt_number },
            update: {
              amount: tx.amount,
              principalComponent: tx.principal_component,
              interestComponent: tx.interest_component,
              feeComponent: tx.fee_component,
              paymentMethod: tx.payment_method,
              reference: tx.reference,
              notes: tx.notes,
            },
            create: {
              loanId: loanDbId,
              receiptNumber: tx.receipt_number,
              transactionDate: tx.transaction_date,
              amount: tx.amount,
              principalComponent: tx.principal_component,
              interestComponent: tx.interest_component,
              feeComponent: tx.fee_component,
              paymentMethod: tx.payment_method,
              reference: tx.reference,
              notes: tx.notes,
            },
          });
        }
      }
    }

    return this.exportSyncData();
  }

  async exportSyncData(): Promise<SyncPayloadDto> {
    const settingsRows = await this.prisma.platformSetting.findMany();
    const settingsObj: Record<string, string> = {};
    for (const r of settingsRows) {
      settingsObj[r.key] = r.value;
    }

    const settings: PlatformSettingsDto = {
      org_name: settingsObj.org_name || 'MicroFinance Systems',
      currency_symbol: settingsObj.currency_symbol || 'KSh',
      default_annual_interest_rate: parseFloat(settingsObj.default_annual_interest_rate || '12.0'),
      default_origination_fee_percent: parseFloat(settingsObj.default_origination_fee_percent || '1.5'),
      theme: settingsObj.theme || 'light',
    };

    const users = (await this.prisma.user.findMany()).map((u) => ({
      id: Number(u.id),
      username: u.username,
      full_name: u.fullName,
      role: u.role,
      status: u.status,
      created_at: u.createdAt.toISOString(),
    }));

    const borrowers = (await this.prisma.borrower.findMany()).map((b) => ({
      id: Number(b.id),
      first_name: b.firstName,
      last_name: b.lastName,
      email: b.email,
      phone: b.phone,
      national_id: b.nationalId,
      address: b.address,
      credit_score: b.creditScore,
      status: b.status,
      created_at: b.createdAt.toISOString(),
    }));

    const loanProducts = (await this.prisma.loanProduct.findMany()).map((lp) => ({
      id: Number(lp.id),
      name: lp.name,
      code: lp.code,
      description: lp.description,
      interest_method: lp.interestMethod,
      annual_interest_rate: lp.annualInterestRate,
      min_amount: lp.minAmount,
      max_amount: lp.maxAmount,
      min_term_months: lp.minTermMonths,
      max_term_months: lp.maxTermMonths,
      payment_frequency: lp.paymentFrequency,
      origination_fee_percent: lp.originationFeePercent,
      late_fee_percent: lp.lateFeePercent,
      grace_period_days: lp.gracePeriodDays,
      created_at: lp.createdAt.toISOString(),
    }));

    const loans = (await this.prisma.loan.findMany({ include: { borrower: true, loanProduct: true } })).map((l) => ({
      id: Number(l.id),
      borrower_id: Number(l.borrowerId),
      loan_product_id: Number(l.loanProductId),
      loan_number: l.loanNumber,
      principal_amount: l.principalAmount,
      annual_interest_rate: l.annualInterestRate,
      interest_method: l.interestMethod,
      term_months: l.termMonths,
      payment_frequency: l.paymentFrequency,
      origination_fee: l.originationFee,
      status: l.status,
      application_date: l.applicationDate,
      approval_date: l.approvalDate || undefined,
      disbursement_date: l.disbursementDate || undefined,
      maturity_date: l.maturityDate || undefined,
      notes: l.notes || undefined,
      created_at: l.createdAt.toISOString(),
      borrower_name: `${l.borrower.firstName} ${l.borrower.lastName}`,
      product_name: l.loanProduct.name,
    }));

    const scheduleItems = (await this.prisma.scheduleItem.findMany()).map((s) => ({
      id: Number(s.id),
      loan_id: Number(s.loanId),
      installment_number: s.installmentNumber,
      due_date: s.dueDate,
      principal_due: s.principalDue,
      interest_due: s.interestDue,
      fee_due: s.feeDue,
      total_installment: s.totalInstallment,
      principal_paid: s.principalPaid,
      interest_paid: s.interestPaid,
      fee_paid: s.feePaid,
      status: s.status,
      paid_date: s.paidDate || undefined,
    }));

    const transactions = (await this.prisma.transaction.findMany()).map((t) => ({
      id: Number(t.id),
      loan_id: Number(t.loanId),
      receipt_number: t.receiptNumber,
      transaction_date: t.transactionDate,
      amount: t.amount,
      principal_component: t.principalComponent,
      interest_component: t.interestComponent,
      fee_component: t.feeComponent,
      payment_method: t.paymentMethod,
      reference: t.reference,
      notes: t.notes,
      created_at: t.createdAt.toISOString(),
    }));

    return {
      timestamp: new Date().toISOString(),
      users,
      settings,
      borrowers,
      loan_products: loanProducts,
      loans,
      schedule_items: scheduleItems,
      transactions,
    };
  }
}
