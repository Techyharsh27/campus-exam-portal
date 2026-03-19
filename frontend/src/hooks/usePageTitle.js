import { useEffect } from 'react';

export function usePageTitle(title) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title ? `${title} | Campus Exam Portal` : 'Campus Exam Portal';
    return () => {
      document.title = prevTitle;
    };
  }, [title]);
}
