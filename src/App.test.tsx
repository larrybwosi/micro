import { describe, it, expect } from 'vitest';
import { Borrower, LoanProduct, User } from './types';

describe('Application logic tests', () => {
  const sampleBorrowers: Borrower[] = [
    {
      id: 1,
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone: '123456789',
      national_id: 'NAT-001',
      address: '123 Main St',
      credit_score: 720,
      status: 'Active',
    },
    {
      id: 2,
      first_name: 'Mary',
      last_name: 'Smith',
      email: 'mary@example.com',
      phone: '987654321',
      national_id: 'NAT-002',
      address: '456 Oak St',
      credit_score: 680,
      status: 'Active',
    },
  ];

  it('filters borrowers by search term correctly', () => {
    const filterBorrowers = (borrowers: Borrower[], term: string) => {
      const lower = term.toLowerCase();
      return borrowers.filter((b) => {
        const fullName = `${b.first_name} ${b.last_name}`.toLowerCase();
        return (
          fullName.includes(lower) ||
          b.national_id.toLowerCase().includes(lower) ||
          b.email.toLowerCase().includes(lower) ||
          b.phone.toLowerCase().includes(lower)
        );
      });
    };

    expect(filterBorrowers(sampleBorrowers, 'Mary').length).toBe(1);
    expect(filterBorrowers(sampleBorrowers, 'NAT-001').length).toBe(1);
    expect(filterBorrowers(sampleBorrowers, 'example.com').length).toBe(2);
    expect(filterBorrowers(sampleBorrowers, 'nonexistent').length).toBe(0);
  });

  it('checks admin role privileges correctly', () => {
    const adminUser: User = { id: 1, username: 'admin', full_name: 'Admin', role: 'ADMIN', status: 'Active' };
    const standardUser: User = { id: 2, username: 'officer', full_name: 'Officer', role: 'USER', status: 'Active' };

    const isAdmin = (user: User | null) => user?.role === 'ADMIN';

    expect(isAdmin(adminUser)).toBe(true);
    expect(isAdmin(standardUser)).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });

  describe('Loan Product logic tests', () => {
    const sampleProducts: LoanProduct[] = [
      {
        id: 1,
        name: 'Micro Business Loan',
        code: 'LP-01',
        description: 'Working capital loan',
        interest_method: 'REDUCING_BALANCE',
        annual_interest_rate: 12.0,
        interest_rate_type: 'ANNUAL',
        interest_type: 'SIMPLE',
        min_amount: 500,
        max_amount: 10000,
        min_term_months: 3,
        max_term_months: 24,
        payment_frequency: 'MONTHLY',
        origination_fee_percent: 1.5,
        late_fee_percent: 2.0,
        grace_period_days: 5,
      },
      {
        id: 2,
        name: 'Emergency Loan',
        code: 'LP-02',
        description: 'Short term emergency cash',
        interest_method: 'FLAT_RATE',
        annual_interest_rate: 15.0,
        interest_rate_type: 'ANNUAL',
        interest_type: 'SIMPLE',
        min_amount: 100,
        max_amount: 2000,
        min_term_months: 1,
        max_term_months: 6,
        payment_frequency: 'MONTHLY',
        origination_fee_percent: 1.0,
        late_fee_percent: 1.5,
        grace_period_days: 3,
      },
    ];

    it('detects duplicate loan product code correctly ignoring case and surrounding spaces', () => {
      const isDuplicateCode = (code: string, editingProductId?: number) => {
        const trimmed = code.trim().toLowerCase();
        return sampleProducts.some(
          (p) => p.code.trim().toLowerCase() === trimmed && p.id !== editingProductId
        );
      };

      expect(isDuplicateCode('LP-01')).toBe(true);
      expect(isDuplicateCode('  lp-01 ')).toBe(true);
      expect(isDuplicateCode('LP-01', 1)).toBe(false); // same product being edited
      expect(isDuplicateCode('LP-03')).toBe(false);
    });

    it('auto-generates non-colliding loan product code', () => {
      const generateCode = (products: LoanProduct[]) => {
        let codeNum = products.length + 1;
        let autoCode = `LP-${String(codeNum).padStart(2, '0')}`;
        while (products.some((p) => p.code.toUpperCase() === autoCode.toUpperCase())) {
          codeNum++;
          autoCode = `LP-${String(codeNum).padStart(2, '0')}`;
        }
        return autoCode;
      };

      expect(generateCode(sampleProducts)).toBe('LP-03');

      const gapProducts = [...sampleProducts, { ...sampleProducts[0], id: 3, code: 'LP-03' }];
      expect(generateCode(gapProducts)).toBe('LP-04');
    });
  });

  describe('API command and Loan status update tests', () => {
    it('updates loan status via api.updateLoanStatus without error', async () => {
      const { api } = await import('./services/api');
      await expect(api.updateLoanStatus(1, 'APPROVED', 'Approved in test')).resolves.toBeUndefined();
    });
  });
});
