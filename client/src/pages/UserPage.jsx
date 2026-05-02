import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { orgsAPI } from '../api';
import JoinQueue from '../components/user/JoinQueue';
import LiveQueueBoard from '../components/shared/LiveQueueBoard';

export default function UserPage() {
  const { orgSlug } = useParams();
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [orgError, setOrgError] = useState('');

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        setLoadingOrgs(true);
        const res = await orgsAPI.getAll();
        setOrganizations(res.data);

        // If a slug is in the URL, auto-select that org
        if (orgSlug) {
          const match = res.data.find(
            (o) => o.slug === orgSlug.toLowerCase()
          );
          if (match) setSelectedOrg(match);
        }
      } catch (err) {
        setOrgError('Failed to load organizations. Please refresh.');
      } finally {
        setLoadingOrgs(false);
      }
    };
    fetchOrgs();
  }, [orgSlug]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-white mb-3">
          Join a <span className="text-gradient">Queue</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto">
          Select an organization, enter your name, and get your token instantly.
          No account needed.
        </p>
      </div>

      {/* Org Selector */}
      {!selectedOrg && (
        <div className="mb-8">
          {loadingOrgs ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : orgError ? (
            <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-center">
              {orgError}
            </div>
          ) : organizations.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400">No organizations registered yet.</p>
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-semibold text-slate-200 mb-4">
                Choose an organization
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {organizations.map((org) => (
                  <button
                    key={org._id}
                    onClick={() => setSelectedOrg(org)}
                    className="card p-5 text-left hover:border-blue-500 hover:bg-slate-750 transition-all duration-150 group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors">
                          {org.name}
                        </h3>
                        <p className="text-slate-500 text-xs mt-1">/{org.slug}</p>
                      </div>
                      <svg
                        className="w-5 h-5 text-slate-600 group-hover:text-blue-400 transition-colors mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected Org - Queue Join + Live Board */}
      {selectedOrg && (
        <div>
          {/* Org Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setSelectedOrg(null)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              title="Back to org list"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h2 className="text-xl font-bold text-white">{selectedOrg.name}</h2>
              <p className="text-slate-500 text-sm">/{selectedOrg.slug}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <JoinQueue org={selectedOrg} />
            <LiveQueueBoard org={selectedOrg} />
          </div>
        </div>
      )}
    </div>
  );
}
