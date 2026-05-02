const express = require('express');
const router = express.Router();
const Queue = require('../models/Queue');
const Token = require('../models/Token');
const { protect, adminOnly } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// GET /api/queues
// List queues for the authenticated user's organization
router.get('/', async (req, res) => {
  try {
    const queues = await Queue.find({ organizationId: req.user.organizationId })
      .sort({ createdAt: -1 });

    // Attach waiting token count to each queue
    const queuesWithStats = await Promise.all(
      queues.map(async (queue) => {
        const waitingCount = await Token.countDocuments({
          queueId: queue._id,
          status: 'waiting',
        });
        const servingCount = await Token.countDocuments({
          queueId: queue._id,
          status: 'serving',
        });
        return {
          ...queue.toObject(),
          waitingCount,
          servingCount,
        };
      })
    );

    res.json(queuesWithStats);
  } catch (error) {
    console.error('Get queues error:', error);
    res.status(500).json({ message: 'Server error fetching queues' });
  }
});

// POST /api/queues
// Create a new queue (admin only)
router.post('/', adminOnly, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Queue name is required' });
    }

    const existing = await Queue.findOne({
      name: name.trim(),
      organizationId: req.user.organizationId,
    });
    if (existing) {
      return res.status(409).json({ message: 'A queue with this name already exists' });
    }

    const queue = await Queue.create({
      name: name.trim(),
      description: description || '',
      organizationId: req.user.organizationId,
    });

    res.status(201).json(queue);
  } catch (error) {
    console.error('Create queue error:', error);
    res.status(500).json({ message: 'Server error creating queue' });
  }
});

// PATCH /api/queues/:id/next
// Advance to next token - marks current serving as completed, serves next waiting
router.patch('/:id/next', adminOnly, async (req, res) => {
  try {
    const queue = await Queue.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
    });

    if (!queue) {
      return res.status(404).json({ message: 'Queue not found' });
    }

    // Mark any currently serving token as completed
    await Token.updateMany(
      { queueId: queue._id, status: 'serving' },
      { status: 'completed' }
    );

    // Find the next waiting token (lowest token number)
    const nextToken = await Token.findOne({
      queueId: queue._id,
      status: 'waiting',
    }).sort({ tokenNumber: 1 });

    if (!nextToken) {
      // No more tokens waiting
      queue.currentServing = 0;
      await queue.save();

      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        const { emitQueueUpdate } = require('../socket/handlers');
        emitQueueUpdate(io, queue.organizationId.toString(), {
          type: 'QUEUE_UPDATE',
          queueId: queue._id,
          currentServing: 0,
          message: 'No more tokens in queue',
        });
      }

      return res.json({ message: 'No more tokens waiting', queue, nextToken: null });
    }

    // Mark next token as serving
    nextToken.status = 'serving';
    await nextToken.save();

    queue.currentServing = nextToken.tokenNumber;
    await queue.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      const { emitQueueUpdate } = require('../socket/handlers');
      emitQueueUpdate(io, queue.organizationId.toString(), {
        type: 'QUEUE_UPDATE',
        queueId: queue._id,
        currentServing: nextToken.tokenNumber,
        servedToken: nextToken,
      });
    }

    res.json({ queue, nextToken });
  } catch (error) {
    console.error('Next token error:', error);
    res.status(500).json({ message: 'Server error advancing queue' });
  }
});

// PATCH /api/queues/:id/toggle
// Toggle queue active status (admin only)
router.patch('/:id/toggle', adminOnly, async (req, res) => {
  try {
    const queue = await Queue.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
    });

    if (!queue) {
      return res.status(404).json({ message: 'Queue not found' });
    }

    queue.isActive = !queue.isActive;
    await queue.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      const { emitQueueUpdate } = require('../socket/handlers');
      emitQueueUpdate(io, queue.organizationId.toString(), {
        type: 'QUEUE_STATUS_CHANGE',
        queueId: queue._id,
        isActive: queue.isActive,
      });
    }

    res.json(queue);
  } catch (error) {
    console.error('Toggle queue error:', error);
    res.status(500).json({ message: 'Server error toggling queue' });
  }
});

// DELETE /api/queues/:id
// Delete a queue (admin only)
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const queue = await Queue.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
    });

    if (!queue) {
      return res.status(404).json({ message: 'Queue not found' });
    }

    // Delete all tokens in this queue
    await Token.deleteMany({ queueId: queue._id });
    await queue.deleteOne();

    res.json({ message: 'Queue deleted successfully' });
  } catch (error) {
    console.error('Delete queue error:', error);
    res.status(500).json({ message: 'Server error deleting queue' });
  }
});

module.exports = router;
