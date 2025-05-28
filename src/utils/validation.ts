/**
 * @fileoverview Validation utilities for quiz creation
 * Centralized validation functions to eliminate code duplication
 */

export const validateYoutubeUrl = (url: string): boolean => {
  if (!url) return false;
  const regExp = /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
  return regExp.test(url);
};

export const containsMeaningfulText = (text: string): boolean => {
  if (!text || text.trim().length === 0) return false;
  
  const alphanumericCount = (text.match(/[a-zA-Z0-9]/g) || []).length;
  const textLength = text.trim().length;
  
  if (alphanumericCount / textLength < 0.1) return false;
  
  const repeatedPatterns = [
    /^(.)\1{10,}$/,          // Single repeated character
    /^(..+)\1{5,}$/,         // Repeated pattern
    /^[\d\s+\-*/=.,!?;:]+$/  // Only numbers and basic punctuation
  ];
  
  return !repeatedPatterns.some(pattern => pattern.test(text.trim()));
};

export const validateFileSize = (file: File, maxSizeMB: number = 20): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type);
};

export const getYoutubeVideoId = (url: string): string | null => {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}; 