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
    <div className="min-h-screen">
      <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white">
        <div className="container mx-auto px-4 py-10">
          <BackButton href="/" />
          <h1 className="text-3xl font-bold mb-1 mt-2">Players</h1>
          <p className="opacity-80 text-sm">All registered players and their career stats</p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search player..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--border)] focus:outline-none focus:border-[var(--primary)] transition-colors"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-10 text-center opacity-60">
            No players found
          </div>
        ) : (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2 px-4 py-3 bg-[var(--muted)] border-b border-[var(--border)] text-xs font-semibold opacity-60 uppercase tracking-wide">
              <span>Player</span>
              <span className="w-12 text-center">M</span>
              <span className="w-12 text-center">Inn</span>
              <span className="w-12 text-center">Runs</span>
              <span className="w-12 text-center">Wkts</span>
              <span className="w-12 text-center">MOTM</span>
            </div>
            {filtered.map((p, i) => (
              <Link key={p._id} href={`/players/search?id=${p._id}`}>
                <div className={`grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2 px-4 py-3 items-center hover:bg-[var(--muted)] transition-colors cursor-pointer ${i !== 0 ? 'border-t border-[var(--border)]' : ''}`}>
                  <div>
                    <p className="font-semibold">{p.name}{p.nickname ? ` (${p.nickname})` : ''}</p>
                    <p className="text-xs opacity-50 capitalize">{p.role}</p>
                  </div>
                  <span className="w-12 text-center text-sm">{p.matches}</span>
                  <span className="w-12 text-center text-sm">{p.innings}</span>
                  <span className="w-12 text-center text-sm font-bold text-[var(--primary)]">{p.runs}</span>
                  <span className="w-12 text-center text-sm font-bold text-[var(--secondary)]">{p.wickets}</span>
                  <span className="w-12 text-center text-sm font-bold text-yellow-500">{p.motmCount > 0 ? p.motmCount : '-'}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
