import React, { useState, useEffect } from 'react';
import { queuesAPI, tokensAPI } from '../../api';
import TokenDisplay from './TokenDisplay';

export default function JoinQueue({ org }) {
  const [queues, setQueues] = useState([]);
  const [loadingQueues, setLoadingQueues] = useState(true);
  const [selectedQueueId, setSelectedQueueId] = useState('');
  const [userName, setUserName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [issuedToken, setIssuedToken] = useState(null);

  useEffect(() => {
    const fetchQueues = async () => {
      if (!org?._id) return;
      try {
        setLoadingQueues(true);
        // Try admin queues endpoint; fall back to empty if unauthenticated
        // Public queue listing is a common pattern — we expose active queues
        const res = await queuesAPI.getAll().catch(() => ({ data: [] }));
        // Filter to active queues for this org (if admin is logged in)
        const orgQueues = res.data.filter(
          (q) => q.organizationId === org._id && q.isActive
        );
        setQueues(orgQueues);
        if (orgQueues.length === 1) setSelectedQueueId(orgQueues[0]._id);
      } catch {
        setQueues([]);
      } finally {
        setLoadingQueues(false);
      }
    };
    fetchQueues();
  }, [org?._id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!selectedQueueId && queues.length > 0) {
      setError('Please select a queue');
      return;
    }

    // If no queues loaded (unauthenticated), we still need a queueId.
    // In a real app you'd have a public queues endpoint.
    if (!selectedQueueId) {
      setError('No queue available. Please ask the organization to activate a queue.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const res = await tokensAPI.generate({
        userName: userName.trim(),
        queueId: selectedQueueId,
        orgId: org._id,
      });
      setIssuedToken(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate token');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setIssuedToken(null);
    setUserName('');
    setError('');
  };

  if (issuedToken) {
    return (
      <div>
        <TokenDisplay
          token={issuedToken.token}
          queueName={issuedToken.queueName}
          ahead={issuedToken.ahead}
        />
        <button
          onClick={handleReset}
          className="btn-secondary w-full mt-4"
        >
          Get Another Token
        </button>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-9 h-9 bg-blue-600/20 border border-blue-700 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-white">Get Your Token</h3>
          <p className="text-slate-400 text-xs">{org.name}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Your Name</label>
          <input
            type="text"
            value={userName}
            onChange={(e) => {
              setUserName(e.target.value);
              setError('');
            }}
            placeholder="Enter your name"
            className="input"
            maxLength={60}
            disabled={submitting}
          />
        </div>

        {loadingQueues ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Loading queues...
          </div>
        ) : queues.length > 0 ? (
          <div>
            <label className="label">Select Queue</label>
            <select
              value={selectedQueueId}
              onChange={(e) => setSelectedQueueId(e.target.value)}
              className="input"
              disabled={submitting}
            >
              <option value="">-- Choose a queue --</option>
              {queues.map((q) => (
                <option key={q._id} value={q._id}>
                  {q.name}
                  {q.waitingCount !== undefined ? ` (${q.waitingCount} waiting)` : ''}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600">
            <p className="text-slate-400 text-sm text-center">
              No active queues available right now.
            </p>
          </div>
        )}

        <button
          type="submit"
          className="btn-primary w-full py-3 text-base"
          disabled={submitting || queues.length === 0}
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Getting token...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
              Get My Token
            </span>
          )}
        </button>
      </form>
    </div>
  );
}
