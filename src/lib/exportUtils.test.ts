import { describe, it, expect } from 'vitest';
import { escapeCSVField, generateCSV } from './exportUtils';

describe('exportUtils', () => {
  describe('escapeCSVField', () => {
    it('handles null and undefined', () => {
      expect(escapeCSVField(null)).toBe('""');
      expect(escapeCSVField(undefined)).toBe('""');
    });

    it('escapes quotes by doubling them and wrapping in quotes', () => {
      expect(escapeCSVField('John "Doe" Smith')).toBe('"John ""Doe"" Smith"');
    });

    it('prevents formula injection by prepending apostrophe if field starts with =, +, -, @', () => {
      expect(escapeCSVField('=1+2')).toBe('"\'=1+2"');
      expect(escapeCSVField('+SUM(A1:A10)')).toBe('"\'Control+SUM(A1:A10)"'.replace('Control', ''));
      expect(escapeCSVField('-100')).toBe('"\'=100"'.replace('=100', '-100'));
      expect(escapeCSVField('@admin')).toBe('"\'@admin"');
    });

    it('handles normal strings and numbers', () => {
      expect(escapeCSVField('Normal Text')).toBe('"Normal Text"');
      expect(escapeCSVField(1234.56)).toBe('"1234.56"');
    });
  });

  describe('generateCSV', () => {
    it('includes UTF-8 BOM, headers, and data rows', () => {
      const headers = ['ID', 'Name', 'Amount'];
      const rows = [
        [1, 'Alice', 500],
        [2, 'Bob', 1200],
      ];

      const csv = generateCSV(headers, rows);
      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('"ID","Name","Amount"');
      expect(csv).toContain('"1","Alice","500"');
      expect(csv).toContain('"2","Bob","1200"');
    });

    it('includes title headers and summary rows when options are provided', () => {
      const headers = ['Name', 'Balance'];
      const rows = [['John', 100]];
      const summaryRow = ['TOTAL', 100];

      const csv = generateCSV(headers, rows, {
        orgName: 'Test MFI',
        title: 'Summary Report',
        summaryRow,
      });

      expect(csv).toContain('"Test MFI"');
      expect(csv).toContain('"Summary Report"');
      expect(csv).toContain('"TOTAL","100"');
    });
  });
});
