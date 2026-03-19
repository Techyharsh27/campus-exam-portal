import React, { useEffect } from 'react';
import { Button } from './Button';

export const Modal = ({ isOpen, onClose, title, children, footer, size = 'md' }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidth = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  }[size];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center outline-none focus:outline-none">
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className={`relative w-full ${maxWidth} mx-auto my-6 p-4`}>
        <div className="relative flex w-full flex-col rounded-xl bg-white shadow-2xl outline-none focus:outline-none">
          {/* Header */}
          <div className="flex items-start justify-between rounded-t border-b border-gray-100 p-5">
            <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
            <button
              className="ml-auto border-0 bg-transparent p-1 text-3xl font-semibold leading-none text-gray-400 outline-none hover:text-gray-900 focus:outline-none"
              onClick={onClose}
            >
              <span className="block h-6 w-6 text-2xl outline-none focus:outline-none">×</span>
            </button>
          </div>
          
          {/* Body */}
          <div className="relative flex-auto p-6">{children}</div>
          
          {/* Footer */}
          {footer ? (
            <div className="flex items-center justify-end rounded-b border-t border-gray-100 p-5">
              {footer}
            </div>
          ) : (
             <div className="flex items-center justify-end rounded-b border-t border-gray-100 p-5 gap-2">
                 <Button variant="secondary" onClick={onClose}>Close</Button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
