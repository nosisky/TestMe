import { promises as fsPromises } from 'fs';
import pdfParse from 'pdf-parse';

/**
 * Extracts text from a PDF file
 * @param filePath Path to the PDF file
 * @returns Extracted text from the PDF
 */
export async function extractTextFromPdf(filePath: string): Promise<string> {
  try {
    // Read PDF file
    const dataBuffer = await fsPromises.readFile(filePath);
    
    // Parse PDF
    const data = await pdfParse(dataBuffer);
    
    // Return the text content
    return data.text;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF');
  }
}

/**
 * Get the number of pages in a PDF file
 * @param filePath Path to the PDF file
 * @returns Number of pages in the PDF
 */
export async function getPdfPageCount(filePath: string): Promise<number> {
  try {
    const dataBuffer = await fsPromises.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    
    return data.numpages;
  } catch (error) {
    console.error('Error getting PDF page count:', error);
    throw new Error('Failed to get PDF page count');
  }
}

/**
 * Validates if a PDF is within the allowed page limit
 * @param filePath Path to the PDF file
 * @param maxPages Maximum allowed pages
 * @returns Boolean indicating if the PDF is valid
 */
export async function validatePdfSize(filePath: string, maxPages: number = 5): Promise<boolean> {
  try {
    const pageCount = await getPdfPageCount(filePath);
    return pageCount <= maxPages;
  } catch (error) {
    console.error('Error validating PDF size:', error);
    throw new Error('Failed to validate PDF size');
  }
}

/**
 * Validates the extracted PDF content to ensure it's suitable for question generation
 * @param content The text content from the PDF
 * @throws Error if validation fails
 */
export function validatePdfContent(content: string): void {
  if (!content) {
    throw new Error('PDF content is empty');
  }
  
  if (content.trim().length < 100) {
    throw new Error('PDF content is too short for question generation (minimum 100 characters)');
  }
  
  // Check for potentially problematic content
  if (content.trim().length > 100000) {
    throw new Error('PDF content is too large (maximum 50,000 characters)');
  }
  
  // Additional validations can be added as needed
} 