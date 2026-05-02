import { useState, useEffect, useCallback, useRef } from 'react';
import { queuesAPI } from '../api';
import { useSocket } from '../context/SocketContext';

/**
 * Custom hook to fetch queues and keep them in sync via socket events.
 *
 * @param {string|null} orgId - If provided, only fetches queues for this org (used by admins).
 */
export function useQueue(orgId = null) {
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { socket } = useSocket();
  const mountedRef = useRef(true);

  const fetchQueues = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await queuesAPI.getAll();
      if (mountedRef.current) {
        setQueues(res.data);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err.response?.data?.message || 'Failed to load queues');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchQueues();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchQueues]);

  // Listen for real-time socket updates and patch local state accordingly
  useEffect(() => {
    if (!socket) return;

    const handleQueueUpdate = (data) => {
      if (!mountedRef.current) return;

      switch (data.type) {
        case 'QUEUE_UPDATE':
          setQueues((prev) =>
            prev.map((q) =>
              q._id === data.queueId
                ? { ...q, currentServing: data.currentServing ?? q.currentServing }
                : q
            )
          );
          break;

        case 'QUEUE_STATUS_CHANGE':
          setQueues((prev) =>
            prev.map((q) =>
              q._id === data.queueId ? { ...q, isActive: data.isActive } : q
            )
          );
          break;

        case 'NEW_TOKEN':
          // Increment waiting count for the affected queue
          setQueues((prev) =>
            prev.map((q) =>
              q._id === data.queueId
                ? { ...q, waitingCount: (q.waitingCount || 0) + 1 }
                : q
            )
          );
          break;

        case 'TOKEN_STATUS_UPDATE':
          // Refetch for simplicity when token statuses change
          fetchQueues();
          break;

        default:
          break;
      }
    };

    socket.on('queue_update', handleQueueUpdate);
    return () => {
      socket.off('queue_update', handleQueueUpdate);
    };
  }, [socket, fetchQueues]);

  return { queues, loading, error, refetch: fetchQueues, setQueues };
}
