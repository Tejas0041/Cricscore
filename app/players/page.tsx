'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import BackButton from '@/app/components/BackButton';

interface PlayerRow {
  _id: string;
  name: string;
  nickname?: string;
  role: string;
  matches: number;
  innings: number;
  runs: number;
  wickets: number;
  motmCount: number;
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/players/list')
      .then(r => r.json())
      .then(d => setPlayers(d.players || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = players.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen pb-8">
      <div className="container mx-auto px-4 pt-8 md:pt-10">
        <div className="hero-glow glass-card rounded-[2rem] p-8 md:p-10">
          <BackButton href="/" />
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-1 mt-2">Player Hub</h1>
          <p className="text-sm md:text-base text-[var(--foreground)]/75">Explore every registered player with quick-glance career metrics.</p>
          <div className="mt-4 inline-flex feature-chip rounded-full px-3 py-1 text-xs font-semibold">
            {players.length} registered players
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6 glass-card rounded-2xl p-4">
          <input
            type="text"
            placeholder="Search player..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[var(--muted)]/40 border border-[var(--border)] focus:outline-none focus:border-[var(--primary)] transition-colors"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center opacity-70">
            No players found
          </div>
        ) : (
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="bg-[var(--muted)]/70 border-b border-[var(--border)] text-xs font-bold uppercase tracking-wide opacity-60">
                    <th className="text-left px-4 py-3">Player</th>
                    <th className="text-center px-3 py-3">M</th>
                    <th className="text-center px-3 py-3">Inn</th>
                    <th className="text-center px-3 py-3">Runs</th>
                    <th className="text-center px-3 py-3">Wkts</th>
                    <th className="text-center px-3 py-3">MOTM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filtered.map((p) => (
                    <Link key={p._id} href={`/players/search?id=${p._id}`} legacyBehavior>
                      <tr className="hover:bg-[var(--muted)]/40 transition-colors cursor-pointer">
                        <td className="px-4 py-3">
                          <p className="font-semibold leading-tight">{p.name}{p.nickname ? ` (${p.nickname})` : ''}</p>
                          <p className="text-xs opacity-50 capitalize">{p.role}</p>
                        </td>
                        <td className="text-center px-3 py-3">{p.matches}</td>
                        <td className="text-center px-3 py-3">{p.innings}</td>
                        <td className="text-center px-3 py-3 font-bold text-[var(--primary)]">{p.runs}</td>
                        <td className="text-center px-3 py-3 font-bold text-[var(--secondary)]">{p.wickets}</td>
                        <td className="text-center px-3 py-3 font-bold text-yellow-500">{p.motmCount > 0 ? p.motmCount : '—'}</td>
                      </tr>
                    </Link>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
