'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import BackButton from '@/app/components/BackButton';
import ConfirmDialog from '@/app/components/ConfirmDialog';

const MATCH_TYPES = ['league', 'semifinal', 'final'] as const;

export default function ScorerTournamentPage() {
  const params = useParams();
  const router = useRouter();
  const [tournament, setTournament] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateMatch, setShowCreateMatch] = useState(false);
  const [matchType, setMatchType] = useState<'league' | 'semifinal' | 'final'>('league');
  const [teamAId, setTeamAId] = useState('');
  const [teamBId, setTeamBId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [creating, setCreating] = useState(false);

  // Squad selection
  const [showSquadModal, setShowSquadModal] = useState(false);
  const [squadStep, setSquadStep] = useState<'squad' | 'toss'>('squad');
  const [pendingMatch, setPendingMatch] = useState<any>(null);
  const [squadA, setSquadA] = useState<string[]>([]);
  const [squadB, setSquadB] = useState<string[]>([]);
  const [captainA, setCaptainA] = useState('');
  const [captainB, setCaptainB] = useState('');
  const [tossWinner, setTossWinner] = useState('');
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl'>('bat');
  const [startingMatch, setStartingMatch] = useState(false);

  // Delete
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, matchId: '', deleting: false });

  const fetchData = async () => {
    const res = await fetch(`/api/tournaments/${params.id}`);
    const data = await res.json();
    setTournament(data.tournament);
    setMatches(data.matches || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateMatch = async () => {
    if (!teamAId || !teamBId || teamAId === teamBId) return;
    setCreating(true);
    const res = await fetch(`/api/tournaments/${params.id}/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamAId, teamBId, matchType, scheduledDate }),
    });
    setCreating(false);
    if (res.ok) {
      setShowCreateMatch(false);
      setTeamAId(''); setTeamBId('');
      fetchData();
    }
  };

  const handleDeleteMatch = async () => {
    setConfirmDialog(d => ({ ...d, deleting: true }));
    const matchId = confirmDialog.matchId;

    // Remove match ref from tournament, then delete the match doc
    await fetch(`/api/tournaments/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ removeMatchId: matchId }),
    });
    await fetch(`/api/matches/${matchId}`, { method: 'DELETE' });

    setMatches(m => m.filter(x => x._id !== matchId));
    setConfirmDialog({ isOpen: false, matchId: '', deleting: false });
  };

  const handleStartMatch = (match: any) => {
    setPendingMatch(match);
    setSquadA(match.teamA.players.map((p: any) => p._id?.toString() || p.toString()));
    setSquadB(match.teamB.players.map((p: any) => p._id?.toString() || p.toString()));
    setCaptainA('');
    setCaptainB('');
    setTossWinner('');
    setTossDecision('bat');
    setSquadStep('squad');
    setShowSquadModal(true);
  };

  const toggleSquadPlayer = (team: 'A' | 'B', pid: string) => {
    if (team === 'A') setSquadA(prev => prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid]);
    else setSquadB(prev => prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid]);
  };

  const playersPerTeam = tournament?.playersPerTeam || 6;

  const handleConfirmSquad = async () => {
    if (squadA.length !== playersPerTeam || squadB.length !== playersPerTeam) return;
    // Move to toss step
    setSquadStep('toss');
  };

  const handleConfirmToss = async () => {
    if (!tossWinner) return;
    setStartingMatch(true);

    const battingTeam = tossDecision === 'bat' ? tossWinner : (tossWinner === pendingMatch.teamA.name ? pendingMatch.teamB.name : pendingMatch.teamA.name);
    const bowlingTeam = battingTeam === pendingMatch.teamA.name ? pendingMatch.teamB.name : pendingMatch.teamA.name;

    // Save captain back to tournament teams too
    const tournamentUpdates: any = {};
    if (captainA || captainB) {
      const updatedTeams = tournament.teams.map((t: any) => {
        const tid = t.id?.toString() || t._id?.toString();
        const matchTeamA = pendingMatch.teamA;
        const matchTeamB = pendingMatch.teamB;
        if (t.name === matchTeamA.name && captainA) return { ...t, captain: captainA };
        if (t.name === matchTeamB.name && captainB) return { ...t, captain: captainB };
        return t;
      });
      tournamentUpdates.teams = updatedTeams;
    }

    await Promise.all([
      fetch(`/api/matches/${pendingMatch._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'teamA.players': squadA,
          'teamB.players': squadB,
          ...(captainA ? { 'teamA.captain': captainA } : {}),
          ...(captainB ? { 'teamB.captain': captainB } : {}),
          tossWinner,
          tossDecision,
          innings: {
            first: { battingTeam, bowlingTeam },
            second: { battingTeam: bowlingTeam, bowlingTeam: battingTeam },
          },
          status: 'upcoming',
        }),
      }),
      Object.keys(tournamentUpdates).length > 0 && fetch(`/api/tournaments/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tournamentUpdates),
      }),
    ]);

    setStartingMatch(false);
    setShowSquadModal(false);
    router.push(`/scorer/score/${pendingMatch._id}`);
  };

  const winMessage = (match: any) => {
    if (!match.winner) return null;
    if (match.winner === 'Tie') return 'Tied';
    const secondBattingTeamName = match.innings?.second?.battingTeam;
    if (match.winner === secondBattingTeamName) {
      const secondTeam = match.winner === match.teamB.name ? match.teamB : match.teamA;
      const w = secondTeam.players.length - match.innings.second.wickets;
      return `Won by ${w} wicket${w !== 1 ? 's' : ''}`;
    }
    const r = (match.innings?.first?.runs ?? 0) - (match.innings?.second?.runs ?? 0);
    return `Won by ${r} run${r !== 1 ? 's' : ''}`;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" /></div>;
  if (!tournament) return <div className="min-h-screen flex items-center justify-center">Tournament not found</div>;

  return (
    <div className="min-h-screen pb-16">
      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Match"
        message="Delete this match? This cannot be undone."
        confirmText="Delete"
        danger
        loading={confirmDialog.deleting}
        onConfirm={handleDeleteMatch}
        onCancel={() => setConfirmDialog({ isOpen: false, matchId: '', deleting: false })}
      />

      {/* Squad Selection Modal */}
      {showSquadModal && pendingMatch && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
          <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">

            {/* Header */}
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg">
                  {squadStep === 'squad' ? `Select Playing ${playersPerTeam}` : 'Toss'}
                </h2>
                <p className="text-xs opacity-60">
                  {squadStep === 'squad' ? `Exactly ${playersPerTeam} per team · tap Set C for captain` : `${pendingMatch.teamA.name} vs ${pendingMatch.teamB.name}`}
                </p>
              </div>
              <button onClick={() => setShowSquadModal(false)} className="p-2 rounded-xl hover:bg-[var(--muted)]">✕</button>
            </div>

            {/* Step indicator */}
            <div className="flex border-b border-[var(--border)]">
              {['Squad', 'Toss'].map((label, i) => (
                <div key={label} className={`flex-1 py-2 text-center text-xs font-semibold border-b-2 transition-all ${
                  (i === 0 && squadStep === 'squad') || (i === 1 && squadStep === 'toss')
                    ? 'border-[var(--primary)] text-[var(--primary)]'
                    : 'border-transparent opacity-40'
                }`}>{label}</div>
              ))}
            </div>

            {/* SQUAD STEP */}
            {squadStep === 'squad' && ([
              { team: 'A' as const, label: pendingMatch.teamA.name, players: pendingMatch.teamA.players, selected: squadA, captain: captainA, setCap: setCaptainA },
              { team: 'B' as const, label: pendingMatch.teamB.name, players: pendingMatch.teamB.players, selected: squadB, captain: captainB, setCap: setCaptainB },
            ]).map(({ team, label, players, selected, captain, setCap }) => (
              <div key={team} className="p-4 border-b border-[var(--border)]">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold">{label}</p>
                  <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${selected.length === playersPerTeam ? 'bg-green-500/20 text-green-500' : 'bg-amber-500/20 text-amber-500'}`}>
                    {selected.length}/{playersPerTeam}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {players.map((p: any) => {
                    const pid = p._id?.toString() || p.toString();
                    const isSelected = selected.includes(pid);
                    const isCap = captain === pid;
                    const atLimit = selected.length >= playersPerTeam && !isSelected;
                    return (
                      <div key={pid} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all text-sm ${isSelected ? 'border-[var(--primary)] bg-[var(--primary)]/8' : atLimit ? 'opacity-30 border-[var(--border)]' : 'border-[var(--border)]'}`}>
                        <button onClick={() => !atLimit && toggleSquadPlayer(team, pid)}
                          className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${isSelected ? 'border-[var(--primary)] bg-[var(--primary)]' : 'border-[var(--border)]'}`}>
                          {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                        </button>
                        <span className={`flex-1 ${isSelected ? 'font-semibold' : ''}`}>{p.name || p}</span>
                        {isCap && <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-bold">C</span>}
                        {isSelected && (
                          <button onClick={() => setCap(isCap ? '' : pid)}
                            className={`text-xs px-2 py-1 rounded-lg font-semibold transition-all flex-shrink-0 ${isCap ? 'bg-amber-500/20 text-amber-500' : 'bg-[var(--muted)] opacity-60 hover:opacity-100'}`}>
                            {isCap ? 'Captain' : 'Set C'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {squadStep === 'squad' && (
              <div className="p-4">
                <button onClick={handleConfirmSquad}
                  disabled={squadA.length !== playersPerTeam || squadB.length !== playersPerTeam}
                  className="w-full py-3 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white rounded-xl font-bold disabled:opacity-40">
                  {squadA.length !== playersPerTeam || squadB.length !== playersPerTeam
                    ? `Select exactly ${playersPerTeam} per team`
                    : 'Next: Toss →'}
                </button>
              </div>
            )}

            {/* TOSS STEP */}
            {squadStep === 'toss' && (
              <div className="p-5 space-y-5">
                <div>
                  <p className="text-xs font-semibold opacity-60 uppercase tracking-wide mb-2">Toss won by</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[pendingMatch.teamA.name, pendingMatch.teamB.name].map(team => (
                      <button key={team} onClick={() => setTossWinner(team)}
                        className={`py-3 px-4 rounded-xl border-2 font-semibold text-sm transition-all ${tossWinner === team ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]' : 'border-[var(--border)] hover:border-[var(--primary)]/50'}`}>
                        {team}
                      </button>
                    ))}
                  </div>
                </div>

                {tossWinner && (
                  <div>
                    <p className="text-xs font-semibold opacity-60 uppercase tracking-wide mb-2">{tossWinner} chose to</p>
                    <div className="grid grid-cols-2 gap-3">
                      {(['bat', 'bowl'] as const).map(d => (
                        <button key={d} onClick={() => setTossDecision(d)}
                          className={`py-3 px-4 rounded-xl border-2 font-semibold text-sm capitalize transition-all ${tossDecision === d ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]' : 'border-[var(--border)] hover:border-[var(--primary)]/50'}`}>
                          {d === 'bat' ? '🏏 Bat first' : '🎯 Bowl first'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {tossWinner && (
                  <div className="p-3 bg-[var(--muted)] rounded-xl text-sm text-center opacity-70">
                    {(() => {
                      const batting = tossDecision === 'bat' ? tossWinner : (tossWinner === pendingMatch.teamA.name ? pendingMatch.teamB.name : pendingMatch.teamA.name);
                      const bowling = batting === pendingMatch.teamA.name ? pendingMatch.teamB.name : pendingMatch.teamA.name;
                      return <><span className="font-semibold">{batting}</span> bats first · <span className="font-semibold">{bowling}</span> bowls</>;
                    })()}
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setSquadStep('squad')}
                    className="px-4 py-3 rounded-xl border border-[var(--border)] font-semibold text-sm">
                    ← Back
                  </button>
                  <button onClick={handleConfirmToss} disabled={!tossWinner || startingMatch}
                    className="flex-1 py-3 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white rounded-xl font-bold disabled:opacity-40">
                    {startingMatch ? 'Starting...' : '▶ Start Match'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white px-4 py-8">
        <div className="container mx-auto max-w-3xl">
          <BackButton href="/scorer/tournament" />
          <div className="mt-3 flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-3xl font-bold">🏆 {tournament.name}</h1>
              <p className="opacity-80 text-sm mt-1">{tournament.overs} overs · {tournament.teams.length} teams · {tournament.dates?.join(', ')}</p>
            </div>
            <Link href={`/tournament/${params.id}`} target="_blank"
              className="px-4 py-2 bg-white/20 rounded-xl text-sm font-semibold hover:bg-white/30 transition-all">
              Public View ↗
            </Link>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
        {/* Teams */}
        <div className="glass-card rounded-2xl p-5">
          <h2 className="font-bold text-base mb-3">Teams</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {tournament.teams.map((t: any) => (
              <div key={t.name} className="bg-[var(--muted)] rounded-xl p-3">
                <p className="font-semibold text-sm">{t.name}</p>
                <p className="text-xs opacity-50 mt-0.5">{t.players?.length || 0} players</p>
              </div>
            ))}
          </div>
        </div>

        {/* Matches */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-base">Matches</h2>
            <button onClick={() => setShowCreateMatch(!showCreateMatch)}
              className="px-4 py-2 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold">
              {showCreateMatch ? 'Cancel' : '+ Create Match'}
            </button>
          </div>

          {showCreateMatch && (
            <div className="mb-5 p-4 bg-[var(--muted)] rounded-xl space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs opacity-60 font-semibold">Team A</label>
                  <select value={teamAId} onChange={e => setTeamAId(e.target.value)}
                    className="w-full mt-1 p-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm">
                    <option value="">Select team</option>
                    {tournament.teams.map((t: any) => (
                      <option key={t.id || t._id} value={t.id?.toString() || t._id?.toString()}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs opacity-60 font-semibold">Team B</label>
                  <select value={teamBId} onChange={e => setTeamBId(e.target.value)}
                    className="w-full mt-1 p-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm">
                    <option value="">Select team</option>
                    {tournament.teams.filter((t: any) => (t.id?.toString() || t._id?.toString()) !== teamAId).map((t: any) => (
                      <option key={t.id || t._id} value={t.id?.toString() || t._id?.toString()}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs opacity-60 font-semibold">Match Type</label>
                  <select value={matchType} onChange={e => setMatchType(e.target.value as any)}
                    className="w-full mt-1 p-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] focus:outline-none text-sm">
                    {MATCH_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs opacity-60 font-semibold">Date</label>
                  <select value={scheduledDate} onChange={e => setScheduledDate(e.target.value)}
                    className="w-full mt-1 p-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] focus:outline-none text-sm">
                    <option value="">Select date</option>
                    {tournament.dates?.map((d: string) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleCreateMatch} disabled={creating || !teamAId || !teamBId}
                className="w-full py-2.5 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white rounded-xl font-semibold text-sm disabled:opacity-40">
                {creating ? 'Creating...' : 'Create Match'}
              </button>
            </div>
          )}

          <div className="space-y-3">
            {matches.length === 0 && <p className="text-center opacity-50 py-6 text-sm">No matches yet</p>}
            {matches.map((match: any) => {
              const wMsg = winMessage(match);
              const typeLabel = match.matchType ? match.matchType.charAt(0).toUpperCase() + match.matchType.slice(1) : 'League';
              return (
                <div key={match._id} className="bg-[var(--muted)] rounded-xl overflow-hidden">
                  {/* Card header */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-[var(--primary)]">{typeLabel}</span>
                      {match.scheduledDate && <span className="opacity-50">· {match.scheduledDate}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {match.status === 'live' && (
                        <span className="flex items-center gap-1 text-xs font-bold text-red-500">
                          <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" /></span>
                          LIVE
                        </span>
                      )}
                      {match.status === 'completed' && <span className="text-xs font-semibold text-green-600">Done</span>}
                      {match.status === 'upcoming' && <span className="text-xs opacity-40">Upcoming</span>}
                      {/* Delete button */}
                      <button
                        onClick={() => setConfirmDialog({ isOpen: true, matchId: match._id, deleting: false })}
                        className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Delete match">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Scores */}
                  <div className="px-3 py-2.5 space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold">{match.teamA.name}</span>
                      <span className="font-bold">{match.innings?.first?.runs ?? 0}/{match.innings?.first?.wickets ?? 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold">{match.teamB.name}</span>
                      <span className="font-bold">{match.innings?.second?.runs ?? 0}/{match.innings?.second?.wickets ?? 0}</span>
                    </div>
                    {wMsg && <p className="text-xs font-semibold text-[var(--primary)] pt-1">{match.winner} — {wMsg}</p>}
                  </div>

                  {/* Actions */}
                  <div className="px-3 pb-3 flex gap-2">
                    {match.status === 'upcoming' && (
                      <button onClick={() => handleStartMatch(match)}
                        className="flex-1 py-2 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white rounded-lg text-sm font-semibold">
                        ▶ Start Match
                      </button>
                    )}
                    {match.status === 'live' && (
                      <Link href={`/scorer/score/${match._id}`} className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold text-center">
                        Score Live
                      </Link>
                    )}
                    {match.status === 'completed' && (
                      <Link href={`/match/${match._id}`} className="flex-1 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm font-semibold text-center">
                        View Scorecard
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
