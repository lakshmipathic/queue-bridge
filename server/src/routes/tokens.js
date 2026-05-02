const express = require('express');
const router = express.Router();
const Token = require('../models/Token');
const Queue = require('../models/Queue');
const Organization = require('../models/Organization');
const { protect, adminOnly } = require('../middleware/auth');

// POST /api/tokens
// Generate a token for a queue (public - no auth needed)
router.post('/', async (req, res) => {
  try {
    const { userName, queueId, orgId } = req.body;

    if (!userName || !queueId || !orgId) {
      return res.status(400).json({
        message: 'userName, queueId, and orgId are required',
      });
    }

    // Validate organization exists
    const org = await Organization.findById(orgId);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Validate queue exists and belongs to org
    const queue = await Queue.findOne({ _id: queueId, organizationId: orgId });
    if (!queue) {
      return res.status(404).json({ message: 'Queue not found' });
    }

    if (!queue.isActive) {
      return res.status(400).json({ message: 'This queue is currently inactive' });
    }

    const token = await Token.create({
      userName: userName.trim(),
      queueId,
      organizationId: orgId,
    });

    // Count how many are ahead
    const ahead = await Token.countDocuments({
      queueId,
      status: 'waiting',
      tokenNumber: { $lt: token.tokenNumber },
    });

    // Emit socket event for live updates
    const io = req.app.get('io');
    if (io) {
      const { emitQueueUpdate } = require('../socket/handlers');
      emitQueueUpdate(io, orgId.toString(), {
        type: 'NEW_TOKEN',
        queueId,
        token: token.toObject(),
        ahead,
      });
    }

    res.status(201).json({
      token: token.toObject(),
      queueName: queue.name,
      ahead,
    });
  } catch (error) {
    console.error('Create token error:', error);
    res.status(500).json({ message: 'Server error generating token' });
  }
});

// GET /api/tokens/queue/:queueId
// List tokens in a queue (admin only)
router.get('/queue/:queueId', protect, adminOnly, async (req, res) => {
  try {
    const queue = await Queue.findOne({
      _id: req.params.queueId,
      organizationId: req.user.organizationId,
    });

    if (!queue) {
      return res.status(404).json({ message: 'Queue not found' });
    }

    const { status, page = 1, limit = 50 } = req.query;
    const filter = { queueId: req.params.queueId };
    if (status) filter.status = status;

    const tokens = await Token.find(filter)
      .sort({ tokenNumber: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Token.countDocuments(filter);

    res.json({ tokens, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    console.error('Get tokens error:', error);
    res.status(500).json({ message: 'Server error fetching tokens' });
  }
});

// PATCH /api/tokens/:id/status
// Update token status (admin only)
router.patch('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['waiting', 'serving', 'completed', 'skipped'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const token = await Token.findById(req.params.id);
    if (!token) {
      return res.status(404).json({ message: 'Token not found' });
    }

    // Ensure token belongs to admin's organization
    if (token.organizationId.toString() !== req.user.organizationId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    token.status = status;
    await token.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      const { emitQueueUpdate } = require('../socket/handlers');
      emitQueueUpdate(io, token.organizationId.toString(), {
        type: 'TOKEN_STATUS_UPDATE',
        tokenId: token._id,
        queueId: token.queueId,
        status,
      });
    }

    res.json(token);
  } catch (error) {
    console.error('Update token status error:', error);
    res.status(500).json({ message: 'Server error updating token status' });
  }
});

module.exports = router;
