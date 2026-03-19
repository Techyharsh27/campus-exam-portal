import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { studentExamService, warningService, securityService } from '../services/api';
import { Loader } from '../components/Loader';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  LineElement, 
  PointElement, 
  ArcElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { generateResultPDF } from '../utils/ResultPDF';
import { usePageTitle } from '../hooks/usePageTitle';

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  LineElement, 
  PointElement, 
  ArcElement, 
  Title, 
  Tooltip, 
  Legend
);

const MAX_WARNINGS = 3;
const SECTIONS = ['REASONING', 'VERBAL', 'NUMERICAL', 'CORE'];

export default function ExamPage() {
  const { examId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  usePageTitle('Live Exam');

  const [questions, setQuestions] = useState([]);
  const [attemptId, setAttemptId] = useState(null);
  const [activeSection, setActiveSection] = useState('REASONING');
  const [answers, setAnswers] = useState({});
  const [currentIdx, setCurrentIdx] = useState(0); // Index within current section
  const [timeLeft, setTimeLeft] = useState(0);
  const [warnings, setWarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [warningMsg, setWarningMsg] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const answersRef = useRef({});

  useEffect(() => { answersRef.current = answers; }, [answers]);

  const handleSubmit = useCallback(async (auto = false) => {
    if (isSubmitting || !!result) return;
    setIsSubmitting(true);
    try {
      const res = await studentExamService.submitExam(examId, attemptId, answersRef.current);
      setResult(res.data.data);
      if (document.fullscreenElement) {
        document.exitFullscreen?.();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Submission failed');
      navigate('/student');
    } finally {
      setIsSubmitting(false);
    }
  }, [examId, attemptId, navigate, isSubmitting, result]);

  const lockExam = useCallback(async (reason) => {
    if (!!result || isLocked) return;
    setIsLocked(true);
    setWarningMsg(`❌ EXAM LOCKED: ${reason}`);
    
    try {
      await securityService.reportViolation(attemptId, reason);
      if (document.fullscreenElement) {
        document.exitFullscreen?.();
      }
    } catch (err) {
      console.error('Failed to report violation', err);
    }
  }, [attemptId, isLocked, result]);

  const enterFullscreen = () => {
    document.documentElement.requestFullscreen?.();
    setIsFullscreen(true);
  };

  useEffect(() => {
    if (!!result || isLocked) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        lockExam('Tab/Browser switch detected');
      }
    };

    const handleBlur = () => {
      lockExam('Window lost focus');
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        lockExam('Fullscreen exited');
        setIsFullscreen(false);
      }
    };

    const handleKeyDown = (e) => {
      // Block Alt key
      if (e.altKey) {
        e.preventDefault();
        lockExam('Alt key pressed');
        return;
      }

      // Block F12 (DevTools)
      if (e.key === 'F12') {
        e.preventDefault();
        lockExam('DevTools access attempted (F12)');
        return;
      }

      // Block Ctrl combinations
      if (e.ctrlKey) {
        const forbidden = ['c', 'v', 'u', 'i', 's', 'p', 'j', 'Shift'];
        if (forbidden.includes(e.key) || forbidden.includes(e.code)) {
          e.preventDefault();
          lockExam(`Forbidden keyboard combination: Ctrl + ${e.key}`);
          return;
        }
      }
    };

    const disableContextMenu = (e) => {
      e.preventDefault();
      // Optional: don't lock on just right click, but per requirements we can if we want.
      // Requirements say "Disable: Right-click", doesn't say "Lock on right-click".
    };

    const disableCopyPaste = (e) => {
      e.preventDefault();
      lockExam('Copy/Paste attempted');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', disableContextMenu);
    document.addEventListener('copy', disableCopyPaste);
    document.addEventListener('paste', disableCopyPaste);
    document.addEventListener('selectstart', disableCopyPaste);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', disableContextMenu);
      document.removeEventListener('copy', disableCopyPaste);
      document.removeEventListener('paste', disableCopyPaste);
      document.removeEventListener('selectstart', disableCopyPaste);
    };
  }, [lockExam, result, isLocked, isFullscreen]);

  useEffect(() => {
    if (!!result || timeLeft <= 0 || isLocked) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [handleSubmit, result, timeLeft, isLocked]);

  // Auto-save state every 30 seconds
  useEffect(() => {
    if (!attemptId || !!result || isLocked) return;
    const saveInterval = setInterval(async () => {
      try {
        await studentExamService.saveState(examId, {
          attemptId,
          currentQuestionIndex: currentIdx,
          remainingTime: timeLeft
        });
      } catch (err) {
        console.error('State save failed', err);
      }
    }, 30000);
    return () => clearInterval(saveInterval);
  }, [examId, attemptId, currentIdx, timeLeft, result, isLocked]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await studentExamService.startExam(examId);
        const { exam, attemptId: aid, questions: qs, attempt, currentQuestionIndex, remainingTime } = res.data.data;
        setQuestions(qs);
        setAttemptId(aid);
        
        if (attempt?.isLocked) {
          setIsLocked(true);
          setWarningMsg(`❌ EXAM LOCKED: Please contact admin.`);
        }

        // Restore state if resume
        if (currentQuestionIndex !== undefined) {
          // currentQuestionIndex is global cross-section index? 
          // Actually, let's assume it's global for simplicity or per-section.
          // Based on service, it's global.
          setCurrentIdx(currentQuestionIndex % 20);
          const sections = ['REASONING', 'VERBAL', 'NUMERICAL', 'CORE'];
          setActiveSection(sections[Math.floor(currentQuestionIndex / 20)]);
        }

        if (remainingTime !== undefined && remainingTime !== null) {
          setTimeLeft(remainingTime);
        } else {
          // Calculate remaining time from first start
          const end = new Date(exam.endTime);
          const now = new Date();
          const durationSeconds = exam.duration * 60;
          const potentialRemaining = Math.floor((end - now) / 1000);
          setTimeLeft(Math.min(durationSeconds, potentialRemaining));
        }

      } catch (err) {
        alert(err.response?.data?.message || 'Failed to start exam');
        navigate('/student');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [examId, navigate]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (loading) return <Loader fullScreen />;

  if (result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-indigo-600 p-8 text-white text-center">
            <h2 className="text-3xl font-bold mb-2">Exam Result</h2>
            <p className="opacity-90">Thank you for appearing for the examination.</p>
          </div>
          <div className="p-8">
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="bg-indigo-50 p-6 rounded-2xl text-center">
                <p className="text-sm text-indigo-600 font-semibold mb-1">Total Score</p>
                <p className="text-4xl font-black text-indigo-900">{result.totalScore}/80</p>
              </div>
              <div className="bg-green-50 p-6 rounded-2xl text-center">
                <p className="text-sm text-green-600 font-semibold mb-1">Percentage</p>
                <p className="text-4xl font-black text-green-900">{result.percentage.toFixed(1)}%</p>
              </div>
              <div className="bg-orange-50 p-6 rounded-2xl text-center">
                <p className="text-sm text-orange-600 font-semibold mb-1">Rank</p>
                <p className="text-4xl font-black text-orange-900">#{result.rank}</p>
              </div>
            </div>

            <h3 className="font-bold text-gray-900 mb-4 px-1">Section-wise Performance</h3>
            <div className="space-y-3 mb-8">
              {[
                { name: 'Reasoning', score: result.reasoningScore },
                { name: 'Verbal Ability', score: result.verbalScore },
                { name: 'Numerical Ability', score: result.numericalScore },
                { name: 'Core Questions', score: result.coreScore },
              ].map(sec => (
                <div key={sec.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="font-medium text-gray-700">{sec.name}</span>
                  <span className="font-bold text-gray-900">{sec.score}/20</span>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => generateResultPDF(result, user?.name)}
                className="flex-1 bg-green-50 text-green-700 font-bold py-4 rounded-xl hover:bg-green-100 transition-colors flex items-center justify-center gap-2"
              >
                <span>📥</span> Download PDF
              </button>
              <button
                onClick={() => navigate('/student')}
                className="flex-1 bg-gray-100 text-gray-700 font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate(`/student/leaderboard/${examId}`)}
                className="flex-1 bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition-colors"
              >
                View Leaderboard 🏆
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="fixed inset-0 bg-red-900 flex flex-col items-center justify-center text-white text-center px-4 z-[9999] select-none">
        <div className="text-8xl mb-6 animate-pulse">🔒</div>
        <h2 className="text-4xl font-black mb-4 uppercase tracking-tighter">Exam Locked</h2>
        <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 max-w-lg">
          <p className="text-xl font-bold mb-6 text-red-100">
            "Exam locked due to suspicious activity. Contact admin."
          </p>
          <div className="space-y-4 text-sm text-red-200 opacity-80">
            <p>Reason: {warningMsg.replace('❌ EXAM LOCKED: ', '') || 'Security Violation'}</p>
            <p>Attempt ID: <span className="font-mono text-white">{attemptId}</span></p>
          </div>
        </div>
        <button
          onClick={() => navigate('/student')}
          className="mt-8 bg-white text-red-900 font-black py-4 px-10 rounded-2xl hover:bg-gray-100 transition-all active:scale-95 shadow-2xl"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (!isFullscreen) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex flex-col items-center justify-center text-white text-center px-4">
        <div className="text-6xl mb-6">🖥️</div>
        <h2 className="text-2xl font-bold mb-3">Fullscreen Required</h2>
        <p className="text-gray-300 mb-6 max-w-sm">This exam must be taken in fullscreen mode. Any attempt to exit fullscreen will count as a warning.</p>
        <button
          onClick={enterFullscreen}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-8 rounded-xl transition-colors"
        >
          Enter Fullscreen & Start Exam
        </button>
      </div>
    );
  }

  const sectionQuestions = questions.filter(q => q.section === activeSection);
  const q = sectionQuestions[currentIdx];
  const answeredCount = Object.keys(answers).length;
  const timerRed = timeLeft < 60;
  const options = ['A', 'B', 'C', 'D'];

  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col select-none">
      {warningMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white text-sm font-semibold px-6 py-3 rounded-full shadow-xl animate-bounce text-center">
          {warningMsg}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between z-10">
        <div>
          <h1 className="font-bold text-gray-900">CAMPUS Online Exam</h1>
          <p className="text-xs text-gray-400">{user?.name} | {activeSection}</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-4 text-sm text-gray-600">
            <div>Answered: <span className="font-bold text-indigo-600">{answeredCount}/80</span></div>
            <div>Warnings: <span className={`font-bold ${warnings > 0 ? 'text-red-500' : 'text-gray-700'}`}>{warnings}/{MAX_WARNINGS}</span></div>
          </div>
          <div className={`px-4 py-2 rounded-xl font-mono font-bold text-lg ${timerRed ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-indigo-50 text-indigo-700'}`}>
            ⏱ {formatTime(timeLeft)}
          </div>
        </div>
      </header>

      {/* Section Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 flex items-center gap-1 overflow-x-auto no-scrollbar">
        {SECTIONS.map((sec) => (
          <button
            key={sec}
            onClick={() => {
              setActiveSection(sec);
              setCurrentIdx(0);
            }}
            className={`px-6 py-3 text-sm font-bold whitespace-nowrap transition-all border-b-2 ${activeSection === sec
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
          >
            {sec.charAt(0) + sec.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-6">
          {/* Question Area */}
          <div className="flex-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6 min-h-[400px]">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider">
                  {activeSection} - Q{currentIdx + 1}
                </span>
              </div>
              <p className="text-xl font-bold text-gray-900 leading-relaxed mb-6">{q?.questionText}</p>

              {q?.questionType === 'GRAPH' && q?.graphData && (
                <div className="mb-8 p-4 bg-gray-50 rounded-2xl border border-gray-100 flex justify-center h-[300px]">
                  {q.graphType === 'bar' && (
                    <Bar 
                      data={{
                        labels: q.graphData.labels,
                        datasets: [{
                          label: 'Value',
                          data: q.graphData.values,
                          backgroundColor: 'rgba(79, 70, 229, 0.6)',
                          borderRadius: 8
                        }]
                      }} 
                      options={{ maintainAspectRatio: false, responsive: true }}
                    />
                  )}
                  {q.graphType === 'line' && (
                    <Line 
                      data={{
                        labels: q.graphData.labels,
                        datasets: [{
                          label: 'Value',
                          data: q.graphData.values,
                          borderColor: 'rgb(79, 70, 229)',
                          tension: 0.3,
                          fill: true,
                          backgroundColor: 'rgba(79, 70, 229, 0.1)'
                        }]
                      }} 
                      options={{ maintainAspectRatio: false, responsive: true }}
                    />
                  )}
                  {q.graphType === 'pie' && (
                    <Pie 
                      data={{
                        labels: q.graphData.labels,
                        datasets: [{
                          data: q.graphData.values,
                          backgroundColor: [
                            'rgba(79, 70, 229, 0.6)',
                            'rgba(245, 158, 11, 0.6)',
                            'rgba(16, 185, 129, 0.6)',
                            'rgba(239, 68, 68, 0.6)',
                            'rgba(107, 114, 128, 0.6)'
                          ]
                        }]
                      }} 
                      options={{ maintainAspectRatio: false, responsive: true }}
                    />
                  )}
                </div>
              )}

              <div className="space-y-4">
                {q?.options.map((optContent, i) => {
                  const optLabels = ['A', 'B', 'C', 'D'];
                  const label = optLabels[i];
                  const isSelected = answers[q?.id] === optContent;
                  return (
                    <button
                      key={i}
                      onClick={() => setAnswers({ ...answers, [q.id]: optContent })}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${isSelected
                          ? 'border-indigo-600 bg-indigo-50 shadow-md transform scale-[1.01]'
                          : 'border-gray-100 bg-gray-50 hover:border-indigo-200 hover:bg-white'
                        }`}
                    >
                      <span className={`h-10 w-10 flex items-center justify-center rounded-full text-base font-black flex-shrink-0 transition-colors ${isSelected ? 'bg-indigo-600 text-white' : 'bg-white border-2 border-gray-200 text-gray-400'
                        }`}>{label}</span>
                      <span className={`text-lg font-medium ${isSelected ? 'text-indigo-900' : 'text-gray-700'}`}>{optContent}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer Navigation */}
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                disabled={currentIdx === 0}
                className="px-8 py-3 rounded-2xl border-2 border-gray-200 bg-white text-gray-700 font-bold hover:bg-gray-50 disabled:opacity-40 transition-all active:scale-95"
              >
                ← Prev
              </button>

              <div className="flex gap-4">
                <button
                  onClick={() => setAnswers({ ...answers, [q.id]: undefined })}
                  className="text-gray-400 text-sm font-bold hover:text-red-500 transition-colors"
                >
                  Clear Selection
                </button>
                {currentIdx < sectionQuestions.length - 1 ? (
                  <button
                    onClick={() => setCurrentIdx((i) => i + 1)}
                    className="px-8 py-3 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const nextSecIdx = SECTIONS.indexOf(activeSection) + 1;
                      if (nextSecIdx < SECTIONS.length) {
                        setActiveSection(SECTIONS[nextSecIdx]);
                        setCurrentIdx(0);
                      } else {
                        if (window.confirm('Are you sure you want to submit the exam?')) {
                          handleSubmit(false);
                        }
                      }
                    }}
                    className={`px-8 py-3 rounded-2xl font-bold transition-all active:scale-95 shadow-lg ${activeSection === 'CORE'
                        ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-200'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                      }`}
                  >
                    {activeSection === 'CORE' ? 'Submit Exam' : 'Next Section →'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Question Grid Sidebar */}
          <aside className="w-full md:w-64 bg-white rounded-2xl border border-gray-100 p-6 flex flex-col h-fit">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Question Status</h3>
            <div className="grid grid-cols-5 gap-2">
              {sectionQuestions.map((sq, i) => {
                const isAnswered = answers[sq.id];
                const isCurrent = i === currentIdx;
                
                let bgColor = 'bg-gray-50';
                let textColor = 'text-gray-400';
                let ring = '';

                if (isCurrent) {
                  bgColor = 'bg-indigo-50';
                  textColor = 'text-indigo-700';
                  ring = 'ring-2 ring-indigo-600';
                } else if (isAnswered) {
                  bgColor = 'bg-green-500';
                  textColor = 'text-white';
                } else {
                  // Not answered -> Red as per requirements
                  bgColor = 'bg-rose-50 border border-rose-100';
                  textColor = 'text-rose-400';
                }

                return (
                  <button
                    key={sq.id}
                    onClick={() => setCurrentIdx(i)}
                    className={`h-10 w-full text-sm font-bold rounded-xl transition-all ${bgColor} ${textColor} ${ring}`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 space-y-3">
              <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                <div className="w-3 h-3 bg-rose-50 border border-rose-100 rounded-sm"></div>
                <span>Not Answered</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                <div className="w-3 h-3 bg-indigo-50 ring-1 ring-indigo-600 rounded-sm"></div>
                <span>Current</span>
              </div>
            </div>

            {isSubmitting && (
              <div className="mt-6 p-4 bg-indigo-50 rounded-xl flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-bold text-indigo-700">Submitting...</span>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
