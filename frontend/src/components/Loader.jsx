import React from 'react';

export const Loader = ({ fullScreen = false }) => {
  const loaderEl = (
    <div className="flex flex-col items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
      <p className="mt-4 text-sm text-gray-500 font-medium animate-pulse">Loading...</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        {loaderEl}
      </div>
    );
  }

  return (
    <div className="flex w-full items-center justify-center p-8">
      {loaderEl}
    </div>
  );
};
