const Settlement = require('../models/Settlement');
const Group = require('../models/Group');

const assertMember = async (groupId, userId) => {
  const group = await Group.findById(groupId);
  if (!group) throw { status: 404, message: 'Group not found' };
  if (!group.members.some((m) => m.equals(userId)))
    throw { status: 403, message: 'Access denied' };
  return group;
};

// GET /api/groups/:groupId/settlements
const getSettlements = async (req, res) => {
  try {
    await assertMember(req.params.groupId, req.user._id);
    const settlements = await Settlement.find({ group: req.params.groupId })
      .populate('fromUser', 'name email')
      .populate('toUser', 'name email')
      .sort('-settledAt');
    res.json(settlements);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// POST /api/groups/:groupId/settlements  — creates a pending request
const createSettlement = async (req, res) => {
  try {
    await assertMember(req.params.groupId, req.user._id);
    const group = await Group.findById(req.params.groupId);
    const { toUser, amount } = req.body;

    if (!group.members.some((m) => m.toString() === toUser))
      return res.status(400).json({ message: 'toUser is not a group member' });

    if (req.user._id.toString() === toUser)
      return res.status(400).json({ message: 'Cannot send payment request to yourself' });

    const settlement = await Settlement.create({
      group: req.params.groupId,
      fromUser: req.user._id,
      toUser,
      amount,
      status: 'pending',
    });

    const populated = await settlement.populate([
      { path: 'fromUser', select: 'name email' },
      { path: 'toUser', select: 'name email' },
    ]);

    res.status(201).json(populated);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// PATCH /api/groups/:groupId/settlements/:id/accept  — creditor confirms receipt
const acceptSettlement = async (req, res) => {
  try {
    await assertMember(req.params.groupId, req.user._id);

    const settlement = await Settlement.findById(req.params.id);
    if (!settlement) return res.status(404).json({ message: 'Settlement not found' });
    if (settlement.group.toString() !== req.params.groupId)
      return res.status(400).json({ message: 'Settlement does not belong to this group' });
    if (!settlement.toUser.equals(req.user._id))
      return res.status(403).json({ message: 'Only the recipient can confirm this payment' });
    if (settlement.status === 'accepted')
      return res.status(400).json({ message: 'Already accepted' });

    settlement.status = 'accepted';
    settlement.acceptedAt = new Date();
    await settlement.save();

    const populated = await settlement.populate([
      { path: 'fromUser', select: 'name email' },
      { path: 'toUser', select: 'name email' },
    ]);

    res.json(populated);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

module.exports = { getSettlements, createSettlement, acceptSettlement };
