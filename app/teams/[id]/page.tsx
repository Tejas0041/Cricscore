'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function TeamPage() {
  const params = useParams();
  const [team, setTeam] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      const res = await fetch(`/api/teams/${params.id}`);
      const data = await res.json();
      setTeam(data.team);
      setMatches(data.matches || []);
    } catch (error) {
      console.error('Error fetching team:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  if (!team) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Team not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">{team.name}</h1>
          <Link href="/" className="hover:underline">Home</Link>
        </div>
      </header>

      <main className="container mx-auto p-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Team Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{team.stats.matchesPlayed}</p>
              <p className="text-sm text-gray-600">Matches</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{team.stats.wins}</p>
              <p className="text-sm text-gray-600">Wins</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">{team.stats.losses}</p>
              <p className="text-sm text-gray-600">Losses</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">{team.stats.highestScore}</p>
              <p className="text-sm text-gray-600">Highest Score</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Players</h2>
          <div className="grid gap-3">
            {team.players.map((player: any) => (
              <Link key={player._id} href={`/players/${player._id}`}>
                <div className="p-3 border rounded hover:bg-gray-50 cursor-pointer">
                  <p className="font-semibold">{player.name}</p>
                  <p className="text-sm text-gray-600 capitalize">{player.role}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Match History</h2>
          <div className="space-y-3">
            {matches.map((match: any) => (
              <Link key={match._id} href={`/match/${match._id}`}>
                <div className="p-4 border rounded hover:bg-gray-50 cursor-pointer">
                  <p className="font-semibold">{match.teamA.name} vs {match.teamB.name}</p>
                  <p className="text-sm text-gray-600">
                    {match.winner === team.name ? 'Won' : match.winner === 'Tie' ? 'Tied' : 'Lost'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
