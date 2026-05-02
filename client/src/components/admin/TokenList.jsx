import React, { useState, useEffect, useCallback } from 'react';
import { tokensAPI } from '../../api';
import { useSocket } from '../../context/SocketContext';

const STATUS_OPTIONS = ['waiting', 'serving', 'completed', 'skipped'];

const STATUS_BADGE = {
  waiting: 'badge-waiting',
  serving: 'badge-serving',
  completed: 'badge-completed',
  skipped: 'badge-skipped',
};

export default function TokenList({ queue }) {
  const [tokens, setTokens] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const { socket } = useSocket();

  const fetchTokens = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await tokensAPI.getByQueue(queue._id, {
        status: statusFilter || undefined,
        limit: 100,
      });
      setTokens(res.data.tokens);
      setTotal(res.data.total);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tokens');
    } finally {
      setLoading(false);
    }
  }, [queue._id, statusFilter]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  // Real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (data) => {
      if (data.queueId !== queue._id && data.queueId?.toString() !== queue._id?.toString()) return;

      if (data.type === 'TOKEN_STATUS_UPDATE') {
        setTokens((prev) =>
          prev.map((t) =>
            t._id === data.tokenId ? { ...t, status: data.status } : t
          )
        );
      } else if (data.type === 'NEW_TOKEN' && data.token) {
        setTokens((prev) => {
          // Avoid duplicates
          if (prev.find((t) => t._id === data.token._id)) return prev;
          return [...prev, data.token];
        });
        setTotal((n) => n + 1);
      } else if (data.type === 'QUEUE_UPDATE') {
        // Update serving status via refetch
        fetchTokens();
      }
    };

    socket.on('queue_update', handleUpdate);
    return () => socket.off('queue_update', handleUpdate);
  }, [socket, queue._id, fetchTokens]);

  const handleStatusUpdate = async (tokenId, newStatus) => {
    try {
      setUpdatingId(tokenId);
      await tokensAPI.updateStatus(tokenId, newStatus);
      setTokens((prev) =>
        prev.map((t) => (t._id === tokenId ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredTokens = statusFilter
    ? tokens.filter((t) => t.status === statusFilter)
    : tokens;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold text-white">{queue.name}</h2>
          <p className="text-slate-400 text-sm mt-0.5">
            {total} token{total !== 1 ? 's' : ''} total
            {queue.currentServing > 0 && (
              <span className="ml-2 text-blue-400">
                · Currently serving: {String(queue.currentServing).padStart(3, '0')}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input !w-auto text-sm py-1.5"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>

          <button
            onClick={fetchTokens}
            className="btn-secondary text-sm py-1.5 px-3"
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Status summary pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        {STATUS_OPTIONS.map((s) => {
          const count = tokens.filter((t) => t.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              className={`badge cursor-pointer transition-opacity ${STATUS_BADGE[s]} ${
                statusFilter && statusFilter !== s ? 'opacity-40' : 'opacity-100'
              }`}
            >
              {s}: {count}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredTokens.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-slate-400">No tokens found.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Token #</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Joined</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredTokens.map((token) => (
                  <tr
                    key={token._id}
                    className={`transition-colors ${
                      token.status === 'serving'
                        ? 'bg-blue-900/20'
                        : 'hover:bg-slate-700/30'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-white text-base">
                        {String(token.tokenNumber).padStart(3, '0')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-200">{token.userName}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${STATUS_BADGE[token.status]}`}>
                        {token.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(token.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {STATUS_OPTIONS.filter((s) => s !== token.status).map((s) => (
                          <button
                            key={s}
                            onClick={() => handleStatusUpdate(token._id, s)}
                            disabled={updatingId === token._id}
                            className={`text-xs px-2 py-1 rounded font-medium transition-colors ${
                              s === 'serving'
                                ? 'bg-blue-900/40 text-blue-300 hover:bg-blue-900/60 border border-blue-800'
                                : s === 'completed'
                                ? 'bg-emerald-900/40 text-emerald-300 hover:bg-emerald-900/60 border border-emerald-800'
                                : s === 'skipped'
                                ? 'bg-slate-700 text-slate-400 hover:bg-slate-600 border border-slate-600'
                                : 'bg-amber-900/40 text-amber-300 hover:bg-amber-900/60 border border-amber-800'
                            } disabled:opacity-50`}
                          >
                            {updatingId === token._id ? (
                              <span className="w-3 h-3 border border-current/30 border-t-current rounded-full animate-spin inline-block" />
                            ) : (
                              s
                            )}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
