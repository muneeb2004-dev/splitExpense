const Settlement = require('../models/Settlement');
const Group = require('../models/Group');

// GET /api/groups/:groupId/settlements
const getSettlements = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.members.some((m) => m.equals(req.user._id)))
      return res.status(403).json({ message: 'Access denied' });

    const settlements = await Settlement.find({ group: req.params.groupId })
      .populate('fromUser', 'name email')
      .populate('toUser', 'name email')
      .sort('-settledAt');

    res.json(settlements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/groups/:groupId/settlements
const createSettlement = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.members.some((m) => m.equals(req.user._id)))
      return res.status(403).json({ message: 'Access denied' });

    const { toUser, amount } = req.body;

    if (!group.members.some((m) => m.toString() === toUser))
      return res.status(400).json({ message: 'toUser is not a group member' });

    const settlement = await Settlement.create({
      group: req.params.groupId,
      fromUser: req.user._id,
      toUser,
      amount,
    });

    const populated = await settlement.populate([
      { path: 'fromUser', select: 'name email' },
      { path: 'toUser', select: 'name email' },
    ]);

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getSettlements, createSettlement };
