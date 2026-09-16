require('dotenv').config({ quiet: true });
const Anthropic = require('@anthropic-ai/sdk');
const { getBalance, getCategorySpend, getBudgetStatus, tools, currentMonth } = require('./tools');

const MODEL = process.env.ASSISTANT_MODEL || 'claude-haiku-4-5';

const SYSTEM = [
  'You are the assistant inside a shared household expenses app. You answer questions about one household of four',
  'members and their shared expenses, and nothing else. If a question is not about this household\'s spending,',
  "balances or budgets, reply with exactly: I can only help with questions about this household's expenses.",
  'and nothing further.',
  '',
  'Every number you give must come from a tool result. Do not add, subtract, divide or estimate any figure yourself,',
  'and never state a number the tools did not return. Write money as a dollar figure like $12.34, and when you say a',
  'category is over or close to its budget, give the dollar amount spent, not only a percentage.',
  '',
  'The current month is ' + currentMonth + '. Keep answers to one or two sentences, plain and direct.'
].join('\n');

const handlers = {
  get_balance: input => getBalance(input.member),
  get_category_spend: input => getCategorySpend(input.category, input.month),
  get_budget_status: input => getBudgetStatus(input.month)
};

async function ask(question) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const messages = [{ role: 'user', content: question }];
  const toolCalls = [];

  let res = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM,
    tools,
    messages
  });

  while (res.stop_reason === 'tool_use') {
    const results = [];
    for (const block of res.content) {
      if (block.type !== 'tool_use') continue;
      toolCalls.push({ name: block.name, input: block.input });
      results.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(handlers[block.name](block.input))
      });
    }

    messages.push({ role: 'assistant', content: res.content });
    messages.push({ role: 'user', content: results });

    res = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      tools,
      messages
    });
  }

  const text = res.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('')
    .trim();

  return { text, toolCalls };
}

module.exports = { ask };
