import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { studentService } from '../services/api';
import { Loader } from '../components/Loader';
import { generateResultPDF } from '../utils/ResultPDF';
import { usePageTitle } from '../hooks/usePageTitle';

export default function StudentDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [activeExams, setActiveExams] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'upcoming' | 'completed'

  usePageTitle('Student Dashboard');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, upcomingRes, activeRes, resultsRes] = await Promise.all([
          studentService.getProfile(),
          studentService.getUpcomingExams(),
          studentService.getActiveExams(),
          studentService.getResults(),
        ]);
        setProfile(profileRes.data.data);
        setUpcomingExams(upcomingRes.data.data || []);
        setActiveExams(activeRes.data.data || []);
        setResults(resultsRes.data.data || []);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) return <Loader fullScreen />;

  const stats = [
    { label: 'Active Exams', value: activeExams.length, icon: '🔥', color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Upcoming', value: upcomingExams.length, icon: '📅', color: 'text-blue-600', bg: 'bg-blue-50' },
    { 
      label: 'Avg. Score', 
      value: results.length > 0 ? `${(results.reduce((acc, r) => acc + r.percentage, 0) / results.length).toFixed(1)}%` : 'N/A', 
      icon: '📈', color: 'text-indigo-600', bg: 'bg-indigo-50' 
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 text-xl text-white">🎓</div>
          <div>
            <h1 className="font-black text-gray-900 text-xl tracking-tight leading-none text-indigo-600">CAMPUS</h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Examination Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:block text-right">
            <p className="text-sm font-bold text-gray-900 leading-none">{profile?.name}</p>
            <p className="text-xs text-indigo-500 font-medium">{profile?.rollNumber}</p>
          </div>
          <button 
            onClick={handleLogout} 
            className="h-10 px-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6 lg:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column - Profile & Stats */}
          <div className="lg:col-span-4 space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 p-6 overflow-hidden relative">
               <div className="absolute top-0 right-0 p-8 opacity-5">
                 <span className="text-8xl">👤</span>
               </div>
               <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                 <span className="h-2 w-2 bg-indigo-600 rounded-full"></span>
                 Student Profile
               </h2>
               <div className="space-y-4 relative z-10">
                 <ProfileItem label="Full Name" value={profile?.name} />
                 <ProfileItem label="University Roll" value={profile?.rollNumber} />
                 <ProfileItem label="Section" value={profile?.section} />
                 <ProfileItem label="Email Address" value={profile?.email} />
                 <ProfileItem label="Contact" value={profile?.contactNumber} />
               </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-4">
              {stats.map((stat, i) => (
                <div key={i} className={`${stat.bg} ${stat.color} p-5 rounded-3xl flex items-center justify-between shadow-sm`}>
                  <div>
                    <p className="text-xs font-bold opacity-80 mb-1 uppercase tracking-wider">{stat.label}</p>
                    <p className="text-3xl font-black">{stat.value}</p>
                  </div>
                  <span className="text-3xl grayscale-0">{stat.icon}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Exams & Results */}
          <div className="lg:col-span-8 space-y-6">
            {/* Tabs */}
            <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-fit overflow-x-auto">
               {[
                 { id: 'active', label: 'Active', icon: '🔥' },
                 { id: 'upcoming', label: 'Upcoming', icon: '📅' },
                 { id: 'completed', label: 'History', icon: '📜' }
               ].map(tab => (
                 <button 
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id)}
                   className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-gray-500 hover:text-gray-900'}`}
                 >
                   <span>{tab.icon}</span>
                   {tab.label}
                 </button>
               ))}
            </div>

            <div className="min-h-[400px]">
              {activeTab === 'active' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeExams.length === 0 ? (
                    <EmptyState icon="⚡" message="No active exams right now" />
                  ) : (
                    activeExams.map((exam) => (
                      <ExamCard key={exam.id} exam={exam} type="active" />
                    ))
                  )}
                </div>
              )}

              {activeTab === 'upcoming' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingExams.length === 0 ? (
                    <EmptyState icon="📅" message="No upcoming exams scheduled" />
                  ) : (
                    upcomingExams.map((exam) => (
                      <ExamCard key={exam.id} exam={exam} type="upcoming" />
                    ))
                  )}
                </div>
              )}

              {activeTab === 'completed' && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50/50 text-gray-500 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                          <th className="px-6 py-5 text-left">Examination</th>
                          <th className="px-6 py-5 text-center">Score Card</th>
                          <th className="px-6 py-5 text-center">Percentage</th>
                          <th className="px-6 py-5 text-center">Date Taken</th>
                          <th className="px-6 py-5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {results.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="px-6 py-16 text-center text-gray-400 font-bold">No records found</td>
                          </tr>
                        ) : (
                          results.map((r) => (
                            <tr key={r.id} className="hover:bg-indigo-50/30 transition-colors group">
                              <td className="px-6 py-5">
                                <p className="font-black text-gray-900 uppercase">{r.exam?.title}</p>
                                <p className="text-[10px] text-gray-400 font-bold">EXAM ID: {r.examId.slice(0, 8)}</p>
                              </td>
                              <td className="px-6 py-5 text-center">
                                <span className="font-black text-indigo-600 text-base">{r.totalScore}</span>
                                <span className="text-gray-400 text-xs font-bold"> / 80</span>
                              </td>
                              <td className="px-6 py-5 text-center">
                                <span className={`px-4 py-1.5 rounded-full text-xs font-black ${r.percentage >= 60 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {r.percentage.toFixed(1)}%
                                </span>
                              </td>
                              <td className="px-6 py-5 text-center text-gray-500 font-bold text-xs uppercase">
                                {new Date(r.submittedAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                              </td>
                              <td className="px-6 py-5 text-right">
                                <button
                                  onClick={() => generateResultPDF(r, profile?.name)}
                                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2 ml-auto border border-indigo-100"
                                >
                                  <span>📥</span>
                                  PDF
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileItem({ label, value }) {
  return (
    <div className="bg-gray-50/50 p-3 rounded-2xl border border-gray-100/50">
      <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-sm font-bold text-gray-900 truncate">{value || 'Not provided'}</p>
    </div>
  );
}

function ExamCard({ exam, type }) {
  const isUpcoming = type === 'upcoming';
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-indigo-100 transition-all p-6 group">
      <div className="flex items-start justify-between mb-4">
        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-xl ${isUpcoming ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
          {isUpcoming ? '🕒' : '⚡'}
        </div>
        <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${isUpcoming ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
          {isUpcoming ? 'Upcoming' : 'Live Now'}
        </span>
      </div>
      <h3 className="text-lg font-black text-gray-900 mb-2 leading-tight group-hover:text-indigo-600 transition-colors uppercase">{exam.title}</h3>
      <div className="space-y-2 mb-6">
        <ExamDetail icon="⏱" label="Duration" value={`${exam.duration} Minutes`} />
        <ExamDetail icon="📅" label={isUpcoming ? "Starts" : "Ends"} value={new Date(isUpcoming ? exam.startTime : exam.endTime).toLocaleString()} />
      </div>
      {isUpcoming ? (
        <button disabled className="w-full bg-gray-100 text-gray-400 py-3 rounded-2xl font-bold cursor-not-allowed">
          Session Locked
        </button>
      ) : (
        <Link to={`/student/exam/${exam.id}`}>
          <button className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-bold hover:bg-gray-900 transition-all flex items-center justify-center gap-2 group/btn shadow-lg shadow-indigo-100">
            Start Exam Session
            <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
          </button>
        </Link>
      )}
    </div>
  );
}

function ExamDetail({ icon, label, value }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="grayscale opacity-50">{icon}</span>
      <span className="text-gray-400 font-medium">{label}:</span>
      <span className="text-gray-900 font-bold truncate">{value}</span>
    </div>
  );
}

function EmptyState({ icon, message }) {
  return (
    <div className="col-span-full text-center bg-white rounded-3xl p-16 border-2 border-dashed border-gray-100">
      <span className="text-5xl block mb-4 grayscale opacity-30">{icon}</span>
      <p className="text-gray-400 font-bold">{message}</p>
    </div>
  );
}
