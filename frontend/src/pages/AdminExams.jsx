import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { examService, questionService, uploadService } from '../services/api';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Loader } from '../components/Loader';
import { toast } from 'react-hot-toast';

// Helper to reliably format a date for datetime-local input (local time)
const toLocalISOString = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  
  // Format as YYYY-MM-DDTHH:mm using local components
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

function ExamForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || { title: '', duration: '', startTime: '', endTime: '' });
  const [saving, setSaving] = useState(false);
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    // Ensure dates are sent as ISO strings to avoid timezone shifts
    const payload = {
      ...form,
      startTime: form.startTime ? new Date(form.startTime).toISOString() : '',
      endTime: form.endTime ? new Date(form.endTime).toISOString() : ''
    };
    
    console.log('[DEBUG] Exam Form Submit:', {
       localForm: form,
       payloadUTC: {
          startTime: payload.startTime,
          endTime: payload.endTime
       }
    });
    
    try { 
      await onSave(payload); 
      toast.success('Exam saved successfully');
    } catch (err) {
      toast.error(err.message || 'Error saving exam');
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Exam Title" name="title" value={form.title} onChange={handleChange} placeholder="e.g. Midterm - Data Structures" required />
      <Input label="Duration (minutes)" name="duration" type="number" value={form.duration} onChange={handleChange} placeholder="60" required />
      <Input label="Start Time" name="startTime" type="datetime-local" value={form.startTime} onChange={handleChange} required />
      <Input label="End Time" name="endTime" type="datetime-local" value={form.endTime} onChange={handleChange} required />
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" isLoading={saving}>Save Exam</Button>
      </div>
    </form>
  );
}

const SECTIONS = ['REASONING', 'VERBAL', 'NUMERICAL', 'CORE'];
const SECTION_LABELS = {
    'REASONING': 'Reasoning',
    'VERBAL': 'Verbal Ability',
    'NUMERICAL': 'Numerical Ability',
    'CORE': 'Core Questions'
};

function QuestionList({ examId }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editQ, setEditQ] = useState(null);
  const [form, setForm] = useState({ 
    correctAnswer: '', 
    section: 'REASONING',
    questionType: 'MCQ',
    graphType: 'bar',
    graphData: '',
    imageUrl: ''
  });
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Bulk upload state
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkPreview, setBulkPreview] = useState([]);
  const [bulkResult, setBulkResult] = useState(null);

  const load = async () => {
    try {
      const res = await questionService.getQuestionsByExam(examId);
      setQuestions(res.data.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [examId]);

  const openAdd = () => { 
    setEditQ(null); 
    setForm({ 
        questionText: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctAnswer: '', 
        section: 'REASONING',
        questionType: 'MCQ',
        graphType: 'bar',
        graphData: '',
        imageUrl: ''
    }); 
    setImageFile(null);
    setImagePreview(null);
    setShowModal(true); 
  };

  const openEdit = (q) => { 
    setEditQ(q); 
    setForm({ 
      questionText: q.questionText || '',
      optionA: q.optionA || '',
      optionB: q.optionB || '',
      optionC: q.optionC || '',
      optionD: q.optionD || '',
      correctAnswer: q.correctAnswer,
      section: q.section,
      questionType: q.questionType || 'MCQ',
      graphType: q.graphType || 'bar',
      graphData: q.graphData ? JSON.stringify(q.graphData, null, 2) : '',
      imageUrl: q.imageUrl || ''
    }); 
    setImageFile(null);
    setImagePreview(q.imageUrl || null);
    setShowModal(true); 
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.correctAnswer) {
        alert('Please select the correct answer');
        return;
    }
    if (form.questionType === 'IMAGE' && !imageFile && !form.imageUrl) {
        alert('Please attach an image for image-based questions.');
        return;
    }
    setSaving(true);

    let finalImageUrl = form.imageUrl;
    if (imageFile) {
        setUploadingImage(true);
        try {
            const formData = new FormData();
            formData.append('image', imageFile);
            const res = await uploadService.uploadImage(formData);
            finalImageUrl = res.data.data.url;
        } catch (err) {
            alert('Image upload failed: ' + (err.response?.data?.message || err.message));
            setSaving(false);
            setUploadingImage(false);
            return;
        }
        setUploadingImage(false);
    }

    const payload = {
      questionText: form.questionText,
      optionA: form.optionA,
      optionB: form.optionB,
      optionC: form.optionC,
      optionD: form.optionD,
      correctAnswer: form.correctAnswer,
      section: form.section,
      questionType: form.questionType || 'MCQ',
      graphType: form.questionType === 'GRAPH' ? (form.graphType || 'bar') : null,
      graphData: form.questionType === 'GRAPH' && form.graphData ? JSON.parse(form.graphData) : null,
      imageUrl: finalImageUrl || null,
    };
    try {
      if (editQ) await questionService.updateQuestion(editQ.id, payload);
      else await questionService.addQuestion(examId, payload);

      setShowModal(false);
      load();
    } catch (err) {
      const backendMsg = err.response?.data?.message || err.message || 'Error saving question';
      alert('Save failed: ' + backendMsg);
    } finally { setSaving(false); }
  };

  const handleBulkFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBulkFile(file);
    setBulkResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target.result;
        const firstLine = text.split('\n')[0];
        
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
        const data = lines.slice(1, 11).map(line => {
            const values = line.split(sep).map(v => v.trim().replace(/^["']|["']$/g, ''));
            const obj = {};
            headers.forEach((h, i) => {
                if (h) obj[h] = values[i] || '';
            });
            return obj;
        });
        setBulkPreview(data);
    };
    reader.readAsText(file);
  };

  const handleBulkImport = async () => {
    if (!bulkFile) return;
    setSaving(true);
    const formData = new FormData();
    formData.append('file', bulkFile);
    try {
        const res = await questionService.bulkImportQuestions(examId, formData);
        setBulkResult(res.data.data);
        load();
    } catch (err) {
        alert(err.response?.data?.message || 'Bulk import failed');
    } finally {
        setSaving(false);
        setBulkFile(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this question?')) return;
    await questionService.deleteQuestion(id);
    load();
  };

  if (loading) return <Loader />;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-700">Questions ({questions.length})</h3>
        <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setShowBulkModal(true)}>📤 Bulk Import</Button>
            <Button size="sm" onClick={openAdd}>+ Add Manual</Button>
        </div>
      </div>
      
      {questions.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-6 border border-dashed rounded-xl">No questions yet. Add some!</p>
      ) : (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={q.id} className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 pr-4">
                     <div className="flex items-center gap-2 mb-1">
                       <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">{q.section}</span>
                       <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${q.questionType === 'GRAPH' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>
                         {q.questionType || 'MCQ'}
                       </span>
                       {q.imageUrl && <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded">🖼️ IMAGE</span>}
                       <span className="text-xs text-gray-400">Q{i + 1}</span>
                   </div>
                   <p className="font-medium text-gray-800">{q.questionText}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => openEdit(q)} className="text-xs text-blue-500 hover:underline">Edit</button>
                  <button onClick={() => handleDelete(q.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-sm text-gray-500">
                {[q.optionA, q.optionB, q.optionC, q.optionD].map((opt, idx) => (
                   <div key={idx} className={`p-2 rounded-lg border ${opt === q.correctAnswer ? 'bg-green-50 border-green-200 text-green-700 font-bold' : 'bg-gray-50 border-gray-100'}`}>
                      <span className="mr-2 opacity-50">{String.fromCharCode(65 + idx)}.</span>
                      {opt}
                   </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual Entry Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editQ ? 'Edit Question' : 'Add Question'} size="lg"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} isLoading={saving}>Save</Button>
          </div>
        }
      >
        <form className="space-y-3 p-1">
          <Input 
            label="Question Text" 
            name="questionText" 
            value={form.questionText} 
            onChange={(e) => setForm({ ...form, questionText: e.target.value })} 
            required 
          />
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Question Type</label>
              <select 
                value={form.questionType} 
                onChange={(e) => setForm({ ...form, questionType: e.target.value })}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="MCQ">Standard MCQ (Text only)</option>
                <option value="IMAGE">🖼️ Image Based (Image required)</option>
                <option value="GRAPH">Graph Based (JSON Chart)</option>
              </select>
            </div>
          </div>

          {form.questionType === 'GRAPH' && (
            <div className="grid grid-cols-2 gap-4 bg-amber-50 p-3 rounded-xl border border-amber-100">
              <div>
                <label className="mb-1 block text-sm font-medium text-amber-800">Graph Type</label>
                <select 
                  value={form.graphType} 
                  onChange={(e) => setForm({ ...form, graphType: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="bar">Bar Chart</option>
                  <option value="line">Line Chart</option>
                  <option value="pie">Pie Chart</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium text-amber-800">Graph Data (JSON)</label>
                <textarea 
                  value={form.graphData} 
                  onChange={(e) => setForm({ ...form, graphData: e.target.value })}
                  placeholder='{"labels": ["Jan", "Feb"], "values": [10, 20]}'
                  className="flex w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[100px]"
                />
                <p className="text-[10px] text-amber-600 mt-1">Must be valid JSON with "labels" and "values" arrays.</p>
              </div>
            </div>
          )}

          {/* Image Upload - required for IMAGE type, hidden for all other types */}
          {form.questionType === 'IMAGE' && (
            <div className="py-2 border-t border-b border-blue-100 my-2 bg-blue-50 rounded-xl px-3">
              <label className="mb-1 block text-sm font-medium text-blue-800">
                🖼️ Attach Image / Diagram <span className="text-red-500 text-xs">(Required for Image-Based Question)</span>
              </label>
              <div className="flex items-center gap-4">
                {imagePreview && (
                  <div className="relative w-20 h-20 bg-gray-50 border border-blue-200 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                    <img 
                      src={(() => {
                        const url = imagePreview.startsWith('http') || imagePreview.startsWith('data:') 
                          ? imagePreview 
                          : `${(import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '')}/uploads/${imagePreview.replace(/^.*[\\\/]/, '')}`;
                        return (url && url.startsWith('http://') && window.location.protocol === 'https:') ? url.replace('http://', 'https://') : url;
                      })()} 
                      alt="preview" 
                      className="max-h-full max-w-full object-contain" 
                      crossOrigin="anonymous"
                    />
                    <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); setForm({...form, imageUrl: ''}); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                  </div>
                )}
                <div className="flex-1">
                  <input 
                    type="file" 
                    accept="image/*"
                    required
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setImageFile(file);
                        const reader = new FileReader();
                        reader.onload = (e) => setImagePreview(e.target.result);
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                  />
                  {!imagePreview && !imageFile && <p className="text-xs text-red-500 mt-1">An image is required for image-based questions.</p>}
                </div>
              </div>
              {uploadingImage && <p className="text-xs text-blue-600 mt-1 animate-pulse">Uploading image securely...</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Section</label>
              <select 
                value={form.section} 
                onChange={(e) => setForm({ ...form, section: e.target.value })}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {SECTIONS.map((s) => <option key={s} value={s}>{SECTION_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Correct Answer</label>
              <select 
                value={form.correctAnswer} 
                onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Correct Option</option>
                <option value={form.optionA}>Option A: {form.optionA || '(Empty)'}</option>
                <option value={form.optionB}>Option B: {form.optionB || '(Empty)'}</option>
                <option value={form.optionC}>Option C: {form.optionC || '(Empty)'}</option>
                <option value={form.optionD}>Option D: {form.optionD || '(Empty)'}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <Input label="Option A" value={form.optionA} onChange={(e) => setForm({ ...form, optionA: e.target.value })} required />
            <Input label="Option B" value={form.optionB} onChange={(e) => setForm({ ...form, optionB: e.target.value })} required />
            <Input label="Option C" value={form.optionC} onChange={(e) => setForm({ ...form, optionC: e.target.value })} required />
            <Input label="Option D" value={form.optionD} onChange={(e) => setForm({ ...form, optionD: e.target.value })} required />
          </div>
        </form>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal isOpen={showBulkModal} onClose={() => setShowBulkModal(false)} title="Bulk Import Questions (CSV)" size="xl"
        footer={
            <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setShowBulkModal(false)}>Close</Button>
                <Button onClick={handleBulkImport} isLoading={saving} disabled={!bulkFile}>Import Data</Button>
            </div>
        }
      >
        <div className="space-y-6">
            <div className="bg-indigo-50 p-4 rounded-xl text-sm text-indigo-700 border border-indigo-100">
                <p className="font-bold mb-1">CSV Template Guide:</p>
                <code>questionText,optionA,optionB,optionC,optionD,correctAnswer,section</code>
                <p className="mt-2">Sections: <span className="font-semibold italic">Reasoning, Verbal Ability, Numerical Ability, Core Questions</span></p>
                <p>CorrectAnswer: <span className="font-semibold italic">A, B, C, or D</span></p>
            </div>

            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center bg-gray-50 hover:bg-white transition-colors cursor-pointer relative">
                <input type="file" accept=".csv" onChange={handleBulkFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" title="CSV files only" />
                <div className="text-3xl mb-2">📊</div>
                <p className="text-gray-500 font-medium">{bulkFile ? bulkFile.name : 'Select CSV File (Excel not supported)'}</p>
                <p className="text-xs text-gray-400 mt-1">Make sure to use "Save As" then select "CSV" in Excel</p>
            </div>

            {bulkPreview.length > 0 && !bulkResult && (
                <div className="space-y-2">
                    <h4 className="font-bold text-gray-700 text-sm">Preview (First 10 Rows)</h4>
                    <div className="max-h-60 overflow-auto border border-gray-100 rounded-xl bg-white shadow-inner">
                        <table className="w-full text-[10px] text-left">
                            <thead className="bg-gray-50 text-gray-500 sticky top-0">
                                <tr>
                                    {Object.keys(bulkPreview[0]).map(h => <th key={h} className="px-3 py-2">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {bulkPreview.map((row, i) => (
                                    <tr key={i}>
                                        {Object.values(row).map((v, j) => <td key={j} className="px-3 py-2 text-gray-700 truncate max-w-[100px]">{v}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {bulkResult && (
                <div className={`p-4 rounded-xl border ${bulkResult.failed === 0 ? 'bg-green-50 border-green-100' : 'bg-orange-50 border-orange-100'}`}>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-xl">{bulkResult.failed === 0 ? '✅' : '⚠️'}</span>
                        <p className={`font-bold ${bulkResult.failed === 0 ? 'text-green-800' : 'text-orange-800'}`}>
                            {bulkResult.failed === 0 ? 'Import Successful!' : 'Import Completed with Issues'}
                        </p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm font-semibold">
                        <div className="p-3 bg-white rounded-lg shadow-sm">
                            <p className="text-gray-400 text-[10px] uppercase">Processed</p>
                            <p className="text-gray-900">{bulkResult.total}</p>
                        </div>
                        <div className="p-3 bg-white rounded-lg shadow-sm">
                            <p className="text-green-500 text-[10px] uppercase">Success</p>
                            <p className="text-green-600">{bulkResult.success}</p>
                        </div>
                        <div className="p-3 bg-white rounded-lg shadow-sm">
                            <p className="text-red-500 text-[10px] uppercase">Failed</p>
                            <p className="text-red-600">{bulkResult.failed}</p>
                        </div>
                    </div>
                    {bulkResult.errors.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-orange-200">
                            <p className="text-xs font-bold text-orange-800 mb-2">Error Log:</p>
                            <div className="max-h-32 overflow-auto text-[10px] space-y-1 text-orange-700">
                                {bulkResult.errors.map((e, i) => <p key={i}>• {e}</p>)}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
      </Modal>
    </div>
  );
}

function ExamList() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editExam, setEditExam] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const load = async () => {
    try { const r = await examService.getExams(); setExams(r.data.data || []); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleSave = async (formPayload) => {
    if (editExam) await examService.updateExam(editExam.id, formPayload);
    else await examService.createExam(formPayload);
    setShowModal(false);
    setEditExam(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this exam and all its questions?')) return;
    await examService.deleteExam(id);
    load();
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">📝 Exam Management</h2>
        <Button onClick={() => { setEditExam(null); setShowModal(true); }}>+ Create Exam</Button>
      </div>

      {exams.length === 0 ? (
        <div className="text-center bg-white rounded-2xl p-12 text-gray-400 border border-dashed border-gray-200">No exams created yet</div>
      ) : (
        exams.map((exam) => (
          <div key={exam.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-5">
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">{exam.title}</h3>
                <p className="text-sm text-gray-400 mt-0.5">⏱ {exam.duration} min · {new Date(exam.startTime).toLocaleString()} → {new Date(exam.endTime).toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setExpandedId(expandedId === exam.id ? null : exam.id)}>
                  {expandedId === exam.id ? 'Hide Questions' : 'Manage Questions'}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => { setEditExam(exam); setShowModal(true); }}>Edit</Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(exam.id)}>Delete</Button>
              </div>
            </div>
            {expandedId === exam.id && (
              <div className="border-t border-gray-100 p-5 bg-gray-50">
                <QuestionList examId={exam.id} />
              </div>
            )}
          </div>
        ))
      )}

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditExam(null); }} title={editExam ? 'Edit Exam' : 'Create Exam'} size="md">
        <ExamForm 
          initial={editExam ? {
            ...editExam,
            startTime: toLocalISOString(editExam.startTime),
            endTime: toLocalISOString(editExam.endTime)
          } : null} 
          onSave={handleSave} 
          onCancel={() => { setShowModal(false); setEditExam(null); }} 
        />
      </Modal>
    </div>
  );
}

export default function AdminExams() {
  return (
    <Routes>
      <Route index element={<ExamList />} />
    </Routes>
  );
}
