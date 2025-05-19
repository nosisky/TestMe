'use client';

import { ReactNode } from 'react';
import { MathJaxContext } from 'better-react-mathjax';

interface MathJaxWrapperProps {
  children: ReactNode;
}

export default function MathJaxWrapper({ children }: MathJaxWrapperProps) {
  // Configure MathJax
  const mathJaxConfig = {
    tex: {
      inlineMath: [['$', '$'], ['\\(', '\\)']],
      displayMath: [['$$', '$$'], ['\\[', '\\]']],
    },
    options: {
      enableMenu: false, // Disable the MathJax menu
    },
    startup: {
      typeset: false
    }
  };

  return (
    <MathJaxContext config={mathJaxConfig}>
      {children}
    </MathJaxContext>
  );
} 