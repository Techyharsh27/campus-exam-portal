import React, { useEffect, useState } from 'react';
import { studentService } from '../services/api';
import { Loader } from '../components/Loader';
import toast from 'react-hot-toast';

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [deletedStudents, setDeletedStudents] = useState([]);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await studentService.getAuthorizedStudents();
        setStudents(res.data.data || []);
      } catch (err) {
        console.error('Failed to fetch students', err);
        toast.error('Failed to load students');
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  useEffect(() => {
    if (showDeleted) {
      const fetchDeleted = async () => {
        try {
          const res = await studentService.getDeletedStudents();
          setDeletedStudents(res.data.data || []);
        } catch (err) {
          console.error('Failed to fetch deleted students', err);
          toast.error('Failed to load deleted students');
        }
      };
      fetchDeleted();
    }
  }, [showDeleted]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name}?`)) return;

    try {
      const res = await studentService.deleteStudent(id);
      const deletedStudent = res.data.data;
      
      // Update local state
      setStudents(prev => prev.filter(s => s.id !== id));
      setDeletedStudents(prev => [deletedStudent, ...prev]);

      // Show toast with Undo button
      toast.success(
        (t) => (
          <div className="flex items-center gap-3">
            <span>Student removed successfully</span>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                handleRestore(id);
              }}
              className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
            >
              UNDO
            </button>
          </div>
        ),
        { duration: 15000 } // Give user 15 seconds to undo
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove student');
    }
  };

  const handleRestore = async (id) => {
    try {
      await studentService.restoreStudent(id);
      
      // Update local states
      const restoredStudent = deletedStudents.find(s => s.id === id);
      if (restoredStudent) {
        setDeletedStudents(prev => prev.filter(s => s.id !== id));
        setStudents(prev => [restoredStudent, ...prev]);
      } else {
        // Fallback: refresh both
        const [activeRes, deletedRes] = await Promise.all([
          studentService.getAuthorizedStudents(),
          studentService.getDeletedStudents()
        ]);
        setStudents(activeRes.data.data || []);
        setDeletedStudents(deletedRes.data.data || []);
      }
      
      toast.success('Student restored successfully');
    } catch (err) {
      toast.error('Failed to restore student');
    }
  };

  const currentList = showDeleted ? deletedStudents : students;

  const filtered = currentList.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 leading-tight">PRE-AUTHORIZED STUDENTS</h2>
          <p className="text-sm text-gray-500">View and manage students allowed to register</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200">
            <button
              onClick={() => setShowDeleted(false)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${!showDeleted ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              ACTIVE
            </button>
            <button
              onClick={() => setShowDeleted(true)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${showDeleted ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              DELETED
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-80 pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 grayscale opacity-40 text-sm">🔍</span>
          </div>
        </div>
      </div>

      <div className={`bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden ${showDeleted ? 'border-rose-100 ring-2 ring-rose-50' : ''}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                <th className="px-8 py-6 text-left">Student Info</th>
                <th className="px-8 py-6 text-left">Roll Number</th>
                <th className="px-8 py-6 text-left">DOB</th>
                <th className="px-8 py-6 text-left">Section</th>
                <th className="px-8 py-6 text-center">Status</th>
                <th className="px-8 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-8 py-20 text-center">
                    <div className="grayscale opacity-20 text-5xl mb-4">👥</div>
                    <p className="text-gray-400 font-bold">No authorization records found</p>
                  </td>
                </tr>
              ) : (
                filtered.map((student) => (
                  <tr key={student.id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center text-lg grayscale group-hover:grayscale-0 transition-all">
                          👤
                        </div>
                        <div>
                          <p className="font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{student.name}</p>
                          <p className="text-xs text-gray-400 font-medium">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-gray-600 font-bold">{student.rollNumber}</td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-black">
                        {student.dob ? new Date(student.dob).toLocaleDateString('en-GB').replace(/\//g, '-') : 'N/A'}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-black uppercase tracking-wider">
                        {student.section || 'N/A'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${student.isRegistered ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {student.isRegistered ? 'Registered' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      {!showDeleted ? (
                        <button
                          onClick={() => handleDelete(student.id, student.name)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all font-black text-xs uppercase tracking-widest flex items-center gap-2 ml-auto"
                        >
                          <span className="opacity-60 text-base">🗑️</span>
                          Delete
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRestore(student.id)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all font-black text-xs uppercase tracking-widest flex items-center gap-2 ml-auto"
                        >
                          <span className="opacity-60 text-base">↩️</span>
                          Restore
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
