'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DatePicker from '@/app/components/DatePicker';
import BackButton from '@/app/components/BackButton';

type StatCategory = 'batting' | 'bowling' | 'teams' | 'motm' | 'captain' | 'wins';
type BattingMetric = 'runs' | 'strikeRate' | 'average' | 'highestScore' | 'fours';
type BowlingMetric = 'wickets' | 'economy' | 'strikeRate' | 'bestFigures';
type WinSubCategory = 'batting' | 'bowling';
type WinBattingMetric = 'runs' | 'strikeRate' | 'average' | 'highestScore';
type WinBowlingMetric = 'wickets' | 'economy' | 'strikeRate' | 'bestFigures';
type DateFilter = 'today' | 'yesterday' | 'all';

function isSameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

export default function StatsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<StatCategory>('batting');
  const [battingMetric, setBattingMetric] = useState<BattingMetric>('runs');
  const [bowlingMetric, setBowlingMetric] = useState<BowlingMetric>('wickets');
  const [winSubCategory, setWinSubCategory] = useState<WinSubCategory>('batting');
  const [winBattingMetric, setWinBattingMetric] = useState<WinBattingMetric>('runs');
  const [winBowlingMetric, setWinBowlingMetric] = useState<WinBowlingMetric>('wickets');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [pickedDate, setPickedDate] = useState<Date | null>(null);

  const fetchStats = (filter: DateFilter, picked: Date | null) => {
    setLoading(true);
    let param = '';
    if (picked) {
      const y = picked.getFullYear();
      const m = String(picked.getMonth() + 1).padStart(2, '0');
      const d = String(picked.getDate()).padStart(2, '0');
      param = `?date=${y}-${m}-${d}`;
    } else if (filter !== 'all') {
      param = `?date=${filter}`;
    }
    fetch(`/api/stats${param}`)
      .then(r => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStats('all', null); }, []);

  const battingData = (() => {
    if (!stats?.battingStats) return [];
    return [...stats.battingStats]
      .filter((p: any) => {
        if (battingMetric === 'runs') return p.runs > 0;
        if (battingMetric === 'highestScore') return p.highestScore > 0;
        if (battingMetric === 'fours') return p.fours > 0;
        if (battingMetric === 'strikeRate' || battingMetric === 'average') return p.innings >= 10;
        return p.runs > 0 || p.balls > 0;
      })
      .sort((a: any, b: any) => {
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
    return [...stats.bowlingStats]
      .filter((p: any) => {
        if (bowlingMetric === 'wickets') return p.wickets > 0;
        if (bowlingMetric === 'bestFigures') return p.bestFigures?.wickets > 0;
        if (bowlingMetric === 'economy' || bowlingMetric === 'strikeRate') return p.balls >= 90;
        return p.balls > 0;
      })
      .sort((a: any, b: any) => {
        if (bowlingMetric === 'wickets') return b.wickets - a.wickets;
        if (bowlingMetric === 'economy') return a.economy - b.economy;
        if (bowlingMetric === 'strikeRate') return a.bowlingStrikeRate - b.bowlingStrikeRate;
        if (bowlingMetric === 'bestFigures') {
          if (b.bestFigures.wickets !== a.bestFigures.wickets) return b.bestFigures.wickets - a.bestFigures.wickets;
          return a.bestFigures.runs - b.bestFigures.runs;
        }
        return 0;
      });
  })();

  const teamData = (stats?.topTeams || [])
    .filter((t: any) => (t.stats?.wins || 0) > 0);

  const motmData = (stats?.motmStats || []).filter((m: any) => m.count > 0);
  const captainData = (stats?.captainStats || []);

  const winBattingData = (() => {
    if (!stats?.winBattingStats) return [];
    return [...stats.winBattingStats]
      .filter((p: any) => {
        if (winBattingMetric === 'runs') return p.runs > 0;
        if (winBattingMetric === 'highestScore') return p.highestScore > 0;
        if (winBattingMetric === 'strikeRate' || winBattingMetric === 'average') return p.innings >= 5;
        return p.runs > 0;
      })
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
    return [...stats.winBowlingStats]
      .filter((p: any) => {
        if (winBowlingMetric === 'wickets') return p.wickets > 0;
        if (winBowlingMetric === 'bestFigures') return p.bestFigures?.wickets > 0;
        if (winBowlingMetric === 'economy' || winBowlingMetric === 'strikeRate') return p.balls >= 30;
        return p.balls > 0;
      })
      .sort((a: any, b: any) => {
        if (winBowlingMetric === 'wickets') return b.wickets - a.wickets;
        if (winBowlingMetric === 'economy') return a.economy - b.economy;
        if (winBowlingMetric === 'strikeRate') return a.bowlingStrikeRate - b.bowlingStrikeRate;
        if (winBowlingMetric === 'bestFigures') {
          if (b.bestFigures.wickets !== a.bestFigures.wickets) return b.bestFigures.wickets - a.bestFigures.wickets;
          return a.bestFigures.runs - b.bestFigures.runs;
        }
        return 0;
      });
  })();

  const hasData = category === 'batting' ? battingData.length > 0
    : category === 'bowling' ? bowlingData.length > 0
    : category === 'motm' ? motmData.length > 0
    : category === 'captain' ? captainData.length > 0
    : category === 'wins' ? (winSubCategory === 'batting' ? winBattingData.length > 0 : winBowlingData.length > 0)
    : teamData.length > 0;

  const metricLabel = category === 'batting'
    ? battingMetric === 'runs' ? 'Runs'
      : battingMetric === 'highestScore' ? 'Highest Score'
      : battingMetric === 'fours' ? 'Boundaries'
      : battingMetric === 'strikeRate' ? 'Strike Rate'
      : 'Average'
    : bowlingMetric === 'wickets' ? 'Wickets'
      : bowlingMetric === 'bestFigures' ? 'Best Figures'
      : bowlingMetric === 'economy' ? 'Economy'
      : 'Strike Rate';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-card rounded-3xl p-7 flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold opacity-80">Crunching stats</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-8">
      <div className="container mx-auto px-4 pt-8 md:pt-10 max-w-4xl">
        <div className="hero-glow glass-card rounded-[2rem] p-8 md:p-10">
          <BackButton href="/" />
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-2">Performance Studio</h1>
          <p className="mt-2 text-sm md:text-base text-[var(--foreground)]/75">Switch dimensions and metrics instantly with a dashboard-like experience.</p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="glass-card rounded-2xl p-6">
          <div className="mb-6 space-y-3">
            <DatePicker
              value={pickedDate}
              onChange={d => { setPickedDate(d); if (d) { setDateFilter('all'); fetchStats('all', d); } }}
              placeholder="Pick a date (dd/mm/yyyy)"
            />
            <div className="grid grid-cols-3 gap-2">
              {(['all', 'today', 'yesterday'] as DateFilter[]).map(f => (
                <button key={f} onClick={() => { setPickedDate(null); setDateFilter(f); fetchStats(f, null); }}
                  className={`ui-btn py-2.5 rounded-xl font-semibold text-sm capitalize transition-all ${!pickedDate && dateFilter === f ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white shadow-md' : 'bg-[var(--muted)]/70 hover:bg-[var(--muted)] text-[var(--foreground)]'}`}>
                  {f === 'today' ? 'Today' : f === 'yesterday' ? 'Yesterday' : 'All'}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold opacity-60 uppercase tracking-wide mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as StatCategory)}
                  className="ui-input text-[var(--foreground)]"
                >
                  <option value="batting" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>Batting</option>
                  <option value="bowling" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>Bowling</option>
                  <option value="teams" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>Teams</option>
                  <option value="motm" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>MOTM</option>
                  <option value="captain" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>Captain's Record</option>
                  <option value="wins" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>Winning Impact</option>
                </select>
              </div>

              {category === 'batting' && (
                <div>
                  <label className="block text-xs font-semibold opacity-60 uppercase tracking-wide mb-1.5">Batting Metric</label>
                  <select
                    value={battingMetric}
                    onChange={(e) => setBattingMetric(e.target.value as BattingMetric)}
                    className="ui-input text-[var(--foreground)]"
                  >
                    <option value="runs" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>Runs</option>
                    <option value="highestScore" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>Highest Score</option>
                    <option value="fours" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>4s</option>
                    <option value="strikeRate" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>Strike Rate</option>
                    <option value="average" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>Average</option>
                  </select>
                </div>
              )}

              {category === 'bowling' && (
                <div>
                  <label className="block text-xs font-semibold opacity-60 uppercase tracking-wide mb-1.5">Bowling Metric</label>
                  <select
                    value={bowlingMetric}
                    onChange={(e) => setBowlingMetric(e.target.value as BowlingMetric)}
                    className="ui-input text-[var(--foreground)]"
                  >
                    <option value="wickets" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>Wickets</option>
                    <option value="bestFigures" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>Best Figures</option>
                    <option value="economy" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>Economy</option>
                    <option value="strikeRate" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>Strike Rate</option>
                  </select>
                </div>
              )}

              {/* Wins sub-filters */}
              {category === 'wins' && (
                <div>
                  <label className="block text-xs font-semibold opacity-60 uppercase tracking-wide mb-1.5">Discipline</label>
                  <select value={winSubCategory} onChange={e => setWinSubCategory(e.target.value as WinSubCategory)} className="ui-input text-[var(--foreground)]">
                    <option value="batting" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>Batting in Wins</option>
                    <option value="bowling" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>Bowling in Wins</option>
                  </select>
                </div>
              )}
              {category === 'wins' && winSubCategory === 'batting' && (
                <div>
                  <label className="block text-xs font-semibold opacity-60 uppercase tracking-wide mb-1.5">Metric</label>
                  <select value={winBattingMetric} onChange={e => setWinBattingMetric(e.target.value as WinBattingMetric)} className="ui-input text-[var(--foreground)]">
                    <option value="runs" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>Most Runs</option>
                    <option value="highestScore" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>Highest Score</option>
                    <option value="strikeRate" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>Strike Rate</option>
                    <option value="average" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>Average</option>
                  </select>
                </div>
              )}
              {category === 'wins' && winSubCategory === 'bowling' && (
                <div>
                  <label className="block text-xs font-semibold opacity-60 uppercase tracking-wide mb-1.5">Metric</label>
                  <select value={winBowlingMetric} onChange={e => setWinBowlingMetric(e.target.value as WinBowlingMetric)} className="ui-input text-[var(--foreground)]">
                    <option value="wickets" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>Most Wickets</option>
                    <option value="economy" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>Economy</option>
                    <option value="strikeRate" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>Strike Rate</option>
                    <option value="bestFigures" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>Best Figures</option>
                  </select>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3 mb-8">
            {(category === 'batting' && (battingMetric === 'strikeRate' || battingMetric === 'average')) && (
              <div className="text-[10px] text-amber-500/90 font-black uppercase tracking-widest sm:tracking-[0.2em] px-4 py-2.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 w-full text-center shadow-inner">
                ⚠️ Minimum 10 innings required
              </div>
            )}
            {(category === 'bowling' && (bowlingMetric === 'economy' || bowlingMetric === 'strikeRate')) && (
              <div className="text-[10px] text-amber-500/90 font-black uppercase tracking-widest sm:tracking-[0.2em] px-4 py-2.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 w-full text-center shadow-inner">
                ⚠️ Minimum 15 overs (90 balls) required
              </div>
            )}
            {(category === 'wins' && winSubCategory === 'batting' && (winBattingMetric === 'strikeRate' || winBattingMetric === 'average')) && (
              <div className="text-[10px] text-amber-500/90 font-black uppercase tracking-widest sm:tracking-[0.2em] px-4 py-2.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 w-full text-center shadow-inner">
                ⚠️ Minimum 5 innings in wins required
              </div>
            )}
            {(category === 'wins' && winSubCategory === 'bowling' && (winBowlingMetric === 'economy' || winBowlingMetric === 'strikeRate')) && (
              <div className="text-[10px] text-amber-500/90 font-black uppercase tracking-widest sm:tracking-[0.2em] px-4 py-2.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 w-full text-center shadow-inner">
                ⚠️ Minimum 5 overs (30 balls) in wins required
              </div>
            )}
          </div>

          {!hasData ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-[var(--muted)] rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-lg opacity-60">No statistics available yet</p>
              <p className="text-sm opacity-40 mt-2">Play some matches to see stats here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {category === 'batting' && battingData.map((player: any, idx: number) => (
                <Link key={player._id} href={`/players/search?id=${player._id}`} className="block group">
                  <div className="glass-card elevated-hover flex items-center justify-between p-4 rounded-xl transition-all duration-300 group-hover:border-[var(--primary)]/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white rounded-full flex items-center justify-center font-bold shadow-lg">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-bold group-hover:text-[var(--primary)] transition-colors">{player.name}{player.nickname ? ` (${player.nickname})` : ''}</p>
                        <p className="text-xs opacity-60">
                          {battingMetric === 'highestScore' && `${player.highestBalls} balls · SR ${player.highestSR.toFixed(1)}`}
                          {battingMetric === 'fours' && `${player.innings} inn`}
                          {battingMetric === 'runs' && `${player.innings} inn · ${player.balls} balls`}
                          {(battingMetric === 'strikeRate' || battingMetric === 'average') && `${player.innings} inn · ${player.balls} balls`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[var(--primary)]">
                        {battingMetric === 'runs' && player.runs}
                        {battingMetric === 'highestScore' && player.highestScore}
                        {battingMetric === 'fours' && player.fours}
                        {battingMetric === 'strikeRate' && player.strikeRate.toFixed(1)}
                        {battingMetric === 'average' && player.average.toFixed(1)}
                      </p>
                      <p className="text-xs opacity-60">
                        {battingMetric === 'runs' && `${player.balls} balls`}
                        {battingMetric === 'highestScore' && 'HS'}
                        {battingMetric === 'fours' && '4s'}
                        {battingMetric === 'strikeRate' && 'SR'}
                        {battingMetric === 'average' && 'Avg'}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}

              {category === 'bowling' && bowlingData.map((player: any, idx: number) => {
                const ov = Math.floor(player.balls / 6);
                const bl = player.balls % 6;
                return (
                  <Link key={player._id} href={`/players/search?id=${player._id}`} className="block group">
                    <div className="glass-card elevated-hover flex items-center justify-between p-4 rounded-xl transition-all duration-300 group-hover:border-red-500/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 text-white rounded-full flex items-center justify-center font-bold shadow-lg">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-bold group-hover:text-red-500 transition-colors">{player.name}{player.nickname ? ` (${player.nickname})` : ''}</p>
                          <p className="text-xs opacity-60">
                            {bowlingMetric !== 'bestFigures' && (bowlingMetric === 'wickets'
                              ? `${ov}.${bl} overs`
                              : `${ov}.${bl} overs · ${player.runs} runs`)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-red-500">
                          {bowlingMetric === 'wickets' && player.wickets}
                          {bowlingMetric === 'economy' && player.economy.toFixed(2)}
                          {bowlingMetric === 'strikeRate' && (player.bowlingStrikeRate > 0 ? player.bowlingStrikeRate.toFixed(1) : '—')}
                          {bowlingMetric === 'bestFigures' && `${player.bestFigures.wickets}-${player.bestFigures.runs}`}
                        </p>
                        <p className="text-xs opacity-60">
                          {bowlingMetric === 'wickets' && 'wickets'}
                          {bowlingMetric === 'economy' && 'Econ'}
                          {bowlingMetric === 'strikeRate' && 'SR'}
                          {bowlingMetric === 'bestFigures' && ''}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}

              {category === 'teams' && teamData.map((team: any, idx: number) => (
                <div key={team._id} className="glass-card elevated-hover flex items-center justify-between p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[var(--accent)] to-yellow-500 text-white rounded-full flex items-center justify-center font-bold">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-bold">{team.name}</p>
                      <p className="text-xs opacity-60">{(team.stats?.wins || 0) + (team.stats?.losses || 0)} matches</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[var(--accent)]">{team.stats?.wins || 0}</p>
                    <p className="text-xs opacity-60">wins</p>
                  </div>
                </div>
              ))}
               {category === 'motm' && motmData.map((m: any, idx: number) => (
                <Link key={m.playerId || m.name} href={m.playerId ? `/players/search?id=${m.playerId}` : '#'} className={`block group ${!m.playerId && 'pointer-events-none'}`}>
                  <div className="glass-card elevated-hover flex items-center justify-between p-4 rounded-xl transition-all duration-300 group-hover:border-yellow-500/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-full flex items-center justify-center font-bold shadow-lg">
                        {idx === 0 ? '🏆' : idx + 1}
                      </div>
                      <div>
                        <p className="font-bold group-hover:text-yellow-500 transition-colors">{m.name}</p>
                        <p className="text-xs opacity-60">{m.team}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-yellow-500">{m.count}</p>
                      <p className="text-xs opacity-60">MOTM</p>
                    </div>
                  </div>
                </Link>
              ))}
              {category === 'captain' && captainData.map((c: any, idx: number) => (
                <Link key={`${c.id}-${c.team}`} href={`/players/search?id=${c.id}`} className="block group">
                  <div className="glass-card elevated-hover flex items-center justify-between p-4 rounded-xl transition-all duration-300 group-hover:border-blue-500/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center font-bold shadow-lg">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-bold group-hover:text-blue-500 transition-colors">{c.name}</p>
                        <p className="text-xs opacity-60">Team: {c.team}</p>
                        <p className="text-[10px] opacity-40 font-bold uppercase tracking-tight mt-0.5">{c.matches} match{c.matches !== 1 ? 'es' : ''} led</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-500">{c.wins}</p>
                      <p className="text-xs opacity-60">wins</p>
                    </div>
                  </div>
                </Link>
              ))}

              {/* Match Winners — Batting in Wins */}
              {category === 'wins' && winSubCategory === 'batting' && winBattingData.map((player: any, idx: number) => (
                <Link key={player._id} href={`/players/search?id=${player._id}`} className="block group">
                  <div className="glass-card elevated-hover flex items-center justify-between p-4 rounded-xl transition-all duration-300 group-hover:border-emerald-500/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-full flex items-center justify-center font-bold shadow-lg">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-bold group-hover:text-emerald-400 transition-colors">{player.name}{player.nickname ? ` (${player.nickname})` : ''}</p>
                        <p className="text-xs opacity-60">
                          {winBattingMetric === 'runs' && `${player.innings} inn · ${player.balls} balls`}
                          {winBattingMetric === 'highestScore' && `${player.highestBalls} balls · SR ${player.highestSR?.toFixed(1)}`}
                          {(winBattingMetric === 'strikeRate' || winBattingMetric === 'average') && `${player.innings} inn`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-400">
                        {winBattingMetric === 'runs' && player.runs}
                        {winBattingMetric === 'highestScore' && player.highestScore}
                        {winBattingMetric === 'strikeRate' && player.strikeRate.toFixed(1)}
                        {winBattingMetric === 'average' && player.average.toFixed(1)}
                      </p>
                      <p className="text-xs opacity-60">
                        {winBattingMetric === 'runs' && 'runs'}
                        {winBattingMetric === 'highestScore' && 'HS'}
                        {winBattingMetric === 'strikeRate' && 'SR'}
                        {winBattingMetric === 'average' && 'Avg'}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}

              {/* Match Winners — Bowling in Wins */}
              {category === 'wins' && winSubCategory === 'bowling' && winBowlingData.map((player: any, idx: number) => {
                const ov = Math.floor(player.balls / 6);
                const bl = player.balls % 6;
                return (
                  <Link key={player._id} href={`/players/search?id=${player._id}`} className="block group">
                    <div className="glass-card elevated-hover flex items-center justify-between p-4 rounded-xl transition-all duration-300 group-hover:border-emerald-500/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-full flex items-center justify-center font-bold shadow-lg">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-bold group-hover:text-emerald-400 transition-colors">{player.name}{player.nickname ? ` (${player.nickname})` : ''}</p>
                          <p className="text-xs opacity-60">
                            {winBowlingMetric !== 'bestFigures' && `${ov}.${bl} ov · ${player.runs} runs`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-emerald-400">
                          {winBowlingMetric === 'wickets' && player.wickets}
                          {winBowlingMetric === 'economy' && player.economy.toFixed(2)}
                          {winBowlingMetric === 'strikeRate' && (player.bowlingStrikeRate > 0 ? player.bowlingStrikeRate.toFixed(1) : '—')}
                          {winBowlingMetric === 'bestFigures' && `${player.bestFigures.wickets}-${player.bestFigures.runs}`}
                        </p>
                        <p className="text-xs opacity-60">
                          {winBowlingMetric === 'wickets' && 'wkts'}
                          {winBowlingMetric === 'economy' && 'Econ'}
                          {winBowlingMetric === 'strikeRate' && 'SR'}
                          {winBowlingMetric === 'bestFigures' && 'best'}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
