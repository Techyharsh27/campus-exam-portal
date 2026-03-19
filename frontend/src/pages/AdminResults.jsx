import React, { useEffect, useState } from 'react';
import { resultService } from '../services/api';
import { Loader } from '../components/Loader';

export default function AdminResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    resultService.getAllResults()
      .then((r) => setResults(r.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = results.filter(
    (r) =>
      r.student?.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.exam?.title?.toLowerCase().includes(search.toLowerCase()) ||
      r.student?.rollNumber?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Loader />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">📊 All Results</h2>
        <input
          type="text"
          placeholder="Search by student or exam..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-64"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-12">No results found</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-6 py-3 text-left">Student</th>
                <th className="px-6 py-3 text-left">Roll No</th>
                <th className="px-6 py-3 text-left">Exam</th>
                <th className="px-6 py-3 text-center">Score</th>
                <th className="px-6 py-3 text-center">Percentage</th>
                <th className="px-6 py-3 text-center">Submitted At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{r.student?.name}</td>
                  <td className="px-6 py-4 text-gray-500">{r.student?.rollNumber}</td>
                  <td className="px-6 py-4 text-gray-600">{r.exam?.title}</td>
                  <td className="px-6 py-4 text-center font-semibold text-indigo-600">{r.score}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`font-bold text-sm px-2 py-0.5 rounded-full ${r.percentage >= 60 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      {r.percentage?.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-gray-400 text-xs">{new Date(r.submittedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
