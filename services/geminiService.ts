import { GoogleGenAI, Type, Modality } from '@google/genai';
// Fix: Removed 'GenerateContentStreamResult' as it is not an exported member.
import type { GenerateContentResponse } from '@google/genai';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY environment variable not set. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

// --- Text Generation ---
export const generateText = async (prompt: string, model: 'gemini-2.5-pro' | 'gemini-2.5-flash'): Promise<string> => {
  if (!API_KEY) return "API Key not configured.";
  try {
    const response = await ai.models.generateContent({
        model,
        contents: prompt
    });
    return response.text;
  } catch (error) {
    console.error("Error generating text:", error);
    return `Error: ${(error as Error).message}`;
  }
};

export const getInLineEdit = async (text: string, action: 'improve' | 'expand' | 'summarize'): Promise<string> => {
    if (!API_KEY) return "API Key not configured.";
    let prompt = '';
    switch(action) {
        case 'improve':
            prompt = `Rewrite the following text to be more clear, engaging, and grammatically correct. Do not add any explanatory preamble, just provide the improved text:\n\n"${text}"`;
            break;
        case 'expand':
            prompt = `Expand on the following idea or scene, adding more detail and description. Do not add any explanatory preamble, just provide the expanded text:\n\n"${text}"`;
            break;
        case 'summarize':
            prompt = `Summarize the following text concisely. Do not add any explanatory preamble, just provide the summary:\n\n"${text}"`;
            break;
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return response.text.trim();
    } catch (error) {
        console.error(`Error with in-line edit (${action}):`, error);
        return `Error: ${(error as Error).message}`;
    }
};


export const generateWithThinking = async (prompt: string): Promise<string> => {
    if (!API_KEY) return "API Key not configured.";
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: 32768 }
            }
        });
        return response.text;
    } catch(e) {
        console.error("Error with thinking mode:", e);
        return `Error: ${(e as Error).message}`;
    }
};

export const generateWithSearch = async (prompt: string): Promise<{text: string; sources: any[]}> => {
    if (!API_KEY) return {text: "API Key not configured.", sources: []};
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{googleSearch: {}}]
            }
        });
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        return { text: response.text, sources: groundingChunks };
    } catch (e) {
        console.error("Error with search grounding:", e);
        return { text: `Error: ${(e as Error).message}`, sources: [] };
    }
};


// --- Image Understanding ---
export const analyzeImage = async (prompt: string, imageBase64: string, mimeType: string): Promise<string> => {
  if (!API_KEY) return "API Key not configured.";
  try {
    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType
      }
    };
    const textPart = { text: prompt };
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {parts: [imagePart, textPart]}
    });
    return response.text;
  } catch (error) {
    console.error("Error analyzing image:", error);
    return `Error: ${(error as Error).message}`;
  }
};

// --- Image Generation ---
export const generateImage = async (prompt: string, aspectRatio: string): Promise<string | null> => {
  if (!API_KEY) {
      console.error("API Key not configured.");
      return null;
  }
  try {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
            numberOfImages: 1,
            aspectRatio: aspectRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9",
        }
    });
    return response.generatedImages[0].image.imageBytes;
  } catch (error) {
    console.error("Error generating image:", error);
    return null;
  }
};


// --- Text-to-Speech (TTS) ---
export const generateSpeech = async (text: string): Promise<string | null> => {
  if (!API_KEY) return null;
  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
            },
        },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? null;
  } catch (error) {
    console.error("Error generating speech:", error);
    return null;
  }
};


// --- Audio Utilities ---
export function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

export async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

export function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export const getAiInstance = () => {
    if (!API_KEY) throw new Error("API Key not configured.");
    return new GoogleGenAI({ apiKey: API_KEY });
};