'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import BackButton from '@/app/components/BackButton';

type Tab = 'matches' | 'points' | 'stats' | 'squads';

export default function TournamentPage() {
  const params = useParams();
  const [tournament, setTournament] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [points, setPoints] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('matches');
  const [loading, setLoading] = useState(true);
  const [statCategory, setStatCategory] = useState<'batting' | 'bowling' | 'teams' | 'motm' | 'captain' | 'wins'>('batting');
  const [battingMetric, setBattingMetric] = useState<'runs' | 'strikeRate' | 'average' | 'highestScore' | 'fours'>('runs');
  const [bowlingMetric, setBowlingMetric] = useState<'wickets' | 'economy' | 'strikeRate' | 'bestFigures'>('wickets');
  const [winSubCategory, setWinSubCategory] = useState<'batting' | 'bowling'>('batting');
  const [winBattingMetric, setWinBattingMetric] = useState<'runs' | 'strikeRate' | 'average' | 'highestScore'>('runs');
  const [winBowlingMetric, setWinBowlingMetric] = useState<'wickets' | 'economy' | 'strikeRate' | 'bestFigures'>('wickets');

  useEffect(() => {
    Promise.all([
      fetch(`/api/tournaments/${params.id}`).then(r => r.json()),
      fetch(`/api/tournaments/${params.id}/points`).then(r => r.json()),
      fetch(`/api/tournaments/${params.id}/stats`).then(r => r.json()),
    ]).then(([tData, pData, sData]) => {
      setTournament(tData.tournament);
      setMatches(tData.matches || []);
      setPoints(pData.points || []);
      setStats(sData);
      setLoading(false);
    });
  }, []);

  const winMessage = (match: any) => {
    if (!match.winner) return null;
    if (match.winner === 'Tie') return 'Match Tied';
    const secondBattingTeamName = match.innings?.second?.battingTeam;
    if (match.winner === secondBattingTeamName) {
      const secondTeam = match.winner === match.teamB.name ? match.teamB : match.teamA;
      const w = secondTeam.players.length - match.innings.second.wickets;
      return `${match.winner} won by ${w} wicket${w !== 1 ? 's' : ''}`;
    }
    const r = (match.innings?.first?.runs ?? 0) - (match.innings?.second?.runs ?? 0);
    return `${match.winner} won by ${r} run${r !== 1 ? 's' : ''}`;
  };

  const battingData = (() => {
    if (!stats?.battingStats) return [];
    return [...stats.battingStats].filter((p: any) => {
      if (battingMetric === 'runs') return p.runs > 0;
      if (battingMetric === 'highestScore') return p.highestScore > 0;
      if (battingMetric === 'fours') return p.fours > 0;
      if (battingMetric === 'strikeRate') return p.wickets > 0 || p.innings > 0;
      return p.runs > 0 || p.balls > 0;
    }).sort((a: any, b: any) => {
      if (battingMetric === 'runs') return b.runs - a.runs;
      if (battingMetric === 'strikeRate') return b.strikeRate - a.strikeRate;
      if (battingMetric === 'average') return b.average - a.average;
      if (battingMetric === 'highestScore') return b.highestScore - a.highestScore;
      if (battingMetric === 'fours') return b.fours - a.fours;
      return 0;
    });
  })();

  const bowlingData = (() => {
    if (!stats?.bowlingStats) return [];
    return [...stats.bowlingStats].filter((p: any) => {
      if (bowlingMetric === 'wickets') return p.wickets > 0;
      if (bowlingMetric === 'bestFigures') return p.bestFigures?.wickets > 0;
      if (bowlingMetric === 'strikeRate') return p.wickets > 0 && p.balls > 0;
      return p.balls > 0;
    }).sort((a: any, b: any) => {
      if (bowlingMetric === 'wickets') return b.wickets - a.wickets;
      if (bowlingMetric === 'economy') return a.economy - b.economy;
      if (bowlingMetric === 'strikeRate') return a.bowlingStrikeRate - b.bowlingStrikeRate;
      if (bowlingMetric === 'bestFigures') { if (b.bestFigures.wickets !== a.bestFigures.wickets) return b.bestFigures.wickets - a.bestFigures.wickets; return a.bestFigures.runs - b.bestFigures.runs; }
      return 0;
    });
  })();

  const winBattingData = (() => {
    if (!stats?.winBattingStats) return [];
    return [...stats.winBattingStats].filter((p: any) => p.runs > 0 || p.innings > 0)
      .sort((a: any, b: any) => {
        if (winBattingMetric === 'runs') return b.runs - a.runs;
        if (winBattingMetric === 'strikeRate') return b.strikeRate - a.strikeRate;
        if (winBattingMetric === 'average') return b.average - a.average;
        if (winBattingMetric === 'highestScore') return b.highestScore - a.highestScore;
        return 0;
      });
  })();

  const winBowlingData = (() => {
    if (!stats?.winBowlingStats) return [];
    return [...stats.winBowlingStats].filter((p: any) => {
      if (winBowlingMetric === 'wickets') return p.wickets > 0;
      if (winBowlingMetric === 'bestFigures') return p.bestFigures?.wickets > 0;
      if (winBowlingMetric === 'strikeRate') return p.wickets > 0;
      return p.balls > 0;
    }).sort((a: any, b: any) => {
      if (winBowlingMetric === 'wickets') return b.wickets - a.wickets;
      if (winBowlingMetric === 'economy') return a.economy - b.economy;
      if (winBowlingMetric === 'strikeRate') return a.bowlingStrikeRate - b.bowlingStrikeRate;
      if (winBowlingMetric === 'bestFigures') { if (b.bestFigures.wickets !== a.bestFigures.wickets) return b.bestFigures.wickets - a.bestFigures.wickets; return a.bestFigures.runs - b.bestFigures.runs; }
      return 0;
    });
  })();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!tournament) return <div className="min-h-screen flex items-center justify-center">Tournament not found</div>;

  const liveMatches = matches.filter(m => m.status === 'live');
  const upcomingMatches = matches.filter(m => m.status === 'upcoming');
  const completedMatches = matches.filter(m => m.status === 'completed');

  return (
    <div className="min-h-screen pb-16">
      {/* Header */}
      <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white px-4 py-8">
        <div className="container mx-auto max-w-3xl">
          <BackButton href="/" />
          <h1 className="text-3xl font-bold mt-3">🏆 {tournament.name}</h1>
          <p className="opacity-80 text-sm mt-1">
            {tournament.overs} overs · {tournament.teams?.length} teams · {tournament.dates?.join(', ')}
          </p>
          {liveMatches.length > 0 && (
            <div className="mt-3 flex items-center gap-2 text-sm font-semibold">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
              </span>
              {liveMatches.length} match{liveMatches.length > 1 ? 'es' : ''} live
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-16 z-10 bg-[var(--background)] border-b border-[var(--border)]">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="flex overflow-x-auto">
            {(['matches', 'points', 'stats', 'squads'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 min-w-fit py-3.5 text-sm font-semibold capitalize transition-all border-b-2 whitespace-nowrap px-2 ${tab === t ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent opacity-60'}`}>
                {t === 'points' ? 'Points Table' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-5 max-w-3xl">

        {/* MATCHES TAB */}
        {tab === 'matches' && (
          <div className="space-y-5">
            {liveMatches.length > 0 && (
              <section>
                <h2 className="text-xs font-black uppercase tracking-widest opacity-50 mb-3">Live</h2>
                <div className="space-y-3">
                  {liveMatches.map(match => (
                    <Link key={match._id} href={`/match/${match._id}`}>
                      <div className="glass-card rounded-2xl overflow-hidden border border-red-500/30">
                        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border-b border-red-500/20">
                          <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" /></span>
                          <span className="text-xs font-bold text-red-500">LIVE</span>
                          <span className="text-xs opacity-50 ml-auto capitalize">{match.matchType || 'League'}</span>
                        </div>
                        <div className="px-4 py-3 space-y-2">
                          <div className="flex justify-between text-sm"><span className="font-semibold">{match.teamA.name}</span><span className="font-bold">{match.innings?.first?.runs}/{match.innings?.first?.wickets} <span className="opacity-50 text-xs">({match.innings?.first?.overs}.{match.innings?.first?.balls})</span></span></div>
                          <div className="flex justify-between text-sm"><span className="font-semibold">{match.teamB.name}</span><span className="font-bold">{match.innings?.second?.runs}/{match.innings?.second?.wickets} <span className="opacity-50 text-xs">({match.innings?.second?.overs}.{match.innings?.second?.balls})</span></span></div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {upcomingMatches.length > 0 && (
              <section>
                <h2 className="text-xs font-black uppercase tracking-widest opacity-50 mb-3">Upcoming</h2>
                <div className="space-y-2">
                  {upcomingMatches.map(match => (
                    <div key={match._id} className="glass-card rounded-xl px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{match.teamA.name} vs {match.teamB.name}</p>
                        <p className="text-xs opacity-50 capitalize">{match.matchType || 'League'}{match.scheduledDate ? ` · ${match.scheduledDate}` : ''}</p>
                      </div>
                      <span className="text-xs opacity-40 font-semibold">Soon</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {completedMatches.length > 0 && (
              <section>
                <h2 className="text-xs font-black uppercase tracking-widest opacity-50 mb-3">Results</h2>
                <div className="space-y-3">
                  {completedMatches.map(match => {
                    const wMsg = winMessage(match);
                    return (
                      <Link key={match._id} href={`/match/${match._id}`}>
                        <div className="glass-card rounded-xl overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-[var(--muted)]/50">
                            <span className="text-xs opacity-50 capitalize">{match.matchType || 'League'}{match.scheduledDate ? ` · ${match.scheduledDate}` : ''}</span>
                            <span className="text-xs font-semibold text-green-600">Done</span>
                          </div>
                          <div className="px-4 py-3 space-y-1.5">
                            <div className="flex justify-between text-sm"><span className="font-semibold">{match.teamA.name}</span><span className="font-bold">{match.innings?.first?.runs}/{match.innings?.first?.wickets}</span></div>
                            <div className="flex justify-between text-sm"><span className="font-semibold">{match.teamB.name}</span><span className="font-bold">{match.innings?.second?.runs}/{match.innings?.second?.wickets}</span></div>
                            {wMsg && <p className="text-xs font-semibold text-[var(--primary)] pt-1">{wMsg}</p>}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {matches.length === 0 && (
              <div className="text-center py-16 opacity-50">
                <p className="text-4xl mb-3">🏏</p>
                <p>No matches scheduled yet</p>
              </div>
            )}
          </div>
        )}

        {/* POINTS TABLE TAB */}
        {tab === 'points' && (
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--muted)]/50">
              <p className="text-xs font-black uppercase tracking-widest opacity-50">Points Table</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-xs opacity-50">
                    <th className="text-left px-4 py-3">#</th>
                    <th className="text-left px-2 py-3">Team</th>
                    <th className="text-center px-2 py-3">P</th>
                    <th className="text-center px-2 py-3">W</th>
                    <th className="text-center px-2 py-3">L</th>
                    <th className="text-center px-2 py-3">T</th>
                    <th className="text-center px-2 py-3">Pts</th>
                    <th className="text-center px-2 py-3">NRR</th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((row, i) => (
                    <tr key={row.name} className={`border-b border-[var(--border)] ${i === 0 ? 'bg-[var(--primary)]/5' : ''}`}>
                      <td className="px-4 py-3 font-bold opacity-50">{i + 1}</td>
                      <td className="px-2 py-3 font-semibold">{row.name}</td>
                      <td className="text-center px-2 py-3">{row.played}</td>
                      <td className="text-center px-2 py-3 text-green-500 font-semibold">{row.won}</td>
                      <td className="text-center px-2 py-3 text-red-500">{row.lost}</td>
                      <td className="text-center px-2 py-3">{row.tied}</td>
                      <td className="text-center px-2 py-3 font-bold text-[var(--primary)]">{row.points}</td>
                      <td className={`text-center px-2 py-3 font-semibold text-xs ${row.nrr >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {row.nrr >= 0 ? '+' : ''}{row.nrr.toFixed(3)}
                      </td>
                    </tr>
                  ))}
                  {points.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-10 opacity-50">No completed matches yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-[var(--border)]">
              <p className="text-xs opacity-40">NRR = Net Run Rate. Sorted by Points → NRR → Wins. Win = 2 pts, Tie = 1 pt.</p>
            </div>
          </div>
        )}

        {/* SQUADS TAB */}
        {tab === 'squads' && (
          <div className="space-y-4">
            {tournament.teams?.length === 0 && (
              <p className="text-center py-16 opacity-50 text-sm">No teams in this tournament</p>
            )}
            {tournament.teams?.map((team: any) => (
              <div key={team.name} className="glass-card rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--muted)]/50 flex items-center justify-between">
                  <p className="font-bold text-base">{team.name}</p>
                  <span className="text-xs opacity-50">{team.players?.length || 0} players</span>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {(team.players || []).length === 0 && (
                    <p className="text-center py-6 opacity-40 text-sm">No players</p>
                  )}
                  {(team.players || []).map((p: any, i: number) => {
                    const pid = p._id?.toString() || p.toString();
                    const cap = team.captain;
                    const capId = cap?._id?.toString() || cap?.toString();
                    const isCap = capId && capId === pid;
                    return (
                      <div key={pid} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-full bg-[var(--muted)] flex items-center justify-center text-xs font-bold opacity-60">{i + 1}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm">{p.name}{p.nickname ? ` (${p.nickname})` : ''}</p>
                              {isCap && <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-bold">C</span>}
                            </div>
                            <p className="text-xs opacity-40 capitalize">{p.role}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* STATS TAB */}
        {tab === 'stats' && (
          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-4 space-y-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-semibold opacity-60 uppercase tracking-wide mb-1.5">Category</label>
                <select value={statCategory} onChange={e => setStatCategory(e.target.value as any)}
                  className="ui-input text-[var(--foreground)] w-full">
                  <option value="batting">Batting</option>
                  <option value="bowling">Bowling</option>
                  <option value="teams">Teams</option>
                  <option value="motm">MOTM</option>
                  <option value="captain">Captain's Record</option>
                  <option value="wins">Winning Impact</option>
                </select>
              </div>

              {/* Sub-metric selectors */}
              {statCategory === 'batting' && (
                <div>
                  <label className="block text-xs font-semibold opacity-60 uppercase tracking-wide mb-1.5">Batting Metric</label>
                  <select value={battingMetric} onChange={e => setBattingMetric(e.target.value as any)} className="ui-input text-[var(--foreground)] w-full">
                    <option value="runs">Runs</option>
                    <option value="highestScore">Highest Score</option>
                    <option value="fours">4s</option>
                    <option value="strikeRate">Strike Rate</option>
                    <option value="average">Average</option>
                  </select>
                </div>
              )}
              {statCategory === 'bowling' && (
                <div>
                  <label className="block text-xs font-semibold opacity-60 uppercase tracking-wide mb-1.5">Bowling Metric</label>
                  <select value={bowlingMetric} onChange={e => setBowlingMetric(e.target.value as any)} className="ui-input text-[var(--foreground)] w-full">
                    <option value="wickets">Wickets</option>
                    <option value="bestFigures">Best Figures</option>
                    <option value="economy">Economy</option>
                    <option value="strikeRate">Strike Rate</option>
                  </select>
                </div>
              )}
              {statCategory === 'wins' && (
                <div>
                  <label className="block text-xs font-semibold opacity-60 uppercase tracking-wide mb-1.5">Discipline</label>
                  <select value={winSubCategory} onChange={e => setWinSubCategory(e.target.value as any)} className="ui-input text-[var(--foreground)] w-full">
                    <option value="batting">Batting in Wins</option>
                    <option value="bowling">Bowling in Wins</option>
                  </select>
                </div>
              )}
              {statCategory === 'wins' && winSubCategory === 'batting' && (
                <div>
                  <label className="block text-xs font-semibold opacity-60 uppercase tracking-wide mb-1.5">Metric</label>
                  <select value={winBattingMetric} onChange={e => setWinBattingMetric(e.target.value as any)} className="ui-input text-[var(--foreground)] w-full">
                    <option value="runs">Most Runs</option>
                    <option value="highestScore">Highest Score</option>
                    <option value="strikeRate">Strike Rate</option>
                    <option value="average">Average</option>
                  </select>
                </div>
              )}
              {statCategory === 'wins' && winSubCategory === 'bowling' && (
                <div>
                  <label className="block text-xs font-semibold opacity-60 uppercase tracking-wide mb-1.5">Metric</label>
                  <select value={winBowlingMetric} onChange={e => setWinBowlingMetric(e.target.value as any)} className="ui-input text-[var(--foreground)] w-full">
                    <option value="wickets">Most Wickets</option>
                    <option value="economy">Economy</option>
                    <option value="strikeRate">Strike Rate</option>
                    <option value="bestFigures">Best Figures</option>
                  </select>
                </div>
              )}
            </div>

            {/* Data */}
            <div className="space-y-2">
              {/* Batting */}
              {statCategory === 'batting' && battingData.map((p: any, i: number) => (
                <div key={p._id} className="glass-card flex items-center justify-between p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white ${i === 0 ? 'bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)]' : 'bg-[var(--muted)]'}`} style={i > 0 ? { color: 'var(--foreground)' } : {}}>{i + 1}</div>
                    <div>
                      <p className="font-bold text-sm">{p.name}{p.nickname ? ` (${p.nickname})` : ''}</p>
                      <p className="text-xs opacity-50">{p.innings} inn · {p.balls} balls</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-[var(--primary)]">
                      {battingMetric === 'runs' && p.runs}
                      {battingMetric === 'highestScore' && p.highestScore}
                      {battingMetric === 'fours' && p.fours}
                      {battingMetric === 'strikeRate' && p.strikeRate.toFixed(1)}
                      {battingMetric === 'average' && p.average.toFixed(1)}
                    </p>
                    <p className="text-xs opacity-50">{battingMetric === 'runs' ? 'runs' : battingMetric === 'highestScore' ? 'HS' : battingMetric === 'fours' ? '4s' : battingMetric === 'strikeRate' ? 'SR' : 'Avg'}</p>
                  </div>
                </div>
              ))}
              {statCategory === 'batting' && battingData.length === 0 && <p className="text-center py-10 opacity-50 text-sm">No batting data yet</p>}

              {/* Bowling */}
              {statCategory === 'bowling' && bowlingData.map((p: any, i: number) => (
                <div key={p._id} className="glass-card flex items-center justify-between p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white ${i === 0 ? 'bg-gradient-to-br from-red-500 to-orange-500' : 'bg-[var(--muted)]'}`} style={i > 0 ? { color: 'var(--foreground)' } : {}}>{i + 1}</div>
                    <div>
                      <p className="font-bold text-sm">{p.name}{p.nickname ? ` (${p.nickname})` : ''}</p>
                      <p className="text-xs opacity-50">{Math.floor(p.balls / 6)}.{p.balls % 6} ov · {p.runs} runs</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-red-500">
                      {bowlingMetric === 'wickets' && p.wickets}
                      {bowlingMetric === 'economy' && p.economy.toFixed(2)}
                      {bowlingMetric === 'strikeRate' && (p.bowlingStrikeRate > 0 ? p.bowlingStrikeRate.toFixed(1) : '—')}
                      {bowlingMetric === 'bestFigures' && `${p.bestFigures.wickets}-${p.bestFigures.runs}`}
                    </p>
                    <p className="text-xs opacity-50">{bowlingMetric === 'wickets' ? 'wkts' : bowlingMetric === 'economy' ? 'Econ' : bowlingMetric === 'strikeRate' ? 'SR' : ''}</p>
                  </div>
                </div>
              ))}
              {statCategory === 'bowling' && bowlingData.length === 0 && <p className="text-center py-10 opacity-50 text-sm">No bowling data yet</p>}

              {/* Teams */}
              {statCategory === 'teams' && (stats?.topTeams || []).filter((t: any) => t.stats?.wins > 0).map((t: any, i: number) => (
                <div key={t._id} className="glass-card flex items-center justify-between p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white ${i === 0 ? 'bg-gradient-to-br from-amber-500 to-yellow-400' : 'bg-[var(--muted)]'}`} style={i > 0 ? { color: 'var(--foreground)' } : {}}>{i + 1}</div>
                    <div><p className="font-bold text-sm">{t.name}</p><p className="text-xs opacity-50">{t.stats.matches} matches</p></div>
                  </div>
                  <div className="text-right"><p className="text-xl font-bold text-amber-500">{t.stats.wins}</p><p className="text-xs opacity-50">wins</p></div>
                </div>
              ))}
              {statCategory === 'teams' && (stats?.topTeams || []).filter((t: any) => t.stats?.wins > 0).length === 0 && <p className="text-center py-10 opacity-50 text-sm">No completed matches yet</p>}

              {/* MOTM */}
              {statCategory === 'motm' && (stats?.motmStats || []).map((m: any, i: number) => (
                <div key={m.name} className="glass-card flex items-center justify-between p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white ${i === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : 'bg-[var(--muted)]'}`} style={i > 0 ? { color: 'var(--foreground)' } : {}}>{i === 0 ? '🏆' : i + 1}</div>
                    <div><p className="font-bold text-sm">{m.name}</p><p className="text-xs opacity-50">{m.team}</p></div>
                  </div>
                  <div className="text-right"><p className="text-xl font-bold text-yellow-500">{m.count}</p><p className="text-xs opacity-50">MOTM</p></div>
                </div>
              ))}
              {statCategory === 'motm' && (stats?.motmStats || []).length === 0 && <p className="text-center py-10 opacity-50 text-sm">No MOTM awards yet</p>}

              {/* Captain */}
              {statCategory === 'captain' && (stats?.captainStats || []).map((c: any, i: number) => (
                <div key={`${c.id}-${c.team}`} className="glass-card flex items-center justify-between p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white ${i === 0 ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-[var(--muted)]'}`} style={i > 0 ? { color: 'var(--foreground)' } : {}}>{i + 1}</div>
                    <div><p className="font-bold text-sm">{c.name}</p><p className="text-xs opacity-50">{c.team} · {c.matches} led</p></div>
                  </div>
                  <div className="text-right"><p className="text-xl font-bold text-blue-500">{c.wins}</p><p className="text-xs opacity-50">wins</p></div>
                </div>
              ))}
              {statCategory === 'captain' && (stats?.captainStats || []).length === 0 && <p className="text-center py-10 opacity-50 text-sm">No captain data yet</p>}

              {/* Wins — Batting */}
              {statCategory === 'wins' && winSubCategory === 'batting' && winBattingData.map((p: any, i: number) => (
                <div key={p._id} className="glass-card flex items-center justify-between p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white ${i === 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-[var(--muted)]'}`} style={i > 0 ? { color: 'var(--foreground)' } : {}}>{i + 1}</div>
                    <div><p className="font-bold text-sm">{p.name}{p.nickname ? ` (${p.nickname})` : ''}</p><p className="text-xs opacity-50">{p.innings} inn · {p.balls} balls</p></div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-emerald-500">
                      {winBattingMetric === 'runs' && p.runs}
                      {winBattingMetric === 'highestScore' && p.highestScore}
                      {winBattingMetric === 'strikeRate' && p.strikeRate.toFixed(1)}
                      {winBattingMetric === 'average' && p.average.toFixed(1)}
                    </p>
                    <p className="text-xs opacity-50">{winBattingMetric === 'runs' ? 'runs' : winBattingMetric === 'highestScore' ? 'HS' : winBattingMetric === 'strikeRate' ? 'SR' : 'Avg'}</p>
                  </div>
                </div>
              ))}

              {/* Wins — Bowling */}
              {statCategory === 'wins' && winSubCategory === 'bowling' && winBowlingData.map((p: any, i: number) => (
                <div key={p._id} className="glass-card flex items-center justify-between p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white ${i === 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-[var(--muted)]'}`} style={i > 0 ? { color: 'var(--foreground)' } : {}}>{i + 1}</div>
                    <div><p className="font-bold text-sm">{p.name}{p.nickname ? ` (${p.nickname})` : ''}</p><p className="text-xs opacity-50">{Math.floor(p.balls / 6)}.{p.balls % 6} ov</p></div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-emerald-500">
                      {winBowlingMetric === 'wickets' && p.wickets}
                      {winBowlingMetric === 'economy' && p.economy.toFixed(2)}
                      {winBowlingMetric === 'strikeRate' && (p.bowlingStrikeRate > 0 ? p.bowlingStrikeRate.toFixed(1) : '—')}
                      {winBowlingMetric === 'bestFigures' && `${p.bestFigures.wickets}-${p.bestFigures.runs}`}
                    </p>
                    <p className="text-xs opacity-50">{winBowlingMetric === 'wickets' ? 'wkts' : winBowlingMetric === 'economy' ? 'Econ' : winBowlingMetric === 'strikeRate' ? 'SR' : ''}</p>
                  </div>
                </div>
              ))}
              {statCategory === 'wins' && (winSubCategory === 'batting' ? winBattingData : winBowlingData).length === 0 && <p className="text-center py-10 opacity-50 text-sm">No data yet</p>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
