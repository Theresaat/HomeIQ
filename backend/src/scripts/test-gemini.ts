import { createGeminiClient } from '../services/gemini.ts';

async function testGemini() {
  if (!process.env.GEMINI_API_KEY?.trim()) {
    console.error('Gemini test failed: set GEMINI_API_KEY in backend/.env.');
    process.exitCode = 1;
    return;
  }
  const client = createGeminiClient();
  const response = await client.models.generateContent({
    model: 'gemini-3.5-flash-lite',
    contents: 'Reply with the single word OK.',
    config: { maxOutputTokens: 128 },
  });
  if (!response.text?.trim()) throw new Error('Gemini returned no text.');
  console.log('Gemini connection test passed.');
}

testGemini().catch(() => {
  console.error('Gemini connection test failed. Check the backend API key, model access, quota, and network connection.');
  process.exitCode = 1;
});
