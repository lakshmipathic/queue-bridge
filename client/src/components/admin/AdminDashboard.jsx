import React, { useState } from 'react';
import { useQueue } from '../../hooks/useQueue';
import { queuesAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import QueueManager from './QueueManager';
import TokenList from './TokenList';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { queues, loading, error, refetch, setQueues } = useQueue();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedQueueId, setSelectedQueueId] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  const setLoading = (id, val) =>
    setActionLoading((prev) => ({ ...prev, [id]: val }));

  const handleNext = async (queueId) => {
    try {
      setLoading(queueId + '_next', true);
      const res = await queuesAPI.next(queueId);
      // Update local state immediately
      setQueues((prev) =>
        prev.map((q) =>
          q._id === queueId
            ? { ...q, currentServing: res.data.queue.currentServing }
            : q
        )
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to advance queue');
    } finally {
      setLoading(queueId + '_next', false);
    }
  };

  const handleToggle = async (queueId) => {
    try {
      setLoading(queueId + '_toggle', true);
      const res = await queuesAPI.toggle(queueId);
      setQueues((prev) =>
        prev.map((q) => (q._id === queueId ? { ...q, isActive: res.data.isActive } : q))
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle queue');
    } finally {
      setLoading(queueId + '_toggle', false);
    }
  };

  const handleDelete = async (queueId) => {
    if (!window.confirm('Delete this queue and all its tokens? This cannot be undone.')) return;
    try {
      setLoading(queueId + '_delete', true);
      await queuesAPI.delete(queueId);
      setQueues((prev) => prev.filter((q) => q._id !== queueId));
      if (selectedQueueId === queueId) setSelectedQueueId(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete queue');
    } finally {
      setLoading(queueId + '_delete', false);
    }
  };

  const handleQueueCreated = (newQueue) => {
    setQueues((prev) => [newQueue, ...prev]);
    setShowCreateForm(false);
  };

  const selectedQueue = queues.find((q) => q._id === selectedQueueId);

  if (selectedQueue) {
    return (
      <div>
        <button
          onClick={() => setSelectedQueueId(null)}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>
        <TokenList queue={selectedQueue} />
      </div>
    );
  }

  return (
    <div>
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Total Queues"
          value={queues.length}
          icon={
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          }
          color="blue"
        />
        <StatCard
          label="Active Queues"
          value={queues.filter((q) => q.isActive).length}
          icon={
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="emerald"
        />
        <StatCard
          label="People Waiting"
          value={queues.reduce((sum, q) => sum + (q.waitingCount || 0), 0)}
          icon={
            <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          color="amber"
        />
      </div>

      {/* Queues Section */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Your Queues</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn-primary text-sm py-1.5"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Queue
        </button>
      </div>

      {/* Create Queue Form */}
      {showCreateForm && (
        <div className="mb-6">
          <QueueManager
            onCreated={handleQueueCreated}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={refetch} className="text-red-400 hover:text-red-300 underline text-xs">
            Retry
          </button>
        </div>
      )}

      {/* Queue List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : queues.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </div>
          <p className="text-slate-400 font-medium">No queues yet</p>
          <p className="text-slate-500 text-sm mt-1">Create your first queue to get started</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-primary mt-4"
          >
            Create Queue
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {queues.map((queue) => (
            <QueueCard
              key={queue._id}
              queue={queue}
              onNext={() => handleNext(queue._id)}
              onToggle={() => handleToggle(queue._id)}
              onDelete={() => handleDelete(queue._id)}
              onViewTokens={() => setSelectedQueueId(queue._id)}
              isNextLoading={actionLoading[queue._id + '_next']}
              isToggleLoading={actionLoading[queue._id + '_toggle']}
              isDeleteLoading={actionLoading[queue._id + '_delete']}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  const colorMap = {
    blue: 'bg-blue-900/20 border-blue-800/30',
    emerald: 'bg-emerald-900/20 border-emerald-800/30',
    amber: 'bg-amber-900/20 border-amber-800/30',
  };

  return (
    <div className={`card p-5 ${colorMap[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  );
}

function QueueCard({
  queue,
  onNext,
  onToggle,
  onDelete,
  onViewTokens,
  isNextLoading,
  isToggleLoading,
  isDeleteLoading,
}) {
  return (
    <div className={`card p-5 flex flex-col gap-4 ${!queue.isActive ? 'opacity-70' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-white">{queue.name}</h3>
          {queue.description && (
            <p className="text-slate-500 text-xs mt-0.5">{queue.description}</p>
          )}
        </div>
        <span className={`badge ${queue.isActive ? 'badge-serving' : 'badge-skipped'}`}>
          {queue.isActive ? 'Active' : 'Paused'}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-slate-700/50 rounded-lg py-2">
          <p className="text-lg font-bold text-blue-300">
            {String(queue.currentServing || 0).padStart(3, '0')}
          </p>
          <p className="text-xs text-slate-500">Serving</p>
        </div>
        <div className="bg-slate-700/50 rounded-lg py-2">
          <p className="text-lg font-bold text-amber-300">{queue.waitingCount || 0}</p>
          <p className="text-xs text-slate-500">Waiting</p>
        </div>
        <div className="bg-slate-700/50 rounded-lg py-2">
          <p className="text-lg font-bold text-emerald-300">{queue.servingCount || 0}</p>
          <p className="text-xs text-slate-500">In Service</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <button
          onClick={onNext}
          disabled={isNextLoading || !queue.isActive}
          className="btn-primary text-sm py-2"
        >
          {isNextLoading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Call Next
            </>
          )}
        </button>

        <div className="flex gap-2">
          <button
            onClick={onViewTokens}
            className="btn-secondary text-xs py-1.5 flex-1"
          >
            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Tokens
          </button>
          <button
            onClick={onToggle}
            disabled={isToggleLoading}
            className={`text-xs py-1.5 px-3 rounded-lg font-medium transition-colors ${
              queue.isActive
                ? 'bg-amber-900/30 text-amber-300 border border-amber-700 hover:bg-amber-900/50'
                : 'bg-emerald-900/30 text-emerald-300 border border-emerald-700 hover:bg-emerald-900/50'
            }`}
          >
            {isToggleLoading ? (
              <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            ) : queue.isActive ? (
              'Pause'
            ) : (
              'Resume'
            )}
          </button>
          <button
            onClick={onDelete}
            disabled={isDeleteLoading}
            className="bg-red-900/30 text-red-400 border border-red-800 hover:bg-red-900/50 text-xs py-1.5 px-3 rounded-lg font-medium transition-colors"
          >
            {isDeleteLoading ? (
              <span className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
