import { useEffect, useState } from 'react';
import type { LeaderboardResponse } from '../../shared/api';

type LeaderboardProps = {
  date: string;
  onClose: () => void;
};

export function Leaderboard({ date, onClose }: LeaderboardProps) {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        console.log('Fetching leaderboard for date:', date);
        const response = await fetch(`/api/leaderboard/${date}`);
        const result = await response.json();
        console.log('Leaderboard response:', result);
        setData(result);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoading(false);
      }
    }

    if (date) {
      void fetchLeaderboard();
    }
  }, [date]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 bg-book-text/50 flex items-center justify-center z-50 p-4">
      <div className="bg-book-paper rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col border-4 border-book-border">
        {/* Header */}
        <div className="p-4 border-b-2 border-book-border bg-book-bg">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-book-accent">Leaderboard</h2>
              <p className="text-xs text-book-text/60">{formatDate(date)}</p>
            </div>
            <button
              onClick={onClose}
              className="text-book-text/60 hover:text-book-text transition-colors text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!date ? (
            <div className="text-center py-8 text-book-text/60">No date specified</div>
          ) : loading ? (
            <div className="text-center py-8 text-book-text/60">Loading...</div>
          ) : data && data.entries.length > 0 ? (
            <>
              {/* User's rank */}
              {data.userEntry && data.userRank && (
                <div className="bg-book-green/10 border-2 border-book-green rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-book-green font-bold text-lg">#{data.userRank}</div>
                      <div>
                        <div className="font-semibold text-book-text">{data.userEntry.username}</div>
                        <div className="text-xs text-book-text/70">
                          {data.userEntry.attempts} {data.userEntry.attempts === 1 ? 'guess' : 'guesses'}
                        </div>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-bold ${data.userEntry.won ? 'bg-book-green text-white' : 'bg-book-absent text-book-text'
                      }`}>
                      {data.userEntry.won ? 'Won' : 'Lost'}
                    </div>
                  </div>
                </div>
              )}

              {/* Top players */}
              <div className="space-y-2">
                {data.entries.map((entry, index) => (
                  <div
                    key={`${entry.username}-${index}`}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 ${entry.username === data.userEntry?.username
                      ? 'border-book-green bg-book-green/5'
                      : 'border-book-border bg-book-paper'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`font-bold text-sm w-8 text-center ${index === 0 ? 'text-yellow-600' :
                        index === 1 ? 'text-gray-500' :
                          index === 2 ? 'text-amber-700' :
                            'text-book-text/60'
                        }`}>
                        #{index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-book-text text-sm">{entry.username}</div>
                        <div className="text-xs text-book-text/60">
                          {entry.attempts} {entry.attempts === 1 ? 'guess' : 'guesses'}
                        </div>
                      </div>
                    </div>
                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${entry.won ? 'bg-book-correct text-white' : 'bg-book-absent text-book-text/70'
                      }`}>
                      {entry.won ? '✓' : '✗'}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-book-text/60">
              No entries yet for this day
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t-2 border-book-border bg-book-bg">
          <button
            onClick={onClose}
            className="w-full bg-book-accent text-white font-bold py-2 rounded-lg hover:bg-book-accent/90 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
