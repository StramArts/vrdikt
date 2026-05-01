// net balance: positive = is owed money, negative = owes money
export function calculateNetBalances(members, expenses, splits) {
  const net = {}
  for (const m of members) net[m.user_id] = 0

  for (const exp of expenses) {
    if (net[exp.paid_by] !== undefined) net[exp.paid_by] += Number(exp.amount)
  }

  for (const split of splits) {
    if (net[split.user_id] !== undefined) net[split.user_id] -= Number(split.amount)
  }

  return net
}

// greedy minimum settlements from net balances
export function calculateSettlements(members, expenses, splits) {
  const net = calculateNetBalances(members, expenses, splits)

  const creditors = []
  const debtors = []

  for (const [userId, balance] of Object.entries(net)) {
    if (balance > 0.005) creditors.push({ userId, amount: balance })
    else if (balance < -0.005) debtors.push({ userId, amount: -balance })
  }

  creditors.sort((a, b) => b.amount - a.amount)
  debtors.sort((a, b) => b.amount - a.amount)

  const settlements = []

  while (debtors.length && creditors.length) {
    const debtor = debtors[0]
    const creditor = creditors[0]
    const amount = Math.min(debtor.amount, creditor.amount)

    settlements.push({
      from: debtor.userId,
      to: creditor.userId,
      amount: Math.round(amount * 100) / 100,
    })

    debtor.amount -= amount
    creditor.amount -= amount

    if (debtor.amount < 0.005) debtors.shift()
    if (creditor.amount < 0.005) creditors.shift()
  }

  return settlements
}

export function getMemberTotals(members, expenses, splits) {
  const paid = {}
  const owes = {}
  for (const m of members) { paid[m.user_id] = 0; owes[m.user_id] = 0 }

  for (const exp of expenses) {
    paid[exp.paid_by] = (paid[exp.paid_by] ?? 0) + Number(exp.amount)
  }

  for (const split of splits) {
    owes[split.user_id] = (owes[split.user_id] ?? 0) + Number(split.amount)
  }

  return members.map(m => ({
    ...m,
    paid: paid[m.user_id] ?? 0,
    owes: owes[m.user_id] ?? 0,
    net: (paid[m.user_id] ?? 0) - (owes[m.user_id] ?? 0),
  }))
}
