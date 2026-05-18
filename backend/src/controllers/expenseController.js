const Expense = require('../models/Expense');
const Group = require('../models/Group');

const assertGroupMember = async (groupId, userId) => {
  const group = await Group.findById(groupId);
  if (!group) throw { status: 404, message: 'Group not found' };
  if (!group.members.some((m) => m.equals(userId)))
    throw { status: 403, message: 'Access denied' };
  return group;
};

// GET /api/groups/:groupId/expenses
const getExpenses = async (req, res) => {
  try {
    await assertGroupMember(req.params.groupId, req.user._id);
    const expenses = await Expense.find({ group: req.params.groupId })
      .populate('paidBy', 'name email')
      .populate('participants.user', 'name email')
      .sort('-date');
    res.json(expenses);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// POST /api/groups/:groupId/expenses
const createExpense = async (req, res) => {
  try {
    const group = await assertGroupMember(req.params.groupId, req.user._id);

    const { amount, description, date, category, participantIds } = req.body;

    const selectedMembers =
      participantIds && participantIds.length > 0
        ? group.members.filter((m) => participantIds.includes(m.toString()))
        : group.members;

    if (selectedMembers.length === 0)
      return res.status(400).json({ message: 'Select at least one participant' });

    const memberCount = selectedMembers.length;
    const perPerson = parseFloat((amount / memberCount).toFixed(2));
    const remainder = parseFloat((amount - perPerson * memberCount).toFixed(2));
    const participants = selectedMembers.map((memberId, i) => ({
      user: memberId,
      share: i === 0 ? parseFloat((perPerson + remainder).toFixed(2)) : perPerson,
    }));

    const expense = await Expense.create({
      group: req.params.groupId,
      paidBy: req.user._id,
      amount,
      description,
      date: date || Date.now(),
      participants,
      category,
    });

    const populated = await expense.populate([
      { path: 'paidBy', select: 'name email' },
      { path: 'participants.user', select: 'name email' },
    ]);

    res.status(201).json(populated);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// DELETE /api/groups/:groupId/expenses/:id
const deleteExpense = async (req, res) => {
  try {
    await assertGroupMember(req.params.groupId, req.user._id);
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    if (!expense.paidBy.equals(req.user._id))
      return res.status(403).json({ message: 'Only the payer can delete this expense' });

    await expense.deleteOne();
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// GET /api/groups/:groupId/balances
const getBalances = async (req, res) => {
  try {
    const group = await assertGroupMember(req.params.groupId, req.user._id);
    const expenses = await Expense.find({ group: req.params.groupId });
    const Settlement = require('../models/Settlement');
    const settlements = await Settlement.find({ group: req.params.groupId });

    // net[userId] = amount others owe them (positive = they are owed)
    const net = {};
    group.members.forEach((m) => { net[m.toString()] = 0; });

    for (const exp of expenses) {
      const payerId = exp.paidBy.toString();
      net[payerId] = (net[payerId] || 0) + exp.amount;
      for (const p of exp.participants) {
        const uid = p.user.toString();
        net[uid] = (net[uid] || 0) - p.share;
      }
    }

    for (const s of settlements) {
      net[s.fromUser.toString()] += s.amount;
      net[s.toUser.toString()] -= s.amount;
    }

    res.json(net);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

module.exports = { getExpenses, createExpense, deleteExpense, getBalances };
