import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import { GoogleGenAI } from '@google/genai';
import { text } from 'stream/consumers';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

const __fiename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__fiename);

const app = express();
const upload = multer();

const GEMINI_MODEL = 'gemini-2.5-flash';
const PORT = process.env.PORT || 3000;

const modelMapper = {
  'flash': 'gemini-2.5-flash',
  'flash-lite': 'gemini-2.5-flash-lite'
}

const determineGeminiModel = (key) => {
  return modelMapper[key] ?? GEMINI_MODEL;
}

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_AI_STUDIO_API_KEY,
});

app.use(cors());

app.use(express.json());


app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
  console.log(`Open this link http://localhost:${PORT}`);
})

const extractGeneratedText = (resp) => {
    try {
        const text = resp?.response?.candidates?.[0]?.content?.parts?.[0]?.text ??
        resp?.candidates?.[0]?.content?.parts?.[0]?.text ??
        resp?.response?.candidates?.[0]?.content?.text;

        return text ?? JSON.stringify(resp, null, 2);
    } catch (err) {
        console.error('Error extracting generated text:', err);
        return JSON.stringify(resp, null, 2);
    }
}

app.use(express.static(path.join(__dirname, 'public')));  

// Generate Text
app.post('/generate-text', async (req, res) => {
  try {
    // console.log(req.body);

    // Destructuring
    // const {prompt} = req.body;
    const prompt = req.body?.prompt;
    
    if (!prompt) {
      return res.status(400).json({error: 'Prompt is required'});
    }

    const resp = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    res.json({result: extractGeneratedText(resp)});
  } catch (err) {
    res.status(500).json({message: err.message});
  }
});

app.post('/chat', async (req, res) => {
  try {
    if (!req.body) {
      return res.json(400, "Request body is required");
    }
    
    const { messages } = req.body;

    if (!messages) {
      return res.json(400, "Message is required");
    }

    const payload = messages.map(
      msg => {
        return {
          role: msg.role,
          parts: [
            { text: msg.content }
          ]
        }
      }
    )

    const aiResponse = await ai.models.generateContent({
      model: determineGeminiModel('flash'),
      contents: payload,
      config: {
        systemInstruction: 'Anda adalah AI yang gaul dan suka bercanda. Anda akan menjawab pertanyaan dengan cara yang menyenangkan dan menghibur.',

      }
    });
    res.json({reply: extractGeneratedText(aiResponse)});
  } catch (e) {
    res.status(500).json({message: e.message});
  }
})

app.post('/generate-text-from-image', upload.single('image'), async (req, res) => {
  try {
    const prompt = req.body?.prompt;
    
    if (!prompt) {
      return res.status(400).json({error: 'Prompt is required'});
    }

    const file = req.file;

    if (!file) {
      return res.status(400).json({error: 'File image is required'});
    }

    const imgBase64 = file.buffer.toString('base64');
    const resp = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { text: prompt },
        { inlineData: {mimeType: file.mimetype, data: imgBase64} }
      ]
    });

    res.json({result: extractGeneratedText(resp)});
  }
  catch (err) {
    res.status(500).json({message: err.message});
  }
});