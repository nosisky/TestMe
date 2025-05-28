/**
 * @fileoverview Reusable Button component
 * Eliminates button duplication and provides consistent styling
 */

import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react';
import styles from './Button.module.scss';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'outline';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ 
  variant = 'primary', 
  size = 'medium', 
  loading = false,
  fullWidth = false,
  children,
  disabled,
  className,
  ...props 
}, ref) => {
  const baseClass = styles.button;
  const variantClass = styles[variant];
  const sizeClass = styles[size];
  const loadingClass = loading ? styles.loading : '';
  const fullWidthClass = fullWidth ? styles.fullWidth : '';
  
  const combinedClassName = [
    baseClass,
    variantClass,
    sizeClass,
    loadingClass,
    fullWidthClass,
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      ref={ref}
      className={combinedClassName}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <span className={styles.spinner} />
          Loading...
        </>
      ) : children}
    </button>
  );
});

Button.displayName = 'Button'; 