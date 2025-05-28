/**
 * @fileoverview Quiz Type Selector component
 * Allows users to select the type of content for quiz creation
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { QuizType, QUIZ_TYPE_CONFIG } from '@/constants/quiz';
import { Button } from '@/components/shared/Button';
import styles from './QuizTypeSelector.module.scss';

interface QuizTypeSelectorProps {
  selectedType?: QuizType;
  onTypeSelect: (type: QuizType) => void;
  disabled?: boolean;
}

export const QuizTypeSelector = ({ 
  selectedType, 
  onTypeSelect, 
  disabled = false 
}: QuizTypeSelectorProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (triggerRef.current?.contains(event.target as Node)) {
        return;
      }
      
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleTypeSelect = (type: QuizType) => {
    onTypeSelect(type);
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    if (!disabled) {
      setIsMenuOpen(!isMenuOpen);
    }
  };

  const currentConfig = selectedType ? QUIZ_TYPE_CONFIG[selectedType] : null;

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>What would you like to create a quiz from?</h2>
      <p className={styles.subtitle}>Choose your content source to get started</p>
      
      <div className={styles.selectorWrapper}>
        <Button
          ref={triggerRef}
          onClick={toggleMenu}
          variant="outline"
          size="large"
          fullWidth
          disabled={disabled}
          className={styles.triggerButton}
        >
          {currentConfig ? (
            <>
              <span className={styles.selectedIcon}>{currentConfig.icon}</span>
              <span className={styles.selectedText}>
                <span className={styles.selectedTitle}>{currentConfig.title}</span>
                <span className={styles.selectedDescription}>{currentConfig.description}</span>
              </span>
            </>
          ) : (
            <>
              <span className={styles.placeholderIcon}>📋</span>
              <span className={styles.placeholderText}>Select content type</span>
            </>
          )}
          <span className={`${styles.chevron} ${isMenuOpen ? styles.open : ''}`}>▼</span>
        </Button>

        {isMenuOpen && (
          <div 
            ref={menuRef}
            className={styles.dropdown}
          >
            {(Object.keys(QUIZ_TYPE_CONFIG) as QuizType[]).map((type) => {
              const config = QUIZ_TYPE_CONFIG[type];
              const isSelected = selectedType === type;
              
              return (
                <button
                  key={type}
                  onClick={() => handleTypeSelect(type)}
                  className={`${styles.option} ${isSelected ? styles.selected : ''}`}
                >
                  <span className={styles.optionIcon}>{config.icon}</span>
                  <div className={styles.optionContent}>
                    <span className={styles.optionTitle}>{config.title}</span>
                    <span className={styles.optionDescription}>{config.description}</span>
                  </div>
                  {isSelected && <span className={styles.checkmark}>✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}; 