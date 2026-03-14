'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import ConfirmDialog from '@/app/components/ConfirmDialog';

export default function ScorePage() {
  const params = useParams();
  const [match, setMatch] = useState<any>(null);
  const [currentBatsman, setCurrentBatsman] = useState('');
  const [currentBowler, setCurrentBowler] = useState('');
  const [tempBatsman, setTempBatsman] = useState('');
  const [tempBowler, setTempBowler] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingPlayers, setSavingPlayers] = useState(false);
  const [editingPlayers, setEditingPlayers] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [alertDialog, setAlertDialog] = useState({ isOpen: false, title: '', message: '' });
  const [squadModal, setSquadModal] = useState<{ open: boolean; team: 'A' | 'B' }>({ open: false, team: 'A' });
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [squadEditMode, setSquadEditMode] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerRole, setNewPlayerRole] = useState('allrounder');
  const [selectedToAdd, setSelectedToAdd] = useState('');
  const [savingSquad, setSavingSquad] = useState(false);
  const [editingOvers, setEditingOvers] = useState(false);
  const [tempOvers, setTempOvers] = useState('');
  const [savingOvers, setSavingOvers] = useState(false);
  const [newMatchModal, setNewMatchModal] = useState(false);
  const [newMatchBattingFirst, setNewMatchBattingFirst] = useState<'A' | 'B'>('A');
  const [newMatchTossWinner, setNewMatchTossWinner] = useState('');
  const [newMatchTossDecision, setNewMatchTossDecision] = useState<'bat' | 'bowl'>('bat');
  const [tossResult, setTossResult] = useState<'heads' | 'tails' | null>(null);
  const [tossFlipping, setTossFlipping] = useState(false);
  const [newMatchOvers, setNewMatchOvers] = useState('');
  const [creatingMatch, setCreatingMatch] = useState(false);
  const matchRef = useRef<any>(null);
  const isScoringRef = useRef(false);

  // Keep ref in sync for double-click prevention
  useEffect(() => { matchRef.current = match; }, [match]);

  useEffect(() => {
    fetchMatch();
  }, []);

  useEffect(() => {
    const initPusher = () => {
      if (typeof window === 'undefined' || !(window as any).Pusher) return null;
      const pusher = new (window as any).Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      });
      const channel = pusher.subscribe(`match-${params.id}`);
      channel.bind('score-update', (data: any) => {
        if (isScoringRef.current) return;
        setMatch((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: data.status,
            currentInnings: data.currentInnings,
            innings: {
              ...prev.innings,
              first: { ...prev.innings.first, ...data.first },
              second: { ...prev.innings.second, ...data.second },
            },
          };
        });
      });
      return () => { channel.unbind_all(); channel.unsubscribe(); pusher.disconnect(); };
    };

    const cleanup = initPusher();
    if (cleanup) return cleanup;

    const interval = setInterval(() => {
      const cleanup = initPusher();
      if (cleanup) clearInterval(interval);
    }, 100);
    return () => clearInterval(interval);
  }, [params.id]);

  const syncPlayersFromMatch = (m: any) => {
    const innings = m.innings[m.currentInnings];
    const cb = innings.currentBatsman;
    const cbw = innings.currentBowler;
    if (cb) {
      const id = cb._id ? cb._id.toString() : cb.toString();
      setCurrentBatsman(id);
      setTempBatsman(id);
    }
    if (cbw) {
      const id = cbw._id ? cbw._id.toString() : cbw.toString();
      setCurrentBowler(id);
      setTempBowler(id);
    }
  };

  const fetchMatch = async () => {
    try {
      const res = await fetch(`/api/matches/${params.id}`);
      const data = await res.json();
      setMatch(data.match);
      syncPlayersFromMatch(data.match);
    } catch (error) {
      console.error('Error fetching match:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlayers = async (batsmanId?: string, bowlerId?: string) => {
    const bat = batsmanId ?? tempBatsman;
    const bowl = bowlerId ?? tempBowler;
    if (!bat || !bowl) {
      setAlertDialog({ isOpen: true, title: 'Selection Required', message: 'Please select both batsman and bowler' });
      return;
    }
    setSavingPlayers(true);
    try {
      const res = await fetch(`/api/matches/${params.id}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batsman: bat, bowler: bowl }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setMatch(data.match);
      setCurrentBatsman(bat);
      setCurrentBowler(bowl);
      setTempBatsman(bat);
      setTempBowler(bowl);
      setEditingPlayers(false);
    } catch (error) {
      console.error('Error saving players:', error);
    } finally {
      setSavingPlayers(false);
    }
  };

  const handleCancelEdit = () => {
    setTempBatsman(currentBatsman);
    setTempBowler(currentBowler);
    setEditingPlayers(false);
  };

  const openSquad = async (team: 'A' | 'B') => {
    setSquadModal({ open: true, team });
    setSquadEditMode(false);
    setNewPlayerName('');
    setSelectedToAdd('');
    const res = await fetch('/api/players');
    const data = await res.json();
    setAllPlayers(data.players || []);
  };

  const getSquadTeamId = (team: 'A' | 'B') => {
    const t = team === 'A' ? match?.teamA : match?.teamB;
    return t?.id || t?._id;
  };

  const syncMatchPlayers = async (team: 'A' | 'B', updatedPlayerIds: string[]) => {
    const field = team === 'A' ? 'teamA.players' : 'teamB.players';
    await fetch(`/api/matches/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: updatedPlayerIds }),
    });
  };

  const handleSquadRemove = async (pid: string) => {
    setSavingSquad(true);
    try {
      const teamId = getSquadTeamId(squadModal.team);
      await fetch(`/api/teams/${teamId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ removePlayerIds: [pid] }),
      });
      // Sync match embedded players
      const currentPlayers = (squadModal.team === 'A' ? match.teamA.players : match.teamB.players)
        .map((p: any) => (p._id || p).toString())
        .filter((id: string) => id !== pid);
      await syncMatchPlayers(squadModal.team, currentPlayers);
      await fetchMatch();
      const r = await fetch('/api/players');
      setAllPlayers((await r.json()).players || []);
    } finally {
      setSavingSquad(false);
    }
  };

  const handleSquadAddExisting = async () => {
    if (!selectedToAdd) return;
    setSavingSquad(true);
    try {
      const teamId = getSquadTeamId(squadModal.team);
      await fetch(`/api/teams/${teamId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addPlayerIds: [selectedToAdd] }),
      });
      // Sync match embedded players
      const currentPlayers = (squadModal.team === 'A' ? match.teamA.players : match.teamB.players)
        .map((p: any) => (p._id || p).toString());
      if (!currentPlayers.includes(selectedToAdd)) currentPlayers.push(selectedToAdd);
      await syncMatchPlayers(squadModal.team, currentPlayers);
      await fetchMatch();
      const r = await fetch('/api/players');
      setAllPlayers((await r.json()).players || []);
      setSelectedToAdd('');
    } finally {
      setSavingSquad(false);
    }
  };

  const handleSquadAddNew = async () => {
    if (!newPlayerName.trim()) return;
    setSavingSquad(true);
    try {
      const teamId = getSquadTeamId(squadModal.team);
      const res = await fetch(`/api/teams/${teamId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPlayer: { name: newPlayerName.trim(), role: newPlayerRole } }),
      });
      const data = await res.json();
      // Sync match embedded players from updated team
      if (data.team?.players) {
        const updatedIds = data.team.players.map((p: any) => (p._id || p).toString());
        await syncMatchPlayers(squadModal.team, updatedIds);
      }
      await fetchMatch();
      const r = await fetch('/api/players');
      setAllPlayers((await r.json()).players || []);
      setNewPlayerName('');
    } finally {
      setSavingSquad(false);
    }
  };

  const handleSaveOvers = async () => {
    const overs = parseInt(tempOvers);
    if (isNaN(overs) || overs < 1 || overs > 50) {
      setAlertDialog({ isOpen: true, title: 'Invalid Overs', message: 'Overs must be between 1 and 50' });
      return;
    }
    setSavingOvers(true);
    try {
      const res = await fetch(`/api/matches/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overs }),
      });
      if (!res.ok) {
        const data = await res.json();
        setAlertDialog({ isOpen: true, title: 'Error', message: data.error || 'Failed to update overs' });
        return;
      }
      const data = await res.json();
      setMatch(data.match);
      setEditingOvers(false);
    } catch (error) {
      console.error('Error updating overs:', error);
      setAlertDialog({ isOpen: true, title: 'Error', message: 'Failed to update overs' });
    } finally {
      setSavingOvers(false);
    }
  };

  const handleNewMatch = async () => {
    if (!match) return;
    setCreatingMatch(true);
    try {
      // Determine batting/bowling order based on selection
      const teamABatsFirst = newMatchBattingFirst === 'A';
      const body = {
        teamA: {
          id: match.teamA.id || match.teamA._id,
          name: match.teamA.name,
          players: match.teamA.players.map((p: any) => p._id || p),
          captain: match.teamA.captain?._id || match.teamA.captain,
        },
        teamB: {
          id: match.teamB.id || match.teamB._id,
          name: match.teamB.name,
          players: match.teamB.players.map((p: any) => p._id || p),
          captain: match.teamB.captain?._id || match.teamB.captain,
        },
        overs: newMatchOvers ? parseInt(newMatchOvers) : match.overs,
        scoringRules: match.scoringRules,
        bowlerOversLimit: match.bowlerOversLimit,
      };
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to create match');
      const data = await res.json();
      window.location.href = `/scorer/score/${data.match._id}`;
    } catch (e) {
      console.error(e);
      setAlertDialog({ isOpen: true, title: 'Error', message: 'Failed to create new match' });
    } finally {
      setCreatingMatch(false);
    }
  };

  const handleScore = async (eventType: string, runs: number = 0) => {
    if (!currentBatsman || !currentBowler) {
      setAlertDialog({ isOpen: true, title: 'Selection Required', message: 'Please select batsman and bowler' });
      return;
    }
    if (isScoringRef.current) return;
    isScoringRef.current = true;
    setIsScoring(true);

    // Optimistic update — instantly reflect score change in UI
    const prevMatch = matchRef.current;
    setMatch((prev: any) => {
      if (!prev) return prev;
      const inn = { ...prev.innings[prev.currentInnings] };
      const isLegal = !['wide', 'noball', 'deadball'].includes(eventType);
      // Capture over/ball BEFORE incrementing (for timeline entry)
      const ballOver = inn.overs;
      const ballNum = inn.balls + (isLegal ? 1 : 0);
      if (isLegal) {
        if (eventType === 'run') inn.runs += runs;
        else if (eventType === 'wicket') inn.wickets += 1;
        inn.balls += 1;
        if (inn.balls >= 6) { inn.overs += 1; inn.balls = 0; }
      }
      const newBall = { over: ballOver, ball: ballNum, eventType, runs: runs || 0, batsman: currentBatsman, bowler: currentBowler, innings: prev.currentInnings, timestamp: new Date() };
      return {
        ...prev,
        innings: { ...prev.innings, [prev.currentInnings]: inn },
        timeline: [...(prev.timeline || []), newBall],
      };
    });

    try {
      const res = await fetch(`/api/matches/${params.id}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType, runs, batsman: currentBatsman, bowler: currentBowler }),
      });
      const data = await res.json();
      if (!res.ok) { setMatch(prevMatch); return; }

      setMatch(data.match);

      if (data.match.status === 'completed') {
        setCurrentBatsman(''); setCurrentBowler('');
        setTempBatsman(''); setTempBowler('');
      } else {
        const newInnings = data.match.innings[data.match.currentInnings];
        const cb = newInnings.currentBatsman;
        const cbw = newInnings.currentBowler;
        if (cb) { const id = cb._id ? cb._id.toString() : cb.toString(); setCurrentBatsman(id); setTempBatsman(id); }
        else { setCurrentBatsman(''); setTempBatsman(''); }
        if (cbw) { const id = cbw._id ? cbw._id.toString() : cbw.toString(); setCurrentBowler(id); setTempBowler(id); }
        else { setCurrentBowler(''); setTempBowler(''); }
      }
    } catch (error) {
      console.error('Error scoring:', error);
      setMatch(prevMatch);
      fetchMatch();
    } finally {
      isScoringRef.current = false;
      setIsScoring(false);
    }
  };

  const handleUndo = async () => {
    if (!match?.timeline?.length || isScoringRef.current) return;
    isScoringRef.current = true;
    setIsScoring(true);

    // Optimistic: remove last timeline entry and revert score
    const prevMatch = matchRef.current;
    setMatch((prev: any) => {
      if (!prev || !prev.timeline?.length) return prev;
      const last = prev.timeline[prev.timeline.length - 1];
      const inn = { ...prev.innings[last.innings] };
      const isLegal = !['wide', 'noball', 'deadball'].includes(last.eventType);
      if (isLegal) {
        if (last.eventType === 'run') inn.runs -= last.runs;
        else if (last.eventType === 'wicket') inn.wickets -= 1;
        if (inn.balls === 0 && inn.overs > 0) { inn.overs -= 1; inn.balls = 5; }
        else inn.balls = Math.max(0, inn.balls - 1);
      }
      return {
        ...prev,
        innings: { ...prev.innings, [last.innings]: inn },
        timeline: prev.timeline.slice(0, -1),
      };
    });

    try {
      const res = await fetch(`/api/matches/${params.id}/undo`, { method: 'POST' });
      if (!res.ok) { setMatch(prevMatch); return; }
      const data = await res.json();
      setMatch(data.match);
      syncPlayersFromMatch(data.match);
    } catch (error) {
      console.error('Error undoing:', error);
      setMatch(prevMatch);
    } finally {
      isScoringRef.current = false;
      setIsScoring(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg">Loading match...</p>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Match not found</p>
      </div>
    );
  }

  const innings = match.innings[match.currentInnings];
  const battingTeam = match.currentInnings === 'first' ? match.teamA : match.teamB;
  const bowlingTeam = match.currentInnings === 'first' ? match.teamB : match.teamA;

  const currentOverBalls = match.timeline.filter(
    (e: any) => e.innings === match.currentInnings && e.over === innings.overs
  );

  const outPlayers = match.timeline
    .filter((e: any) => e.eventType === 'wicket' && e.innings === match.currentInnings)
    .map((e: any) => {
      const b = e.batsman;
      return b?._id ? b._id.toString() : b?.toString();
    });

  const availableBatsmen = battingTeam.players.filter(
    (p: any) => p?._id && !outPlayers.includes(p._id.toString())
  );

  const legalBallsByBowler = match.timeline
    .filter((e: any) => e.innings === match.currentInnings && ['run', 'dot', 'wicket'].includes(e.eventType))
    .reduce((acc: any, e: any) => {
      const pid = e.bowler?._id ? e.bowler._id.toString() : e.bowler?.toString();
      if (pid) acc[pid] = (acc[pid] || 0) + 1;
      return acc;
    }, {});

  // Find who bowled the previous over (last completed over = innings.overs - 1, but if balls===0 it means we just finished an over)
  const previousOverIndex = innings.balls === 0 && innings.overs > 0 ? innings.overs - 1 : innings.overs - 1;
  const lastOverBowler = (() => {
    if (innings.overs === 0 && innings.balls > 0) return null; // still in first over
    // Find the last legal ball from the previous over
    const prevOverEvents = match.timeline.filter(
      (e: any) =>
        e.innings === match.currentInnings &&
        ['run', 'dot', 'wicket'].includes(e.eventType) &&
        e.over === previousOverIndex
    );
    if (!prevOverEvents.length) return null;
    const last = prevOverEvents[prevOverEvents.length - 1];
    return last.bowler?._id ? last.bowler._id.toString() : last.bowler?.toString();
  })();

  // Max overs per bowler = ceil(totalOvers / numBowlers) capped at 2
  const maxOversPerBowler = 2;

  const availableBowlers = bowlingTeam.players.filter((p: any) => {
    if (!p?._id) return false;
    const pid = p._id.toString();
    const balls = legalBallsByBowler[pid] || 0;
    const oversCompleted = Math.floor(balls / 6);
    // Exclude: quota full OR bowled the previous over (consecutive overs not allowed)
    if (oversCompleted >= maxOversPerBowler) return false;
    if (innings.balls === 0 && pid === lastOverBowler) return false;
    return true;
  });

  const batsmanStats = match.timeline
    .filter((e: any) => e.innings === match.currentInnings && e.batsman)
    .reduce((acc: any, e: any) => {
      const pid = e.batsman?._id ? e.batsman._id.toString() : e.batsman?.toString();
      if (!pid) return acc;
      if (!acc[pid]) acc[pid] = { runs: 0, balls: 0, fours: 0, singles: 0, out: false };
      if (e.eventType === 'run') {
        acc[pid].runs += e.runs;
        acc[pid].balls++;
        if (e.runs === 4) acc[pid].fours++;
        else if (e.runs === 1) acc[pid].singles++;
      } else if (e.eventType === 'dot') {
        acc[pid].balls++;
      } else if (e.eventType === 'wicket') {
        acc[pid].balls++;
        acc[pid].out = true;
      }
      return acc;
    }, {});

  const bowlerStats = match.timeline
    .filter((e: any) => e.innings === match.currentInnings && e.bowler)
    .reduce((acc: any, e: any) => {
      const pid = e.bowler?._id ? e.bowler._id.toString() : e.bowler?.toString();
      if (!pid) return acc;
      if (!acc[pid]) acc[pid] = { runs: 0, wickets: 0, balls: 0, dots: 0 };
      if (e.eventType === 'run') { acc[pid].runs += e.runs; acc[pid].balls++; }
      else if (e.eventType === 'dot') { acc[pid].balls++; acc[pid].dots++; }
      else if (e.eventType === 'wicket') { acc[pid].wickets++; acc[pid].balls++; }
      return acc;
    }, {});

  const rr = (innings.overs > 0 || innings.balls > 0)
    ? (innings.runs / (innings.overs + innings.balls / 6)).toFixed(2)
    : '0.00';

  // 2nd innings chase info
  const isSecondInnings = match.currentInnings === 'second';
  const target = isSecondInnings ? match.innings.first.runs + 1 : 0;
  const runsNeeded = isSecondInnings ? target - innings.runs : 0;
  const totalBalls = match.overs * 6;
  const ballsBowled = innings.overs * 6 + innings.balls;
  const ballsLeft = isSecondInnings ? totalBalls - ballsBowled : 0;
  const reqRR = isSecondInnings && ballsLeft > 0
    ? (runsNeeded / (ballsLeft / 6)).toFixed(2)
    : '0.00';

  // Win message
  const winMessage = (() => {
    if (match.status !== 'completed' || !match.winner) return null;
    if (match.winner === 'Tie') return 'Match Tied!';
    const teamBName = match.teamB.name;
    // Team batting second won — by wickets remaining
    if (match.winner === teamBName) {
      const wicketsLeft = match.teamB.players.length - match.innings.second.wickets;
      return `${match.winner} won by ${wicketsLeft} wicket${wicketsLeft !== 1 ? 's' : ''}`;
    }
    // Team batting first won — by runs
    const runDiff = match.innings.first.runs - match.innings.second.runs;
    return `${match.winner} won by ${runDiff} run${runDiff !== 1 ? 's' : ''}`;
  })();

  // 1st innings stats (for display during 2nd innings)
  const firstInningsTeamA = match.teamA;
  const firstInningsTeamB = match.teamB;
  const firstBattingTeam = match.innings.first.battingTeam
    ? (match.innings.first.battingTeam.toString() === match.teamA._id?.toString() ? match.teamA : match.teamB)
    : match.teamA;
  const firstBowlingTeam = firstBattingTeam._id?.toString() === match.teamA._id?.toString() ? match.teamB : match.teamA;

  const firstBatsmanStats = match.timeline
    .filter((e: any) => e.innings === 'first' && e.batsman)
    .reduce((acc: any, e: any) => {
      const pid = e.batsman?._id ? e.batsman._id.toString() : e.batsman?.toString();
      if (!pid) return acc;
      if (!acc[pid]) acc[pid] = { runs: 0, balls: 0, fours: 0, singles: 0, out: false };
      if (e.eventType === 'run') {
        acc[pid].runs += e.runs; acc[pid].balls++;
        if (e.runs === 4) acc[pid].fours++;
        else if (e.runs === 1) acc[pid].singles++;
      } else if (e.eventType === 'dot') { acc[pid].balls++; }
      else if (e.eventType === 'wicket') { acc[pid].balls++; acc[pid].out = true; }
      return acc;
    }, {});

  const firstBowlerStats = match.timeline
    .filter((e: any) => e.innings === 'first' && e.bowler)
    .reduce((acc: any, e: any) => {
      const pid = e.bowler?._id ? e.bowler._id.toString() : e.bowler?.toString();
      if (!pid) return acc;
      if (!acc[pid]) acc[pid] = { runs: 0, wickets: 0, balls: 0, dots: 0 };
      if (e.eventType === 'run') { acc[pid].runs += e.runs; acc[pid].balls++; }
      else if (e.eventType === 'dot') { acc[pid].balls++; acc[pid].dots++; }
      else if (e.eventType === 'wicket') { acc[pid].wickets++; acc[pid].balls++; }
      return acc;
    }, {});

  return (
    <div className="min-h-screen pb-20">
      <ConfirmDialog
        isOpen={alertDialog.isOpen}
        title={alertDialog.title}
        message={alertDialog.message}
        confirmText="OK"
        onConfirm={() => setAlertDialog({ ...alertDialog, isOpen: false })}
        onCancel={() => setAlertDialog({ ...alertDialog, isOpen: false })}
      />

      {/* New Match Modal */}
      {newMatchModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <h2 className="font-bold text-lg">New Match — Same Teams</h2>
              <button onClick={() => setNewMatchModal(false)} className="p-1.5 rounded-lg hover:bg-[var(--muted)] transition-all">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Overs */}
              <div>
                <label className="block text-sm font-medium mb-1">Overs</label>
                <input type="number" min="1" max="50" value={newMatchOvers}
                  onChange={e => setNewMatchOvers(e.target.value)}
                  className="w-full p-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
              </div>

              {/* Batting first */}
              <div>
                <label className="block text-sm font-medium mb-2">Who bats first?</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['A', 'B'] as const).map(t => (
                    <button key={t} onClick={() => setNewMatchBattingFirst(t)}
                      className={`p-3 rounded-lg font-semibold text-sm border-2 transition-all ${newMatchBattingFirst === t ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]' : 'border-[var(--border)] bg-[var(--muted)]'}`}>
                      {t === 'A' ? match.teamA.name : match.teamB.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toss (optional) */}
              <div>
                <label className="block text-sm font-medium mb-2">Toss (optional)</label>
                <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
                  {/* Coin */}
                  <div
                    key={tossFlipping ? 'flipping' : tossResult ?? 'idle'}
                    className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg select-none ${tossFlipping ? 'coin-flip' : ''} ${
                      !tossResult ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                      tossResult === 'heads' ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                      'bg-gradient-to-br from-slate-400 to-slate-600'
                    }`}
                    style={{ perspective: '600px' }}
                  >
                    {tossFlipping ? '?' : tossResult === 'heads' ? 'H' : tossResult === 'tails' ? 'T' : '?'}
                  </div>

                  {tossResult && !tossFlipping && (
                    <p className="font-bold text-lg capitalize">{tossResult}!</p>
                  )}
                  {!tossResult && !tossFlipping && (
                    <p className="text-sm opacity-50">Tap to flip</p>
                  )}

                  <button
                    onClick={() => {
                      setTossFlipping(true);
                      setTossResult(null);
                      setTimeout(() => {
                        setTossResult(Math.random() < 0.5 ? 'heads' : 'tails');
                        setTossFlipping(false);
                      }, 850);
                    }}
                    disabled={tossFlipping}
                    className="px-5 py-2 rounded-lg text-sm font-semibold bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--border)] transition-all disabled:opacity-50"
                  >
                    {tossFlipping ? 'Flipping...' : tossResult ? 'Flip Again' : 'Flip Coin'}
                  </button>
                </div>
              </div>

              <button onClick={handleNewMatch} disabled={creatingMatch}
                className="w-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white p-3 rounded-lg font-bold hover:opacity-90 transition-all disabled:opacity-50">
                {creatingMatch ? 'Creating...' : 'Start Match'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overs Edit Modal */}
      {editingOvers && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <h2 className="font-bold text-lg">Change Overs</h2>
              <button onClick={() => setEditingOvers(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--muted)] transition-all">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm mb-2 font-medium">Number of Overs (1-50)</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={tempOvers}
                  onChange={(e) => setTempOvers(e.target.value)}
                  className="w-full p-3 bg-[var(--muted)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  placeholder="Enter overs"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleSaveOvers} disabled={savingOvers}
                  className="flex-1 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white p-3 rounded-lg font-semibold hover:opacity-90 transition-all disabled:opacity-50">
                  {savingOvers ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => setEditingOvers(false)} disabled={savingOvers}
                  className="flex-1 bg-[var(--muted)] p-3 rounded-lg font-semibold hover:bg-[var(--border)] transition-all disabled:opacity-50">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Squad Modal */}
      {squadModal.open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <h2 className="font-bold text-lg">Squads</h2>
              <div className="flex items-center gap-2">
                {!squadEditMode
                  ? <button onClick={() => setSquadEditMode(true)} className="text-sm text-[var(--primary)] font-semibold hover:underline">Edit</button>
                  : <button onClick={() => setSquadEditMode(false)} className="text-sm opacity-60 font-semibold hover:underline">Done</button>
                }
                <button onClick={() => setSquadModal({ ...squadModal, open: false })}
                  className="p-1.5 rounded-lg hover:bg-[var(--muted)] transition-all">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Team tabs */}
            <div className="flex border-b border-[var(--border)]">
              {(['A', 'B'] as const).map(t => (
                <button key={t} onClick={() => { setSquadModal({ open: true, team: t }); setSquadEditMode(false); }}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-all ${squadModal.team === t ? 'border-b-2 border-[var(--primary)] text-[var(--primary)]' : 'opacity-60'}`}>
                  {t === 'A' ? match.teamA.name : match.teamB.name}
                </button>
              ))}
            </div>
            <div className="p-4 space-y-2">
              {(squadModal.team === 'A' ? match.teamA.players : match.teamB.players).map((player: any) => (
                <div key={player._id} className="flex items-center justify-between p-3 bg-[var(--muted)] rounded-lg">
                  <div>
                    <p className="font-medium">{player.name}</p>
                    <p className="text-xs opacity-60 capitalize">{player.role}</p>
                  </div>
                  {squadEditMode && (
                    <button onClick={() => handleSquadRemove(player._id.toString())} disabled={savingSquad}
                      className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              {squadEditMode && (() => {
                const teamPlayers = squadModal.team === 'A' ? match.teamA.players : match.teamB.players;
                const available = allPlayers.filter((p: any) => !teamPlayers.some((sp: any) => sp._id?.toString() === p._id?.toString()));
                return (
                  <div className="pt-3 space-y-3 border-t border-[var(--border)]">
                    {available.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold opacity-60 mb-1">Add existing player</p>
                        <div className="flex gap-2">
                          <select value={selectedToAdd} onChange={e => setSelectedToAdd(e.target.value)}
                            className="flex-1 p-2 text-sm bg-[var(--muted)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                            <option value="">Select player</option>
                            {available.map((p: any) => <option key={p._id} value={p._id}>{p.name}</option>)}
                          </select>
                          <button onClick={handleSquadAddExisting} disabled={!selectedToAdd || savingSquad}
                            className="px-3 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-semibold disabled:opacity-50">Add</button>
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold opacity-60 mb-1">Create new player</p>
                      <div className="flex gap-2 mb-2">
                        <input value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} placeholder="Player name"
                          className="flex-1 p-2 text-sm bg-[var(--muted)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
                        <select value={newPlayerRole} onChange={e => setNewPlayerRole(e.target.value)}
                          className="p-2 text-sm bg-[var(--muted)] border border-[var(--border)] rounded-lg focus:outline-none">
                          <option value="allrounder">All-rounder</option>
                          <option value="batsman">Batsman</option>
                          <option value="bowler">Bowler</option>
                        </select>
                      </div>
                      <button onClick={handleSquadAddNew} disabled={!newPlayerName.trim() || savingSquad}
                        className="w-full py-2 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                        {savingSquad ? 'Saving...' : 'Create & Add'}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white sticky top-0 z-10 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-base md:text-xl font-bold truncate">{match.teamA.name} vs {match.teamB.name}</h1>
            <p className="text-sm opacity-90">Scoring Panel</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setTempOvers(match.overs.toString()); setEditingOvers(true); }}
              className="flex-shrink-0 text-xs bg-white/20 hover:bg-white/30 px-2.5 py-1.5 rounded-lg font-semibold transition-all">
              {match.overs} Overs
            </button>
            <button onClick={() => openSquad('A')} className="flex-shrink-0 text-xs bg-white/20 hover:bg-white/30 px-2.5 py-1.5 rounded-lg font-semibold transition-all">
              See Squads
            </button>
          </div>
        </div>
      </div>

      <main className="container mx-auto p-4 max-w-4xl space-y-4">
        {/* Score Header */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg p-4 md:p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold">{battingTeam.name}</h2>
              <p className="text-3xl md:text-4xl font-bold text-[var(--primary)]">
                {innings.runs}/{innings.wickets}
              </p>
              <p className="text-sm opacity-60">Overs: {innings.overs}.{innings.balls}</p>
            </div>
            <div className="text-right">
              <p className="text-xs md:text-sm opacity-60">Run Rate</p>
              <p className="text-xl md:text-2xl font-bold">{rr}</p>
            </div>
          </div>
          {/* 2nd innings chase info OR win message */}
          {isSecondInnings && (
            match.status === 'completed' && winMessage ? (
              <div className="mt-3 pt-3 border-t border-[var(--border)] text-center">
                <p className="text-lg font-bold text-[var(--primary)]">🏆 {winMessage}</p>
              </div>
            ) : (
              <div className="mt-3 pt-3 border-t border-[var(--border)] grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs opacity-60">Target</p>
                  <p className="text-xl font-bold text-[var(--primary)]">{target}</p>
                </div>
                <div>
                  <p className="text-xs opacity-60">Need</p>
                  <p className="text-sm font-bold leading-tight">{runsNeeded > 0 ? `${runsNeeded} runs off ${ballsLeft} balls` : 'Won'}</p>
                </div>
                <div>
                  <p className="text-xs opacity-60">Req. RR</p>
                  <p className="text-xl font-bold">{runsNeeded > 0 ? reqRR : '-'}</p>
                </div>
              </div>
            )
          )}

          {/* Win message for 1st innings completion */}
          {!isSecondInnings && match.status === 'completed' && winMessage && (
            <div className="mt-3 pt-3 border-t border-[var(--border)] text-center">
              <p className="text-lg font-bold text-[var(--primary)]">🏆 {winMessage}</p>
            </div>
          )}

          {/* Ball circles for current over */}
          <div className="flex gap-2 flex-wrap mt-3">
            {currentOverBalls.map((ball: any, idx: number) => (
              <div
                key={`ball-${idx}`}
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                  ball.eventType === 'wicket' ? 'bg-red-500 text-white' :
                  ball.eventType === 'run' && ball.runs >= 4 ? 'bg-green-500 text-white' :
                  ball.eventType === 'dot' ? 'bg-[var(--muted)] border border-[var(--border)]' :
                  ball.eventType === 'wide' ? 'bg-yellow-400 text-black' :
                  ball.eventType === 'noball' ? 'bg-orange-500 text-white' :
                  ball.eventType === 'deadball' ? 'bg-gray-400 text-white' :
                  'bg-[var(--secondary)] text-white'
                }`}
              >
                {ball.eventType === 'wicket' ? 'W' :
                 ball.eventType === 'wide' ? 'Wd' :
                 ball.eventType === 'noball' ? 'Nb' :
                 ball.eventType === 'deadball' ? 'Db' :
                 ball.eventType === 'dot' ? '0' :
                 ball.runs}
              </div>
            ))}
          </div>
        </div>

        {/* Current Players - hide when match is completed */}
        {match.status !== 'completed' && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg p-4 md:p-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold">Current Players</h3>
            {currentBatsman && currentBowler && !editingPlayers && (
              <button
                onClick={() => { setTempBatsman(currentBatsman); setTempBowler(currentBowler); setEditingPlayers(true); }}
                className="text-sm text-[var(--primary)] hover:underline font-semibold"
              >
                Edit
              </button>
            )}
          </div>

          {(!currentBatsman || !currentBowler || editingPlayers) ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1 font-medium">Batsman</label>
                <select
                  value={editingPlayers ? tempBatsman : currentBatsman}
                  onChange={async (e) => {
                    const val = e.target.value;
                    if (editingPlayers) {
                      setTempBatsman(val);
                    } else {
                      setCurrentBatsman(val);
                      setTempBatsman(val);
                      if (currentBowler && val) await handleSavePlayers(val, currentBowler);
                    }
                  }}
                  className="w-full p-2 md:p-3 bg-[var(--muted)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value="">Select Batsman</option>
                  {availableBatsmen.map((player: any) => (
                    <option key={player._id} value={player._id}>{player.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">Bowler</label>
                <select
                  value={editingPlayers ? tempBowler : currentBowler}
                  onChange={async (e) => {
                    const val = e.target.value;
                    if (editingPlayers) {
                      setTempBowler(val);
                    } else {
                      setCurrentBowler(val);
                      setTempBowler(val);
                      if (currentBatsman && val) await handleSavePlayers(currentBatsman, val);
                    }
                  }}
                  className="w-full p-2 md:p-3 bg-[var(--muted)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value="">Select Bowler</option>
                  {availableBowlers.map((player: any) => (
                    <option key={player._id} value={player._id}>{player.name}</option>
                  ))}
                </select>
              </div>
              {editingPlayers ? (
                <div className="flex gap-2">
                  <button onClick={() => handleSavePlayers()} disabled={savingPlayers}
                    className="flex-1 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white p-3 rounded-lg font-semibold hover:opacity-90 transition-all disabled:opacity-50">
                    {savingPlayers ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={handleCancelEdit} disabled={savingPlayers}
                    className="flex-1 bg-[var(--muted)] p-3 rounded-lg font-semibold hover:bg-[var(--border)] transition-all disabled:opacity-50">
                    Cancel
                  </button>
                </div>
              ) : (
                (!currentBatsman || !currentBowler) && (
                  <button onClick={() => handleSavePlayers()} disabled={savingPlayers}
                    className="w-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white p-3 rounded-lg font-semibold hover:opacity-90 transition-all disabled:opacity-50">
                    {savingPlayers ? 'Saving...' : 'Save Players'}
                  </button>
                )
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-[var(--muted)] rounded-lg">
                <span className="text-sm opacity-60">Batsman</span>
                <span className="font-semibold">
                  {battingTeam.players.find((p: any) => p?._id?.toString() === currentBatsman)?.name || 'Select'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[var(--muted)] rounded-lg">
                <span className="text-sm opacity-60">Bowler</span>
                <span className="font-semibold">
                  {bowlingTeam.players.find((p: any) => p?._id?.toString() === currentBowler)?.name || 'Select'}
                </span>
              </div>
            </div>
          )}
        </div>
        )}

        {/* Match Won Banner + Scoring Buttons */}
        {match.status === 'completed' ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg p-4 space-y-3">
            <p className="text-xl font-bold text-center">
              {match.winner === 'Tie' ? 'Match Tied!' : winMessage}
            </p>
            <p className="opacity-60 text-sm text-center">Match has ended</p>
            <button onClick={handleUndo} disabled={!match.timeline?.length || isScoring}
              className="w-full bg-purple-500 text-white p-3 rounded-lg font-bold hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
              Undo Last Ball
            </button>
            <button onClick={() => { setNewMatchBattingFirst('A'); setTossResult(null); setNewMatchOvers(match.overs.toString()); setNewMatchModal(true); }}
              className="w-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white p-3 rounded-lg font-bold hover:opacity-90 transition-all active:scale-95">
              Start New Match (Same Teams)
            </button>
          </div>
        ) : (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg p-4 md:p-6">
            <h3 className="font-bold mb-3">Scoring</h3>
            <div className="grid grid-cols-3 gap-2 md:gap-3 mb-3">
              {[
                { label: `+${match.scoringRules.single}`, action: () => handleScore('run', match.scoringRules.single), cls: 'bg-[var(--secondary)]' },
                { label: `+${match.scoringRules.boundary}`, action: () => handleScore('run', match.scoringRules.boundary), cls: 'bg-[var(--primary)]' },
                { label: 'Wicket', action: () => handleScore('wicket'), cls: 'bg-red-500' },
                { label: 'Dot', action: () => handleScore('dot'), cls: 'bg-gray-400' },
                { label: 'Wide', action: () => handleScore('wide'), cls: 'bg-yellow-500' },
                { label: 'No Ball', action: () => handleScore('noball'), cls: 'bg-orange-500' },
              ].map(({ label, action, cls }) => (
                <button key={label} onClick={action} disabled={isScoring}
                  className={`${cls} text-white p-3 md:p-4 rounded-lg text-lg md:text-xl font-bold hover:opacity-90 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 md:gap-3">
              <button onClick={() => handleScore('deadball')} disabled={isScoring}
                className="bg-gray-600 text-white p-3 rounded-lg font-bold hover:opacity-90 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed">
                Dead Ball
              </button>
              <button onClick={handleUndo} disabled={!match.timeline?.length || isScoring}
                className="bg-purple-500 text-white p-3 rounded-lg font-bold hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                Undo Last Ball
              </button>
            </div>
          </div>
        )}

        {/* Batting Scorecard */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg p-4 md:p-6">
          <h3 className="font-bold mb-4">Batting</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] opacity-60 text-xs">
                  <th className="text-left py-2">Batsman</th>
                  <th className="text-center py-2">R</th>
                  <th className="text-center py-2">B</th>
                  <th className="text-center py-2">1s</th>
                  <th className="text-center py-2">4s</th>
                  <th className="text-center py-2">SR</th>
                </tr>
              </thead>
              <tbody>
                {battingTeam.players
                  .filter((p: any) => p?._id && (batsmanStats[p._id.toString()] || p._id.toString() === currentBatsman))
                  .map((player: any) => {
                    const pid = player._id.toString();
                    const stats = batsmanStats[pid] || { runs: 0, balls: 0, fours: 0, singles: 0, out: false };
                    const isCaptain = battingTeam.captain && (battingTeam.captain._id?.toString() === pid || battingTeam.captain.toString() === pid);
                    const isCurrent = pid === currentBatsman;
                    return (
                      <tr key={pid} className={`border-b border-[var(--border)] ${isCurrent ? 'font-semibold' : ''}`}>
                        <td className="py-2">
                          <span className="flex items-center gap-1">
                            {isCurrent && <span className="w-2 h-2 rounded-full bg-[var(--primary)] inline-block flex-shrink-0"></span>}
                            {player.name}{isCaptain ? ' (c)' : ''}
                            {stats.out && <span className="text-red-500 ml-1 text-xs">out</span>}
                          </span>
                        </td>
                        <td className="text-center">{stats.runs}</td>
                        <td className="text-center">{stats.balls}</td>
                        <td className="text-center">{stats.singles}</td>
                        <td className="text-center">{stats.fours}</td>
                        <td className="text-center">{stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(1) : '-'}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bowling Scorecard */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg p-4 md:p-6">
          <h3 className="font-bold mb-4">Bowling</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] opacity-60 text-xs">
                  <th className="text-left py-2">Bowler</th>
                  <th className="text-center py-2">O</th>
                  <th className="text-center py-2">R</th>
                  <th className="text-center py-2">Dots</th>
                  <th className="text-center py-2">W</th>
                  <th className="text-center py-2">Econ</th>
                </tr>
              </thead>
              <tbody>
                {bowlingTeam.players
                  .filter((p: any) => p?._id && (bowlerStats[p._id.toString()] || p._id.toString() === currentBowler))
                  .map((player: any) => {
                    const pid = player._id.toString();
                    const stats = bowlerStats[pid] || { runs: 0, wickets: 0, balls: 0, dots: 0 };
                    const overs = Math.floor(stats.balls / 6);
                    const balls = stats.balls % 6;
                    const isCaptain = bowlingTeam.captain && (bowlingTeam.captain._id?.toString() === pid || bowlingTeam.captain.toString() === pid);
                    const isCurrent = pid === currentBowler;
                    return (
                      <tr key={pid} className={`border-b border-[var(--border)] ${isCurrent ? 'font-semibold' : ''}`}>
                        <td className="py-2">
                          <span className="flex items-center gap-1">
                            {isCurrent && <span className="w-2 h-2 rounded-full bg-red-500 inline-block flex-shrink-0"></span>}
                            {player.name}{isCaptain ? ' (c)' : ''}
                          </span>
                        </td>
                        <td className="text-center">{overs}.{balls}</td>
                        <td className="text-center">{stats.runs}</td>
                        <td className="text-center">{stats.dots}</td>
                        <td className="text-center">{stats.wickets}</td>
                        <td className="text-center">{stats.balls > 0 ? (stats.runs / (stats.balls / 6)).toFixed(2) : '-'}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 1st innings scorecard (shown during 2nd innings) */}
        {isSecondInnings && (
          <>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg p-4 md:p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold">1st Innings — {firstBattingTeam.name}</h3>
                <div className="text-right">
                  <p className="text-xl font-bold text-[var(--primary)]">
                    {match.innings.first.runs}/{match.innings.first.wickets}
                  </p>
                  <p className="text-xs opacity-60">({match.innings.first.overs}.{match.innings.first.balls} ov)</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] opacity-60 text-xs">
                      <th className="text-left py-2">Batsman</th>
                      <th className="text-center py-2">R</th>
                      <th className="text-center py-2">B</th>
                      <th className="text-center py-2">1s</th>
                      <th className="text-center py-2">4s</th>
                      <th className="text-center py-2">SR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {firstBattingTeam.players
                      .filter((p: any) => p?._id && firstBatsmanStats[p._id.toString()])
                      .map((player: any) => {
                        const pid = player._id.toString();
                        const stats = firstBatsmanStats[pid];
                        const isCaptain = firstBattingTeam.captain && (firstBattingTeam.captain._id?.toString() === pid || firstBattingTeam.captain.toString() === pid);
                        return (
                          <tr key={pid} className="border-b border-[var(--border)]">
                            <td className="py-2">{player.name}{isCaptain ? ' (c)' : ''}{stats.out && <span className="text-red-500 ml-1 text-xs">out</span>}</td>
                            <td className="text-center">{stats.runs}</td>
                            <td className="text-center">{stats.balls}</td>
                            <td className="text-center">{stats.singles}</td>
                            <td className="text-center">{stats.fours}</td>
                            <td className="text-center">{stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(1) : '-'}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg p-4 md:p-6">
              <h3 className="font-bold mb-4">1st Innings — {firstBowlingTeam.name} Bowling</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] opacity-60 text-xs">
                      <th className="text-left py-2">Bowler</th>
                      <th className="text-center py-2">O</th>
                      <th className="text-center py-2">R</th>
                      <th className="text-center py-2">Dots</th>
                      <th className="text-center py-2">W</th>
                      <th className="text-center py-2">Econ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {firstBowlingTeam.players
                      .filter((p: any) => p?._id && firstBowlerStats[p._id.toString()])
                      .map((player: any) => {
                        const pid = player._id.toString();
                        const stats = firstBowlerStats[pid];
                        const overs = Math.floor(stats.balls / 6);
                        const balls = stats.balls % 6;
                        const isCaptain = firstBowlingTeam.captain && (firstBowlingTeam.captain._id?.toString() === pid || firstBowlingTeam.captain.toString() === pid);
                        return (
                          <tr key={pid} className="border-b border-[var(--border)]">
                            <td className="py-2">{player.name}{isCaptain ? ' (c)' : ''}</td>
                            <td className="text-center">{overs}.{balls}</td>
                            <td className="text-center">{stats.runs}</td>
                            <td className="text-center">{stats.dots}</td>
                            <td className="text-center">{stats.wickets}</td>
                            <td className="text-center">{stats.balls > 0 ? (stats.runs / (stats.balls / 6)).toFixed(2) : '-'}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
