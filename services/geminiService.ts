
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { WarmUpRequest, WarmUpResult, ClassLabels } from "../types";

// Helper for decoding base64 audio
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
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

/**
 * Extracts lesson metadata from an uploaded file (PDF/Text)
 */
export const extractMetadata = async (fileBase64: string, mimeType: string): Promise<{ unit?: string, vocabulary?: string, learningTargets?: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: fileBase64
          }
        },
        { text: "Analyze this Spanish lesson plan or vocabulary document. Extract the Unit Title, a list of key Vocabulary words, and the primary Learning Targets or Objectives. Return the result strictly as JSON." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          unit: { type: Type.STRING },
          vocabulary: { type: Type.STRING },
          learningTargets: { type: Type.STRING }
        }
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    return {};
  }
};

export const generateWarmUp = async (request: WarmUpRequest): Promise<WarmUpResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const classInfo = ClassLabels[request.classType];

  const systemPrompt = `
    Create a 5-10 minute classroom warm-up exercise for a Spanish class.
    Class Name: ${classInfo.name} (${classInfo.level})
    Unit: ${request.unit}
    Activity Type: ${request.activityType}
    
    CONTEXT:
    Vocabulary provided: ${request.vocabulary}
    Learning Targets: ${request.learningTargets}
    Lesson Plan Context: ${request.lessonPlan}

    Based on the activity type "${request.activityType}", generate:
    - If "written": A creative written task like translation, fill-in-the-blanks, or a short creative response.
    - If "spoken": A partner-based dialogue prompt or a set of "preguntas personales".
    - If "listening": A short script (in Spanish) for the teacher to read and 3 specific comprehension questions.
    - If "other": An interactive or visual task (e.g., "Draw what I describe" or a quick matching challenge).

    Make it engaging and appropriate for ${classInfo.level} level students.
    The response must be strictly JSON.
  `;

  const parts: any[] = [{ text: systemPrompt }];

  // If a file is attached, we send it along for deeper context even if we already extracted text
  if (request.attachment) {
    parts.push({
      inlineData: {
        mimeType: request.attachment.mimeType,
        data: request.attachment.base64
      }
    });
    parts.push({ text: "Reference this document for any specific formatting or examples requested in the warm-up." });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          instruction: { type: Type.STRING },
          content: { type: Type.STRING, description: 'The actual exercise content for students' },
          teacherKey: { type: Type.STRING, description: 'Answer key or teacher notes' },
          listeningScript: { type: Type.STRING, description: 'Required if activity type is listening' }
        },
        required: ["title", "instruction", "content"]
      }
    }
  });

  return JSON.parse(response.text) as WarmUpResult;
};

export const generateSpeech = async (text: string): Promise<void> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Read this Spanish text clearly and naturally: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio data returned");

  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  const audioBuffer = await decodeAudioData(decode(base64Audio), audioCtx, 24000, 1);
  const source = audioCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioCtx.destination);
  source.start();
};
