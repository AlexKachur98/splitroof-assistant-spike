const { getBalance, getCategorySpend, getBudgetStatus } = require('../src/tools');

describe('getBalance', () => {
  test('Alex is owed by all three after covering rent', () => {
    const bal = getBalance('Alex');
    expect(bal.net).toEqual({ Sean: 613.46, Priya: 546.56, Dan: 593.6 });
    expect(bal.total).toBe(1753.62);
  });

  test('Sean owes Alex and Priya but Dan owes him', () => {
    const bal = getBalance('Sean');
    expect(bal.net).toEqual({ Alex: -613.46, Priya: -54, Dan: 29.52 });
    expect(bal.total).toBe(-637.94);
  });

  test('the vacuum Priya paid for but was left out of still counts in her favour', () => {
    const bal = getBalance('Priya');
    expect(bal.net).toEqual({ Alex: -546.56, Sean: 54, Dan: 83.52 });
    expect(bal.total).toBe(-409.04);
  });

  test('Dan is behind with everyone', () => {
    const bal = getBalance('Dan');
    expect(bal.net).toEqual({ Alex: -593.6, Sean: -29.52, Priya: -83.52 });
    expect(bal.total).toBe(-706.64);
  });

  test('the four totals cancel out', () => {
    const sum = ['Alex', 'Sean', 'Priya', 'Dan'].reduce((s, m) => s + getBalance(m).total, 0);
    expect(sum).toBeCloseTo(0, 6);
  });
});

describe('getCategorySpend', () => {
  test('groceries in September, with who paid for what', () => {
    const spend = getCategorySpend('groceries', '2026-09');
    expect(spend.total).toBe(579.52);
    expect(spend.count).toBe(8);
    expect(spend.byPayer).toEqual({ Alex: 183.48, Sean: 181.48, Priya: 109.96, Dan: 104.6 });
  });

  test('Priya covered both utility bills herself', () => {
    const spend = getCategorySpend('utilities', '2026-09');
    expect(spend.total).toBe(193.4);
    expect(spend.count).toBe(2);
    expect(spend.byPayer).toEqual({ Priya: 193.4 });
  });

  test('rent is a single expense', () => {
    const spend = getCategorySpend('rent', '2026-09');
    expect(spend.total).toBe(2380);
    expect(spend.count).toBe(1);
  });

  test('a month with nothing in it comes back at zero', () => {
    const spend = getCategorySpend('groceries', '2026-10');
    expect(spend.total).toBe(0);
    expect(spend.count).toBe(0);
    expect(spend.byPayer).toEqual({});
  });
});

describe('getBudgetStatus', () => {
  test('September budgets with the pace projection', () => {
    const status = getBudgetStatus('2026-09');
    expect(status.month).toBe('2026-09');
    expect(status.categories).toEqual([
      { category: 'groceries', budget: 600, spent: 579.52, pct: 96.59, projected: 724.4, over: true },
      { category: 'utilities', budget: 200, spent: 193.4, pct: 96.7, projected: 241.75, over: true },
      { category: 'entertainment', budget: 150, spent: 157.76, pct: 105.17, projected: 197.2, over: true }
    ]);
  });

  test('entertainment is the one already past its budget', () => {
    const ent = getBudgetStatus('2026-09').categories.find(c => c.category === 'entertainment');
    expect(ent.spent).toBeGreaterThan(ent.budget);
    expect(ent.pct).toBeGreaterThan(100);
  });

  test('categories without a budget are left out', () => {
    const names = getBudgetStatus('2026-09').categories.map(c => c.category);
    expect(names).not.toContain('rent');
    expect(names).not.toContain('household');
  });
});
