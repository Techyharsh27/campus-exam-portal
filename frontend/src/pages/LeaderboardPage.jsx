import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentExamService } from '../services/api';
import { Loader } from '../components/Loader';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';

export default function LeaderboardPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);

  usePageTitle('Leaderboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await studentExamService.getLeaderboard(examId);
        setLeaderboard(res.data.data);
      } catch (err) {
        console.error('Failed to fetch leaderboard', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [examId]);

  if (loading) return <Loader fullScreen />;

  return (
    <div className="min-h-screen bg-gray-50 p-6 sm:p-10">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-black text-gray-900 mb-2">🏆 Leaderboard</h1>
            <p className="text-gray-500 font-medium">Top performers for this examination</p>
          </div>
          <button
            onClick={() => navigate('/student')}
            className="px-6 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
          >
            ← Back to Dashboard
          </button>
        </header>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="px-6 py-4 font-black uppercase tracking-wider text-xs">Rank</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-xs">Student Name</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-xs">Total Score</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-xs text-center">Time Taken</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-xs text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leaderboard.map((student) => {
                const isTop3 = student.rank <= 3;
                const isMe = student.studentId === user?.id;
                const medal = student.rank === 1 ? '🥇' : student.rank === 2 ? '🥈' : student.rank === 3 ? '🥉' : null;

                return (
                  <tr key={student.rank} className={`hover:bg-gray-50 transition-colors ${isMe ? 'bg-indigo-600/10 ring-2 ring-indigo-600 z-10' : isTop3 ? 'bg-indigo-50/30' : ''}`}>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <span className={`h-8 w-8 flex items-center justify-center rounded-lg font-black text-sm ${student.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                            student.rank === 2 ? 'bg-gray-100 text-gray-700' :
                              student.rank === 3 ? 'bg-orange-100 text-orange-700' :
                                'bg-gray-50 text-gray-400'
                          }`}>
                          {student.rank}
                        </span>
                        {medal && <span className="text-lg">{medal}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className={`font-bold ${isMe ? 'text-indigo-900' : 'text-gray-900'}`}>
                        {student.name} {isMe && '(You)'}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-xl font-black text-indigo-600">{student.score}/80</p>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <p className="text-sm font-bold text-gray-500">{Math.floor(student.timeTaken / 60)}m {student.timeTaken % 60}s</p>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-black text-gray-300 uppercase">Section-wise</span>
                        <div className="flex gap-2 text-[10px] font-bold">
                          <span className="text-blue-500">R:{student.sectionWise.reasoning}</span>
                          <span className="text-purple-500">V:{student.sectionWise.verbal}</span>
                          <span className="text-teal-500">N:{student.sectionWise.numerical}</span>
                          <span className="text-orange-500">C:{student.sectionWise.core}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {leaderboard.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-20 text-center">
                    <p className="text-gray-400 font-bold">No results available yet.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
