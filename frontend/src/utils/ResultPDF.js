import { resultService } from '../services/api';

/**
 * Downloads a result PDF from the backend and triggers the browser to save it.
 * @param {Object} result - The result object containing at least the `id` and `exam`.
 * @param {string} studentName - The name of the student.
 */
export const generateResultPDF = async (result, studentName) => {
  try {
    if (!result || !result.id) {
      throw new Error('Invalid result data for PDF generation');
    }

    // Call the backend endpoint
    const response = await resultService.downloadPDF(result.id);
    
    // Create a Blob from the response data
    const blob = new Blob([response.data], { type: 'application/pdf' });
    
    // Create a URL for the Blob
    const url = window.URL.createObjectURL(blob);
    
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = url;
    
    // Set the filename
    const safeName = studentName ? studentName.replace(/[^a-z0-9]/gi, '_') : 'Student';
    const examName = result.exam?.title ? result.exam.title.replace(/[^a-z0-9]/gi, '_') : 'Exam';
    link.setAttribute('download', `${safeName}_${examName}_Result.pdf`);
    
    // Append to body, click, and clean up
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    window.setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);

  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Failed to download PDF. Please try again later.');
  }
};
