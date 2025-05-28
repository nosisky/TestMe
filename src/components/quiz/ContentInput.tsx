/**
 * @fileoverview Content Input component
 * Handles different types of content input based on quiz type
 */

'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { QuizType, QUIZ_TYPE_CONFIG } from '@/constants/quiz';
import { useFileUpload } from '@/hooks/useFileUpload';
import { validateYoutubeUrl, containsMeaningfulText } from '@/utils/validation';
import { Button } from '@/components/shared/Button';
import styles from './ContentInput.module.scss';

interface ContentInputProps {
  quizType: QuizType;
  content: string;
  onContentChange: (content: string) => void;
  onValidationChange: (isValid: boolean) => void;
  disabled?: boolean;
}

export const ContentInput = ({
  quizType,
  content,
  onContentChange,
  onValidationChange,
  disabled = false
}: ContentInputProps) => {
  const [textInput, setTextInput] = useState(content);
  const [error, setError] = useState('');
  
  const config = QUIZ_TYPE_CONFIG[quizType];
  const isFileUpload = quizType === 'pdf' || quizType === 'image';
  
  const fileUpload = useFileUpload({
    allowedTypes: config.allowedFileTypes || [],
    maxSizeMB: config.maxFileSize || 20,
    allowPreview: quizType === 'image'
  });

  const validateContent = useCallback((value: string) => {
    setError('');
    
    if (!value.trim()) {
      setError('Please provide content for your quiz');
      onValidationChange(false);
      return false;
    }

    if (quizType === 'youtube') {
      if (!validateYoutubeUrl(value)) {
        setError('Please enter a valid YouTube URL');
        onValidationChange(false);
        return false;
      }
    } else if (quizType === 'text') {
      if (!containsMeaningfulText(value)) {
        setError('Please provide meaningful text content');
        onValidationChange(false);
        return false;
      }
    }

    onValidationChange(true);
    return true;
  }, [quizType, onValidationChange]);

  const handleTextChange = useCallback((value: string) => {
    setTextInput(value);
    onContentChange(value);
    validateContent(value);
  }, [onContentChange, validateContent]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    fileUpload.handleFileSelect(event);
    if (event.target.files?.[0]) {
      onContentChange(event.target.files[0].name);
      onValidationChange(true);
    }
  }, [fileUpload, onContentChange, onValidationChange]);

  if (isFileUpload) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>
          <span className={styles.icon}>{config.icon}</span>
          {config.title}
        </h3>
        
        <div className={styles.fileUploadArea}>
          <input
            ref={fileUpload.fileInputRef}
            type="file"
            accept={config.allowedFileTypes?.join(',')}
            onChange={handleFileSelect}
            className={styles.hiddenInput}
            disabled={disabled}
          />
          
          {!fileUpload.file ? (
            <div 
              className={styles.uploadDropzone}
              onClick={fileUpload.handleFileButtonClick}
            >
              <div className={styles.uploadIcon}>{config.icon}</div>
              <h4>Drop your {config.title.toLowerCase()} here</h4>
              <p>or click to browse</p>
              <Button variant="outline" disabled={disabled}>
                Choose File
              </Button>
            </div>
          ) : (
            <div className={styles.filePreview}>
              <div className={styles.fileInfo}>
                <span className={styles.fileName}>{fileUpload.file.name}</span>
                <span className={styles.fileSize}>
                  {Math.round(fileUpload.file.size / 1024)} KB
                </span>
              </div>
              {fileUpload.previewUrl && (
                <Image 
                  src={fileUpload.previewUrl} 
                  alt="Preview" 
                  width={100}
                  height={100}
                  className={styles.imagePreview}
                />
              )}
              <Button 
                onClick={fileUpload.clearFile}
                variant="secondary"
                size="small"
              >
                Remove
              </Button>
            </div>
          )}
        </div>
        
        {(fileUpload.error || error) && (
          <div className={styles.error}>
            {fileUpload.error || error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>
        <span className={styles.icon}>{config.icon}</span>
        {config.title}
      </h3>
      
      {quizType === 'youtube' ? (
        <input
          type="url"
          value={textInput}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={config.placeholder}
          className={styles.textInput}
          disabled={disabled}
        />
      ) : (
        <textarea
          value={textInput}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={config.placeholder}
          className={styles.textArea}
          rows={8}
          disabled={disabled}
        />
      )}
      
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}; 