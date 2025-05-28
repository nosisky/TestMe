/**
 * @fileoverview Custom hook for file upload handling
 * Centralizes file upload state and validation logic
 */

import { useState, useCallback, useRef } from 'react';
import { validateFileSize, validateFileType } from '@/utils/validation';

interface FileUploadState {
  file: File | null;
  previewUrl: string | null;
  isUploading: boolean;
  error: string;
}

interface UseFileUploadOptions {
  allowedTypes: string[];
  maxSizeMB?: number;
  allowPreview?: boolean;
}

export const useFileUpload = (options: UseFileUploadOptions) => {
  const { allowedTypes, maxSizeMB = 20, allowPreview = true } = options;
  
  const [state, setState] = useState<FileUploadState>({
    file: null,
    previewUrl: null,
    isUploading: false,
    error: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateState = useCallback((updates: Partial<FileUploadState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const validateFile = useCallback((file: File): boolean => {
    // Reset error state
    updateState({ error: '' });

    // Validate file type
    if (!validateFileType(file, allowedTypes)) {
      const allowedTypesStr = allowedTypes.map(type => type.split('/')[1]).join(', ');
      updateState({ error: `Invalid file type. Allowed types: ${allowedTypesStr}` });
      return false;
    }

    // Validate file size
    if (!validateFileSize(file, maxSizeMB)) {
      updateState({ error: `File size too large. Maximum size: ${maxSizeMB}MB` });
      return false;
    }

    return true;
  }, [allowedTypes, maxSizeMB, updateState]);

  const generatePreview = useCallback((file: File) => {
    if (!allowPreview || !file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      updateState({ previewUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  }, [allowPreview, updateState]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    
    if (!selectedFile) {
      updateState({ file: null, previewUrl: null, error: '' });
      return;
    }

    if (validateFile(selectedFile)) {
      updateState({ file: selectedFile });
      generatePreview(selectedFile);
    } else {
      // Clear the input if validation fails
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [validateFile, generatePreview, updateState]);

  const handleFileButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const clearFile = useCallback(() => {
    setState({
      file: null,
      previewUrl: null,
      isUploading: false,
      error: ''
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const uploadFile = useCallback(async (uploadUrl: string, additionalData?: Record<string, string | number | boolean>) => {
    if (!state.file) {
      updateState({ error: 'No file selected' });
      return { success: false, error: 'No file selected' };
    }

    updateState({ isUploading: true, error: '' });

    try {
      const formData = new FormData();
      formData.append('file', state.file);
      
      if (additionalData) {
        Object.entries(additionalData).forEach(([key, value]) => {
          formData.append(key, String(value));
        });
      }

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      updateState({ isUploading: false });
      
      return { success: true, data: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      updateState({ isUploading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, [state.file, updateState]);

  return {
    ...state,
    fileInputRef,
    handleFileSelect,
    handleFileButtonClick,
    clearFile,
    uploadFile,
    validateFile
  };
}; 