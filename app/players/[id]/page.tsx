'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function PlayerPage() {
  const params = useParams();
  const [player, setPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlayer();
  }, []);

  const fetchPlayer = async () => {
    try {
      const res = await fetch(`/api/players/${params.id}`);
      const data = await res.json();
      setPlayer(data.player);
    } catch (error) {
      console.error('Error fetching player:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  if (!player) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Player not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">{player.name}</h1>
          <Link href="/" className="hover:underline">Home</Link>
        </div>
      </header>

      <main className="container mx-auto p-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Player Info</h2>
          <div className="space-y-2">
            <p><span className="font-semibold">Name:</span> {player.name}</p>
            {player.nickname && <p><span className="font-semibold">Nickname:</span> {player.nickname}</p>}
            <p><span className="font-semibold">Role:</span> <span className="capitalize">{player.role}</span></p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Batting Stats</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Matches</span>
                <span className="font-bold">{player.stats.batting.matches}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Runs</span>
                <span className="font-bold text-blue-600">{player.stats.batting.runs}</span>
              </div>
              <div className="flex justify-between">
                <span>Highest Score</span>
                <span className="font-bold">{player.stats.batting.highestScore}</span>
              </div>
              <div className="flex justify-between">
                <span>Average</span>
                <span className="font-bold">{player.stats.batting.average.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Strike Rate</span>
                <span className="font-bold">{player.stats.batting.strikeRate.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>50+ Scores</span>
                <span className="font-bold">{player.stats.batting.fifties}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Bowling Stats</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Matches</span>
                <span className="font-bold">{player.stats.bowling.matches}</span>
              </div>
              <div className="flex justify-between">
                <span>Wickets</span>
                <span className="font-bold text-red-600">{player.stats.bowling.wickets}</span>
              </div>
              <div className="flex justify-between">
                <span>Economy</span>
                <span className="font-bold">{player.stats.bowling.economy.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Average</span>
                <span className="font-bold">{player.stats.bowling.average.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Strike Rate</span>
                <span className="font-bold">{player.stats.bowling.strikeRate.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
