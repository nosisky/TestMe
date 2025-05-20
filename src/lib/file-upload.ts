import { IncomingForm } from 'formidable';
import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import os from 'os';
import { IncomingMessage } from 'http';

// Define the allowed file types
const allowedFileTypes = ['application/pdf'];
const maxFileSize = 20 * 1024 * 1024; // 20MB

export interface UploadedFile {
  filepath: string;
  originalFilename: string;
  mimetype: string;
  size: number;
}

/**
 * Process file upload from a request
 * @param req Next.js request object
 * @returns Promise with the uploaded file information
 */
export async function processFileUpload(req: NextRequest): Promise<UploadedFile> {
  const uploadDir = path.join(os.tmpdir(), 'testme-uploads');
  
  // Ensure upload directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({
      uploadDir,
      keepExtensions: true,
      maxFileSize,
      filename: (_name, _ext, part) => {
        const uniqueFilename = `${randomUUID()}${path.extname(part.originalFilename || '')}`;
        return uniqueFilename;
      }
    });
    
    // Cast NextRequest to IncomingMessage for formidable
    form.parse(req as unknown as IncomingMessage, (err, _fields, files) => {
      if (err) {
        return reject(new Error('File upload failed'));
      }
      
      // Get the uploaded file
      const fileArray = files.file;
      
      if (!fileArray || fileArray.length === 0) {
        return reject(new Error('No file uploaded'));
      }
      
      const file = fileArray[0];
      
      // Validate file type
      if (!allowedFileTypes.includes(file.mimetype || '')) {
        // Remove the invalid file
        fs.unlinkSync(file.filepath);
        return reject(new Error('Invalid file type. Only PDF files are allowed'));
      }
      
      // Return the file information
      resolve({
        filepath: file.filepath,
        originalFilename: file.originalFilename || 'unknown',
        mimetype: file.mimetype || 'application/octet-stream',
        size: file.size || 0
      });
    });
  });
}

/**
 * Cleanup temporary uploaded file
 * @param filepath Path to the temporary file
 */
export function cleanupUploadedFile(filepath: string): void {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch (error) {
    console.error('Error cleaning up file:', error);
  }
} 