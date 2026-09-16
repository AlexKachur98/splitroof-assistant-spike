const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'household.json'), 'utf8'));

// TODO: the real app should read the actual date; this spike follows the data it has
const currentMonth = data.expenses.map(e => e.date).sort().pop().slice(0, 7);

function round2(n) {
  return Math.round(n * 100) / 100;
}

function inMonth(e, month) {
  return e.date.startsWith(month);
}

function getBalance(member) {
  const net = {};
  for (const m of data.members) {
    if (m !== member) net[m] = 0;
  }

  // Everyone in splitBetween owes an equal share to whoever paid, so a member's
  // line with someone moves up when that person shares an expense the member
  // covered, and down when the member shares one they covered.
  for (const e of data.expenses) {
    const share = e.amount / e.splitBetween.length;
    if (e.paidBy === member) {
      for (const m of e.splitBetween) {
        if (m !== member) net[m] += share;
      }
    } else if (e.splitBetween.includes(member)) {
      net[e.paidBy] -= share;
    }
  }

  let total = 0;
  for (const m of Object.keys(net)) {
    total += net[m];
    net[m] = round2(net[m]);
  }

  return { member, net, total: round2(total) };
}

function getCategorySpend(category, month) {
  const rows = data.expenses.filter(e => e.category === category && inMonth(e, month));
  const byPayer = {};
  let total = 0;

  for (const e of rows) {
    total += e.amount;
    byPayer[e.paidBy] = round2((byPayer[e.paidBy] || 0) + e.amount);
  }

  return { category, month, total: round2(total), count: rows.length, byPayer };
}

function getBudgetStatus(month) {
  const monthExpenses = data.expenses.filter(e => inMonth(e, month));
  const lastDate = monthExpenses.map(e => e.date).sort().pop();
  const elapsed = lastDate ? Number(lastDate.slice(8)) : 0;
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();

  const categories = Object.keys(data.budgets).map(cat => {
    const spent = monthExpenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
    const budget = data.budgets[cat];
    // Pace is a straight line: the daily rate up to the last expense, carried to month end.
    const projected = elapsed ? (spent / elapsed) * daysInMonth : 0;

    return {
      category: cat,
      budget,
      spent: round2(spent),
      pct: round2((spent / budget) * 100),
      projected: round2(projected),
      over: projected > budget
    };
  });

  return { month, categories };
}

const tools = [
  {
    name: 'get_balance',
    description:
      "Returns one household member's standing with each of the other members, plus their overall total. " +
      'A positive number means that other person owes the member money; a negative number means the member owes them. ' +
      'Use this for any question about who owes whom, settling up, debts, or whether someone is square with the house. ' +
      'Do not use it for questions about how much was spent on something, or about budgets.',
    input_schema: {
      type: 'object',
      properties: {
        member: {
          type: 'string',
          description:
            'The exact first name of the member whose balance you want: Alex, Sean, Priya or Dan. ' +
            'This is the person the question is being asked by or about, not the other side of the debt. ' +
            'For "I am Alex, what do I owe Sean", the member is Alex, and Sean is read off the result.'
        }
      },
      required: ['member']
    }
  },
  {
    name: 'get_category_spend',
    description:
      'Returns the total the household spent in one category during one month, how many expenses made up that total, ' +
      'and a breakdown of how much each member personally paid toward it. ' +
      'Use it for "how much did we spend on X" questions, and for "how much has a particular person paid for X", ' +
      'which the per-payer breakdown answers. ' +
      'Do not use it to compare spending against a budget or to check whether the house is overspending; get_budget_status covers that.',
    input_schema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['rent', 'utilities', 'groceries', 'household', 'entertainment'],
          description: 'The spending category. Household covers supplies and repairs; groceries covers food shopping.'
        },
        month: {
          type: 'string',
          description:
            'The month as YYYY-MM. The records currently cover ' + currentMonth + ', so use ' + currentMonth +
            ' when the question says "this month" or names no month at all.'
        }
      },
      required: ['category', 'month']
    }
  },
  {
    name: 'get_budget_status',
    description:
      'Returns every category that has a monthly budget with its budget, the amount spent so far, the percent of the budget used, ' +
      'a straight-line projection of the month-end total if spending keeps up at the same daily pace, and whether that projection lands over budget. ' +
      'Use it for any question about budgets, overspending, running out of money, or whether the household is on track. ' +
      'Do not use it when the question just wants a plain spending total for one category.',
    input_schema: {
      type: 'object',
      properties: {
        month: {
          type: 'string',
          description:
            'The month as YYYY-MM. The records currently cover ' + currentMonth + ', so use ' + currentMonth +
            ' when the question says "this month" or names no month at all.'
        }
      },
      required: ['month']
    }
  }
];

module.exports = { getBalance, getCategorySpend, getBudgetStatus, tools, currentMonth };
