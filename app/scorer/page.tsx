'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ScorerPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [updatingRankings, setUpdatingRankings] = useState(false);
  const [rankingsUpdated, setRankingsUpdated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      
      if (data.user && (data.user.role === 'scorer' || data.user.role === 'admin')) {
        setUser(data.user);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await res.json();
      
      if (res.ok && (data.user.role === 'scorer' || data.user.role === 'admin')) {
        setUser(data.user);
      } else {
        setError('Invalid credentials or insufficient permissions');
      }
    } catch (error) {
      setError('Login failed');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  const handleUpdateRankings = async () => {
    setUpdatingRankings(true); setRankingsUpdated(false);
    try {
      const res = await fetch('/api/rankings/update', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setRankingsUpdated(true);
        setTimeout(() => setRankingsUpdated(false), 3000);
      } else {
        alert('Failed to update rankings: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Error updating rankings: ' + error);
    } finally { setUpdatingRankings(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card p-6 md:p-8 rounded-2xl shadow-2xl w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">Scorer Login</h1>
            <p className="text-sm opacity-60 mt-2">Access the scorer panel</p>
          </div>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="ui-input"
                placeholder="Enter username"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="ui-input"
                placeholder="Enter password"
                required
              />
            </div>
            
            <button
              type="submit"
              className="ui-btn w-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white p-3 rounded-lg font-semibold hover:opacity-90 transition-all"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      <div className="container mx-auto px-4 pt-8 md:pt-10">
        <div className="hero-glow glass-card rounded-[2rem] p-8 md:p-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Scorer Panel</h1>
              <p className="mt-2 text-sm md:text-base text-[var(--foreground)]/75">Welcome, {user.username}. Manage live games and squads from one place.</p>
            </div>
            <button
              onClick={handleLogout}
              className="ui-btn px-6 py-2.5 rounded-xl bg-rose-500/90 text-white hover:bg-rose-500 w-fit font-semibold"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <button
            onClick={() => router.push('/scorer/create-match')}
            className="glass-card elevated-hover p-6 rounded-xl transition-all text-left group"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">Create New Match</h2>
            <p className="text-sm opacity-60">Start a new cricket match</p>
          </button>

          <button
            onClick={() => router.push('/scorer/all-matches')}
            className="glass-card elevated-hover p-6 rounded-xl transition-all text-left group"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">All Matches</h2>
            <p className="text-sm opacity-60">View and manage matches</p>
          </button>

          <button
            onClick={() => router.push('/scorer/players')}
            className="glass-card elevated-hover p-6 rounded-xl transition-all text-left group"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-[var(--accent)] to-yellow-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">Manage Players</h2>
            <p className="text-sm opacity-60">Add or edit players</p>
          </button>

          <button
            onClick={() => router.push('/scorer/teams')}
            className="glass-card elevated-hover p-6 rounded-xl transition-all text-left group"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">Manage Teams</h2>
            <p className="text-sm opacity-60">View stats and match history</p>
          </button>

          <button
            onClick={handleUpdateRankings}
            disabled={updatingRankings}
            className="glass-card elevated-hover p-6 rounded-xl transition-all text-left group disabled:opacity-60"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              {updatingRankings ? (
                <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              )}
            </div>
            <h2 className="text-xl font-bold mb-2">
              {updatingRankings ? 'Updating...' : rankingsUpdated ? '✓ Rankings Updated' : 'Update Rankings'}
            </h2>
            <p className="text-sm opacity-60">Recalculate CricScore Rankings</p>
          </button>
        </div>
      </main>
    </div>
  );
}
