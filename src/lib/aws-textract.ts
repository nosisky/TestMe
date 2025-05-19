import { TextractClient, AnalyzeDocumentCommand, FeatureType } from "@aws-sdk/client-textract";

/**
 * AWS Textract service for extracting text from images
 * This service uses AWS Textract to extract text from images for quiz generation
 */

// Initialize the Textract client
const textractClient = new TextractClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
  }
});

/**
 * Extract text from an image buffer using AWS Textract
 * @param imageBuffer Buffer containing the image data
 * @returns Extracted text content as a string
 */
export async function extractTextFromImage(imageBuffer: Buffer): Promise<string> {
  try {
    const params = {
      Document: {
        Bytes: imageBuffer
      },
      FeatureTypes: [FeatureType.TABLES, FeatureType.FORMS]
    };

    const command = new AnalyzeDocumentCommand(params);
    const response = await textractClient.send(command);

    // Extract and concatenate text from the response
    let textContent = "";
    
    if (response.Blocks) {
      response.Blocks.forEach(block => {
        if (block.BlockType === "LINE" && block.Text) {
          textContent += block.Text + " ";
        }
      });
    }

    return textContent.trim();
  } catch (error) {
    console.error("Error extracting text from image:", error);
    throw new Error(`Failed to extract text from image: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
} 