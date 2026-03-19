import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { examService, resultService, studentService, securityService } from '../services/api';
import { Loader } from '../components/Loader';
import AdminExams from './AdminExams';
import AdminResults from './AdminResults';
import AdminStudents from './AdminStudents';
import { usePageTitle } from '../hooks/usePageTitle';

function AdminHome({ exams, results, lockedAttempts, onRefresh }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setUploadResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target.result;
        const firstLine = text.split(/\r?\n/)[0];
        
        // Auto-detect delimiter
        let sep = ',';
        const counts = {
            ',': (firstLine.match(/,/g) || []).length,
            ';': (firstLine.match(/;/g) || []).length,
            '\t': (firstLine.match(/\t/g) || []).length
        };
        if (counts[';'] > counts[',']) sep = ';';
        if (counts['\t'] > counts[','] && counts['\t'] > counts[';']) sep = '\t';

        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length === 0) return;

        const headers = lines[0].split(sep).map(h => h.replace(/[^\x20-\x7E]/g, '').trim().replace(/^["']|["']$/g, ''));
        const data = lines.slice(1, 6).map(line => {
            const values = line.split(sep).map(v => v.trim().replace(/^["']|["']$/g, ''));
            const obj = {};
            headers.forEach((h, i) => {
                if (h) obj[h] = values[i] || '';
            });
            return obj;
        });
        setPreview(data);
    };
    reader.readAsText(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await studentService.uploadCSV(formData);
      setUploadResult({
        success: true,
        data: res.data.data
      });
      setFile(null);
      // Reset file input
      document.getElementById('csv-upload').value = '';
    } catch (err) {
      console.error('Upload failed', err);
      setUploadResult({
        success: false,
        message: err.response?.data?.message || 'Upload failed'
      });
    } finally {
      setUploading(false);
    }
  };
  const handleUnlock = async (attemptId) => {
    if (!window.confirm('Are you sure you want to unlock this student? They will be able to resume their exam.')) return;
    try {
      await securityService.unlockAttempt(attemptId);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to unlock student');
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Exams', value: exams.length, icon: '📝', color: 'bg-indigo-50 text-indigo-700' },
          { label: 'Total Results', value: results.length, icon: '📊', color: 'bg-green-50 text-green-700' },
          { label: 'Unique Students', value: new Set(results.map((r) => r.studentId)).size, icon: '👥', color: 'bg-purple-50 text-purple-700' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`text-3xl h-14 w-14 flex items-center justify-center rounded-xl ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CSV Upload Section */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>📤</span> Authorize Students (CSV)
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          Upload a CSV file with headers: <code className="bg-gray-100 px-1 rounded text-gray-700">university_rollno, student_name, section, Date of birth, official email_id</code> to allow students to register.
        </p>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <input
            id="csv-upload"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className={`px-6 py-2 rounded-full font-bold text-white transition-all ${!file || uploading ? 'bg-gray-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg'}`}
          >
            {uploading ? 'Uploading...' : 'Import Students'}
          </button>
        </div>

        {file && preview.length > 0 && !uploadResult && (
          <div className="mt-6 border border-gray-100 rounded-2xl overflow-hidden bg-gray-50/50">
            <div className="px-4 py-2 bg-gray-100 border-b border-gray-200 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Pre-Import Preview (First 5 Rows)</span>
              <span className="text-[10px] font-bold text-indigo-600">Detected format: {file.name}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] text-left">
                <thead>
                  <tr className="bg-white border-b border-gray-100">
                    {Object.keys(preview[0]).map(h => (
                      <th key={h} className="px-4 py-2 font-black text-gray-400 uppercase tracking-tighter">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {preview.map((row, i) => (
                    <tr key={i} className="bg-white/50">
                      {Object.values(row).map((v, j) => (
                        <td key={j} className="px-4 py-2 text-gray-600 truncate max-w-[150px]">{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {uploadResult && (
          <div className={`mt-6 p-4 rounded-xl border ${uploadResult.success ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
            {uploadResult.success ? (
              <div className="flex items-start gap-3">
                <span className="text-green-600 text-xl">✅</span>
                <div>
                  <p className="font-bold text-green-800">Import Successful!</p>
                  <div className="text-sm text-green-700 mt-1 flex gap-4">
                    <span>Processed: <strong>{uploadResult.data.success}</strong></span>
                    <span>Errors/Skipped: <strong>{uploadResult.data.skipped}</strong></span>
                  </div>
                  {uploadResult.data.errors.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-green-200">
                      <p className="text-xs font-semibold text-green-800 uppercase tracking-wider">Error Details:</p>
                      <ul className="text-xs list-disc list-inside mt-1 space-y-1">
                        {uploadResult.data.errors.slice(0, 5).map((err, i) => (
                          <li key={i} className="text-green-700">{err}</li>
                        ))}
                        {uploadResult.data.errors.length > 5 && <li className="text-green-700 italic">...and {uploadResult.data.errors.length - 5} more</li>}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <span className="text-red-500 text-xl">❌</span>
                <div>
                  <p className="font-bold text-red-800">Upload Failed</p>
                  <p className="text-sm text-red-700 mt-1">{uploadResult.message}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Locked Students Section */}
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-red-50 bg-red-50/50 flex items-center justify-between">
          <h3 className="font-bold text-red-800 flex items-center gap-2">
            <span>🔒</span> SECURITY ALERTS: Locked Students ({lockedAttempts.length})
          </h3>
          {lockedAttempts.length > 0 && <span className="animate-ping h-2 w-2 rounded-full bg-red-500"></span>}
        </div>
        {lockedAttempts.length === 0 ? (
          <p className="text-center text-gray-400 py-12 text-sm italic">No security violations detected. All systems clear. ✅</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4 text-left">Student</th>
                  <th className="px-6 py-4 text-left">Exam</th>
                  <th className="px-6 py-4 text-left">Violation Info</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lockedAttempts.map((attempt) => (
                  <tr key={attempt.id} className="hover:bg-red-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{attempt.student?.name}</p>
                      <p className="text-xs text-gray-400">{attempt.student?.rollNumber}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-700 font-medium">{attempt.exam?.title}</p>
                    </td>
                    <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-[10px] font-black uppercase tracking-wider">
                            Violations: {attempt.violationCount}
                        </span>
                        <p className="text-[10px] text-red-400 mt-1 italic">Exam locked permanently until manual intervention.</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleUnlock(attempt.id)}
                        className="bg-indigo-600 text-white text-xs font-bold py-2 px-4 rounded-xl hover:bg-indigo-700 transition-all shadow-sm active:scale-95"
                      >
                        Unlock Student
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Results */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <h3 className="font-semibold text-gray-800">Recent Submissions</h3>
        </div>
        {results.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No submissions yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-6 py-3 text-left">Student</th>
                <th className="px-6 py-3 text-left">Exam</th>
                <th className="px-6 py-3 text-center">Score</th>
                <th className="px-6 py-3 text-center">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {results.slice(0, 10).map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{r.student?.name}</td>
                  <td className="px-6 py-3 text-gray-500">{r.exam?.title}</td>
                  <td className="px-6 py-3 text-center font-semibold text-indigo-600">{r.score}</td>
                  <td className="px-6 py-3 text-center font-bold">
                    <span className={r.percentage >= 60 ? 'text-green-600' : 'text-red-500'}>{r.percentage?.toFixed(1)}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [exams, setExams] = useState([]);
  
  usePageTitle('Admin Dashboard');
  const [results, setResults] = useState([]);
  const [lockedAttempts, setLockedAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [examsRes, resultsRes, lockedRes] = await Promise.all([
        examService.getExams(), 
        resultService.getAllResults(),
        securityService.getLockedAttempts()
      ]);
      setExams(examsRes.data.data || []);
      setResults(resultsRes.data.data || []);
      setLockedAttempts(lockedRes.data.data || []);
    } catch (err) {
      console.error('Admin dashboard error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const navItems = [
    { to: '/admin', label: '🏠 Dashboard', exact: true },
    { to: '/admin/students', label: '👥 Students' },
    { to: '/admin/exams', label: '📝 Exams' },
    { to: '/admin/results', label: '📊 Results' },
  ];

  const isActive = (to, exact) => exact ? location.pathname === to : location.pathname.startsWith(to);

  if (loading) return <Loader fullScreen />;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎓</span>
          <div>
            <h1 className="font-bold text-gray-900">CAMPUS Admin</h1>
            <p className="text-xs text-gray-400">Admin Control Panel</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {navItems.map(({ to, label, exact }) => (
            <Link key={to} to={to} className={`text-sm font-medium transition-colors ${isActive(to, exact) ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}>
              {label}
            </Link>
          ))}
          <button onClick={() => { logout(); navigate('/login'); }} className="ml-2 text-sm text-red-500 hover:text-red-700 font-medium">Logout</button>
        </div>
      </nav>

      <main className="flex-1 max-w-6xl mx-auto w-full p-6">
        <Routes>
          <Route index element={<AdminHome exams={exams} results={results} lockedAttempts={lockedAttempts} onRefresh={fetchData} />} />
          <Route path="students" element={<AdminStudents />} />
          <Route path="exams/*" element={<AdminExams />} />
          <Route path="results" element={<AdminResults />} />
        </Routes>
      </main>
    </div>
  );
}
