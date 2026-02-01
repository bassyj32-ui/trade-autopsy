import { GoogleGenerativeAI } from "@google/generative-ai";
import { TradeInput } from "./types";

export interface GeminiAnalysisResult {
  trades: Partial<TradeInput>[];
  feedback: string;
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F' | 'Degenerate';
}

export async function analyzeImageWithGemini(file: File, apiKey: string): Promise<GeminiAnalysisResult> {
  const genAI = new GoogleGenerativeAI(apiKey);
  // Use gemini-1.5-flash for speed and cost effectiveness
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const imagePart = await fileToGenerativePart(file);

  const prompt = `
  Analyze this trading screenshot. 
  1. Extract all trade details (Asset, Entry Price, Position Size, Stop Loss, Take Profit, PnL/Loss Amount).
  2. Analyze the quality of the trade based on visible price action, risk management, and outcome.
  3. Assign a grade: S (Perfect), A (Great), B (Good), C (Average), D (Poor), F (Fail), or Degenerate (Gambling).
  4. Provide a short, brutal, roasting feedback sentence.

  Return ONLY valid JSON in this format:
  {
    "trades": [
      {
        "asset": "EURUSD",
        "entryPrice": 1.1000,
        "positionSize": 1.0,
        "stopLoss": 1.0950,
        "takeProfit": 1.1100,
        "lossAmount": -500
      }
    ],
    "feedback": "You bought the top like a retail liquidity provider.",
    "grade": "F"
  }
  `;

  try {
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();
    
    // Clean code blocks if present
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze image with AI.");
  }
}

async function fileToGenerativePart(file: File) {
  return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
