'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmDialog from '@/app/components/ConfirmDialog';
import BackButton from '@/app/components/BackButton';

export default function CreateMatchPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [players, setPlayers] = useState<any[]>([]);
  const [existingTeams, setExistingTeams] = useState<any[]>([]);
  
  const [teamAName, setTeamAName] = useState('');
  const [teamBName, setTeamBName] = useState('');
  const [teamAId, setTeamAId] = useState('');
  const [teamBId, setTeamBId] = useState('');
  const [overs, setOvers] = useState(7);
  
  const [tossWinner, setTossWinner] = useState<'A' | 'B' | ''>('');
  const [showCoinFlip, setShowCoinFlip] = useState(false);
  
  const [teamAPlayers, setTeamAPlayers] = useState<string[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<string[]>([]);
  const [currentPicker, setCurrentPicker] = useState<'A' | 'B'>('A');
  
  const [teamACaptain, setTeamACaptain] = useState('');
  const [teamBCaptain, setTeamBCaptain] = useState('');
  
  const [finalTossWinner, setFinalTossWinner] = useState('');
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl'>('bat');
  const [showFinalCoinFlip, setShowFinalCoinFlip] = useState(false);
  
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerRole, setNewPlayerRole] = useState<'batsman' | 'bowler' | 'allrounder'>('batsman');
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [pickMode, setPickMode] = useState<'choose' | 'one-by-one' | 'team-at-once'>('choose');
  const [firstTeamConfirmed, setFirstTeamConfirmed] = useState(false);
  const [commonPlayers, setCommonPlayers] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    fetchPlayers();
    fetch('/api/teams').then(r => r.json()).then(d => {
      // Deduplicate by name, keep the most recent (first in sorted-by-createdAt desc list)
      const seen = new Set<string>();
      const unique = (d.teams || []).filter((t: any) => {
        if (seen.has(t.name)) return false;
        seen.add(t.name);
        return true;
      });
      setExistingTeams(unique);
    });
  }, []);

  const fetchPlayers = async () => {
    const res = await fetch('/api/players');
    const data = await res.json();
    setPlayers(data.players || []);
  };

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) return;
    
    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPlayerName, role: newPlayerRole }),
      });
      const data = await res.json();
      setPlayers([...players, data.player]);
      setNewPlayerName('');
      setShowAddPlayer(false);
    } catch (error) {
      console.error('Error adding player:', error);
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Player',
      message: 'Are you sure you want to delete this player?',
      onConfirm: async () => {
        try {
          await fetch(`/api/players/${playerId}`, { method: 'DELETE' });
          setPlayers(players.filter(p => p._id !== playerId));
          setTeamAPlayers(teamAPlayers.filter(id => id !== playerId));
          setTeamBPlayers(teamBPlayers.filter(id => id !== playerId));
        } catch (error) {
          console.error('Error deleting player:', error);
        }
        setConfirmDialog({ ...confirmDialog, isOpen: false });
      },
    });
  };

  const handleCoinFlip = () => {
    setShowCoinFlip(true);
    setTimeout(() => {
      const result = Math.random() > 0.5 ? 'A' : 'B';
      setTossWinner(result);
      setCurrentPicker(result);
      setShowCoinFlip(false);
    }, 1500);
  };

  const handleFinalCoinFlip = () => {
    setShowFinalCoinFlip(true);
    setTimeout(() => {
      const result = Math.random() > 0.5 ? teamAName : teamBName;
      setFinalTossWinner(result);
      setShowFinalCoinFlip(false);
    }, 1500);
  };

  const handleSelectPlayer = (playerId: string) => {
    if (currentPicker === 'A') {
      setTeamAPlayers([...teamAPlayers, playerId]);
      setCurrentPicker('B');
    } else {
      setTeamBPlayers([...teamBPlayers, playerId]);
      setCurrentPicker('A');
    }
  };


  const handleUndoLastPick = () => {
    if (teamAPlayers.length === 0 && teamBPlayers.length === 0) return;
    
    if (currentPicker === 'B' && teamAPlayers.length > 0) {
      setTeamAPlayers(teamAPlayers.slice(0, -1));
      setCurrentPicker('A');
    } else if (currentPicker === 'A' && teamBPlayers.length > 0) {
      setTeamBPlayers(teamBPlayers.slice(0, -1));
      setCurrentPicker('B');
    }
  };

  const handleCreateMatch = async () => {
    if (creating) return;
    setCreating(true);
    
    try {
      // Common players must be in both squads
      const finalTeamAPlayers = [...new Set([...teamAPlayers, ...commonPlayers])];
      const finalTeamBPlayers = [...new Set([...teamBPlayers, ...commonPlayers])];

      // Reuse existing team if selected, otherwise create new
      let resolvedTeamAId = teamAId;
      let resolvedTeamBId = teamBId;

      if (!resolvedTeamAId) {
        const res = await fetch('/api/teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: teamAName, players: finalTeamAPlayers, captain: teamACaptain }),
        });
        const data = await res.json();
        resolvedTeamAId = data.team._id;
      } else {
        await fetch(`/api/teams/${resolvedTeamAId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ setPlayers: finalTeamAPlayers, captain: teamACaptain }),
        });
      }

      if (!resolvedTeamBId) {
        const res = await fetch('/api/teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: teamBName, players: finalTeamBPlayers, captain: teamBCaptain }),
        });
        const data = await res.json();
        resolvedTeamBId = data.team._id;
      } else {
        await fetch(`/api/teams/${resolvedTeamBId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ setPlayers: finalTeamBPlayers, captain: teamBCaptain }),
        });
      }
      
      const battingTeam = tossDecision === 'bat' ? finalTossWinner : (finalTossWinner === teamAName ? teamBName : teamAName);
      const bowlingTeam = battingTeam === teamAName ? teamBName : teamAName;
      
      const matchRes = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamA: {
            id: resolvedTeamAId,
            name: teamAName,
            players: finalTeamAPlayers,
            captain: teamACaptain,
          },
          teamB: {
            id: resolvedTeamBId,
            name: teamBName,
            players: finalTeamBPlayers,
            captain: teamBCaptain,
          },
          overs,
          tossWinner: finalTossWinner,
          tossDecision,
          commonPlayers,
          innings: {
            first: { battingTeam, bowlingTeam },
            second: { battingTeam: bowlingTeam, bowlingTeam: battingTeam },
          },
        }),
      });
      
      const matchData = await matchRes.json();
      if (!matchRes.ok || !matchData.match?._id) {
        console.error('Failed to create match:', matchData);
        setCreating(false);
        return;
      }
      router.push(`/scorer/score/${matchData.match._id}`);
    } catch (error) {
      console.error('Error creating match:', error);
      setCreating(false);
    }
  };

  const selectedPlayers = [...teamAPlayers, ...teamBPlayers];
  const availablePlayers = players
    .filter(p => !selectedPlayers.includes(p._id))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Players not in either team — candidates for common
  const commonCandidates = players
    .filter(p => !teamAPlayers.includes(p._id) && !teamBPlayers.includes(p._id))
    .sort((a, b) => a.name.localeCompare(b.name));

  const totalSteps = 6;


  return (
    <div className="min-h-screen pb-20">
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
        <div className="container mx-auto px-4 py-8">
          <BackButton href="/scorer" />
          <h1 className="text-2xl md:text-3xl font-bold mt-2">Create New Match</h1>
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full transition-all ${
                  s <= step ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
          <p className="mt-2 text-sm opacity-90">
            Step {step} of {totalSteps}: {
              step === 1 ? 'Match Details' :
              step === 2 ? 'Toss for Player Selection' :
              step === 3 ? 'Select Players' :
              step === 4 ? 'Common Players' :
              step === 5 ? 'Choose Captains' :
              'Final Toss'
            }
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Step 1: Match Details */}
        {step === 1 && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-6">Match Details</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-2">Team A Name</label>
                {existingTeams.length > 0 && (
                  <select
                    onChange={e => {
                      const t = existingTeams.find((x: any) => x._id === e.target.value);
                      if (t) {
                        setTeamAName(t.name);
                        setTeamAId(t._id);
                        // Don't pre-load players — picked fresh each match
                        setTeamAPlayers([]);
                      } else {
                        setTeamAId('');
                        setTeamAPlayers([]);
                      }
                    }}
                    className="w-full p-4 bg-[var(--muted)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all mb-2"
                  >
                    <option value="">Select existing team...</option>
                    {existingTeams.filter((t: any) => t._id !== teamBId).map((t: any) => (
                      <option key={t._id} value={t._id}>{t.name}</option>
                    ))}
                  </select>
                )}
                <input
                  type="text"
                  value={teamAName}
                  onChange={(e) => { setTeamAName(e.target.value); setTeamAId(''); setTeamAPlayers([]); }}
                  className="w-full p-4 bg-[var(--muted)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                  placeholder="Or type a new team name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Team B Name</label>
                {existingTeams.length > 0 && (
                  <select
                    onChange={e => {
                      const t = existingTeams.find((x: any) => x._id === e.target.value);
                      if (t) {
                        setTeamBName(t.name);
                        setTeamBId(t._id);
                        // Don't pre-load players — picked fresh each match
                        setTeamBPlayers([]);
                      } else {
                        setTeamBId('');
                        setTeamBPlayers([]);
                      }
                    }}
                    className="w-full p-4 bg-[var(--muted)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all mb-2"
                  >
                    <option value="">Select existing team...</option>
                    {existingTeams.filter((t: any) => t._id !== teamAId).map((t: any) => (
                      <option key={t._id} value={t._id}>{t.name}</option>
                    ))}
                  </select>
                )}
                <input
                  type="text"
                  value={teamBName}
                  onChange={(e) => { setTeamBName(e.target.value); setTeamBId(''); setTeamBPlayers([]); }}
                  className="w-full p-4 bg-[var(--muted)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                  placeholder="Or type a new team name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Overs per Innings</label>
                <input
                  type="number"
                  value={overs}
                  onChange={(e) => setOvers(Number(e.target.value))}
                  className="w-full p-4 bg-[var(--muted)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                  min="1"
                  max="50"
                />
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={!teamAName || !teamBName}
                className="w-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white p-4 rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-lg"
              >
                Next: Toss
              </button>
            </div>
          </div>
        )}


        {/* Step 2: Toss for Player Selection */}
        {step === 2 && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-6">Toss for Player Selection</h2>
            <p className="mb-6 opacity-60">Who will pick players first?</p>
            
            {showCoinFlip && (
              <div className="text-center mb-6 py-8">
                <div className="text-8xl animate-spin">🪙</div>
                <p className="mt-4 text-lg font-semibold">Flipping...</p>
              </div>
            )}
            
            {tossWinner && !showCoinFlip && (
              <div className="bg-[var(--primary)]/10 border-2 border-[var(--primary)] p-6 rounded-xl mb-6 text-center">
                <p className="text-2xl font-bold text-[var(--primary)]">
                  🎉 {tossWinner === 'A' ? teamAName : teamBName} will pick first!
                </p>
              </div>
            )}
            
            <div className="space-y-4">
              <button
                onClick={handleCoinFlip}
                disabled={showCoinFlip}
                className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-white p-4 rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-lg"
              >
                🪙 Flip Coin
              </button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--border)]"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-[var(--card)] opacity-60">OR</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setTossWinner('A');
                    setCurrentPicker('A');
                  }}
                  className={`p-4 rounded-xl font-semibold transition-all ${
                    tossWinner === 'A'
                      ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white shadow-lg'
                      : 'bg-[var(--muted)] hover:bg-[var(--border)]'
                  }`}
                >
                  {teamAName}
                </button>
                <button
                  onClick={() => {
                    setTossWinner('B');
                    setCurrentPicker('B');
                  }}
                  className={`p-4 rounded-xl font-semibold transition-all ${
                    tossWinner === 'B'
                      ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white shadow-lg'
                      : 'bg-[var(--muted)] hover:bg-[var(--border)]'
                  }`}
                >
                  {teamBName}
                </button>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-[var(--muted)] p-4 rounded-xl font-bold hover:bg-[var(--border)] transition-all"
              >
                Back
              </button>
              <button
                onClick={() => {
                  setStep(3);
                  setPickMode('choose');
                }}
                className="flex-1 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white p-4 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg"
              >
                {tossWinner ? 'Start Picking' : 'Skip Toss'}
              </button>
            </div>
          </div>
        )}


        {/* Step 3: Select Players */}
        {step === 3 && (
          <div className="space-y-4 pb-24">

            {/* Mode chooser */}
            {pickMode === 'choose' && (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-bold mb-2">Select Players</h2>
                <p className="text-sm opacity-60 mb-6">How do you want to pick players?</p>
                <div className="space-y-3">
                  <button
                    onClick={() => setPickMode('one-by-one')}
                    className="w-full p-5 rounded-xl border-2 border-[var(--border)] bg-[var(--muted)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all text-left"
                  >
                    <p className="font-bold text-base">One by One</p>
                    <p className="text-sm opacity-60 mt-1">{tossWinner === 'A' ? teamAName : tossWinner === 'B' ? teamBName : 'Team A'} picks first, then teams alternate picking one player at a time</p>
                  </button>
                  <button
                    onClick={() => setPickMode('team-at-once')}
                    className="w-full p-5 rounded-xl border-2 border-[var(--border)] bg-[var(--muted)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all text-left"
                  >
                    <p className="font-bold text-base">Team at Once</p>
                    <p className="text-sm opacity-60 mt-1">{tossWinner === 'A' ? teamAName : tossWinner === 'B' ? teamBName : 'Team A'} selects their whole squad first, then the other team picks theirs</p>
                  </button>
                </div>
                <button
                  onClick={() => { setStep(2); setPickMode('choose'); setFirstTeamConfirmed(false); }}
                  className="w-full mt-4 bg-[var(--muted)] p-4 rounded-xl font-bold hover:bg-[var(--border)] transition-all"
                >
                  Back
                </button>
              </div>
            )}

            {/* One-by-one mode */}
            {pickMode === 'one-by-one' && (
              <>
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl p-6">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-xl font-bold">Select Players</h2>
                      <p className="text-sm opacity-60 mt-1">
                        {currentPicker === 'A' ? teamAName : teamBName}'s turn to pick
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddPlayer(!showAddPlayer)}
                      className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-semibold hover:opacity-90 transition-all"
                    >
                      + Add Player
                    </button>
                  </div>

                  {showAddPlayer && (
                    <div className="mb-6 p-4 bg-[var(--muted)] rounded-xl space-y-3">
                      <input type="text" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} placeholder="Player name"
                        className="w-full p-3 bg-[var(--card)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
                      <select value={newPlayerRole} onChange={(e) => setNewPlayerRole(e.target.value as any)}
                        className="w-full p-3 bg-[var(--card)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                        <option value="batsman">Batsman</option>
                        <option value="bowler">Bowler</option>
                        <option value="allrounder">All-rounder</option>
                      </select>
                      <div className="flex gap-2">
                        <button onClick={handleAddPlayer} className="flex-1 bg-[var(--primary)] text-white p-3 rounded-lg font-semibold hover:opacity-90">Add</button>
                        <button onClick={() => setShowAddPlayer(false)} className="flex-1 bg-[var(--muted)] p-3 rounded-lg font-semibold hover:bg-[var(--border)]">Cancel</button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-[var(--muted)] p-4 rounded-xl">
                      <p className="text-sm opacity-60 mb-2">{teamAName}</p>
                      <p className="text-2xl font-bold">{teamAPlayers.length}</p>
                      <p className="text-xs opacity-60">players</p>
                    </div>
                    <div className="bg-[var(--muted)] p-4 rounded-xl">
                      <p className="text-sm opacity-60 mb-2">{teamBName}</p>
                      <p className="text-2xl font-bold">{teamBPlayers.length}</p>
                      <p className="text-xs opacity-60">players</p>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {availablePlayers.map((player) => (
                      <div key={player._id} onClick={() => handleSelectPlayer(player._id)}
                        className="flex items-center justify-between p-4 bg-[var(--muted)] hover:bg-[var(--border)] rounded-xl cursor-pointer transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] rounded-full flex items-center justify-center text-white font-bold">
                            {player.name[0]}
                          </div>
                          <div>
                            <p className="font-bold">{player.name}</p>
                            <p className="text-xs opacity-60 capitalize">{player.role}</p>
                          </div>
                        </div>
                        <div className="flex gap-3 text-sm text-right">
                          <div><p className="opacity-60">Runs</p><p className="font-bold text-[var(--primary)]">{player.stats.batting.runs}</p></div>
                          <div><p className="opacity-60">Wkts</p><p className="font-bold text-red-500">{player.stats.bowling.wickets}</p></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="fixed bottom-0 left-0 right-0 bg-[var(--card)] border-t border-[var(--border)] p-4 shadow-lg">
                  <div className="container mx-auto max-w-2xl flex gap-3">
                    <button onClick={() => { setPickMode('choose'); setTeamAPlayers([]); setTeamBPlayers([]); setFirstTeamConfirmed(false); setCommonPlayers([]); }}
                      className="flex-1 bg-[var(--muted)] p-4 rounded-xl font-bold hover:bg-[var(--border)] transition-all">Back</button>
                    <button onClick={handleUndoLastPick} disabled={teamAPlayers.length === 0 && teamBPlayers.length === 0}
                      className="flex-1 bg-purple-500 text-white p-4 rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50">Undo</button>
                    <button onClick={() => setStep(4)} disabled={teamAPlayers.length === 0 || teamBPlayers.length === 0}
                      className="flex-1 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white p-4 rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-lg">Next</button>
                  </div>
                </div>
              </>
            )}

            {/* Team-at-once mode */}
            {pickMode === 'team-at-once' && (() => {
              const firstPicker = tossWinner === 'B' ? 'B' : 'A';
              const secondPicker = firstPicker === 'A' ? 'B' : 'A';
              const activePicker = firstTeamConfirmed ? secondPicker : firstPicker;
              const activeTeamName = activePicker === 'A' ? teamAName : teamBName;
              const activePlayers = activePicker === 'A' ? teamAPlayers : teamBPlayers;
              const setActivePlayers = activePicker === 'A' ? setTeamAPlayers : setTeamBPlayers;
              const selectedByActive = new Set(activePlayers);
              const alreadyTaken = activePicker === 'A' ? new Set(teamBPlayers) : new Set(teamAPlayers);

              return (
                <>
                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl p-6">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <h2 className="text-xl font-bold">{activeTeamName}'s Squad</h2>
                        <p className="text-sm opacity-60 mt-1">Select all players for {activeTeamName}</p>
                      </div>
                      <button onClick={() => setShowAddPlayer(!showAddPlayer)}
                        className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-semibold hover:opacity-90 transition-all">
                        + Add Player
                      </button>
                    </div>

                    {showAddPlayer && (
                      <div className="my-4 p-4 bg-[var(--muted)] rounded-xl space-y-3">
                        <input type="text" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} placeholder="Player name"
                          className="w-full p-3 bg-[var(--card)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
                        <select value={newPlayerRole} onChange={(e) => setNewPlayerRole(e.target.value as any)}
                          className="w-full p-3 bg-[var(--card)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                          <option value="batsman">Batsman</option>
                          <option value="bowler">Bowler</option>
                          <option value="allrounder">All-rounder</option>
                        </select>
                        <div className="flex gap-2">
                          <button onClick={handleAddPlayer} className="flex-1 bg-[var(--primary)] text-white p-3 rounded-lg font-semibold hover:opacity-90">Add</button>
                          <button onClick={() => setShowAddPlayer(false)} className="flex-1 bg-[var(--muted)] p-3 rounded-lg font-semibold hover:bg-[var(--border)]">Cancel</button>
                        </div>
                      </div>
                    )}

                    <p className="text-xs opacity-50 mt-3 mb-3">{activePlayers.length} selected</p>

                    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                      {players.filter((p: any) => !alreadyTaken.has(p._id)).sort((a: any, b: any) => a.name.localeCompare(b.name)).map((player: any) => {
                        const selected = selectedByActive.has(player._id);
                        return (
                          <div key={player._id}
                            onClick={() => {
                              if (selected) setActivePlayers(activePlayers.filter(id => id !== player._id));
                              else setActivePlayers([...activePlayers, player._id]);
                            }}
                            className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all border-2 ${selected ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-transparent bg-[var(--muted)] hover:bg-[var(--border)]'}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${selected ? 'bg-[var(--primary)]' : 'bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)]'}`}>
                                {selected ? '✓' : player.name[0]}
                              </div>
                              <div>
                                <p className="font-bold">{player.name}</p>
                                <p className="text-xs opacity-60 capitalize">{player.role}</p>
                              </div>
                            </div>
                            <div className="flex gap-3 text-sm text-right">
                              <div><p className="opacity-60">Runs</p><p className="font-bold text-[var(--primary)]">{player.stats.batting.runs}</p></div>
                              <div><p className="opacity-60">Wkts</p><p className="font-bold text-red-500">{player.stats.bowling.wickets}</p></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="fixed bottom-0 left-0 right-0 bg-[var(--card)] border-t border-[var(--border)] p-4 shadow-lg">
                    <div className="container mx-auto max-w-2xl flex gap-3">
                      <button onClick={() => { setPickMode('choose'); setTeamAPlayers([]); setTeamBPlayers([]); setFirstTeamConfirmed(false); }}
                        className="flex-1 bg-[var(--muted)] p-4 rounded-xl font-bold hover:bg-[var(--border)] transition-all">Back</button>
                      {!firstTeamConfirmed ? (
                        <button onClick={() => setFirstTeamConfirmed(true)}
                          disabled={activePlayers.length === 0}
                          className="flex-1 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white p-4 rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-lg">
                          Confirm {activeTeamName} Squad →
                        </button>
                      ) : (
                        <button onClick={() => setStep(4)} disabled={activePlayers.length === 0}
                          className="flex-1 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white p-4 rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-lg">
                          Next: Common Players
                        </button>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}


        {/* Step 4: Common Players */}
        {step === 4 && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-1">Common Players</h2>
            <p className="text-sm opacity-60 mb-6">
              Select players who will play for both teams (optional — gully cricket substitute).
              They'll appear in both squads with a "Common" badge.
            </p>

            {commonCandidates.length === 0 ? (
              <p className="text-center opacity-50 py-8">No remaining players to pick as common</p>
            ) : (
              <div className="space-y-2 max-h-[55vh] overflow-y-auto">
                {commonCandidates.map(player => {
                  const isCommon = commonPlayers.includes(player._id);
                  return (
                    <div key={player._id}
                      onClick={() => setCommonPlayers(isCommon
                        ? commonPlayers.filter(id => id !== player._id)
                        : [...commonPlayers, player._id]
                      )}
                      className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all border-2 ${isCommon ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-transparent bg-[var(--muted)] hover:bg-[var(--border)]'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${isCommon ? 'bg-[var(--primary)]' : 'bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)]'}`}>
                          {isCommon ? '✓' : player.name[0]}
                        </div>
                        <div>
                          <p className="font-bold">{player.name}{player.nickname ? ` (${player.nickname})` : ''}</p>
                          <p className="text-xs opacity-60 capitalize">{player.role}</p>
                        </div>
                      </div>
                      {isCommon && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--primary)]/20 text-[var(--primary)]">Common</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(3)} className="flex-1 bg-[var(--muted)] p-4 rounded-xl font-bold hover:bg-[var(--border)] transition-all">Back</button>
              <button onClick={() => setStep(5)} className="flex-1 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white p-4 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg">
                {commonPlayers.length > 0 ? `Next (${commonPlayers.length} common)` : 'Skip — No Common'}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Choose Captains */}
        {step === 5 && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-6">Choose Captains</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-2">{teamAName} Captain</label>
                <select
                  value={teamACaptain}
                  onChange={(e) => setTeamACaptain(e.target.value)}
                  className="w-full p-4 bg-[var(--muted)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                >
                  <option value="">Select Captain</option>
                  {players.filter(p => [...teamAPlayers, ...commonPlayers].includes(p._id)).map((player) => (
                    <option key={player._id} value={player._id}>{player.name}{commonPlayers.includes(player._id) ? ' (Common)' : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">{teamBName} Captain</label>
                <select
                  value={teamBCaptain}
                  onChange={(e) => setTeamBCaptain(e.target.value)}
                  className="w-full p-4 bg-[var(--muted)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                >
                  <option value="">Select Captain</option>
                  {players.filter(p => [...teamBPlayers, ...commonPlayers].includes(p._id)).map((player) => (
                    <option key={player._id} value={player._id}>{player.name}{commonPlayers.includes(player._id) ? ' (Common)' : ''}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(4)} className="flex-1 bg-[var(--muted)] p-4 rounded-xl font-bold hover:bg-[var(--border)] transition-all">Back</button>
              <button onClick={() => setStep(6)} disabled={!teamACaptain || !teamBCaptain}
                className="flex-1 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white p-4 rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-lg">
                Next: Final Toss
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Final Toss */}
        {step === 6 && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-6">Final Toss</h2>
            <p className="mb-6 opacity-60">Who won the toss and what did they choose?</p>
            
            {showFinalCoinFlip && (
              <div className="text-center mb-6 py-8">
                <div className="text-8xl animate-spin">🪙</div>
                <p className="mt-4 text-lg font-semibold">Flipping...</p>
              </div>
            )}
            
            {finalTossWinner && !showFinalCoinFlip && (
              <div className="bg-[var(--primary)]/10 border-2 border-[var(--primary)] p-6 rounded-xl mb-6 text-center">
                <p className="text-2xl font-bold text-[var(--primary)]">🎉 {finalTossWinner} won the toss!</p>
              </div>
            )}
            
            <div className="space-y-5">
              <button
                onClick={handleFinalCoinFlip}
                disabled={showFinalCoinFlip}
                className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-white p-4 rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-lg"
              >
                🪙 Flip Coin
              </button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--border)]"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-[var(--card)] opacity-60">OR</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2">Toss Winner</label>
                <select
                  value={finalTossWinner}
                  onChange={(e) => setFinalTossWinner(e.target.value)}
                  className="w-full p-4 bg-[var(--muted)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                >
                  <option value="">Select Winner</option>
                  <option value={teamAName}>{teamAName}</option>
                  <option value={teamBName}>{teamBName}</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2">Decision</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setTossDecision('bat')}
                    className={`p-4 rounded-xl font-semibold transition-all ${
                      tossDecision === 'bat'
                        ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white shadow-lg'
                        : 'bg-[var(--muted)] hover:bg-[var(--border)]'
                    }`}
                  >
                    Bat First
                  </button>
                  <button
                    onClick={() => setTossDecision('bowl')}
                    className={`p-4 rounded-xl font-semibold transition-all ${
                      tossDecision === 'bowl'
                        ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white shadow-lg'
                        : 'bg-[var(--muted)] hover:bg-[var(--border)]'
                    }`}
                  >
                    Bowl First
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep(5)}
                className="flex-1 bg-[var(--muted)] p-4 rounded-xl font-bold hover:bg-[var(--border)] transition-all"
              >
                Back
              </button>
              <button
                onClick={handleCreateMatch}
                disabled={!finalTossWinner || creating}
                className="flex-1 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white p-4 rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-lg"
              >
                {creating ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </span>
                ) : (
                  'Create Match'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
