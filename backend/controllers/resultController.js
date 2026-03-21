const resultService = require('../services/resultService');
const PDFDocument = require('pdfkit');

const getMyResults = async (req, res) => {
    try {
        const results = await resultService.getStudentResults(req.user.id);
        res.status(200).json({ success: true, data: results });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const getAllResults = async (req, res) => {
    try {
        const results = await resultService.getAllResults();
        res.status(200).json({ success: true, data: results });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const getExamResults = async (req, res) => {
    try {
        const results = await resultService.getResultsByExam(req.params.examId);
        res.status(200).json({ success: true, data: results });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const downloadResultPDF = async (req, res) => {
    try {
        const result = await resultService.getResultById(req.params.id);
        
        if (!result) {
            return res.status(404).json({ success: false, message: 'Result not found' });
        }

        // Authorization: Only the student who owns the result or an ADMIN can download it
        if (req.user.role !== 'ADMIN' && req.user.id !== result.studentId) {
            return res.status(403).json({ success: false, message: 'Not authorized to download this result' });
        }

        // Create PDF
        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        // Set Headers
        const filename = `Result_${result.student.name.replace(/[^a-z0-9]/gi, '_')}.pdf`;
        res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-type', 'application/pdf');

        doc.pipe(res);

        // Styling constants
        const primaryColor = '#4f46e5'; // Indigo-600

        // Title
        doc.fontSize(22).fillColor(primaryColor).text('CAMPUS EXAMINATION PORTAL', { align: 'center' });
        doc.fontSize(14).fillColor('#666666').text('REPORTS: PERFORMANCE SUMMARY', { align: 'center' });
        doc.moveDown(1);
        
        // Divider
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').stroke();
        doc.moveDown(2);

        // Student Info
        doc.fontSize(12).fillColor('#000000');
        doc.text(`Student Name: ${result.student.name}`);
        doc.text(`Roll Number: ${result.student.rollNumber}`);
        doc.text(`Exam: ${result.exam?.title || 'Examination'}`);
        doc.text(`Date & Time: ${new Date(result.submittedAt).toLocaleString()}`);
        doc.moveDown(2);

        // Summary Cards Section
        const cardY = doc.y;
        
        // Total Score
        doc.rect(50, cardY, 140, 60).fillAndStroke('#f3f4f6', '#e5e7eb');
        doc.fillColor(primaryColor).fontSize(10).text('TOTAL SCORE', 50, cardY + 15, { width: 140, align: 'center' });
        doc.fontSize(16).text(`${result.totalScore}/80`, 50, cardY + 35, { width: 140, align: 'center' });

        // Percentage
        doc.rect(210, cardY, 140, 60).fillAndStroke('#ecfdf5', '#d1fae5');
        doc.fillColor('#047857').fontSize(10).text('PERCENTAGE', 210, cardY + 15, { width: 140, align: 'center' });
        doc.fontSize(16).text(`${result.percentage.toFixed(1)}%`, 210, cardY + 35, { width: 140, align: 'center' });

        // Rank
        doc.rect(370, cardY, 140, 60).fillAndStroke('#fffbeb', '#fef3c7');
        doc.fillColor('#b45309').fontSize(10).text('ALL INDIA RANK', 370, cardY + 15, { width: 140, align: 'center' });
        doc.fontSize(16).text(`#${result.rank || 'N/A'}`, 370, cardY + 35, { width: 140, align: 'center' });

        doc.y = cardY + 90;

        // Section Breakdown
        doc.fillColor('#000000').fontSize(14).text('Section-wise Performance');
        doc.moveDown(1);

        const drawTableRow = (label, score, isHeader = false) => {
            const y = doc.y;
            doc.rect(50, y, 300, 30).fill(isHeader ? primaryColor : (doc.y % 60 === 0 ? '#f9fafb' : '#ffffff'));
            doc.fillColor(isHeader ? '#ffffff' : '#000000').fontSize(11);
            doc.text(label, 60, y + 10);
            doc.text(score, 250, y + 10, { width: 90, align: 'right' });
            doc.y = y + 30;
        };

        drawTableRow('Section Name', 'Marks Obtained', true);
        drawTableRow('Reasoning Ability', `${result.reasoningScore}/20`);
        drawTableRow('Verbal Ability', `${result.verbalScore}/20`);
        drawTableRow('Numerical Ability', `${result.numericalScore}/20`);
        drawTableRow('Core Questions', `${result.coreScore}/20`);

        doc.moveDown(3);

        // Footer
        doc.fontSize(10).fillColor('#9ca3af').text('This is an electronically generated report. Signatures are not required.', { align: 'center' });
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });

        // Finalize
        doc.end();

    } catch (error) {
        console.error('PDF Generation Error:', error);
        // Can't send JSON if headers are already sent, but if we error before piping:
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Failed to generate PDF' });
        }
    }
};

module.exports = {
    getMyResults,
    getAllResults,
    getExamResults,
    downloadResultPDF
};
