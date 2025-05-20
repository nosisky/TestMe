/**
 * @author: Nas Abdulrasaq(nosisky@gmail.com)
 * Email: nosisky@gmail.com
 * Github: https://github.com/nosisky
 */
'use client';

import { useState, useRef, FormEvent } from 'react';
import RangeSlider from '@/app/components/RangeSlider';
import LoadingOverlay from '@/app/components/LoadingOverlay';
import styles from './PdfQuizCreator.module.scss';
import QuizGeneratedSuccess from '@/app/components/quiz/QuizGeneratedSuccess';
import Header from '../Header';

interface QuizOptions {
  numQuestions: number;
  difficulty: 'easy' | 'medium' | 'hard';
  isPublic: boolean;
  tags: string;
}

export default function PdfQuizCreator() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<QuizOptions>({
    numQuestions: 5,
    difficulty: 'medium',
    isPublic: true,
    tags: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [generatedQuizId, setGeneratedQuizId] = useState<string | null>(null);
  const [showPostGenerationPrompt, setShowPostGenerationPrompt] = useState(false);
  const [shareableLink, setShareableLink] = useState('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    setError(null);
    
    if (!selectedFile) {
      setFile(null);
      return;
    }
    
    // Validate file type
    if (selectedFile.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      setFile(null);
      return;
    }
    
    // Validate file size (max 20MB)
    if (selectedFile.size > 20 * 1024 * 1024) {
      setError('File size must be less than 20MB');
      setFile(null);
      return;
    }
    
    setFile(selectedFile);
  };

  const handleOptionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setOptions(prev => ({
      ...prev,
      [name]: type === 'number' || name === 'numQuestions' ? parseInt(value) : newValue
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a PDF file');
      return;
    }
    
    setIsUploading(true);
    setError(null);
    setGeneratedQuizId(null);
    setShowPostGenerationPrompt(false);
    setShareableLink('');
    
    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append('numQuestions', options.numQuestions.toString());
      params.append('difficulty', options.difficulty);
      params.append('isPublic', options.isPublic.toString());
      if (options.tags.trim()) {
        params.append('tags', options.tags);
      }
      
      // Send the request
      const response = await fetch(`/api/pdf/generate-quiz?${params.toString()}`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate quiz');
      }
      
      // Complete the progress bar to 100%
      setTimeout(() => {
        setGeneratedQuizId(data.quiz.id);
        setShareableLink(`${window.location.origin}/quiz/${data.quiz.id}/instructions`);
        setShowPostGenerationPrompt(true);
        setIsUploading(false);
      }, 500);
      
    } catch (error) {
      setError((error as Error).message || 'An error occurred while generating the quiz');
      setIsUploading(false);
    }
  };

  if (showPostGenerationPrompt && generatedQuizId) {
    return (
      <>
      <Header />
      <QuizGeneratedSuccess 
        generatedQuizId={generatedQuizId}
        shareableLink={shareableLink}
        sourceType="pdf"
      />
      </>
    );
  }

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.fileUpload}>
          <label htmlFor="pdf-upload" className={styles.fileLabel}>
            <div className={styles.dropArea}>
              {file ? (
                <div className={styles.selectedFile}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  <span>{file.name}</span>
                  <button
                    type="button"
                    className={styles.removeFile}
                    onClick={() => setFile(null)}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <span>Drag & drop your PDF or click to browse</span>
                  <span className={styles.hint}>Max size: 20MB, Max pages: 50</span>
                </>
              )}
            </div>
            <input
              id="pdf-upload"
              type="file"
              accept="application/pdf"
              ref={fileInputRef}
              onChange={handleFileChange}
              className={styles.hiddenInput}
            />
          </label>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.quizOptions}>
          <h2>Quiz Options</h2>
          <div className={styles.optionsGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="numQuestions">Number of Questions</label>
              <div className={styles.rangeContainer}>
                <RangeSlider
                  min={3}
                  max={15}
                  value={options.numQuestions}
                  onChange={(value) => setOptions({...options, numQuestions: value as number})}
                  showLabels
                />
                <span className={styles.rangeValue}>{options.numQuestions}</span>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="difficulty">Difficulty Level</label>
              <select
                id="difficulty"
                name="difficulty"
                value={options.difficulty}
                onChange={handleOptionChange}
                className={styles.select}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  id="isPublic"
                  name="isPublic"
                  checked={options.isPublic}
                  onChange={handleOptionChange}
                  className={styles.checkbox}
                />
                <span>Public Quiz</span>
              </label>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="tags">Tags (comma separated)</label>
              <input
                type="text"
                id="tags"
                name="tags"
                value={options.tags}
                onChange={handleOptionChange}
                placeholder="e.g. science, biology, genetics"
                className={styles.input}
              />
            </div>
          </div>
        </div>

        <div className={styles.buttonContainer}>
          <button
            type="submit"
            disabled={!file || isUploading}
            className={styles.button}
          >
            {isUploading ? 'Generating Quiz...' : 'Generate Quiz'}
          </button>
        </div>
      </form>
      
      {/* Loading overlay with progress bar */}
      {isUploading && (
        <LoadingOverlay contentType="pdf" />
      )}
    </div>
  );
} 