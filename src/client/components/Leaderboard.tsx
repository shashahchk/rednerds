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

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'Loading...';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Invalid date';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-book-text/50 flex items-center justify-center z-50 p-4">
      <div className="bg-book-paper rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col border-4 border-book-border">
        {/* Header */}
        <div className="p-4 border-b-2 border-book-border bg-book-bg">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-book-accent">Leaderboard</h2>
              <p className="text-xs text-book-text/60">
                {data?.postCreatedAt ? formatDate(data.postCreatedAt) : data?.date ? formatDate(data.date) : formatDate(date)}
              </p>
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
              {/* Leaderboard */}
              <div className="space-y-2">
                {(() => {
                  const TOP_COUNT = 3;
                  const CONTEXT_RANGE = 2; // Show 2 players above and below user
                  const userRank = data.userRank || 0;
                  const totalEntries = data.entries.length;

                  // Determine which entries to show
                  const topEntries = data.entries.slice(0, TOP_COUNT);
                  const showGap = userRank > TOP_COUNT + CONTEXT_RANGE + 1;

                  // Get entries around user's rank
                  let contextEntries: typeof data.entries = [];
                  if (userRank > TOP_COUNT) {
                    const start = Math.max(TOP_COUNT, userRank - CONTEXT_RANGE - 1);
                    const end = Math.min(totalEntries, userRank + CONTEXT_RANGE);
                    contextEntries = data.entries.slice(start, end);
                  }

                  const renderEntry = (entry: typeof data.entries[0], index: number) => {
                    const actualRank = index + 1;
                    const isCurrentUser = entry.username === data.userEntry?.username;

                    return (
                      <div
                        key={`${entry.username}-${index}`}
                        className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${isCurrentUser
                          ? 'border-book-green bg-book-green/10 shadow-md'
                          : 'border-book-border bg-book-paper'
                          }`}
                      >
                        <div className={`font-bold text-sm w-7 text-center shrink-0 ${actualRank === 1 ? 'text-yellow-600' :
                          actualRank === 2 ? 'text-gray-500' :
                            actualRank === 3 ? 'text-amber-700' :
                              isCurrentUser ? 'text-book-green' :
                                'text-book-text/60'
                          }`}>
                          #{actualRank}
                        </div>
                        <div className="relative shrink-0">
                          {entry.avatarUrl ? (
                            <img
                              src={entry.avatarUrl}
                              alt={entry.username}
                              className={`w-10 h-10 rounded-full ${isCurrentUser ? 'ring-2 ring-book-green' : ''}`}
                              crossOrigin="anonymous"
                            />
                          ) : (
                            <div className={`w-10 h-10 rounded-full bg-book-accent/20 flex items-center justify-center text-book-accent font-bold text-xs ${isCurrentUser ? 'ring-2 ring-book-green' : ''}`}>
                              {entry.username[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium text-sm truncate ${isCurrentUser ? 'text-book-green font-bold' : 'text-book-text'}`}>
                            {entry.username}
                            {isCurrentUser && <span className="ml-1 text-xs">(You)</span>}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="text-xs text-book-text/60 font-mono">
                              {formatTime(entry.timeSeconds)}
                            </div>
                            {entry.consecutivePlays && entry.consecutivePlays > 1 && (
                              <div className="bg-gradient-to-r from-amber-400 to-orange-400 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 shadow-sm flex items-center gap-0.5">
                                🔥 {entry.consecutivePlays}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                          <div className={`px-2.5 py-0.5 rounded-full text-base font-bold ${entry.won ? 'bg-book-correct text-white' : 'bg-book-absent text-book-text/70'
                            }`}>
                            {entry.attempts}
                          </div>
                          <div className="text-[9px] text-book-text/50 uppercase font-bold">
                            {entry.attempts === 1 ? 'try' : 'tries'}
                          </div>
                        </div>
                      </div>
                    );
                  };

                  return (
                    <>
                      {/* Top players */}
                      {topEntries.map((entry, idx) => renderEntry(entry, idx))}

                      {/* Gap indicator */}
                      {showGap && (
                        <div className="flex items-center justify-center py-2 text-book-text/40">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-px bg-book-border"></div>
                            <span className="text-xs">•••</span>
                            <div className="w-8 h-px bg-book-border"></div>
                          </div>
                        </div>
                      )}

                      {/* Context around user */}
                      {contextEntries.map((entry) => {
                        const actualIndex = data.entries.findIndex(e => e.username === entry.username);
                        return renderEntry(entry, actualIndex);
                      })}
                    </>
                  );
                })()}
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
