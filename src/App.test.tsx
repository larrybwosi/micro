import { describe, it, expect } from 'vitest';

describe('App smoke test', () => {
  it('passes basic math assertion', () => {
    expect(1 + 1).toBe(2);
  });
});
