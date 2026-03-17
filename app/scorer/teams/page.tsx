'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ConfirmDialog from '@/app/components/ConfirmDialog';
import BackButton from '@/app/components/BackButton';

export default function ManageTeamsPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  useEffect(() => {
    Promise.all([
      fetch('/api/teams').then(r => r.json()),
      fetch('/api/matches').then(r => r.json()),
    ]).then(([td, md]) => {
      setTeams(td.teams || []);
      setMatches(md.matches || []);
    }).finally(() => setLoading(false));
  }, []);

  const getTeamStats = (teamName: string) => {
    const teamMatches = matches.filter(
      m => (m.teamA.name === teamName || m.teamB.name === teamName) && m.status === 'completed'
    );
    const wins = teamMatches.filter(m => m.winner === teamName).length;
    const losses = teamMatches.filter(m => m.winner && m.winner !== teamName && m.winner !== 'Tie').length;
    const ties = teamMatches.filter(m => m.winner === 'Tie').length;
    return { matches: teamMatches, wins, losses, ties };
  };

  const handleDelete = (team: any) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Team',
      message: `Delete "${team.name}"? This only removes the team record, not the players or match history.`,
      onConfirm: async () => {
        await fetch(`/api/teams/${team._id}`, { method: 'DELETE' });
        setTeams(t => t.filter(x => x._id !== team._id));
        setConfirmDialog(d => ({ ...d, isOpen: false }));
      },
    });
  };

  const winMsg = (match: any, teamName: string) => {
    if (!match.winner) return null;
    if (match.winner === 'Tie') return 'Tied';
    if (match.winner === teamName) {
      if (match.teamB.name === teamName) {
        const w = match.teamB.players.length - match.innings.second.wickets;
        return `Won by ${w} wicket${w !== 1 ? 's' : ''}`;
      }
      const r = match.innings.first.runs - match.innings.second.runs;
      return `Won by ${r} run${r !== 1 ? 's' : ''}`;
    }
    return 'Lost';
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen pb-20">
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Delete"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(d => ({ ...d, isOpen: false }))}
        danger={true}
      />

      <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white">
        <div className="container mx-auto px-4 py-10">
          <BackButton href="/scorer" />
          <h1 className="text-3xl font-bold mt-2">Manage Teams</h1>
          <p className="mt-1 opacity-90 text-sm">{teams.length} teams</p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        {teams.length === 0 ? (
          <div className="text-center py-16 opacity-50">
            <p>No teams yet. Create a match to add teams.</p>
          </div>
        ) : (
          teams.map(team => {
            const { matches: tm, wins, losses, ties } = getTeamStats(team.name);
            const isOpen = expanded === team._id.toString();
            return (
              <div key={team._id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
                {/* Team header */}
                <div className="flex items-center justify-between px-4 py-4 cursor-pointer" onClick={() => setExpanded(isOpen ? null : team._id.toString())}>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {team.name[0]}
                    </div>
                    <p className="font-bold text-base truncate">{team.name}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-2 text-xs font-semibold">
                      <span className="px-2 py-1 bg-green-500/10 text-green-600 rounded-lg">{wins}W</span>
                      <span className="px-2 py-1 bg-red-500/10 text-red-500 rounded-lg">{losses}L</span>
                      {ties > 0 && <span className="px-2 py-1 bg-[var(--muted)] rounded-lg">{ties}T</span>}
                    </div>
                    <button onClick={() => handleDelete(team)}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <svg className={`w-4 h-4 opacity-40 transition-transform flex-shrink-0 ml-1 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Expanded: stats + match history */}
                {isOpen && (
                  <div className="border-t border-[var(--border)] px-4 py-4 space-y-4">
                    {/* Summary stats */}
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {[
                        { label: 'Played', val: tm.length, color: 'text-[var(--secondary)]' },
                        { label: 'Won', val: wins, color: 'text-green-500' },
                        { label: 'Lost', val: losses, color: 'text-red-500' },
                        { label: 'Tied', val: ties, color: 'text-[var(--accent)]' },
                      ].map(s => (
                        <div key={s.label} className="bg-[var(--muted)] rounded-lg py-3">
                          <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
                          <p className="text-xs opacity-60">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Match history */}
                    {tm.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold opacity-50 mb-2 uppercase tracking-wide">Match History</p>
                        <div className="space-y-2">
                          {tm.map((m: any) => {
                            const result = winMsg(m, team.name);
                            const opponent = m.teamA.name === team.name ? m.teamB.name : m.teamA.name;
                            const date = new Date(m.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                            const isWin = m.winner === team.name;
                            const isTie = m.winner === 'Tie';
                            return (
                              <Link key={m._id} href={`/match/${m._id}`} className="block">
                                <div className="flex items-center justify-between p-3 bg-[var(--muted)] rounded-lg hover:bg-[var(--border)] transition-all">
                                  <div>
                                    <p className="text-sm font-semibold">vs {opponent}</p>
                                    <p className="text-xs opacity-50">{date}</p>
                                  </div>
                                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                                    isWin ? 'bg-green-500/10 text-green-600' :
                                    isTie ? 'bg-yellow-500/10 text-yellow-600' :
                                    'bg-red-500/10 text-red-500'
                                  }`}>
                                    {result}
                                  </span>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {tm.length === 0 && (
                      <p className="text-sm opacity-40 text-center py-2">No completed matches yet</p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
