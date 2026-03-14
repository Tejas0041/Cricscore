'use client';

import { useEffect, useState } from 'react';
import ConfirmDialog from '@/app/components/ConfirmDialog';

export default function PlayersPage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<any>(null);
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState<'batsman' | 'bowler' | 'allrounder'>('batsman');
  const [saving, setSaving] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const res = await fetch('/api/players');
      const data = await res.json();
      setPlayers(data.players || []);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const handleCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, nickname, role }),
      });
      if (res.ok) { resetForm(); fetchPlayers(); }
    } catch (error) {
      console.error('Error creating player:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEditPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/players/${editingPlayer._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, nickname, role }),
      });
      if (res.ok) { resetForm(); fetchPlayers(); }
    } catch (error) {
      console.error('Error updating player:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Player',
      message: 'Are you sure you want to delete this player? This action cannot be undone.',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/players/${playerId}`, {
            method: 'DELETE',
          });
          
          if (res.ok) {
            fetchPlayers();
          }
        } catch (error) {
          console.error('Error deleting player:', error);
        }
        setConfirmDialog({ ...confirmDialog, isOpen: false });
      },
    });
  };

  const startEdit = (player: any) => {
    setEditingPlayer(player);
    setName(player.name);
    setNickname(player.nickname || '');
    setRole(player.role);
    setShowForm(true);
  };

  const resetForm = () => {
    setName('');
    setNickname('');
    setRole('batsman');
    setShowForm(false);
    setEditingPlayer(null);
  };

  return (
    <div className="min-h-screen">
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Delete"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        danger={true}
      />
      
      <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-3xl md:text-4xl font-bold">Manage Players</h1>
          <p className="mt-2 opacity-90">Add, edit, or remove players</p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <button
          onClick={() => showForm ? resetForm() : setShowForm(true)}
          className="mb-6 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg"
        >
          {showForm ? 'Cancel' : '+ Add New Player'}
        </button>

        {showForm && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-xl font-bold mb-6">
              {editingPlayer ? 'Edit Player' : 'Add New Player'}
            </h2>
            <form onSubmit={editingPlayer ? handleEditPlayer : handleCreatePlayer} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-2">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-4 bg-[var(--muted)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                  placeholder="Enter player name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Nickname (Optional)</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full p-4 bg-[var(--muted)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                  placeholder="Enter nickname"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full p-4 bg-[var(--muted)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                >
                  <option value="batsman">Batsman</option>
                  <option value="bowler">Bowler</option>
                  <option value="allrounder">All-rounder</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white p-4 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : editingPlayer ? 'Update Player' : 'Create Player'}
              </button>
            </form>
          </div>
        )}

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 border-b border-[var(--border)]">
            <h2 className="text-xl font-bold">All Players ({players.length})</h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {players.length === 0 ? (
              <div className="p-8 text-center opacity-60">
                <p>No players yet. Add your first player!</p>
              </div>
            ) : (
              players.map((player) => (
                <div key={player._id} className="p-5 hover:bg-[var(--muted)] transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {player.name[0]}
                      </div>
                      <div>
                        <p className="font-bold text-lg">{player.name}</p>
                        {player.nickname && (
                          <p className="text-sm opacity-60">"{player.nickname}"</p>
                        )}
                        <p className="text-sm opacity-60 capitalize mt-1">
                          {player.role === 'allrounder' ? 'All-rounder' : player.role}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <div className="flex gap-4">
                          <div>
                            <p className="text-xs opacity-60">Runs</p>
                            <p className="font-bold text-[var(--primary)]">{player.stats.batting.runs}</p>
                          </div>
                          <div>
                            <p className="text-xs opacity-60">Wickets</p>
                            <p className="font-bold text-red-500">{player.stats.bowling.wickets}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(player)}
                          className="p-3 bg-[var(--secondary)]/10 text-[var(--secondary)] rounded-lg hover:bg-[var(--secondary)]/20 transition-all"
                          title="Edit player"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeletePlayer(player._id)}
                          className="p-3 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-all"
                          title="Delete player"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
