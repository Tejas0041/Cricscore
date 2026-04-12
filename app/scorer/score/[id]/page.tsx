'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import ConfirmDialog from '@/app/components/ConfirmDialog';
import BackButton from '@/app/components/BackButton';

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
  const [selectedCommon, setSelectedCommon] = useState('');
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
  const [motm, setMotm] = useState<any>(null);
  const [motmLoading, setMotmLoading] = useState(false);
  const [superOverModal, setSuperOverModal] = useState(false);
  const [superOverBattingFirst, setSuperOverBattingFirst] = useState<'A' | 'B'>('A');
  const [superOverOvers, setSuperOverOvers] = useState('1');
  const [startingSuperOver, setStartingSuperOver] = useState(false);
  const [soCurrentBatsman, setSoCurrentBatsman] = useState('');
  const [soCurrentBowler, setSoCurrentBowler] = useState('');
  const [soTempBatsman, setSoTempBatsman] = useState('');
  const [soTempBowler, setSoTempBowler] = useState('');
  const [soEditingPlayers, setSoEditingPlayers] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [endMatchModal, setEndMatchModal] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState('');
  const [endingMatch, setEndingMatch] = useState(false);
  const [switchTeamsModal, setSwitchTeamsModal] = useState(false);
  const [switchingTeams, setSwitchingTeams] = useState(false);
  const matchRef = useRef<any>(null);
  const isScoringRef = useRef(false);

  const handleSwitchTeams = async () => {
    if (!match) return;
    setSwitchingTeams(true);
    try {
      const currentInnings = match.innings[match.currentInnings];
      
      // Get current team names with fallback logic
      let currentBattingTeam = currentInnings.battingTeam;
      let currentBowlingTeam = currentInnings.bowlingTeam;
      
      // If team names are missing, derive them from match data
      if (!currentBattingTeam || !currentBowlingTeam) {
        if (match.currentInnings === 'first') {
          // For first innings, use toss decision to determine teams
          if (match.tossWinner && match.tossDecision) {
            currentBattingTeam = match.tossDecision === 'bat' ? match.tossWinner : 
                                (match.tossWinner === match.teamA.name ? match.teamB.name : match.teamA.name);
            currentBowlingTeam = currentBattingTeam === match.teamA.name ? match.teamB.name : match.teamA.name;
          } else {
            // Default: teamA bats first
            currentBattingTeam = match.teamA.name;
            currentBowlingTeam = match.teamB.name;
          }
        } else {
          // For second innings, swap from first innings
          const firstBatting = match.innings.first.battingTeam;
          const firstBowling = match.innings.first.bowlingTeam;
          if (firstBatting && firstBowling) {
            currentBattingTeam = firstBowling;
            currentBowlingTeam = firstBatting;
          } else {
            // Last resort: swap teamA/teamB
            currentBattingTeam = match.teamB.name;
            currentBowlingTeam = match.teamA.name;
          }
        }
      }
      
      // Swap the teams
      const newBattingTeam = currentBowlingTeam;
      const newBowlingTeam = currentBattingTeam;
      
      const res = await fetch(`/api/matches/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [`innings.${match.currentInnings}.battingTeam`]: newBattingTeam,
          [`innings.${match.currentInnings}.bowlingTeam`]: newBowlingTeam,
        }),
      });
      
      if (!res.ok) throw new Error('Failed to switch teams');
      await fetchMatch();
      setSwitchTeamsModal(false);
      setCurrentBatsman('');
      setCurrentBowler('');
      setTempBatsman('');
      setTempBowler('');
    } catch (e) {
      console.error('Switch teams error:', e);
      setAlertDialog({ isOpen: true, title: 'Error', message: 'Failed to switch teams' });
    } finally {
      setSwitchingTeams(false);
    }
  };

  const handleEndMatchManual = async () => {
    if (!selectedWinner) return;
    setEndingMatch(true);
    try {
      const res = await fetch(`/api/matches/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'completed', 
          winner: selectedWinner,
          matchEndReason: 'manual' 
        }),
      });
      if (!res.ok) throw new Error('Failed to end match');
      await fetchMatch();
      setEndMatchModal(false);
    } catch (e) {
      setAlertDialog({ isOpen: true, title: 'Error', message: 'Failed to end match' });
    } finally {
      setEndingMatch(false);
    }
  };

  // Keep ref in sync for double-click prevention
  useEffect(() => { matchRef.current = match; }, [match]);

  useEffect(() => {
    fetchMatch();
    fetch('/api/admin/settings').then(r => r.json()).then(d => {
      if (d.settings) setSettings(d.settings);
    });
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
    if (!m?.innings || !m.currentInnings) return;
    const innings = m.innings[m.currentInnings];
    if (!innings) return;
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
      if (!res.ok) {
        console.error('Error fetching match:', res.status);
        return;
      }
      const data = await res.json();
      if (!data.match) return;
      setMatch(data.match);
      if (data.match?.motm?.playerName) setMotm(data.match.motm);
      syncPlayersFromMatch(data.match);
    } catch (error) {
      console.error('Error fetching match:', error);
    } finally {
      setLoading(false);
    }
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

  // Poll for MOTM after match completes (auto-fire may take a few seconds)
  // Don't poll for plain ties — user must choose super over or manually trigger
  useEffect(() => {
    const isTie = match?.winner === 'Tie' && !match?.superOver?.active && !match?.superOver?.completed;
    if (!match || match.status !== 'completed' || motm || isTie) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/matches/${params.id}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.match?.motm?.playerName) {
        setMotm(data.match.motm);
        clearInterval(interval);
      }
    }, 2000);
    const timeout = setTimeout(() => clearInterval(interval), 30000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [match?.status, match?.winner, match?.superOver?.completed, motm]);

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

      // If removed player was common, remove from commonPlayers list
      // (they remain in the other team as a permanent member)
      const commonIds = (match.commonPlayers || []).map((p: any) => (p._id || p).toString());
      if (commonIds.includes(pid)) {
        const newCommon = commonIds.filter((id: string) => id !== pid);
        await fetch(`/api/matches/${params.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commonPlayers: newCommon }),
        });
      }

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

  const handleAddCommon = async () => {
    if (!selectedCommon) return;
    setSavingSquad(true);
    try {
      const otherTeam = squadModal.team === 'A' ? 'B' : 'A';
      // Add to both teams' squads
      for (const team of [squadModal.team, otherTeam] as const) {
        const teamId = getSquadTeamId(team);
        await fetch(`/api/teams/${teamId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ addPlayerIds: [selectedCommon] }),
        });
        const currentPlayers = (team === 'A' ? match.teamA.players : match.teamB.players)
          .map((p: any) => (p._id || p).toString());
        if (!currentPlayers.includes(selectedCommon)) currentPlayers.push(selectedCommon);
        await syncMatchPlayers(team, currentPlayers);
      }
      // Add to commonPlayers list
      const existingCommon = (match.commonPlayers || []).map((p: any) => (p._id || p).toString());
      if (!existingCommon.includes(selectedCommon)) {
        await fetch(`/api/matches/${params.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commonPlayers: [...existingCommon, selectedCommon] }),
        });
      }
      await fetchMatch();
      setSelectedCommon('');
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
      // If previous match was a tie with no super over, fire MOTM for it in background
      if (match.winner === 'Tie' && !match.superOver?.completed) {
        fetch(`/api/matches/${params.id}/motm`, { method: 'POST' }).catch(() => {});
      }

      // FIXED: Keep teamA as teamA and teamB as teamB, just set innings correctly
      const battingTeamName = newMatchBattingFirst === 'A' ? match.teamA.name : match.teamB.name;
      const bowlingTeamName = newMatchBattingFirst === 'A' ? match.teamB.name : match.teamA.name;
      
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
        commonPlayers: (match.commonPlayers || []).map((p: any) => p._id || p),
        innings: {
          first: { battingTeam: battingTeamName, bowlingTeam: bowlingTeamName },
          second: { battingTeam: bowlingTeamName, bowlingTeam: battingTeamName },
        },
      };
      
      console.log('New Match Debug:', {
        newMatchBattingFirst,
        battingTeamName,
        bowlingTeamName,
        teamAName: match.teamA.name,
        teamBName: match.teamB.name
      });
      
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

  const handleStartSuperOver = async () => {
    if (startingSuperOver) return;
    setStartingSuperOver(true);
    try {
      const batFirst = superOverBattingFirst === 'A' ? match.teamA : match.teamB;
      const batSecond = superOverBattingFirst === 'A' ? match.teamB : match.teamA;
      const soData = {
        active: true,
        completed: false,
        winner: '',
        overs: parseInt(superOverOvers) || 1,
        currentInnings: 'first',
        innings: {
          first: { battingTeam: batFirst.name, bowlingTeam: batSecond.name, runs: 0, wickets: 0, overs: 0, balls: 0, completed: false },
          second: { battingTeam: batSecond.name, bowlingTeam: batFirst.name, runs: 0, wickets: 0, overs: 0, balls: 0, completed: false },
        },
      };
      const res = await fetch(`/api/matches/${params.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ superOver: soData }),
      });
      if (!res.ok) throw new Error('Failed to start super over');
      const data = await res.json();
      setMatch(data.match);
      setSuperOverModal(false);
      setSoCurrentBatsman(''); setSoCurrentBowler('');
    } catch (e) {
      setAlertDialog({ isOpen: true, title: 'Error', message: 'Failed to start super over' });
    } finally {
      setStartingSuperOver(false);
    }
  };

  const handleSuperOverScore = async (eventType: string, runs: number = 0) => {
    if (!soCurrentBatsman || !soCurrentBowler) {
      setAlertDialog({ isOpen: true, title: 'Selection Required', message: 'Please select batsman and bowler' });
      return;
    }
    if (isScoringRef.current) return;
    isScoringRef.current = true;
    setIsScoring(true);
    try {
      const res = await fetch(`/api/matches/${params.id}/score`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType, runs, batsman: soCurrentBatsman, bowler: soCurrentBowler, superOver: true }),
      });
      const data = await res.json();
      if (!res.ok) return;
      setMatch(data.match);
      const so = data.match.superOver;
      if (so?.completed) {
        setSoCurrentBatsman(''); setSoCurrentBowler('');
      } else {
        const inn = so?.innings?.[so?.currentInnings];
        const cb = inn?.currentBatsman;
        const cbw = inn?.currentBowler;
        if (cb) setSoCurrentBatsman(cb._id ? cb._id.toString() : cb.toString());
        else setSoCurrentBatsman('');
        if (cbw) setSoCurrentBowler(cbw._id ? cbw._id.toString() : cbw.toString());
        else setSoCurrentBowler('');
      }
    } finally {
      isScoringRef.current = false;
      setIsScoring(false);
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
  const battingTeamName = match.innings[match.currentInnings].battingTeam;
  const battingTeam = match.teamA.name === battingTeamName ? match.teamA : match.teamB;
  const bowlingTeam = match.teamA.name === battingTeamName ? match.teamB : match.teamA;

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

  const allPlayerNameMap: Record<string, string> = {};
  [...match.teamA.players, ...match.teamB.players].forEach((p: any) => {
    if (p?._id) allPlayerNameMap[p._id.toString()] = p.nickname ? `${p.name} (${p.nickname})` : p.name;
  });

  const batsmanStats = match.timeline
    .filter((e: any) => e.innings === match.currentInnings && e.batsman)
    .reduce((acc: any, e: any) => {
      const pid = e.batsman?._id ? e.batsman._id.toString() : e.batsman?.toString();
      if (!pid) return acc;
      if (!acc[pid]) acc[pid] = { runs: 0, balls: 0, fours: 0, singles: 0, out: false, dismissedBy: null };
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
        const wid = e.bowler?._id ? e.bowler._id.toString() : e.bowler?.toString();
        acc[pid].dismissedBy = wid || null;
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

    // Manual end logic
    if (match.matchEndReason === 'manual') return `${match.winner} won`;

    // Super over win
    if (match.superOver?.completed) {
      const soWinner = match.superOver.winner;
      if (soWinner && soWinner !== 'Tie') return `Match tied · ${soWinner} won the Super Over`;
      return 'Match tied · Super Over tied!';
    }

    const secondBattingTeam = match.innings.second.battingTeam === match.teamB.name ? match.teamB : match.teamA;
    // Team batting second won — by wickets remaining
    if (match.winner === secondBattingTeam.name) {
      const wicketsLeft = secondBattingTeam.players.length - match.innings.second.wickets;
      return `${match.winner} won by ${wicketsLeft} wicket${wicketsLeft !== 1 ? 's' : ''}`;
    }
    // Team batting first won — by runs
    const runDiff = match.innings.first.runs - match.innings.second.runs;
    return `${match.winner} won by ${runDiff} run${runDiff !== 1 ? 's' : ''}`;
  })();

  // 1st innings stats (for display during 2nd innings)
  const firstInningsTeamA = match.teamA;
  const firstInningsTeamB = match.teamB;
  const firstBattingTeam = match.innings.first.battingTeam === match.teamA.name ? match.teamA : match.teamB;
  const firstBowlingTeam = match.innings.first.battingTeam === match.teamA.name ? match.teamB : match.teamA;

  const firstBatsmanStats = match.timeline
    .filter((e: any) => e.innings === 'first' && e.batsman)
    .reduce((acc: any, e: any) => {
      const pid = e.batsman?._id ? e.batsman._id.toString() : e.batsman?.toString();
      if (!pid) return acc;
      if (!acc[pid]) acc[pid] = { runs: 0, balls: 0, fours: 0, singles: 0, out: false, dismissedBy: null };
      if (e.eventType === 'run') {
        acc[pid].runs += e.runs; acc[pid].balls++;
        if (e.runs === 4) acc[pid].fours++;
        else if (e.runs === 1) acc[pid].singles++;
      } else if (e.eventType === 'dot') { acc[pid].balls++; }
      else if (e.eventType === 'wicket') {
        acc[pid].balls++; acc[pid].out = true;
        const wid = e.bowler?._id ? e.bowler._id.toString() : e.bowler?.toString();
        acc[pid].dismissedBy = wid || null;
      }
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

      {/* Super Over Setup Modal */}
      {superOverModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <h2 className="font-bold text-lg">⚡ Super Over</h2>
              <button onClick={() => setSuperOverModal(false)} className="p-1.5 rounded-lg hover:bg-[var(--muted)] transition-all">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Overs</label>
                <input type="number" min="1" max="5" value={superOverOvers} onChange={e => setSuperOverOvers(e.target.value)}
                  className="w-full p-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Who bats first in Super Over?</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['A', 'B'] as const).map(t => (
                    <button key={t} onClick={() => setSuperOverBattingFirst(t)}
                      className={`p-3 rounded-lg font-semibold text-sm border-2 transition-all ${superOverBattingFirst === t ? 'border-purple-500 bg-purple-500/10 text-purple-500' : 'border-[var(--border)] bg-[var(--muted)]'}`}>
                      {t === 'A' ? match.teamA.name : match.teamB.name}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleStartSuperOver} disabled={startingSuperOver}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white p-3 rounded-lg font-bold hover:opacity-90 transition-all disabled:opacity-50">
                {startingSuperOver ? 'Starting...' : 'Start Super Over'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Match Modal */}
      {newMatchModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl w-full max-w-sm shadow-2xl">
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
          <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl w-full max-w-sm shadow-2xl">
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
          <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl">
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
              {(squadModal.team === 'A' ? match.teamA.players : match.teamB.players).map((player: any) => {
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
                    {squadEditMode && (
                      <button onClick={() => handleSquadRemove(pid!)} disabled={savingSquad}
                        className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
              {squadEditMode && (() => {
                const teamPlayers = squadModal.team === 'A' ? match.teamA.players : match.teamB.players;
                const allTeamIds = new Set([
                  ...match.teamA.players.map((p: any) => p._id?.toString()),
                  ...match.teamB.players.map((p: any) => p._id?.toString()),
                ]);
                const available = allPlayers.filter((p: any) => !teamPlayers.some((sp: any) => sp._id?.toString() === p._id?.toString()));
                // Players not in either team — candidates to add as common
                const commonCandidates = allPlayers.filter((p: any) => {
                  const pid = p._id?.toString();
                  const alreadyCommon = (match.commonPlayers || []).some((cp: any) => (cp._id || cp).toString() === pid);
                  const inAnyTeam = match.teamA.players.some((sp: any) => sp._id?.toString() === pid) ||
                                    match.teamB.players.some((sp: any) => sp._id?.toString() === pid);
                  return !alreadyCommon && !inAnyTeam;
                });
                return (
                  <div className="pt-3 space-y-3 border-t border-[var(--border)]">
                    {available.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold opacity-60 mb-1">Add existing player</p>
                        <div className="flex gap-2">
                          <select value={selectedToAdd} onChange={e => setSelectedToAdd(e.target.value)}
                            className="flex-1 p-2 text-sm bg-[var(--muted)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                            <option value="">Select player</option>
                            {available.map((p: any) => <option key={p._id} value={p._id}>{p.name}{p.nickname ? ` (${p.nickname})` : ''}</option>)}
                          </select>
                          <button onClick={handleSquadAddExisting} disabled={!selectedToAdd || savingSquad}
                            className="px-3 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-semibold disabled:opacity-50">Add</button>
                        </div>
                      </div>
                    )}
                    {commonCandidates.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-purple-500 mb-1">Add common player (from remaining players)</p>
                        <div className="flex gap-2">
                          <select value={selectedCommon} onChange={e => setSelectedCommon(e.target.value)}
                            className="flex-1 p-2 text-sm bg-[var(--muted)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                            <option value="">Select player</option>
                            {commonCandidates.map((p: any) => <option key={p._id} value={p._id}>{p.name}{p.nickname ? ` (${p.nickname})` : ''}</option>)}
                          </select>
                          <button onClick={handleAddCommon} disabled={!selectedCommon || savingSquad}
                            className="px-3 py-2 bg-purple-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50">Common</button>
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

      {/* Manual End Match Modal */}
      {endMatchModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-scale-in">
            <h2 className="text-xl font-bold mb-2">Manual Match Conclusion</h2>
            <p className="text-sm opacity-60 mb-6 font-medium">Select the winning team for this match. This will instantly conclude the match without calculating run/wicket margins.</p>
            <div className="grid grid-cols-1 gap-3">
              {(['A', 'B'] as const).map(t => {
                const teamName = t === 'A' ? match.teamA.name : match.teamB.name;
                return (
                  <button
                    key={t}
                    onClick={() => setSelectedWinner(teamName)}
                    className={`w-full py-4 rounded-xl font-bold text-lg border-2 transition-all ${selectedWinner === teamName ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]' : 'border-[var(--border)] hover:bg-[var(--muted)] opacity-80'}`}
                  >
                    {teamName}
                  </button>
                );
              })}
              <button
                onClick={() => setSelectedWinner('Tie')}
                className={`w-full py-4 rounded-xl font-bold text-lg border-2 transition-all ${selectedWinner === 'Tie' ? 'border-[var(--secondary)] bg-[var(--secondary)]/10 text-[var(--secondary)]' : 'border-[var(--border)] hover:bg-[var(--muted)] opacity-80'}`}
              >
                Tie
              </button>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={handleEndMatchManual}
                disabled={endingMatch || !selectedWinner}
                className="flex-1 py-4 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white rounded-xl font-bold shadow-xl shadow-primary/20 disabled:opacity-50 active:scale-95 transition-all"
              >
                {endingMatch ? 'Ending...' : 'End Match'}
              </button>
              <button
                onClick={() => { setEndMatchModal(false); setSelectedWinner(''); }}
                disabled={endingMatch}
                className="px-6 py-4 bg-[var(--muted)] rounded-xl font-bold hover:bg-[var(--border)] transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Switch Teams Modal */}
      {switchTeamsModal && match && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-scale-in">
            <h2 className="text-xl font-bold mb-2">Switch Batting/Bowling Teams</h2>
            <p className="text-sm opacity-60 mb-4 font-medium">This will swap which team is batting and which is bowling for the current innings.</p>
            
            {(() => {
              const currentInnings = match.innings?.[match.currentInnings];
              
              if (!currentInnings) {
                return (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
                    <p className="text-red-500 text-sm font-semibold">Error: Cannot load innings data</p>
                    <p className="text-xs opacity-60 mt-1">Current innings: {match.currentInnings}</p>
                    <p className="text-xs opacity-60">Available: {Object.keys(match.innings || {}).join(', ')}</p>
                  </div>
                );
              }
              
              // Fallback: Calculate team names from match data if missing in innings
              let currentBattingTeam = currentInnings.battingTeam;
              let currentBowlingTeam = currentInnings.bowlingTeam;
              
              // If team names are missing, derive them from first innings or match data
              if (!currentBattingTeam || !currentBowlingTeam) {
                if (match.currentInnings === 'first') {
                  // For first innings, use toss decision to determine teams
                  if (match.tossWinner && match.tossDecision) {
                    currentBattingTeam = match.tossDecision === 'bat' ? match.tossWinner : 
                                        (match.tossWinner === match.teamA.name ? match.teamB.name : match.teamA.name);
                    currentBowlingTeam = currentBattingTeam === match.teamA.name ? match.teamB.name : match.teamA.name;
                  } else {
                    // Default: teamA bats first
                    currentBattingTeam = match.teamA.name;
                    currentBowlingTeam = match.teamB.name;
                  }
                } else {
                  // For second innings, swap from first innings
                  const firstBatting = match.innings.first.battingTeam;
                  const firstBowling = match.innings.first.bowlingTeam;
                  if (firstBatting && firstBowling) {
                    currentBattingTeam = firstBowling;
                    currentBowlingTeam = firstBatting;
                  } else {
                    // Last resort: swap teamA/teamB
                    currentBattingTeam = match.teamB.name;
                    currentBowlingTeam = match.teamA.name;
                  }
                }
              }
              
              return (
                <>
                  <div className="bg-[var(--muted)] rounded-xl p-4 mb-6 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm opacity-60">Currently Batting:</span>
                      <span className="font-bold text-[var(--primary)]">{currentBattingTeam || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm opacity-60">Currently Bowling:</span>
                      <span className="font-bold text-red-500">{currentBowlingTeam || 'Unknown'}</span>
                    </div>
                    <div className="h-px bg-[var(--border)] my-2" />
                    <div className="flex justify-between items-center">
                      <span className="text-sm opacity-60">Will become Batting:</span>
                      <span className="font-bold text-[var(--primary)]">{currentBowlingTeam || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm opacity-60">Will become Bowling:</span>
                      <span className="font-bold text-red-500">{currentBattingTeam || 'Unknown'}</span>
                    </div>
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-6">
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 font-semibold">⚠️ Warning: This will clear current batsman and bowler selections. You'll need to select them again after switching.</p>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={handleSwitchTeams}
                      disabled={switchingTeams || !currentBattingTeam || !currentBowlingTeam}
                      className="flex-1 py-4 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white rounded-xl font-bold shadow-xl shadow-primary/20 disabled:opacity-50 active:scale-95 transition-all"
                    >
                      {switchingTeams ? 'Switching...' : 'Switch Teams'}
                    </button>
                    <button
                      onClick={() => setSwitchTeamsModal(false)}
                      disabled={switchingTeams}
                      className="px-6 py-4 bg-[var(--muted)] rounded-xl font-bold hover:bg-[var(--border)] transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white sticky top-0 z-10 shadow-lg">
        <div className="container mx-auto px-4 py-3 flex items-start justify-between gap-x-3">
          <div className="flex items-start gap-3 min-w-0">
            <BackButton href="/scorer/all-matches" iconOnly />
            <div className="min-w-0">
              <h1 className="text-base md:text-xl font-bold truncate">{match.teamA.name} vs {match.teamB.name}</h1>
              <p className="text-sm opacity-90">Scoring Panel</p>
              <div className="flex items-center gap-2 mt-1.5">
                <button onClick={() => { setTempOvers(match.overs.toString()); setEditingOvers(true); }}
                  className="text-xs bg-white/20 hover:bg-white/30 px-2.5 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap">
                  {match.overs} Overs
                </button>
                <button onClick={() => openSquad('A')} className="text-xs bg-white/20 hover:bg-white/30 px-2.5 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap">
                  See Squads
                </button>
              </div>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="p-2.5 rounded-2xl hover:bg-white/20 transition-all active:scale-95"
              aria-label="Match Options"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>
            {showOptions && (
              <div className="absolute right-0 mt-2 w-56 bg-[var(--background)] border border-[var(--border)] rounded-xl shadow-2xl py-1 z-20 animate-scale-in">
                <button
                  onClick={() => { setSwitchTeamsModal(true); setShowOptions(false); }}
                  className="w-full px-4 py-2.5 text-left text-sm font-semibold hover:bg-[var(--muted)] text-[var(--primary)] flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Switch Bat/Bowl Teams
                </button>
                <button
                  onClick={() => { setEndMatchModal(true); setShowOptions(false); }}
                  className="w-full px-4 py-2.5 text-left text-sm font-semibold hover:bg-[var(--muted)] text-red-500 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  End Match Early
                </button>
              </div>
            )}
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
              <p className="text-sm opacity-60">Overs: {innings.overs}.{innings.balls} ({match.overs})</p>
            </div>
            <div className="text-right">
              <p className="text-xs md:text-sm opacity-60">Run Rate</p>
              <p className="text-xl md:text-2xl font-bold">{rr}</p>
            </div>
          </div>
          {/* Win message or Innings Info */}
          {match.status === 'completed' && winMessage ? (
            <div className="mt-3 pt-4 border-t border-[var(--border)] text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-lg font-black tracking-tight">
                <span>🏆</span>
                <span>{winMessage.toUpperCase()}</span>
              </div>
            </div>
          ) : isSecondInnings ? (
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
          ) : null}

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
                    <option key={player._id} value={player._id}>{player.name}{player.nickname ? ` (${player.nickname})` : ''}</option>
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
                    <option key={player._id} value={player._id}>{player.name}{player.nickname ? ` (${player.nickname})` : ''}</option>
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
                  {battingTeam.players.find((p: any) => p?._id?.toString() === currentBatsman)
                    ? (() => { const p = battingTeam.players.find((p: any) => p?._id?.toString() === currentBatsman); return `${p.name}${p.nickname ? ` (${p.nickname})` : ''}`; })()
                    : 'Select'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[var(--muted)] rounded-lg">
                <span className="text-sm opacity-60">Bowler</span>
                <span className="font-semibold">
                  {bowlingTeam.players.find((p: any) => p?._id?.toString() === currentBowler)
                    ? (() => { const p = bowlingTeam.players.find((p: any) => p?._id?.toString() === currentBowler); return `${p.name}${p.nickname ? ` (${p.nickname})` : ''}`; })()
                    : 'Select'}
                </span>
              </div>
            </div>
          )}
        </div>
        )}

        {/* Match Won Banner + Scoring Buttons */}
        {match.status === 'completed' ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg p-4 space-y-3">
            {/* Result message */}
            <p className="text-xl font-bold text-center">
              {winMessage ?? (match.winner === 'Tie' ? 'Match Tied!' : `🏆 ${match.winner}`)}
            </p>
            <p className="opacity-60 text-sm text-center">Match has ended</p>

            {/* Super Over scorecard */}
            {match.superOver?.completed && (() => {
              const so = match.superOver;
              const soFirst = so.innings.first;
              const soSecond = so.innings.second;
              const soEvents = match.timeline.filter((e: any) => e.innings === 'so_first' || e.innings === 'so_second');
              const soBatStats: any = {};
              const soBowlStats: any = {};
              for (const e of soEvents) {
                const bId = e.batsman?._id ? e.batsman._id.toString() : e.batsman?.toString();
                const wId = e.bowler?._id ? e.bowler._id.toString() : e.bowler?.toString();
                if (bId) {
                  if (!soBatStats[bId]) soBatStats[bId] = { runs: 0, balls: 0, fours: 0 };
                  if (e.eventType === 'run') { soBatStats[bId].runs += e.runs; soBatStats[bId].balls++; if (e.runs === 4) soBatStats[bId].fours++; }
                  else if (['dot','wicket'].includes(e.eventType)) soBatStats[bId].balls++;
                }
                if (wId) {
                  if (!soBowlStats[wId]) soBowlStats[wId] = { runs: 0, balls: 0, wickets: 0 };
                  if (e.eventType === 'run') { soBowlStats[wId].runs += e.runs; soBowlStats[wId].balls++; }
                  else if (e.eventType === 'dot') soBowlStats[wId].balls++;
                  else if (e.eventType === 'wicket') { soBowlStats[wId].wickets++; soBowlStats[wId].balls++; }
                }
              }
              const allSoPlayers = [...match.teamA.players, ...match.teamB.players];
              const getName = (p: any) => p?.name || '?';
              const findPlayer = (id: string) => allSoPlayers.find((p: any) => p._id?.toString() === id);
              return (
                <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-purple-500/10 border-b border-[var(--border)]">
                    <p className="text-xs font-bold text-purple-500 uppercase tracking-wide">Super Over</p>
                  </div>
                  <div className="p-3 space-y-3">
                    {[{ inn: soFirst, key: 'so_first' }, { inn: soSecond, key: 'so_second' }].map(({ inn, key }) => {
                      const batters = allSoPlayers.filter((p: any) => soBatStats[p._id?.toString()]);
                      const bowlers = allSoPlayers.filter((p: any) => soBowlStats[p._id?.toString()]);
                      return (
                        <div key={key}>
                          <p className="text-xs font-semibold opacity-60 mb-1">{inn.battingTeam} — {inn.runs}/{inn.wickets} ({inn.overs}.{inn.balls}ov)</p>
                          {batters.filter((p: any) => {
                            const pid = p._id?.toString();
                            const s = soBatStats[pid];
                            const inThisInnings = soEvents.some((e: any) => e.innings === key && (e.batsman?._id?.toString() === pid || e.batsman?.toString() === pid));
                            return s && inThisInnings;
                          }).map((p: any) => {
                            const pid = p._id?.toString();
                            const s = soBatStats[pid];
                            return <p key={pid} className="text-xs">{getName(p)}: {s.runs}({s.balls}b){s.fours > 0 ? ` · ${s.fours}(4s)` : ''}</p>;
                          })}
                          {bowlers.filter((p: any) => {
                            const pid = p._id?.toString();
                            const inThisInnings = soEvents.some((e: any) => e.innings === key && (e.bowler?._id?.toString() === pid || e.bowler?.toString() === pid));
                            return inThisInnings;
                          }).map((p: any) => {
                            const pid = p._id?.toString();
                            const s = soBowlStats[pid];
                            return <p key={pid} className="text-xs opacity-60">{getName(p)}: {s.wickets}W/{s.runs}R</p>;
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* MOTM — only show if not a plain tie waiting for super over */}
            {(() => {
              const plainTie = match.winner === 'Tie' && !match.superOver?.completed;
              if (plainTie) return null;
              if (motm) {
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
                  <div className="p-3 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/40 rounded-xl">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold uppercase tracking-wide text-yellow-600">Man of the Match</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--muted)] opacity-70 capitalize">{motm.provider}</span>
                        <button onClick={findMotm} disabled={motmLoading} className="text-xs px-2 py-0.5 rounded-full bg-[var(--muted)] hover:bg-[var(--border)] transition-colors disabled:opacity-50">
                          {motmLoading ? '...' : 'Re-find'}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                      <p className="font-bold">🏅 {motm.playerName}</p>
                      <p className="text-xs opacity-50">{motm.team}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs flex-wrap mb-1.5">
                      {batBalls > 0 && <span className="px-2 py-0.5 rounded-full bg-green-500/15 text-green-600 font-semibold">Bat {batRuns}{batOut ? '' : '*'}({batBalls}) SR {batSR}{batFours > 0 ? ` · ${batFours}(4s)` : ''}</span>}
                      {bowlBalls > 0 && <span className="px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-600 font-semibold">Bowl {bowlWickets}/{bowlRuns} ({bowlOv}ov) Econ {bowlEcon}</span>}
                    </div>
                    <p className="text-xs opacity-70 leading-relaxed">{motm.reason}</p>
                  </div>
                );
              }
              if (motmLoading) return (
                <div className="flex items-center justify-center gap-2 text-sm opacity-60 py-1">
                  <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                  Finding Man of the Match...
                </div>
              );
              return (
                <div className="flex items-center justify-center gap-2 text-xs opacity-50 py-1 animate-pulse">
                  <div className="w-3 h-3 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                  Calculating MOTM...
                </div>
              );
            })()}

            {/* Tie actions — super over or manual MOTM */}
            {match.winner === 'Tie' && !match.superOver?.active && !match.superOver?.completed && (
              <div className="space-y-2">
                <button onClick={findMotm} disabled={motmLoading}
                  className="w-full border border-yellow-500 text-yellow-500 p-2.5 rounded-lg font-semibold text-sm hover:bg-yellow-500/10 transition-all disabled:opacity-50">
                  {motmLoading ? 'Finding MOTM...' : '🏅 Find Man of the Match'}
                </button>
              </div>
            )}

            {/* Super over scoring panel */}
            {match.superOver?.active && !match.superOver?.completed && (() => {
              const so = match.superOver;
              const soInn = so.innings[so.currentInnings];
              const battingTeamName = soInn.battingTeam;
              const bowlingTeamName = soInn.bowlingTeam;
              const battingTeamPlayers = battingTeamName === match.teamA.name ? match.teamA.players : match.teamB.players;
              const bowlingTeamPlayers = bowlingTeamName === match.teamA.name ? match.teamA.players : match.teamB.players;
              const soOutPlayers = match.timeline
                .filter((e: any) => e.eventType === 'wicket' && e.innings === ('so_' + so.currentInnings))
                .map((e: any) => e.batsman?._id ? e.batsman._id.toString() : e.batsman?.toString());
              const soAvailBatsmen = battingTeamPlayers.filter((p: any) => p?._id && !soOutPlayers.includes(p._id.toString()));
              const soAvailBowlers = bowlingTeamPlayers.filter((p: any) => p?._id);
              const soCurrentOverBalls = match.timeline.filter((e: any) => e.innings === ('so_' + so.currentInnings) && e.over === soInn.overs);
              return (
                <div className="border border-purple-500/40 rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-purple-500/10 border-b border-purple-500/30 flex items-center justify-between">
                    <p className="text-xs font-bold text-purple-500 uppercase tracking-wide">⚡ Super Over — {battingTeamName} batting</p>
                    <p className="text-sm font-bold">{soInn.runs}/{soInn.wickets} ({soInn.overs}.{soInn.balls})</p>
                  </div>
                  <div className="p-3 space-y-3">
                    {soCurrentOverBalls.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap">
                        {soCurrentOverBalls.map((ball: any, idx: number) => (
                          <div key={idx} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${ball.eventType === 'wicket' ? 'bg-red-500 text-white' : ball.eventType === 'run' && ball.runs >= 4 ? 'bg-green-500 text-white' : ball.eventType === 'dot' ? 'bg-[var(--muted)] border border-[var(--border)]' : ball.eventType === 'wide' ? 'bg-yellow-400 text-black' : ball.eventType === 'noball' ? 'bg-orange-500 text-white' : 'bg-[var(--secondary)] text-white'}`}>
                            {ball.eventType === 'wicket' ? 'W' : ball.eventType === 'wide' ? 'Wd' : ball.eventType === 'noball' ? 'Nb' : ball.eventType === 'dot' ? '0' : ball.runs}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium mb-1 opacity-60">Batsman</label>
                        <select value={soCurrentBatsman} onChange={e => setSoCurrentBatsman(e.target.value)}
                          className="w-full p-2 text-sm bg-[var(--muted)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                          <option value="">Select</option>
                          {soAvailBatsmen.map((p: any) => <option key={p._id} value={p._id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 opacity-60">Bowler</label>
                        <select value={soCurrentBowler} onChange={e => setSoCurrentBowler(e.target.value)}
                          className="w-full p-2 text-sm bg-[var(--muted)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                          <option value="">Select</option>
                          {soAvailBowlers.map((p: any) => <option key={p._id} value={p._id}>{p.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {(() => {
                        const sr = settings?.scoringRules ?? match.scoringRules;
                        const eb = settings?.enabledButtons ?? {};
                        return [
                          { key: 'single',   label: `+${sr?.single ?? 1}`,   action: () => handleSuperOverScore('run', sr?.single ?? 1),   cls: 'bg-[var(--secondary)]' },
                          { key: 'boundary', label: `+${sr?.boundary ?? 4}`, action: () => handleSuperOverScore('run', sr?.boundary ?? 4), cls: 'bg-[var(--primary)]' },
                          { key: 'six',      label: `+${sr?.six ?? 6}`,      action: () => handleSuperOverScore('run', sr?.six ?? 6),      cls: 'bg-pink-500' },
                          { key: 'wicket',   label: 'Wicket',                 action: () => handleSuperOverScore('wicket'),                 cls: 'bg-red-500' },
                          { key: 'dot',      label: 'Dot',                    action: () => handleSuperOverScore('dot'),                    cls: 'bg-gray-400' },
                          { key: 'wide',     label: 'Wide',                   action: () => handleSuperOverScore('wide'),                   cls: 'bg-yellow-500' },
                          { key: 'noball',   label: 'No Ball',                action: () => handleSuperOverScore('noball'),                 cls: 'bg-orange-500' },
                        ].filter(({ key }) => eb[key] !== false)
                         .map(({ label, action, cls }) => (
                          <button key={label} onClick={action} disabled={isScoring || !soCurrentBatsman || !soCurrentBowler}
                            className={`${cls} text-white p-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition-all active:scale-95 disabled:opacity-50`}>
                            {label}
                          </button>
                        ));
                      })()}
                    </div>
                    {isScoring && <span className="text-xs font-semibold text-green-500 animate-pulse">Saving...</span>}
                  </div>
                </div>
              );
            })()}

            {/* Super Over button — shown below MOTM for ties */}
            {match.winner === 'Tie' && !match.superOver?.active && !match.superOver?.completed && (
              <button onClick={() => setSuperOverModal(true)}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white p-3 rounded-lg font-bold hover:opacity-90 transition-all active:scale-95">
                ⚡ Super Over
              </button>
            )}

            {(!match.superOver?.active || match.superOver?.completed) && (
              <button onClick={() => { setNewMatchBattingFirst('A'); setTossResult(null); setNewMatchOvers(match.overs.toString()); setNewMatchModal(true); }}
                className="w-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white p-3 rounded-lg font-bold hover:opacity-90 transition-all active:scale-95">
                Start New Match (Same Teams)
              </button>
            )}

            <div className="pt-1">
              <button onClick={handleUndo} disabled={!match.timeline?.length || isScoring}
                className="w-full bg-purple-500 text-white p-3 rounded-lg font-bold hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                Undo Last Ball
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg p-4 md:p-6">
            <div className="flex items-center gap-2 mb-3">
                <h3 className="font-bold">Scoring</h3>
                {isScoring && <span className="text-xs font-semibold text-green-500 animate-pulse">Saving...</span>}
              </div>
            <div className="grid grid-cols-3 gap-2 md:gap-3 mb-3">
              {(() => {
                const sr = settings?.scoringRules ?? match.scoringRules;
                const eb = settings?.enabledButtons ?? {};
                const sixEnabled = eb.six !== false;
                // When +6 is enabled, move noball to bottom row to keep 3-col grid clean
                const topButtons = [
                  { key: 'single',   label: `+${sr?.single ?? 1}`,   action: () => handleScore('run', sr?.single ?? 1),   cls: 'bg-[var(--secondary)]' },
                  { key: 'boundary', label: `+${sr?.boundary ?? 4}`, action: () => handleScore('run', sr?.boundary ?? 4), cls: 'bg-[var(--primary)]' },
                  { key: 'six',      label: `+${sr?.six ?? 6}`,      action: () => handleScore('run', sr?.six ?? 6),      cls: 'bg-pink-500' },
                  { key: 'wicket',   label: 'Wicket',                 action: () => handleScore('wicket'),                 cls: 'bg-red-500' },
                  { key: 'dot',      label: 'Dot',                    action: () => handleScore('dot'),                    cls: 'bg-gray-400' },
                  { key: 'wide',     label: 'Wide',                   action: () => handleScore('wide'),                   cls: 'bg-yellow-500' },
                  ...(sixEnabled ? [] : [{ key: 'noball', label: 'No Ball', action: () => handleScore('noball'), cls: 'bg-orange-500' }]),
                ].filter(({ key }) => eb[key] !== false);
                return topButtons.map(({ label, action, cls }) => (
                  <button key={label} onClick={action} disabled={isScoring}
                    className={`${cls} text-white p-3 md:p-4 rounded-lg text-base md:text-lg font-bold hover:opacity-90 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed`}>
                    {label}
                  </button>
                ));
              })()}
            </div>
            {/* Bottom row: Dead Ball / No Ball (when +6 on) / Undo */}
            <div className="grid gap-2 md:gap-3" style={{ gridTemplateColumns: (() => {
              const eb = settings?.enabledButtons ?? {};
              const sixEnabled = eb.six !== false;
              const showNoball = sixEnabled && eb.noball !== false;
              const showDead = eb.deadball !== false;
              const cols = [showDead, showNoball, true].filter(Boolean).length;
              return `repeat(${cols}, 1fr)`;
            })() }}>
              {(settings?.enabledButtons?.deadball ?? true) && (
                <button onClick={() => handleScore('deadball')} disabled={isScoring}
                  className="bg-gray-600 text-white p-3 rounded-lg font-bold hover:opacity-90 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed">
                  Dead Ball
                </button>
              )}
              {(settings?.enabledButtons?.six ?? true) && (settings?.enabledButtons?.noball ?? true) && (
                <button onClick={() => handleScore('noball')} disabled={isScoring}
                  className="bg-orange-500 text-white p-3 rounded-lg font-bold hover:opacity-90 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed">
                  No Ball
                </button>
              )}
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
                            {player.name}{player.nickname ? ` (${player.nickname})` : ''}{isCaptain ? ' (c)' : ''}
                            {stats.out && <span className="text-red-500 ml-1 text-xs">b. {stats.dismissedBy ? (allPlayerNameMap[stats.dismissedBy]?.split(' (')[0] || 'out') : 'out'}</span>}
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
                            {player.name}{player.nickname ? ` (${player.nickname})` : ''}{isCaptain ? ' (c)' : ''}
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
                    {(() => {
                      // Recompute stats directly here to ensure we have the data
                      const localBatsmanStats: any = {};
                      match.timeline
                        .filter((e: any) => e.innings === 'first' && e.batsman)
                        .forEach((e: any) => {
                          const pid = e.batsman?._id ? e.batsman._id.toString() : e.batsman?.toString();
                          if (!pid) return;
                          if (!localBatsmanStats[pid]) {
                            localBatsmanStats[pid] = { runs: 0, balls: 0, fours: 0, singles: 0, out: false, dismissedBy: null };
                          }
                          if (e.eventType === 'run') {
                            localBatsmanStats[pid].runs += e.runs;
                            localBatsmanStats[pid].balls++;
                            if (e.runs === 4) localBatsmanStats[pid].fours++;
                            else if (e.runs === 1) localBatsmanStats[pid].singles++;
                          } else if (e.eventType === 'dot') {
                            localBatsmanStats[pid].balls++;
                          } else if (e.eventType === 'wicket') {
                            localBatsmanStats[pid].balls++;
                            localBatsmanStats[pid].out = true;
                            const wid = e.bowler?._id ? e.bowler._id.toString() : e.bowler?.toString();
                            localBatsmanStats[pid].dismissedBy = wid || null;
                          }
                        });
                      
                      // Show players who actually batted in 1st innings
                      return firstBattingTeam.players
                        .filter((p: any) => p?._id && localBatsmanStats[p._id.toString()])
                        .map((player: any) => {
                          const pid = player._id.toString();
                          const stats = localBatsmanStats[pid];
                          const isCaptain = firstBattingTeam.captain && (firstBattingTeam.captain._id?.toString() === pid || firstBattingTeam.captain.toString() === pid);
                          return (
                            <tr key={pid} className="border-b border-[var(--border)]">
                              <td className="py-2">{player.name}{player.nickname ? ` (${player.nickname})` : ''}{isCaptain ? ' (c)' : ''}{stats.out && <span className="text-red-500 ml-1 text-xs">out</span>}</td>
                              <td className="text-center">{stats.runs}</td>
                              <td className="text-center">{stats.balls}</td>
                              <td className="text-center">{stats.singles}</td>
                              <td className="text-center">{stats.fours}</td>
                              <td className="text-center">{stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(1) : '-'}</td>
                            </tr>
                          );
                        });
                    })()}
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
                            <td className="py-2">{player.name}{player.nickname ? ` (${player.nickname})` : ''}{isCaptain ? ' (c)' : ''}</td>
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
