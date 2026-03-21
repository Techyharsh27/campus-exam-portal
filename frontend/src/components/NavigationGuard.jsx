import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * NavigationGuard prevents students from navigating away from an active exam session.
 * It checks localStorage for an 'activeExamId'.
 */
export const NavigationGuard = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const activeExamId = localStorage.getItem('activeExamId');
    
    // If an exam is active and the user is NOT on the exam page or results page
    // and they are a student (implied by the route they are trying to access if nested under student)
    if (activeExamId) {
      const isExamPage = location.pathname.includes(`/student/exam/${activeExamId}`);
      
      // Allow navigation ONLY to the specific active exam page
      if (!isExamPage) {
        console.warn('Active exam session detected. Redirecting back to exam.');
        navigate(`/student/exam/${activeExamId}`, { replace: true });
      }
    }
  }, [location, navigate]);

  return <>{children}</>;
};
