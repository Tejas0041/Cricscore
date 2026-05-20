'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BackButton from '@/app/components/BackButton';

type Player = { _id?: string; name: string; role: string };
type Team = { name: string; players: Player[]; captainIdx: number };

export default function CreateTournamentPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [overs, setOvers] = useState(8);
  const [dates, setDates] = useState(['20 May 2026', '21 May 2026']);
  const [teams, setTeams] = useState<Team[]>([
    { name: '', players: [], captainIdx: -1 },
    { name: '', players: [], captainIdx: -1 },
  ]);
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);
  const [searches, setSearches] = useState<string[]>(['', '']);
  const [newPlayerNames, setNewPlayerNames] = useState<string[]>(['', '']);
  const [newPlayerRoles, setNewPlayerRoles] = useState<string[]>(['allrounder', 'allrounder']);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/players').then(r => r.json()).then(d => setAvailablePlayers(d.players || []));
  }, []);

  const addTeam = () => {
    setTeams([...teams, { name: '', players: [], captainIdx: -1 }]);
    setSearches([...searches, '']);
    setNewPlayerNames([...newPlayerNames, '']);
    setNewPlayerRoles([...newPlayerRoles, 'allrounder']);
  };

  const removeTeam = (i: number) => {
    setTeams(teams.filter((_, idx) => idx !== i));
    setSearches(searches.filter((_, idx) => idx !== i));
    setNewPlayerNames(newPlayerNames.filter((_, idx) => idx !== i));
    setNewPlayerRoles(newPlayerRoles.filter((_, idx) => idx !== i));
  };

  const updateTeamName = (i: number, val: string) => {
    const t = [...teams]; t[i].name = val; setTeams(t);
  };

  const addExistingPlayer = (teamIdx: number, player: any) => {
    const t = [...teams];
    if (t[teamIdx].players.find(p => p._id === player._id)) return;
    t[teamIdx].players.push({ _id: player._id, name: player.name, role: player.role });
    setTeams(t);
    // clear search
    const s = [...searches]; s[teamIdx] = ''; setSearches(s);
  };

  const addNewPlayer = (teamIdx: number) => {
    const pName = newPlayerNames[teamIdx].trim();
    if (!pName) return;
    const t = [...teams];
    t[teamIdx].players.push({ name: pName, role: newPlayerRoles[teamIdx] });
    setTeams(t);
    const n = [...newPlayerNames]; n[teamIdx] = ''; setNewPlayerNames(n);
  };

  const removePlayer = (teamIdx: number, playerIdx: number) => {
    const t = [...teams];
    t[teamIdx].players.splice(playerIdx, 1);
    // adjust captain index
    if (t[teamIdx].captainIdx === playerIdx) t[teamIdx].captainIdx = -1;
    else if (t[teamIdx].captainIdx > playerIdx) t[teamIdx].captainIdx--;
    setTeams(t);
  };

  const setCaptain = (teamIdx: number, playerIdx: number) => {
    const t = [...teams];
    t[teamIdx].captainIdx = t[teamIdx].captainIdx === playerIdx ? -1 : playerIdx;
    setTeams(t);
  };

  const handleCreate = async () => {
    setError('');
    for (const t of teams) {
      if (!t.name.trim()) { setError('All teams must have a name'); return; }
      if (t.players.length < 2) { setError(`"${t.name || 'A team'}" needs at least 2 players`); return; }
    }
    setCreating(true);
    try {
      // Attach captain info
      const teamsPayload = teams.map(t => ({
        name: t.name,
        players: t.players,
        captain: t.captainIdx >= 0 ? t.players[t.captainIdx] : undefined,
      }));
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, overs, playersPerTeam: 6, dates, teams: teamsPayload }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed'); setCreating(false); return; }
      router.push(`/scorer/tournament/${data.tournament._id}`);
    } catch (e: any) {
      setError(e.message);
      setCreating(false);
    }
  };

  const usedIds = (teamIdx: number) => new Set(teams[teamIdx].players.filter(p => p._id).map(p => p._id));

  const filteredAvailable = (teamIdx: number) => {
    const q = searches[teamIdx].toLowerCase();
    const used = usedIds(teamIdx);
    return availablePlayers.filter(p => !used.has(p._id) && (!q || p.name.toLowerCase().includes(q)));
  };

  return (
    <div className="min-h-screen pb-16">
      <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white px-4 py-8">
        <div className="container mx-auto max-w-2xl">
          <BackButton href="/scorer" />
          <h1 className="text-3xl font-bold mt-3">Create Tournament</h1>
          <p className="opacity-80 text-sm mt-1">Set up teams, players, and schedule</p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-5">
        {/* Step tabs */}
        <div className="flex gap-2">
          {['Details', 'Teams & Players'].map((label, i) => (
            <button key={i} onClick={() => { if (i === 0 || name.trim()) setStep(i + 1); }}
              className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${step === i + 1 ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)] opacity-60'}`}>
              {i + 1}. {label}
            </button>
          ))}
        </div>

        {/* STEP 1 — Details */}
        {step === 1 && (
          <div className="glass-card rounded-2xl p-5 space-y-4">
            <div>
              <label className="text-xs font-semibold opacity-60 uppercase tracking-wide">Tournament Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Gully Cricket Cup 2026"
                className="w-full mt-1 p-3 rounded-xl bg-[var(--muted)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
            </div>
            <div>
              <label className="text-xs font-semibold opacity-60 uppercase tracking-wide">Overs per Match</label>
              <input type="number" value={overs} onChange={e => setOvers(Number(e.target.value))} min={1} max={20}
                className="w-full mt-1 p-3 rounded-xl bg-[var(--muted)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
            </div>
            <div>
              <label className="text-xs font-semibold opacity-60 uppercase tracking-wide">Tournament Dates</label>
              <div className="space-y-2 mt-1">
                {dates.map((d, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={d} onChange={e => { const nd = [...dates]; nd[i] = e.target.value; setDates(nd); }}
                      className="flex-1 p-3 rounded-xl bg-[var(--muted)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
                    {dates.length > 1 && (
                      <button onClick={() => setDates(dates.filter((_, idx) => idx !== i))}
                        className="px-3 text-red-500 hover:bg-red-500/10 rounded-xl">✕</button>
                    )}
                  </div>
                ))}
                <button onClick={() => setDates([...dates, ''])} className="text-sm text-[var(--primary)] font-semibold">+ Add Date</button>
              </div>
            </div>
            <button onClick={() => { if (!name.trim()) { setError('Enter tournament name'); return; } setError(''); setStep(2); }}
              className="w-full py-3 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white rounded-xl font-semibold">
              Next: Add Teams →
            </button>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          </div>
        )}

        {/* STEP 2 — Teams & Players */}
        {step === 2 && (
          <div className="space-y-5">
            {teams.map((team, teamIdx) => (
              <div key={teamIdx} className="glass-card rounded-2xl overflow-hidden">
                {/* Team header */}
                <div className="flex items-center gap-2 p-4 border-b border-[var(--border)]">
                  <input value={team.name} onChange={e => updateTeamName(teamIdx, e.target.value)}
                    placeholder={`Team ${teamIdx + 1} name`}
                    className="flex-1 p-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border)] font-bold text-base focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
                  {teams.length > 2 && (
                    <button onClick={() => removeTeam(teamIdx)} className="text-red-500 text-sm font-semibold px-2 py-1 hover:bg-red-500/10 rounded-lg">Remove</button>
                  )}
                </div>

                {/* Added players list */}
                {team.players.length > 0 && (
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-xs font-semibold opacity-50 uppercase tracking-wide mb-2">Squad ({team.players.length})</p>
                    <div className="space-y-1.5">
                      {team.players.map((p, pi) => {
                        const isCap = team.captainIdx === pi;
                        return (
                          <div key={pi} className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${isCap ? 'border-amber-500/50 bg-amber-500/8' : 'border-[var(--border)] bg-[var(--muted)]'}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              {isCap && <span className="text-amber-500 text-sm flex-shrink-0">©</span>}
                              <div className="min-w-0">
                                <span className="font-semibold text-sm">{p.name}</span>
                                <span className="text-xs opacity-40 ml-1.5 capitalize">{p.role}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button onClick={() => setCaptain(teamIdx, pi)}
                                className={`text-xs px-2 py-1 rounded-lg font-semibold transition-all ${isCap ? 'bg-amber-500/20 text-amber-500' : 'bg-[var(--background)] opacity-50 hover:opacity-100'}`}>
                                {isCap ? 'Captain' : 'Set C'}
                              </button>
                              <button onClick={() => removePlayer(teamIdx, pi)}
                                className="w-6 h-6 flex items-center justify-center text-red-500 hover:bg-red-500/10 rounded-lg text-xs">✕</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Search & add existing */}
                <div className="px-4 pt-3 pb-2">
                  <p className="text-xs font-semibold opacity-50 uppercase tracking-wide mb-2">Add Players</p>
                  <div className="relative mb-2">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input value={searches[teamIdx]}
                      onChange={e => { const s = [...searches]; s[teamIdx] = e.target.value; setSearches(s); }}
                      placeholder="Search existing players..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
                  </div>

                  {/* Filtered player list */}
                  {(searches[teamIdx] || filteredAvailable(teamIdx).length <= 8) && (
                    <div className="max-h-44 overflow-y-auto rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
                      {filteredAvailable(teamIdx).length === 0 && (
                        <p className="text-xs opacity-40 text-center py-3">No players found</p>
                      )}
                      {filteredAvailable(teamIdx).map(p => (
                        <button key={p._id} onClick={() => addExistingPlayer(teamIdx, p)}
                          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[var(--muted)] transition-all text-left">
                          <div>
                            <span className="text-sm font-medium">{p.name}</span>
                            {p.nickname && <span className="text-xs opacity-40 ml-1">({p.nickname})</span>}
                          </div>
                          <span className="text-xs opacity-40 capitalize">{p.role}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Show all button when no search */}
                  {!searches[teamIdx] && filteredAvailable(teamIdx).length > 8 && (
                    <div className="max-h-44 overflow-y-auto rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
                      {filteredAvailable(teamIdx).map(p => (
                        <button key={p._id} onClick={() => addExistingPlayer(teamIdx, p)}
                          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[var(--muted)] transition-all text-left">
                          <div>
                            <span className="text-sm font-medium">{p.name}</span>
                            {p.nickname && <span className="text-xs opacity-40 ml-1">({p.nickname})</span>}
                          </div>
                          <span className="text-xs opacity-40 capitalize">{p.role}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add new player */}
                <div className="px-4 pb-4 pt-1">
                  <p className="text-xs font-semibold opacity-50 uppercase tracking-wide mb-2">Create New Player</p>
                  <div className="flex gap-2">
                    <input value={newPlayerNames[teamIdx]}
                      onChange={e => { const n = [...newPlayerNames]; n[teamIdx] = e.target.value; setNewPlayerNames(n); }}
                      onKeyDown={e => e.key === 'Enter' && addNewPlayer(teamIdx)}
                      placeholder="Player name"
                      className="flex-1 p-2.5 text-sm rounded-xl bg-[var(--muted)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
                    <select value={newPlayerRoles[teamIdx]}
                      onChange={e => { const r = [...newPlayerRoles]; r[teamIdx] = e.target.value; setNewPlayerRoles(r); }}
                      className="p-2.5 text-sm rounded-xl bg-[var(--muted)] border border-[var(--border)] focus:outline-none">
                      <option value="allrounder">All-rounder</option>
                      <option value="batsman">Batsman</option>
                      <option value="bowler">Bowler</option>
                    </select>
                    <button onClick={() => addNewPlayer(teamIdx)}
                      className="px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold">Add</button>
                  </div>
                </div>
              </div>
            ))}

            <button onClick={addTeam}
              className="w-full py-3 border-2 border-dashed border-[var(--border)] rounded-xl text-sm font-semibold opacity-60 hover:opacity-100 transition-all">
              + Add Another Team
            </button>

            {error && <p className="text-red-500 text-sm text-center bg-red-500/10 py-2 rounded-xl">{error}</p>}

            <button onClick={handleCreate} disabled={creating}
              className="w-full py-4 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white rounded-xl font-bold text-base disabled:opacity-50">
              {creating ? 'Creating Tournament...' : '🏆 Create Tournament'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
