import { Annotation } from "../types";

/**
 * 1. 代理服务器配置
 */
const PROXY_URL = "https://gemini-proxy.jasoncmait.workers.dev";

/**
 * 2. 基础请求函数
 */
const callGeminiApi = async (modelName: string, payload: any) => {
  // 构建标准的 Google API 路径
  // 路径格式必须严格为: /v1beta/models/{model}:generateContent
  const endpoint = `${PROXY_URL}/v1beta/models/${modelName}:generateContent`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload)
  });

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("Gemini API Error Response:", responseData);
    throw new Error(
      responseData.error?.message || `请求失败 (Status: ${response.status})`
    );
  }

  return responseData;
};

/**
 * 3. 图像翻译主函数
 */
export const translateImageText = async (
  base64Image: string, 
  mimeType: string = "image/jpeg"
): Promise<Annotation[]> => {
  
  // 构建符合 Google 要求的请求体
  const payload = {
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
      // fetch 模式下直接定义 Schema 对象
      responseSchema: {
        type: "array",
        items: {
          type: "object",
          properties: {
            original: { type: "string" },
            translation: { type: "string" },
            box_2d: { 
              type: "array", 
              items: { type: "integer" } 
            }
          },
          required: ["original", "translation", "box_2d"]
        }
      }
    },
    systemInstruction: {
      parts: [{
        text: "You are an expert OCR and translation assistant. Your goal is to accurately detect text and provide translations. Do not translate numbers, currency symbols, or mathematical notation; keep them exactly as they appear in the original."
      }]
    }
  };

  try {
    // 使用稳定性最好的模型版本
    const data = await callGeminiApi("gemini-1.5-flash-latest", payload);
    
    // 解析返回的 JSON 字符串
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!resultText) {
      console.warn("API 没有返回有效文本数据");
      return [];
    }
    
    return JSON.parse(resultText) as Annotation[];
  } catch (error) {
    console.error("Translation Error Details:", error);
    throw new Error("翻译图片失败，请检查网络或 API 配置。");
  }
};

/**
 * 4. 图像编辑/对话函数
 */
export const editImageWithPrompt = async (
  base64Image: string, 
  prompt: string, 
  mimeType: string = "image/jpeg"
): Promise<string> => {
  const payload = {
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
  };

  try {
    const data = await callGeminiApi("gemini-1.5-flash-latest", payload);
    const parts = data.candidates?.[0]?.content?.parts || [];
    
    // 优先寻找 Base64 格式的返回图像
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        return part.inlineData.data;
      }
    }
    
    // 如果没有图像，返回文本内容
    return parts[0]?.text || "No response content";
  } catch (error) {
    console.error("Image editing error:", error);
    throw new Error("编辑图片失败。");
  }
};
