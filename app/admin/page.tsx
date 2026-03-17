'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmDialog from '@/app/components/ConfirmDialog';
import BackButton from '@/app/components/BackButton';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [alertDialog, setAlertDialog] = useState({ isOpen: false, title: '', message: '' });
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Change password modal
  const [pwModal, setPwModal] = useState(false);
  const [teamsModal, setTeamsModal] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [savingTeam, setSavingTeam] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      
      if (data.user && data.user.role === 'admin') {
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
      
      if (res.ok && data.user.role === 'admin') {
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      
      if (res.ok) {
        setAlertDialog({
          isOpen: true,
          title: 'Success',
          message: 'Password changed successfully',
        });
        setShowChangePassword(false);
        setCurrentPassword('');
        setNewPassword('');
      } else {
        setAlertDialog({
          isOpen: true,
          title: 'Error',
          message: 'Failed to change password',
        });
      }
    } catch (error) {
      setAlertDialog({
        isOpen: true,
        title: 'Error',
        message: 'Error changing password',
      });
    }
  };

  const handleClearStats = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Clear All Stats',
      message: 'Are you sure you want to clear all player statistics? This action cannot be undone.',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/admin/clear-stats', { method: 'POST' });
          if (res.ok) {
            setAlertDialog({ isOpen: true, title: 'Success', message: 'All player stats cleared successfully' });
          } else {
            setAlertDialog({ isOpen: true, title: 'Error', message: 'Failed to clear stats' });
          }
        } catch {
          setAlertDialog({ isOpen: true, title: 'Error', message: 'Error clearing stats' });
        }
        setConfirmDialog({ ...confirmDialog, isOpen: false });
      },
    });
  };

  const openTeamsModal = async () => {
    setTeamsModal(true);
    setTeamsLoading(true);
    setEditingTeam(null);
    try {
      // Fetch teams + matches to compute stats
      const [teamsRes, matchesRes] = await Promise.all([
        fetch('/api/teams'),
        fetch('/api/matches'),
      ]);
      const teamsData = await teamsRes.json();
      const matchesData = await matchesRes.json();
      const matches = matchesData.matches || [];

      const enriched = (teamsData.teams || []).map((t: any) => {
        const tid = t._id.toString();
        const played = matches.filter((m: any) =>
          m.teamA?.id === tid || m.teamA?._id === tid ||
          m.teamB?.id === tid || m.teamB?._id === tid
        );
        const won = played.filter((m: any) => m.winner === t.name).length;
        return { ...t, matchesPlayed: played.length, matchesWon: won };
      });
      setTeams(enriched);
    } finally {
      setTeamsLoading(false);
    }
  };

  const handleRenameTeam = async (id: string) => {
    if (!editName.trim()) return;
    setSavingTeam(true);
    try {
      const res = await fetch(`/api/teams/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (res.ok) {
        setTeams(prev => prev.map(t => t._id === id ? { ...t, name: editName.trim() } : t));
        setEditingTeam(null);
      } else {
        setAlertDialog({ isOpen: true, title: 'Error', message: 'Failed to rename team' });
      }
    } finally {
      setSavingTeam(false);
    }
  };

  const handleDeleteTeam = (id: string, name: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Team',
      message: `Delete "${name}"? This cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        const res = await fetch(`/api/teams/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setTeams(prev => prev.filter(t => t._id !== id));
        } else {
          setAlertDialog({ isOpen: true, title: 'Error', message: 'Failed to delete team' });
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="bg-[var(--card)] border border-[var(--border)] p-8 rounded-2xl shadow-xl w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6">Admin Login</h1>
          
          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded-xl mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 bg-[var(--muted)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-[var(--muted)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white p-3 rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <ConfirmDialog
        isOpen={alertDialog.isOpen}
        title={alertDialog.title}
        message={alertDialog.message}
        confirmText="OK"
        onConfirm={() => setAlertDialog({ ...alertDialog, isOpen: false })}
        onCancel={() => setAlertDialog({ ...alertDialog, isOpen: false })}
      />
      
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Clear Stats"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        danger={true}
      />

      {/* Manage Teams Modal */}
      {teamsModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <h2 className="font-bold text-lg">Manage Teams</h2>
              <button onClick={() => { setTeamsModal(false); setEditingTeam(null); }}
                className="p-1.5 rounded-lg hover:bg-[var(--muted)] transition-all">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {teamsLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : teams.length === 0 ? (
                <p className="text-center opacity-50 py-10">No teams found</p>
              ) : teams.map(t => (
                <div key={t._id} className="bg-[var(--muted)] rounded-xl p-4">
                  {editingTeam === t._id ? (
                    <div className="flex gap-2">
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="flex-1 px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        autoFocus
                      />
                      <button onClick={() => handleRenameTeam(t._id)} disabled={savingTeam}
                        className="px-3 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                        {savingTeam ? '...' : 'Save'}
                      </button>
                      <button onClick={() => setEditingTeam(null)}
                        className="px-3 py-2 bg-[var(--border)] rounded-lg text-sm">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{t.name}</p>
                        <p className="text-xs opacity-50 mt-0.5">
                          {t.matchesPlayed} played · {t.matchesWon} won
                          {t.matchesPlayed > 0 ? ` · ${Math.round((t.matchesWon / t.matchesPlayed) * 100)}% win rate` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => { setEditingTeam(t._id); setEditName(t.name); }}
                          className="px-3 py-1.5 text-xs font-semibold bg-[var(--card)] border border-[var(--border)] rounded-lg hover:bg-[var(--border)] transition-all">
                          Rename
                        </button>
                        <button onClick={() => handleDeleteTeam(t._id, t.name)}
                          className="px-3 py-1.5 text-xs font-semibold text-red-500 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-all">
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Change Password Modal */}
      {pwModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <h2 className="font-bold text-lg">Change Password</h2>
              <button onClick={() => { setPwModal(false); setCurrentPassword(''); setNewPassword(''); }}
                className="p-1.5 rounded-lg hover:bg-[var(--muted)] transition-all">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={async (e) => { await handleChangePassword(e); setPwModal(false); }} className="p-4 space-y-4">
              <div>
                <label className="block text-sm mb-1 font-medium">Current Password</label>
                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                  className="w-full p-3 bg-[var(--muted)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                  required />
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  className="w-full p-3 bg-[var(--muted)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                  required />
              </div>
              <button type="submit"
                className="w-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white p-3 rounded-xl font-semibold hover:opacity-90 transition-all">
                Update Password
              </button>
            </form>
          </div>
        </div>
      )}

      <header className="bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <BackButton href="/" />
            <h1 className="text-2xl font-bold">Admin Panel</h1>
          </div>
          <button onClick={handleLogout} className="bg-red-500 px-4 py-2 rounded hover:bg-red-600 transition-all">
            Logout
          </button>
        </div>
      </header>

      <main className="container mx-auto p-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <button
            onClick={() => router.push('/scorer/create-match')}
            className="bg-[var(--card)] border border-[var(--border)] p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            <h2 className="text-xl font-bold mb-2">Create Match</h2>
            <p className="opacity-60">Start a new match</p>
          </button>
          
          <button
            onClick={() => router.push('/scorer/live-matches')}
            className="bg-[var(--card)] border border-[var(--border)] p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            <h2 className="text-xl font-bold mb-2">Manage Matches</h2>
            <p className="opacity-60">Edit or delete matches</p>
          </button>
          
          <button
            onClick={() => router.push('/scorer/players')}
            className="bg-[var(--card)] border border-[var(--border)] p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            <h2 className="text-xl font-bold mb-2">Manage Players</h2>
            <p className="opacity-60">Add, edit, or delete players</p>
          </button>

          <button
            onClick={openTeamsModal}
            className="bg-[var(--card)] border border-[var(--border)] p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            <h2 className="text-xl font-bold mb-2">Manage Teams</h2>
            <p className="opacity-60">View stats, rename or delete teams</p>
          </button>
          
          <button
            onClick={handleClearStats}
            className="bg-[var(--card)] border-2 border-red-500 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            <h2 className="text-xl font-bold mb-2 text-red-500">Clear All Stats</h2>
            <p className="opacity-60">Reset all player statistics to zero</p>
          </button>

          <button
            onClick={() => setPwModal(true)}
            className="bg-[var(--card)] border border-[var(--border)] p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            <h2 className="text-xl font-bold mb-2">Change Password</h2>
            <p className="opacity-60">Update your admin password</p>
          </button>
          
          <button
            onClick={() => router.push('/admin/settings')}
            className="bg-[var(--card)] border border-[var(--border)] p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            <h2 className="text-xl font-bold mb-2">Settings</h2>
            <p className="opacity-60">Configure scoring rules</p>
          </button>
        </div>
      </main>
    </div>
  );
}
