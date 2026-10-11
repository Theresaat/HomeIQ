import { GoogleGenAI } from '@google/genai';

export function createGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error('Missing required backend environment variable: GEMINI_API_KEY.');
  return new GoogleGenAI({ apiKey, vertexai: false, httpOptions: { timeout: 30_000 } });
}
