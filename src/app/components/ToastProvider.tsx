/**
 * @author: Nas Abdulrasaq(nosisky@gmail.com)
 * Email: nosisky@gmail.com
 * Github: https://github.com/nosisky
 */
'use client';

import { Toaster } from 'react-hot-toast';

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          background: 'var(--card-bg, #fff)',
          color: 'var(--text, #333)',
          border: '1px solid var(--border-color, #eaeaea)',
          fontSize: '14px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        },
        success: {
          iconTheme: {
            primary: 'var(--success-color, #10b981)',
            secondary: '#fff',
          },
        },
        error: {
          iconTheme: {
            primary: 'var(--error-color, #ef4444)',
            secondary: '#fff',
          },
          style: {
            border: '1px solid var(--error-border, rgba(239, 68, 68, 0.2))',
          },
        },
      }}
    />
  );
} 