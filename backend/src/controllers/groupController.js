const Group = require('../models/Group');

// GET /api/groups
const getGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate('createdBy', 'name email')
      .populate('members', 'name email')
      .sort('-createdAt');
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/groups
const createGroup = async (req, res) => {
  try {
    const { name, memberEmails } = req.body;

    const User = require('../models/User');
    let memberIds = [req.user._id];

    if (memberEmails && memberEmails.length > 0) {
      const users = await User.find({ email: { $in: memberEmails } });
      const foundIds = users.map((u) => u._id.toString());
      const notFound = memberEmails.filter(
        (e) => !users.find((u) => u.email === e)
      );
      if (notFound.length > 0) {
        return res.status(400).json({ message: `Users not found: ${notFound.join(', ')}` });
      }
      memberIds = [...new Set([...memberIds.map(String), ...foundIds])];
    }

    const group = await Group.create({
      name,
      createdBy: req.user._id,
      members: memberIds,
    });

    const populated = await group.populate([
      { path: 'createdBy', select: 'name email' },
      { path: 'members', select: 'name email' },
    ]);

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/groups/:id
const getGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('members', 'name email');

    if (!group) return res.status(404).json({ message: 'Group not found' });

    const isMember = group.members.some((m) => m._id.equals(req.user._id));
    if (!isMember) return res.status(403).json({ message: 'Access denied' });

    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/groups/:id
const deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (!group.createdBy.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only the creator can delete this group' });
    }

    await group.deleteOne();
    res.json({ message: 'Group deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getGroups, createGroup, getGroup, deleteGroup };
