'use client';

import { useEffect, useState } from 'react';
import DatePicker from '@/app/components/DatePicker';
import BackButton from '@/app/components/BackButton';

type StatCategory = 'batting' | 'bowling' | 'teams' | 'motm';
type BattingMetric = 'runs' | 'strikeRate' | 'average' | 'highestScore' | 'fours';
type BowlingMetric = 'wickets' | 'economy' | 'strikeRate' | 'bestFigures';
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
        return p.balls >= 5;
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
        if (bowlingMetric === 'strikeRate') return p.wickets > 0;
        if (bowlingMetric === 'bestFigures') return p.bestFigures?.wickets > 0;
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

  const hasData = category === 'batting' ? battingData.length > 0
    : category === 'bowling' ? bowlingData.length > 0
    : category === 'motm' ? motmData.length > 0
    : teamData.length > 0;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-br from-[var(--accent)] to-[var(--secondary)] text-white">
        <div className="container mx-auto px-4 py-12">
          <BackButton href="/" />
          <h1 className="text-3xl md:text-4xl font-bold mt-2">Statistics</h1>
          <p className="mt-2 opacity-90">Top performers and team standings</p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl p-6">
          {/* Date filter */}
          <div className="mb-6 space-y-3">
            <DatePicker
              value={pickedDate}
              onChange={d => { setPickedDate(d); if (d) { setDateFilter('all'); fetchStats('all', d); } }}
              placeholder="Pick a date (dd/mm/yyyy)"
            />
            <div className="flex gap-2">
              {(['all', 'today', 'yesterday'] as DateFilter[]).map(f => (
                <button key={f} onClick={() => { setPickedDate(null); setDateFilter(f); fetchStats(f, null); }}
                  className={`flex-1 py-2 rounded-lg font-semibold text-sm capitalize transition-all ${!pickedDate && dateFilter === f ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)] hover:bg-[var(--border)]'}`}>
                  {f === 'today' ? 'Today' : f === 'yesterday' ? 'Yesterday' : 'All'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <label className="block text-sm font-semibold mb-2">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value as StatCategory)}
                className="w-full p-3 bg-[var(--muted)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all">
                <option value="batting">Batting</option>
                <option value="bowling">Bowling</option>
                <option value="teams">Teams</option>
                <option value="motm">Man of the Match</option>
              </select>
            </div>

            {category === 'batting' && (
              <div className="flex-1">
                <label className="block text-sm font-semibold mb-2">Metric</label>
                <select value={battingMetric} onChange={e => setBattingMetric(e.target.value as BattingMetric)}
                  className="w-full p-3 bg-[var(--muted)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all">
                  <option value="runs">Most Runs</option>
                  <option value="highestScore">Highest Score</option>
                  <option value="fours">Most 4s</option>
                  <option value="strikeRate">Strike Rate (min 5 balls)</option>
                  <option value="average">Average (min 5 balls)</option>
                </select>
              </div>
            )}

            {category === 'bowling' && (
              <div className="flex-1">
                <label className="block text-sm font-semibold mb-2">Metric</label>
                <select value={bowlingMetric} onChange={e => setBowlingMetric(e.target.value as BowlingMetric)}
                  className="w-full p-3 bg-[var(--muted)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all">
                  <option value="wickets">Most Wickets</option>
                  <option value="bestFigures">Best Figures</option>
                  <option value="economy">Economy Rate</option>
                  <option value="strikeRate">Strike Rate (balls/wicket)</option>
                </select>
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
                <div key={player._id} className="flex items-center justify-between p-4 bg-[var(--muted)] rounded-xl hover:scale-[1.01] transition-transform">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white rounded-full flex items-center justify-center font-bold">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-bold">{player.name}{player.nickname ? ` (${player.nickname})` : ''}</p>
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
              ))}

              {category === 'bowling' && bowlingData.map((player: any, idx: number) => {
                const ov = Math.floor(player.balls / 6);
                const bl = player.balls % 6;
                return (
                  <div key={player._id} className="flex items-center justify-between p-4 bg-[var(--muted)] rounded-xl hover:scale-[1.01] transition-transform">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 text-white rounded-full flex items-center justify-center font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-bold">{player.name}{player.nickname ? ` (${player.nickname})` : ''}</p>
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
                );
              })}

              {category === 'teams' && teamData.map((team: any, idx: number) => (
                <div key={team._id} className="flex items-center justify-between p-4 bg-[var(--muted)] rounded-xl hover:scale-[1.01] transition-transform">
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
                <div key={m.name} className="flex items-center justify-between p-4 bg-[var(--muted)] rounded-xl hover:scale-[1.01] transition-transform">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-full flex items-center justify-center font-bold">
                      {idx === 0 ? '🏆' : idx + 1}
                    </div>
                    <div>
                      <p className="font-bold">{m.name}</p>
                      <p className="text-xs opacity-60">{m.team}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-yellow-500">{m.count}</p>
                    <p className="text-xs opacity-60">MOTM</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
