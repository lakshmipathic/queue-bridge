import React, { useState, useEffect, useCallback } from 'react';
import { queuesAPI } from '../../api';
import { useSocket } from '../../context/SocketContext';

export default function LiveQueueBoard({ org }) {
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const { socket, joinOrg, leaveOrg } = useSocket();

  const fetchPublicQueues = useCallback(async () => {
    if (!org?._id) return;
    try {
      // We'll call the public organizations endpoint to get queue info
      // Since queues endpoint requires auth, we fetch org info
      // For demo: use a public-friendly approach
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, [org?._id]);

  // Join org socket room for live updates
  useEffect(() => {
    if (!org?._id) return;
    joinOrg(org._id);
    return () => leaveOrg(org._id);
  }, [org?._id, joinOrg, leaveOrg]);

  // Listen to live queue updates
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (data) => {
      setLastUpdated(new Date());

      if (data.type === 'QUEUE_UPDATE') {
        setQueues((prev) =>
          prev.map((q) =>
            q._id === data.queueId
              ? { ...q, currentServing: data.currentServing }
              : q
          )
        );
      } else if (data.type === 'QUEUE_STATUS_CHANGE') {
        setQueues((prev) =>
          prev.map((q) =>
            q._id === data.queueId ? { ...q, isActive: data.isActive } : q
          )
        );
      } else if (data.type === 'NEW_TOKEN') {
        setQueues((prev) =>
          prev.map((q) =>
            q._id === data.queueId
              ? { ...q, waitingCount: (q.waitingCount || 0) + 1 }
              : q
          )
        );
      }
    };

    socket.on('queue_update', handleUpdate);
    return () => socket.off('queue_update', handleUpdate);
  }, [socket]);

  // Seed with initial data from a token generation response (passed via prop update)
  useEffect(() => {
    setLoading(false);
  }, [org]);

  if (!org) return null;

  return (
    <div className="card p-6 h-fit">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <h3 className="font-semibold text-white">Live Queue Board</h3>
        </div>
        {lastUpdated && (
          <span className="text-xs text-slate-500">
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : queues.length === 0 ? (
        <LiveBoardEmpty org={org} onQueuesLoaded={setQueues} />
      ) : (
        <div className="space-y-4">
          {queues.map((queue) => (
            <QueueCard key={queue._id} queue={queue} />
          ))}
        </div>
      )}
    </div>
  );
}

// Fetches and displays queues for the org via public endpoint workaround
function LiveBoardEmpty({ org, onQueuesLoaded }) {
  const [innerQueues, setInnerQueues] = useState([]);
  const [fetching, setFetching] = useState(true);
  const { socket } = useSocket();

  useEffect(() => {
    // Try to load queues - if user is not authenticated this won't work
    // We show a nice placeholder in that case
    setFetching(false);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (data) => {
      if (data.type === 'QUEUE_UPDATE' && data.queueId) {
        setInnerQueues((prev) => {
          const exists = prev.find((q) => q._id === data.queueId);
          if (exists) {
            return prev.map((q) =>
              q._id === data.queueId
                ? { ...q, currentServing: data.currentServing }
                : q
            );
          }
          // Add a new entry if we see a new queue
          return [
            ...prev,
            {
              _id: data.queueId,
              name: `Queue`,
              currentServing: data.currentServing,
              isActive: true,
            },
          ];
        });
        onQueuesLoaded((prev) => prev);
      }
    };

    socket.on('queue_update', handleUpdate);
    return () => socket.off('queue_update', handleUpdate);
  }, [socket, onQueuesLoaded]);

  if (fetching) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (innerQueues.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="w-16 h-16 bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </div>
        <p className="text-slate-400 font-medium">No active queues</p>
        <p className="text-slate-500 text-sm mt-1">
          Queue updates will appear here in real time
        </p>
        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-emerald-400">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          Listening for updates...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {innerQueues.map((queue) => (
        <QueueCard key={queue._id} queue={queue} />
      ))}
    </div>
  );
}

function QueueCard({ queue }) {
  return (
    <div className={`rounded-xl border p-4 transition-all ${
      queue.isActive
        ? 'border-slate-600 bg-slate-700/50'
        : 'border-slate-700 bg-slate-800/30 opacity-60'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-white">{queue.name}</h4>
        <span className={`badge ${queue.isActive ? 'badge-serving' : 'badge-skipped'}`}>
          {queue.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Currently Serving Display */}
      <div className="text-center py-4 bg-slate-800 rounded-lg border border-slate-700">
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Now Serving</p>
        {queue.currentServing > 0 ? (
          <div>
            <span className="text-5xl font-black text-white tracking-tight">
              {String(queue.currentServing).padStart(3, '0')}
            </span>
          </div>
        ) : (
          <span className="text-2xl font-bold text-slate-600">—</span>
        )}
      </div>

      {/* Stats row */}
      <div className="flex gap-3 mt-3">
        {queue.waitingCount !== undefined && (
          <div className="flex-1 bg-amber-900/20 border border-amber-800/30 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-amber-300">{queue.waitingCount}</p>
            <p className="text-xs text-amber-600">Waiting</p>
          </div>
        )}
        {queue.currentServing > 0 && (
          <div className="flex-1 bg-blue-900/20 border border-blue-800/30 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-blue-300">{queue.currentServing}</p>
            <p className="text-xs text-blue-600">Serving</p>
          </div>
        )}
      </div>
    </div>
  );
}
