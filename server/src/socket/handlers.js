/**
 * Socket.io handlers for QueueBridge
 * Rooms are scoped by organizationId so broadcasts stay within tenant boundaries.
 */

const initSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Client sends their organizationId to join the right room
    socket.on('join_org', (orgId) => {
      if (!orgId) return;
      socket.join(`org_${orgId}`);
      console.log(`Socket ${socket.id} joined room: org_${orgId}`);
    });

    // Client leaves org room (e.g., on logout)
    socket.on('leave_org', (orgId) => {
      if (!orgId) return;
      socket.leave(`org_${orgId}`);
      console.log(`Socket ${socket.id} left room: org_${orgId}`);
    });

    // Client can subscribe to a specific queue for granular updates
    socket.on('join_queue', (queueId) => {
      if (!queueId) return;
      socket.join(`queue_${queueId}`);
      console.log(`Socket ${socket.id} joined queue room: queue_${queueId}`);
    });

    socket.on('leave_queue', (queueId) => {
      if (!queueId) return;
      socket.leave(`queue_${queueId}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id} — reason: ${reason}`);
    });

    socket.on('error', (err) => {
      console.error(`Socket error on ${socket.id}:`, err);
    });
  });
};

/**
 * Emit a queue update to all clients in a given organization's room.
 * Also emits to the specific queue room if queueId is present in data.
 *
 * @param {import('socket.io').Server} io
 * @param {string} orgId - MongoDB ObjectId string of the organization
 * @param {object} data - Payload to broadcast
 */
const emitQueueUpdate = (io, orgId, data) => {
  if (!orgId) return;

  // Broadcast to all members of the org room
  io.to(`org_${orgId}`).emit('queue_update', data);

  // Also emit to the specific queue room if applicable
  if (data.queueId) {
    io.to(`queue_${data.queueId}`).emit('queue_update', data);
  }
};

module.exports = { initSocket, emitQueueUpdate };
