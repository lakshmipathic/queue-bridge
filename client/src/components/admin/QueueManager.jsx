import React, { useState } from 'react';
import { queuesAPI } from '../../api';

export default function QueueManager({ onCreated, onCancel }) {
  const [form, setForm] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Queue name is required');
      return;
    }

    try {
      setLoading(true);
      const res = await queuesAPI.create({
        name: form.name.trim(),
        description: form.description.trim(),
      });
      onCreated?.({ ...res.data, waitingCount: 0, servingCount: 0 });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create queue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-6 border-blue-700/50 bg-blue-900/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New Queue
        </h3>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">
            Queue Name <span className="text-red-400">*</span>
          </label>
          <input
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. General Consultation, Billing Counter A"
            className="input"
            maxLength={80}
            disabled={loading}
            autoFocus
          />
        </div>

        <div>
          <label className="label">Description (optional)</label>
          <input
            name="description"
            type="text"
            value={form.description}
            onChange={handleChange}
            placeholder="Brief description of this queue"
            className="input"
            maxLength={200}
            disabled={loading}
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            className="btn-primary flex-1"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating...
              </span>
            ) : (
              'Create Queue'
            )}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
