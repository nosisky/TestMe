/**
 * @fileoverview Reusable Breadcrumb component
 * Provides consistent navigation breadcrumbs across the application
 */

'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './Breadcrumb.module.scss';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: ReactNode;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  showBackButton?: boolean;
  backButtonText?: string;
  className?: string;
}

export const Breadcrumb = ({ 
  items, 
  showBackButton = true, 
  backButtonText = "Back",
  className 
}: BreadcrumbProps) => {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <nav className={`${styles.breadcrumb} ${className || ''}`} aria-label="Breadcrumb">
      {showBackButton && (
        <button 
          onClick={handleBack}
          className={styles.backButton}
          type="button"
        >
          <span className={styles.backIcon}>←</span>
          {backButtonText}
        </button>
      )}
      
      <ol className={styles.breadcrumbList}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return (
            <li key={index} className={styles.breadcrumbItem}>
              {item.icon && <span className={styles.itemIcon}>{item.icon}</span>}
              
              {item.href && !isLast ? (
                <Link href={item.href} className={styles.breadcrumbLink}>
                  {item.label}
                </Link>
              ) : (
                <span className={`${styles.breadcrumbText} ${isLast ? styles.current : ''}`}>
                  {item.label}
                </span>
              )}
              
              {!isLast && <span className={styles.separator}>›</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}; 