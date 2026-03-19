import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generateResultPDF = (result, studentName) => {
  const doc = new jsPDF();

  // Header Colors & Theme
  const primaryColor = [79, 70, 229]; // Indigo-600

  // Title
  doc.setFontSize(22);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('CAMPUS EXAMINATION PORTAL', 105, 20, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setTextColor(100);
  doc.text('REPORTS: PERFORMANCE SUMMARY', 105, 30, { align: 'center' });

  // Divider
  doc.setLineWidth(0.5);
  doc.setDrawColor(230);
  doc.line(20, 35, 190, 35);

  // Student Info
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(`Student Name: ${studentName}`, 20, 45);
  doc.text(`Exam: ${result.exam?.title || 'Examination'}`, 20, 52);
  doc.text(`Date & Time: ${new Date(result.submittedAt).toLocaleString()}`, 20, 59);

  // Result Summary Cards (Visual Style)
  doc.setFillColor(245, 247, 255);
  doc.roundedRect(20, 65, 50, 25, 3, 3, 'F');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFontSize(10);
  doc.text('TOTAL SCORE', 45, 73, { align: 'center' });
  doc.setFontSize(16);
  doc.text(`${result.totalScore}/80`, 45, 83, { align: 'center' });

  doc.setFillColor(240, 253, 244);
  doc.roundedRect(80, 65, 50, 25, 3, 3, 'F');
  doc.setTextColor(22, 101, 52);
  doc.setFontSize(10);
  doc.text('PERCENTAGE', 105, 73, { align: 'center' });
  doc.setFontSize(16);
  doc.text(`${result.percentage.toFixed(1)}%`, 105, 83, { align: 'center' });

  doc.setFillColor(255, 251, 235);
  doc.roundedRect(140, 65, 50, 25, 3, 3, 'F');
  doc.setTextColor(146, 64, 14);
  doc.setFontSize(10);
  doc.text('ALL INDIA RANK', 165, 73, { align: 'center' });
  doc.setFontSize(16);
  doc.text(`#${result.rank || 'N/A'}`, 165, 83, { align: 'center' });

  // Section-wise Breakdown Table
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.text('Section-wise Performance', 20, 105);

  const sections = [
    ['Reasoning Ability', `${result.reasoningScore}/20`],
    ['Verbal Ability', `${result.verbalScore}/20`],
    ['Numerical Ability', `${result.numericalScore}/20`],
    ['Core Questions', `${result.coreScore}/20`],
  ];

  doc.autoTable({
    startY: 110,
    head: [['Section Name', 'Marks Obtained']],
    body: sections,
    theme: 'striped',
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 5 },
    columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 70, halign: 'center' } }
  });

  // Footer
  const finalY = doc.lastAutoTable.finalY + 20;
  doc.setFontSize(10);
  doc.setTextColor(150);
  doc.text('This is an electronically generated report. Signatures are not required.', 105, finalY, { align: 'center' });
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, finalY + 7, { align: 'center' });

  // Save the PDF
  doc.save(`${studentName}_${result.exam?.title || 'Result'}.pdf`);
};
