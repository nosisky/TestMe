/**
 * Test script to generate mock quiz questions
 * 
 * Usage:
 * - Set USE_MOCK_AI=true in your .env file
 * - Run with: npx ts-node src/scripts/generate-test-questions.ts
 */

import { generateQuizQuestions } from '../lib/ai-service';

// Sample content for testing
const youtubeSampleContent = `
In this video, we're going to discuss machine learning and its applications. 
Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience 
without being explicitly programmed. This technology is transforming various industries including healthcare, finance, 
and transportation. Deep learning, a specialized form of machine learning, uses neural networks to model complex patterns. 
Neural networks are inspired by the human brain's structure and function. We'll explore how these technologies are 
being used to solve real-world problems. The video will cover supervised learning, unsupervised learning, and 
reinforcement learning approaches. We'll also look at practical examples of machine learning in action including 
image recognition, natural language processing, and recommendation systems.
`;

const pdfSampleContent = `
This document explores the effects of climate change on global ecosystems. 
Climate change refers to significant, long-term changes in the global climate. 
The global average surface temperature has increased by about 1.1°C since the pre-industrial era. 
This warming is primarily driven by human activities, particularly greenhouse gas emissions. 
Carbon dioxide, methane, and nitrous oxide are the main greenhouse gases contributing to climate change. 
The effects of climate change include rising sea levels, more frequent extreme weather events, shifts in plant and animal ranges, 
and ocean acidification. Biodiversity is threatened as ecosystems struggle to adapt to rapidly changing conditions. 
Conservation strategies must include climate adaptation planning. International cooperation through agreements like 
the Paris Climate Accord aims to limit global warming to well below 2°C compared to pre-industrial levels.
`;

async function runTest() {
  console.log('Generating YouTube content quiz questions...');
  const youtubeQuiz = await generateQuizQuestions({
    content: youtubeSampleContent,
    numQuestions: 5,
    difficulty: 'medium'
  });
  
  console.log('\nGenerated YouTube Quiz Questions:');
  console.log(JSON.stringify(youtubeQuiz, null, 2));
  
  console.log('\n\nGenerating PDF content quiz questions...');
  const pdfQuiz = await generateQuizQuestions({
    content: pdfSampleContent,
    numQuestions: 5,
    difficulty: 'hard'
  });
  
  console.log('\nGenerated PDF Quiz Questions:');
  console.log(JSON.stringify(pdfQuiz, null, 2));
}

runTest().catch(console.error); 