import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';

const STATUS_CONFIG = {
  waiting: {
    label: 'Waiting',
    className: 'badge-waiting',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  serving: {
    label: 'Now Serving',
    className: 'badge-serving',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  completed: {
    label: 'Completed',
    className: 'badge-completed',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  skipped: {
    label: 'Skipped',
    className: 'badge-skipped',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
      </svg>
    ),
  },
};

export default function TokenDisplay({ token, queueName, ahead: initialAhead }) {
  const [status, setStatus] = useState(token?.status || 'waiting');
  const [currentServing, setCurrentServing] = useState(null);
  const [ahead, setAhead] = useState(initialAhead || 0);
  const { socket, joinQueue, leaveQueue } = useSocket();

  // Subscribe to queue socket room for this specific token's queue
  useEffect(() => {
    if (!token?.queueId) return;
    joinQueue(token.queueId);
    return () => leaveQueue(token.queueId);
  }, [token?.queueId, joinQueue, leaveQueue]);

  // Listen for live updates
  useEffect(() => {
    if (!socket || !token) return;

    const handleUpdate = (data) => {
      if (data.queueId !== token.queueId && data.queueId?.toString() !== token.queueId?.toString()) return;

      if (data.type === 'QUEUE_UPDATE') {
        setCurrentServing(data.currentServing);
        if (data.currentServing >= token.tokenNumber) {
          setStatus('completed');
        } else if (data.currentServing === token.tokenNumber) {
          setStatus('serving');
        }
        // Update ahead count
        const newAhead = Math.max(0, token.tokenNumber - (data.currentServing || 0) - 1);
        setAhead(newAhead);
      }

      if (data.type === 'TOKEN_STATUS_UPDATE' && data.tokenId === token._id) {
        setStatus(data.status);
      }
    };

    socket.on('queue_update', handleUpdate);
    return () => socket.off('queue_update', handleUpdate);
  }, [socket, token]);

  const config = STATUS_CONFIG[status] || STATUS_CONFIG.waiting;
  const isBeingServed = status === 'serving';
  const estimatedWaitMins = ahead * 3; // rough estimate: 3 min per person

  return (
    <div className={`card overflow-hidden ${isBeingServed ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900' : ''}`}>
      {/* Status banner for serving */}
      {isBeingServed && (
        <div className="bg-blue-600 px-6 py-2 text-center">
          <p className="text-sm font-semibold text-white animate-pulse">
            Your turn! Please proceed to the counter.
          </p>
        </div>
      )}

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Queue Token</p>
            <h3 className="font-semibold text-white">{queueName || 'Queue'}</h3>
          </div>
          <span className={`badge ${config.className} flex items-center gap-1`}>
            {config.icon}
            {config.label}
          </span>
        </div>

        {/* Big Token Number */}
        <div className="text-center py-8 bg-gradient-to-b from-slate-700 to-slate-800 rounded-xl border border-slate-600 mb-5">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">Your Token</p>
          <div className="relative inline-block">
            <span className="text-7xl font-black text-white tracking-tight tabular-nums">
              {String(token?.tokenNumber || 0).padStart(3, '0')}
            </span>
            {isBeingServed && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
              </span>
            )}
          </div>
          <p className="text-slate-400 text-sm mt-2">{token?.userName}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
            <p className="text-xs text-slate-400 mb-1">Ahead of you</p>
            <p className="text-xl font-bold text-white">{ahead}</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
            <p className="text-xs text-slate-400 mb-1">Est. wait</p>
            <p className="text-xl font-bold text-white">
              {estimatedWaitMins > 0 ? `~${estimatedWaitMins}m` : '<1m'}
            </p>
          </div>
        </div>

        {/* Current serving indicator */}
        {currentServing !== null && currentServing > 0 && (
          <div className="mt-3 flex items-center justify-between bg-slate-700/30 rounded-lg p-3 border border-slate-700">
            <span className="text-slate-400 text-sm">Now serving:</span>
            <span className="font-bold text-blue-300">
              {String(currentServing).padStart(3, '0')}
            </span>
          </div>
        )}

        {/* Footer note */}
        <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 justify-center">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          This token updates automatically in real time
        </div>
      </div>
    </div>
  );
}
