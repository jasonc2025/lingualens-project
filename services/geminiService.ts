import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Annotation } from "../types";

/**
 * 1. 定义你的代理服务器地址
 * 请求将发往 Worker，由 Worker 注入真实的 API Key
 */
const PROXY_URL = "https://gemini-proxy.jasoncmait.workers.dev";

/**
 * 2. 初始化 Gemini 客户端
 * 关键：配置 baseUrl 指向你的 Worker 地址
 */
const getAiClient = () => {
  return new GoogleGenAI({ 
    apiKey: "PROXY_ACTIVE", // 占位符，Worker 会在后端替换它
    baseUrl: PROXY_URL      // 必须加上这一行，否则请求会直接发给 Google 导致 Key 无效
  });
};

/**
 * 翻译图像中的文本并返回坐标信息
 */
export const translateImageText = async (base64Image: string, mimeType: string = "image/jpeg"): Promise<Annotation[]> => {
  const ai = getAiClient();
  
  // 定义结构化输出 Schema
  const schema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        original: { type: Type.STRING, description: "The original English text detected." },
        translation: { type: Type.STRING, description: "The Chinese translation of the text." },
        box_2d: {
          type: Type.ARRAY,
          items: { type: Type.INTEGER },
          description: "Bounding box of the text in [ymin, xmin, ymax, xmax] format using a 0-1000 scale."
        }
      },
      required: ["original", "translation", "box_2d"]
    }
  };

  try {
    // 获取生成模型实例
    const model = ai.getGenerativeModel({ 
      model: "gemini-2.0-flash" 
    });

    const response = await model.generateContent({
      contents: [{
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image
            }
          },
          {
            text: "Identify all distinct text segments in this image. Translate English segments into Simplified Chinese. If a segment is purely numbers (e.g. '2024', '10.5') or symbols, keep the translation identical to the original. Return the result as a JSON list with bounding boxes (0-1000 scale)."
          }
        ]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
      systemInstruction: "You are an expert OCR and translation assistant. Your goal is to accurately detect text and provide translations. Do not translate numbers, currency symbols, or mathematical notation; keep them exactly as they appear in the original."
    });

    const text = response.response.text();
    if (!text) return [];
    
    return JSON.parse(text) as Annotation[];
  } catch (error) {
    console.error("Translation error:", error);
    throw new Error("Failed to translate image text.");
  }
};

/**
 * 根据用户指令编辑图像
 */
export const editImageWithPrompt = async (base64Image: string, prompt: string, mimeType: string = "image/jpeg"): Promise<string> => {
  const ai = getAiClient();

  try {
    const model = ai.getGenerativeModel({ 
      model: "gemini-2.0-flash" 
    });

    const response = await model.generateContent({
      contents: [{
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image
            }
          },
          {
            text: prompt
          }
        ]
      }]
    });

    // 检查响应中是否包含生成的图像数据
    if (response.response.candidates?.[0]?.content?.parts) {
      for (const part of response.response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return part.inlineData.data;
        }
      }
    }
    
    throw new Error("No image data returned from the model.");
  } catch (error) {
    console.error("Image editing error:", error);
    throw new Error("Failed to edit image.");
  }
};
