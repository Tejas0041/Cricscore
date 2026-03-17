'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import BackButton from '@/app/components/BackButton';

export default function MatchPage() {
  const params = useParams();
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [squadModal, setSquadModal] = useState<{ open: boolean; team: 'A' | 'B' | null }>({ open: false, team: null });
  const [isScorer, setIsScorer] = useState(false);
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerRole, setNewPlayerRole] = useState('allrounder');
  const [selectedToAdd, setSelectedToAdd] = useState('');
  const [saving, setSaving] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [motm, setMotm] = useState<any>(null);
  const [motmLoading, setMotmLoading] = useState(false);

  const handleUndo = async () => {
    if (isUndoing) return;
    setIsUndoing(true);
    try {
      const res = await fetch(`/api/matches/${params.id}/undo`, { method: 'POST' });
      if (res.ok) await fetchMatch();
    } catch (e) { console.error(e); }
    finally { setIsUndoing(false); }
  };

  const fetchMatch = async () => {
    try {
      const res = await fetch(`/api/matches/${params.id}`);
      const data = await res.json();
      setMatch(data.match);
      // load saved MOTM directly from match document
      if (data.match?.motm?.playerName) setMotm(data.match.motm);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const findMotm = async () => {
    setMotmLoading(true);
    try {
      const res = await fetch(`/api/matches/${params.id}/motm`, { method: 'POST' });
      const data = await res.json();
      if (data.motm) setMotm(data.motm);
    } catch (e) { console.error(e); }
    finally { setMotmLoading(false); }
  };

  useEffect(() => {
    fetchMatch();
    fetch('/api/auth/session').then(r => r.json()).then(d => {
      if (d.user?.role === 'scorer' || d.user?.role === 'admin') setIsScorer(true);
    }).catch(() => {});

    const initPusher = () => {
      if (typeof window === 'undefined' || !(window as any).Pusher) return null;
      const pusher = new (window as any).Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER });
      const channel = pusher.subscribe(`match-${params.id}`);
      channel.bind('score-update', () => { fetchMatch(); });
      return () => { channel.unbind_all(); channel.unsubscribe(); pusher.disconnect(); };
    };
    const cleanup = initPusher();
    if (cleanup) return cleanup;
    const interval = setInterval(() => { const c = initPusher(); if (c) clearInterval(interval); }, 100);
    return () => clearInterval(interval);
  }, [params.id]);

  const openSquad = async (team: 'A' | 'B') => {
    setSquadModal({ open: true, team });
    setEditMode(false);
    setNewPlayerName('');
    setSelectedToAdd('');
    if (isScorer) {
      const res = await fetch('/api/players');
      const data = await res.json();
      setAllPlayers(data.players || []);
    }
  };

  const getTeamId = (team: 'A' | 'B') => {
    const t = team === 'A' ? match?.teamA : match?.teamB;
    return t?.id || t?._id;
  };

  const handleRemovePlayer = async (pid: string) => {
    setSaving(true);
    await fetch(`/api/teams/${getTeamId(squadModal.team!)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ removePlayerIds: [pid] }),
    });
    await fetchMatch();
    const r = await fetch('/api/players');
    setAllPlayers((await r.json()).players || []);
    setSaving(false);
  };

  const handleAddExisting = async () => {
    if (!selectedToAdd) return;
    setSaving(true);
    await fetch(`/api/teams/${getTeamId(squadModal.team!)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addPlayerIds: [selectedToAdd] }),
    });
    await fetchMatch();
    setSelectedToAdd('');
    setSaving(false);
  };

  const handleAddNew = async () => {
    if (!newPlayerName.trim()) return;
    setSaving(true);
    await fetch(`/api/teams/${getTeamId(squadModal.team!)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPlayer: { name: newPlayerName.trim(), role: newPlayerRole } }),
    });
    await fetchMatch();
    setNewPlayerName('');
    setSaving(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
  if (!match) return <div className="min-h-screen flex items-center justify-center"><p>Match not found</p></div>;

  const isSecond = match.currentInnings === 'second';
  const firstInnings = match.innings.first;
  const secondInnings = match.innings.second;
  const currentInn = match.innings[match.currentInnings];
  const firstBattingTeam = match.teamA;
  const firstBowlingTeam = match.teamB;
  const secondBattingTeam = match.teamB;
  const secondBowlingTeam = match.teamA;
  const currentBattingTeam = isSecond ? secondBattingTeam : firstBattingTeam;
  const currentBowlingTeam = isSecond ? secondBowlingTeam : firstBowlingTeam;

  const currentOverBalls = match.timeline.filter(
    (e: any) => e.innings === match.currentInnings && e.over === currentInn.overs
  );

  const getStats = (inningsKey: string) => {
    const batStats: any = {};
    const bowlStats: any = {};
    match.timeline.filter((e: any) => e.innings === inningsKey).forEach((e: any) => {
      const bpid = e.batsman?._id ? e.batsman._id.toString() : e.batsman?.toString();
      const wpid = e.bowler?._id ? e.bowler._id.toString() : e.bowler?.toString();
      if (bpid) {
        if (!batStats[bpid]) batStats[bpid] = { runs: 0, balls: 0, fours: 0, singles: 0, out: false };
        if (e.eventType === 'run') { batStats[bpid].runs += e.runs; batStats[bpid].balls++; if (e.runs === 4) batStats[bpid].fours++; else if (e.runs === 1) batStats[bpid].singles++; }
        else if (e.eventType === 'dot') batStats[bpid].balls++;
        else if (e.eventType === 'wicket') { batStats[bpid].balls++; batStats[bpid].out = true; }
      }
      if (wpid) {
        if (!bowlStats[wpid]) bowlStats[wpid] = { runs: 0, wickets: 0, balls: 0, dots: 0 };
        if (e.eventType === 'run') { bowlStats[wpid].runs += e.runs; bowlStats[wpid].balls++; }
        else if (e.eventType === 'dot') { bowlStats[wpid].balls++; bowlStats[wpid].dots++; }
        else if (e.eventType === 'wicket') { bowlStats[wpid].wickets++; bowlStats[wpid].balls++; }
      }
    });
    return { batStats, bowlStats };
  };

  const { batStats: bat1, bowlStats: bowl1 } = getStats('first');
  const { batStats: bat2, bowlStats: bowl2 } = getStats('second');
  const currentBatStats = isSecond ? bat2 : bat1;
  const currentBowlStats = isSecond ? bowl2 : bowl1;

  const target = isSecond ? firstInnings.runs + 1 : 0;
  const runsNeeded = isSecond ? target - secondInnings.runs : 0;
  const ballsLeft = isSecond ? match.overs * 6 - (secondInnings.overs * 6 + secondInnings.balls) : 0;
  const reqRR = isSecond && ballsLeft > 0 ? (runsNeeded / (ballsLeft / 6)).toFixed(2) : '-';

  const winMessage = (() => {
    if (match.status !== 'completed' || !match.winner) return null;
    if (match.winner === 'Tie') return 'Match Tied!';
    if (match.winner === match.teamB.name) {
      const w = match.teamB.players.length - secondInnings.wickets;
      return `${match.winner} won by ${w} wicket${w !== 1 ? 's' : ''}`;
    }
    const r = firstInnings.runs - secondInnings.runs;
    return `${match.winner} won by ${r} run${r !== 1 ? 's' : ''}`;
  })();

  const cbObj = currentInn.currentBatsman;
  const cwObj = currentInn.currentBowler;
  const cbId = cbObj?._id ? cbObj._id.toString() : cbObj?.toString();
  const cwId = cwObj?._id ? cwObj._id.toString() : cwObj?.toString();
  const cbPlayer = cbObj?.name ? cbObj : currentBattingTeam.players.find((p: any) => p?._id?.toString() === cbId);
  const cwPlayer = cwObj?.name ? cwObj : currentBowlingTeam.players.find((p: any) => p?._id?.toString() === cwId);
  const cbName = cbPlayer ? `${cbPlayer.name}${cbPlayer.nickname ? ` (${cbPlayer.nickname})` : ''}` : undefined;
  const cwName = cwPlayer ? `${cwPlayer.name}${cwPlayer.nickname ? ` (${cwPlayer.nickname})` : ''}` : undefined;
  const cbStats = cbId ? (currentBatStats[cbId] || { runs: 0, balls: 0, fours: 0 }) : null;
  const cwStats = cwId ? (currentBowlStats[cwId] || { runs: 0, wickets: 0, balls: 0 }) : null;

  const currentTeam = squadModal.team === 'A' ? match.teamA : match.teamB;
  const squadPlayers = currentTeam?.players || [];
  const availableToAdd = allPlayers.filter((p: any) => !squadPlayers.some((sp: any) => sp._id?.toString() === p._id?.toString()));

  const BattingTable = ({ players, stats, captain }: any) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] opacity-60 text-xs">
            <th className="text-left py-2">Batsman</th>
            <th className="text-center py-2">R</th><th className="text-center py-2">B</th>
            <th className="text-center py-2">1s</th><th className="text-center py-2">4s</th>
            <th className="text-center py-2">SR</th>
          </tr>
        </thead>
        <tbody>
          {players.filter((p: any) => p?._id && stats[p._id.toString()]).map((player: any) => {
            const pid = player._id.toString();
            const s = stats[pid];
            const isCap = captain && (captain._id?.toString() === pid || captain.toString() === pid);
            return (
              <tr key={pid} className="border-b border-[var(--border)]">
                <td className="py-2">{player.name}{player.nickname ? ` (${player.nickname})` : ''}{isCap ? ' (c)' : ''}{s.out && <span className="text-red-500 ml-1 text-xs">out</span>}</td>
                <td className="text-center">{s.runs}</td><td className="text-center">{s.balls}</td>
                <td className="text-center">{s.singles}</td><td className="text-center">{s.fours}</td>
                <td className="text-center">{s.balls > 0 ? ((s.runs / s.balls) * 100).toFixed(1) : '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const BowlingTable = ({ players, stats, captain }: any) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] opacity-60 text-xs">
            <th className="text-left py-2">Bowler</th>
            <th className="text-center py-2">O</th><th className="text-center py-2">R</th>
            <th className="text-center py-2">Dots</th>
            <th className="text-center py-2">W</th><th className="text-center py-2">Econ</th>
          </tr>
        </thead>
        <tbody>
          {players.filter((p: any) => p?._id && stats[p._id.toString()]).map((player: any) => {
            const pid = player._id.toString();
            const s = stats[pid];
            const isCap = captain && (captain._id?.toString() === pid || captain.toString() === pid);
            return (
              <tr key={pid} className="border-b border-[var(--border)]">
                <td className="py-2">{player.name}{player.nickname ? ` (${player.nickname})` : ''}{isCap ? ' (c)' : ''}</td>
                <td className="text-center">{Math.floor(s.balls / 6)}.{s.balls % 6}</td>
                <td className="text-center">{s.runs}</td>
                <td className="text-center">{s.dots}</td><td className="text-center">{s.wickets}</td>
                <td className="text-center">{s.balls > 0 ? (s.runs / (s.balls / 6)).toFixed(2) : '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const InningsCard = ({ label, score, battingTeam, bowlingTeam, batStats, bowlStats }: any) => (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden">
      {/* Innings header */}
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <h3 className="font-bold text-base">{label}</h3>
        <span className="text-lg font-bold text-[var(--primary)]">{score.runs}/{score.wickets} <span className="text-sm opacity-60 font-normal">({score.overs}.{score.balls} ov)</span></span>
      </div>

      {/* Batting section — green left border */}
      <div className="border-l-4 border-green-500 mx-4 my-4 pl-3">
        <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-2">Bat · {battingTeam.name}</p>
        <BattingTable players={battingTeam.players} stats={batStats} captain={battingTeam.captain} />
      </div>

      {/* Divider */}
      <div className="h-px bg-[var(--border)] mx-4" />

      {/* Bowling section — red/orange left border */}
      <div className="border-l-4 border-orange-500 mx-4 my-4 pl-3">
        <p className="text-xs font-bold text-orange-500 uppercase tracking-wide mb-2">Bowl · {bowlingTeam.name}</p>
        <BowlingTable players={bowlingTeam.players} stats={bowlStats} captain={bowlingTeam.captain} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-20">
      {/* Squad Modal */}
      {squadModal.open && currentTeam && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <h2 className="font-bold text-lg">Squads</h2>
              <div className="flex items-center gap-2">
                {isScorer && !editMode && (
                  <button onClick={() => setEditMode(true)} className="text-sm text-[var(--primary)] font-semibold hover:underline">Edit</button>
                )}
                {editMode && (
                  <button onClick={() => setEditMode(false)} className="text-sm opacity-60 font-semibold hover:underline">Done</button>
                )}
                <button onClick={() => setSquadModal({ open: false, team: null })}
                  className="p-1.5 rounded-lg hover:bg-[var(--muted)] transition-all">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Team tabs */}
            <div className="flex border-b border-[var(--border)]">
              <button onClick={() => { setSquadModal({ open: true, team: 'A' }); setEditMode(false); }}
                className={`flex-1 py-2.5 text-sm font-semibold transition-all ${squadModal.team === 'A' ? 'border-b-2 border-[var(--primary)] text-[var(--primary)]' : 'opacity-60'}`}>
                {match.teamA.name}
              </button>
              <button onClick={() => { setSquadModal({ open: true, team: 'B' }); setEditMode(false); }}
                className={`flex-1 py-2.5 text-sm font-semibold transition-all ${squadModal.team === 'B' ? 'border-b-2 border-[var(--primary)] text-[var(--primary)]' : 'opacity-60'}`}>
                {match.teamB.name}
              </button>
            </div>
            <div className="p-4 space-y-2">
              {squadPlayers.map((player: any) => {
                const pid = player._id?.toString();
                const isCommon = (match.commonPlayers || []).some((cp: any) => (cp._id || cp).toString() === pid);
                return (
                  <div key={player._id} className="flex items-center justify-between p-3 bg-[var(--muted)] rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{player.name}{player.nickname ? ` (${player.nickname})` : ''}</p>
                        {isCommon && <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-500 font-semibold">Common</span>}
                      </div>
                      <p className="text-xs opacity-60 capitalize">{player.role}</p>
                    </div>
                    {editMode && (
                      <button onClick={() => handleRemovePlayer(pid!)} disabled={saving}
                        className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
              {editMode && (
                <div className="pt-3 space-y-3 border-t border-[var(--border)]">
                  {availableToAdd.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold opacity-60 mb-1">Add existing player</p>
                      <div className="flex gap-2">
                        <select value={selectedToAdd} onChange={e => setSelectedToAdd(e.target.value)}
                          className="flex-1 p-2 text-sm bg-[var(--muted)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                          <option value="">Select player</option>
                          {availableToAdd.map((p: any) => <option key={p._id} value={p._id}>{p.name}{p.nickname ? ` (${p.nickname})` : ''}</option>)}
                        </select>
                        <button onClick={handleAddExisting} disabled={!selectedToAdd || saving}
                          className="px-3 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold opacity-60 mb-1">Create new player</p>
                    <div className="flex gap-2 mb-2">
                      <input value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)}
                        placeholder="Player name"
                        className="flex-1 p-2 text-sm bg-[var(--muted)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
                      <select value={newPlayerRole} onChange={e => setNewPlayerRole(e.target.value)}
                        className="p-2 text-sm bg-[var(--muted)] border border-[var(--border)] rounded-lg focus:outline-none">
                        <option value="allrounder">All-rounder</option>
                        <option value="batsman">Batsman</option>
                        <option value="bowler">Bowler</option>
                      </select>
                    </div>
                    <button onClick={handleAddNew} disabled={!newPlayerName.trim() || saving}
                      className="w-full py-2 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                      {saving ? 'Saving...' : 'Create & Add'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white sticky top-0 z-10 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <BackButton href="/matches" />
            <div className="min-w-0">
              <h1 className="text-base md:text-xl font-bold truncate">{match.teamA.name} vs {match.teamB.name}</h1>
              <p className="text-xs opacity-90">{match.overs} overs</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button onClick={() => openSquad('A')} className="text-xs bg-white/20 hover:bg-white/30 px-2.5 py-1.5 rounded-lg font-semibold transition-all">See Squads</button>
            {match.status === 'live' && (
              <span className="flex items-center gap-1 text-xs font-bold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                LIVE
              </span>
            )}
          </div>
        </div>
      </div>

      <main className="container mx-auto p-4 max-w-4xl space-y-4">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg p-4 md:p-6">
        {/* MOTM Card — above result */}
        {match.status === 'completed' && (
          <div className="mb-4">
            {motm ? (() => {
              // Compute MOTM's stats from this match's timeline
              const motmId = motm.playerId?.toString();
              let batRuns = 0, batBalls = 0, batFours = 0, batOut = false;
              let bowlRuns = 0, bowlBalls = 0, bowlWickets = 0;
              if (motmId) {
                for (const e of match.timeline) {
                  const bId = e.batsman?._id ? e.batsman._id.toString() : e.batsman?.toString();
                  const wId = e.bowler?._id ? e.bowler._id.toString() : e.bowler?.toString();
                  if (bId === motmId) {
                    if (e.eventType === 'run') { batRuns += e.runs; batBalls++; if (e.runs === 4) batFours++; }
                    else if (e.eventType === 'dot') batBalls++;
                    else if (e.eventType === 'wicket') { batBalls++; batOut = true; }
                  }
                  if (wId === motmId) {
                    if (e.eventType === 'run') { bowlRuns += e.runs; bowlBalls++; }
                    else if (e.eventType === 'dot') bowlBalls++;
                    else if (e.eventType === 'wicket') { bowlWickets++; bowlBalls++; }
                  }
                }
              }
              const batSR = batBalls > 0 ? ((batRuns / batBalls) * 100).toFixed(0) : '0';
              const bowlOv = `${Math.floor(bowlBalls / 6)}.${bowlBalls % 6}`;
              const bowlEcon = bowlBalls > 0 ? (bowlRuns / (bowlBalls / 6)).toFixed(1) : '-';
              return (
                <div className="p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/40 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-yellow-600">Man of the Match</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--muted)] opacity-70 capitalize">{motm.provider}</span>
                      {isScorer && (
                        <button onClick={findMotm} disabled={motmLoading}
                          className="text-xs px-2 py-0.5 rounded-full bg-[var(--muted)] hover:bg-[var(--border)] transition-colors disabled:opacity-50">
                          {motmLoading ? '...' : 'Re-find'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                    <p className="text-lg font-bold">🏅 {motm.playerName}</p>
                    <p className="text-sm opacity-50">{motm.team}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs flex-wrap mb-2">
                    {batBalls > 0 && (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/15 text-green-600 font-semibold">
                        <span className="opacity-60 font-normal">Bat</span>
                        {batRuns}{batOut ? '' : '*'}({batBalls}) SR {batSR}{batFours > 0 ? ` · ${batFours}(4s)` : ''}
                      </span>
                    )}
                    {bowlBalls > 0 && (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/15 text-orange-600 font-semibold">
                        <span className="opacity-60 font-normal">Bowl</span>
                        {bowlWickets}/{bowlRuns} ({bowlOv}ov) Econ {bowlEcon}
                      </span>
                    )}
                  </div>
                  <p className="text-sm opacity-80 leading-relaxed">{motm.reason}</p>
                </div>
              );
            })() : motmLoading ? (
              <div className="flex items-center justify-center gap-2 text-sm opacity-60 py-2">
                <div className="w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                Finding Man of the Match...
              </div>
            ) : isScorer ? (
              <div className="flex justify-center">
                <button onClick={findMotm}
                  className="px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all">
                  🏅 Find Man of the Match
                </button>
              </div>
            ) : null}
          </div>
        )}

          {match.status === 'completed' && winMessage && (
            <div className="mb-4 p-3 bg-[var(--primary)]/10 border border-[var(--primary)] rounded-lg text-center">
              <p className="font-bold text-[var(--primary)]">🏆 {winMessage}</p>
              {isScorer && (
                <button onClick={handleUndo} disabled={isUndoing || !match.timeline?.length}
                  className="mt-2 px-4 py-1.5 bg-purple-500 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50">
                  {isUndoing ? 'Undoing...' : 'Undo Last Ball'}
                </button>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[var(--muted)] rounded-lg p-3">
              <p className="text-sm font-semibold opacity-70 mb-1">{firstBattingTeam.name}</p>
              <p className="text-2xl font-bold text-[var(--primary)]">{firstInnings.runs}/{firstInnings.wickets}</p>
              <p className="text-xs opacity-60">({firstInnings.overs}.{firstInnings.balls} ov)</p>
            </div>
            <div className="bg-[var(--muted)] rounded-lg p-3">
              <p className="text-sm font-semibold opacity-70 mb-1">{secondBattingTeam.name}</p>
              {isSecond || match.status === 'completed' ? (
                <><p className="text-2xl font-bold text-[var(--primary)]">{secondInnings.runs}/{secondInnings.wickets}</p>
                <p className="text-xs opacity-60">({secondInnings.overs}.{secondInnings.balls} ov)</p></>
              ) : <p className="text-2xl font-bold opacity-40">Yet to bat</p>}
            </div>
          </div>

          {isSecond && match.status === 'live' && runsNeeded > 0 && (
            <div className="mt-3 pt-3 border-t border-[var(--border)] grid grid-cols-3 gap-2 text-center">
              <div><p className="text-xs opacity-60">Target</p><p className="text-xl font-bold text-[var(--primary)]">{target}</p></div>
              <div><p className="text-xs opacity-60">Need</p><p className="text-sm font-bold leading-tight">{runsNeeded} runs off {ballsLeft} balls</p></div>
              <div><p className="text-xs opacity-60">Req. RR</p><p className="text-xl font-bold">{reqRR}</p></div>
            </div>
          )}

          {match.status === 'live' && cbName && cwName && (
            <div className="mt-3 pt-3 border-t border-[var(--border)] grid grid-cols-2 gap-3">
              <div className="bg-[var(--muted)] rounded-lg p-3">
                <p className="text-xs opacity-60 mb-1">Batting</p>
                <p className="font-bold text-sm">{cbName}</p>
                {cbStats && <p className="text-xs opacity-70 mt-0.5">{cbStats.runs} ({cbStats.balls}b) · {cbStats.fours} fours</p>}
              </div>
              <div className="bg-[var(--muted)] rounded-lg p-3">
                <p className="text-xs opacity-60 mb-1">Bowling</p>
                <p className="font-bold text-sm">{cwName}</p>
                {cwStats && <p className="text-xs opacity-70 mt-0.5">{Math.floor(cwStats.balls / 6)}.{cwStats.balls % 6} ov · {cwStats.wickets}W · {cwStats.balls > 0 ? (cwStats.runs / (cwStats.balls / 6)).toFixed(1) : '-'} econ</p>}
              </div>
            </div>
          )}

          {match.status === 'live' && (
            <div className="mt-3 pt-3 border-t border-[var(--border)]">
              <p className="text-xs opacity-60 mb-2">This Over</p>
              <div className="flex gap-2 flex-wrap">
                {currentOverBalls.map((ball: any, idx: number) => (
                  <div key={idx} className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                    ball.eventType === 'wicket' ? 'bg-red-500 text-white' :
                    ball.eventType === 'run' && ball.runs >= 4 ? 'bg-green-500 text-white' :
                    ball.eventType === 'dot' ? 'bg-[var(--muted)] border border-[var(--border)]' :
                    ball.eventType === 'wide' ? 'bg-yellow-400 text-black' :
                    ball.eventType === 'noball' ? 'bg-orange-500 text-white' :
                    ball.eventType === 'deadball' ? 'bg-gray-400 text-white' :
                    'bg-[var(--secondary)] text-white'
                  }`}>
                    {ball.eventType === 'wicket' ? 'W' : ball.eventType === 'wide' ? 'Wd' : ball.eventType === 'noball' ? 'Nb' : ball.eventType === 'deadball' ? 'Db' : ball.eventType === 'dot' ? '0' : ball.runs}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {(isSecond || match.status === 'completed') && (
          <InningsCard
            label="2nd Innings"
            score={secondInnings}
            battingTeam={secondBattingTeam}
            bowlingTeam={secondBowlingTeam}
            batStats={bat2}
            bowlStats={bowl2}
          />
        )}
        <InningsCard
          label="1st Innings"
          score={firstInnings}
          battingTeam={firstBattingTeam}
          bowlingTeam={firstBowlingTeam}
          batStats={bat1}
          bowlStats={bowl1}
        />
      </main>
    </div>
  );
}
