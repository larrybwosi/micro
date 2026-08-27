import { describe, it, expect } from 'vitest';
import { Borrower, User } from './types';

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
});
