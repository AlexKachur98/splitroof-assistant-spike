require('dotenv').config({ quiet: true });
const { ask } = require('../src/assistant');

jest.setTimeout(60000);

const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);
const suite = hasKey ? describe : describe.skip;
const title = hasKey ? 'ask' : 'ask (skipped, no ANTHROPIC_API_KEY set, copy .env.example to .env to run these)';

suite(title, () => {
  test('what do I owe Sean goes to the balance tool', async () => {
    const res = await ask('I am Alex. What do I owe Sean?');
    expect(res.toolCalls.map(c => c.name)).toEqual(['get_balance']);
    expect(res.toolCalls[0].input).toEqual({ member: 'Alex' });
    expect(res.text).toMatch(/\$613\.46/);
  });

  test('groceries this month goes to the category tool', async () => {
    const res = await ask('How much did we spend on groceries this month?');
    expect(res.toolCalls.map(c => c.name)).toEqual(['get_category_spend']);
    expect(res.toolCalls[0].input).toEqual({ category: 'groceries', month: '2026-09' });
    expect(res.text).toMatch(/\$579\.52/);
  });

  test('over budget anywhere goes to the budget tool and names entertainment', async () => {
    const res = await ask('Are we over budget anywhere?');
    expect(res.toolCalls.map(c => c.name)).toEqual(['get_budget_status']);
    expect(res.toolCalls[0].input).toEqual({ month: '2026-09' });
    expect(res.text).toMatch(/entertainment/i);
    expect(res.text).toMatch(/\$157\.76/);
  });

  test('what one person paid for a category comes off the payer breakdown', async () => {
    const res = await ask('How much has Priya paid for utilities?');
    expect(res.toolCalls.map(c => c.name)).toEqual(['get_category_spend']);
    expect(res.toolCalls[0].input).toEqual({ category: 'utilities', month: '2026-09' });
    expect(res.text).toMatch(/\$193\.4/);
  });

  test('an off topic question gets a short brush off and no tool call', async () => {
    const res = await ask('What is the capital of France?');
    expect(res.toolCalls).toEqual([]);
    expect(res.text).toMatch(/expense/i);
    expect(res.text.length).toBeLessThan(200);
  });
});
