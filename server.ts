import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize GoogleGenAI client lazy-loaded to prevent crashing if the key is missing on startup
let aiClient: GoogleGenAI | null = null;
function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in the backend environment variables.');
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

// AI Food parsing endpoint
app.post('/api/ai-log', async (req, res) => {
  const { text, language } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid food description' });
  }

  try {
    const ai = getAiClient();
    const isRu = language === 'ru';
    
    const systemPrompt = isRu
      ? 'Вы — эксперт-нутрициолог. Пациент сообщает, что он съел. Проанализируйте текст, разделите на продукты, определите примерный вес, калории, белки, углеводы и жиры всей порции. Сделайте вывод в формате JSON.'
      : 'You are an advanced nutritionist. The user describes what they ate. Formulate an assessment listing the food items, portions, and estimating calories, protein (g), carbs (g), and fats (g). Return the response in the specified JSON format.';

    const contents = `Analyze what the user ate: "${text}". Language preferred for output: ${isRu ? 'Russian' : 'English'}. Please estimate calories, protein, carbs and fat for the absolute total values based on estimated or implied portion size. Provide a short friendly summary text explaining the breakdown.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['name', 'calories', 'protein', 'carbs', 'fat', 'summary'],
          properties: {
            name: {
              type: Type.STRING,
              description: isRu ? 'Короткое название блюда (например: Овсянка с бананом)' : 'A short summarizing name of the food combo (e.g. Oats with banana)',
            },
            calories: {
              type: Type.INTEGER,
              description: 'Estimated total calories of the entire portion (kcal).',
            },
            protein: {
              type: Type.NUMBER,
              description: 'Estimated total protein of the entire portion (grams).',
            },
            carbs: {
              type: Type.NUMBER,
              description: 'Estimated total carbohydrates of the entire portion (grams).',
            },
            fat: {
              type: Type.NUMBER,
              description: 'Estimated total fat of the entire portion (grams).',
            },
            summary: {
              type: Type.STRING,
              description: isRu 
                ? 'Короткое (1-2 предложения) резюме анализа продуктов и объяснение калорийности.' 
                : 'A short, encouraging explanation of the estimated weight and individual macros breakdown.',
            },
          },
        },
      },
    });

    const resultText = response.text.trim();
    const resultJson = JSON.parse(resultText);
    res.json(resultJson);
  } catch (error: any) {
    console.error('Error calling Gemini API:', error);
    res.status(500).json({ error: error.message || 'Gemini processing failed' });
  }
});

// Vite server integrations
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
