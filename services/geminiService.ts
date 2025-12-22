import { Annotation } from "../types";

/**
 * 1. 你的 CloudCone 服务器中转地址
 * 请替换为你在 1Panel 中配置的域名或 IP
 */
const PROXY_URL = "https://api.jasonx.site"; 

/**
 * 2. 基础请求函数
 */
const callGeminiApi = async (modelName: string, payload: any) => {
  // 路径使用 v1beta，这是目前功能最全的版本
  const endpoint = `${PROXY_URL}/v1beta/models/${modelName}:generateContent`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("Gemini API Error:", errorData);
    throw new Error(errorData.error?.message || `Status: ${response.status}`);
  }

  return await response.json();
};

/**
 * 3. 图像翻译主函数
 */
export const translateImageText = async (
  base64Image: string, 
  mimeType: string = "image/jpeg"
): Promise<Annotation[]> => {
  
  const payload = {
    contents: [{
      parts: [
        { inlineData: { mimeType, data: base64Image } },
        { text: "Identify text segments in this image and translate English to Simplified Chinese. Return as JSON array with 'original', 'translation', and 'box_2d' [ymin, xmin, ymax, xmax]." }
      ]
    }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "array",
        items: {
          type: "object",
          properties: {
            original: { type: "string" },
            translation: { type: "string" },
            box_2d: { type: "array", items: { type: "integer" } }
          },
          required: ["original", "translation", "box_2d"]
        }
      }
    },
    systemInstruction: {
      parts: [{ text: "You are an expert OCR and translation assistant." }]
    }
  };

  try {
    const data = await callGeminiApi("gemini-2.0-flash", payload);
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!resultText) return [];
    return JSON.parse(resultText) as Annotation[];
  } catch (error) {
    console.error("Translation Error Details:", error);
    throw new Error("翻译失败，请检查中转服务器状态。");
  }
};

/**
 * 4. 图像编辑函数
 */
export const editImageWithPrompt = async (
  base64Image: string, 
  prompt: string, 
  mimeType: string = "image/jpeg"
): Promise<string> => {
  const payload = {
    contents: [{
      parts: [
        { inlineData: { mimeType, data: base64Image } },
        { text: prompt }
      ]
    }]
  };

  try {
    const data = await callGeminiApi("gemini-2.0-flash", payload);
    const parts = data.candidates?.[0]?.content?.parts || [];
    
    for (const part of parts) {
      if (part.inlineData?.data) return part.inlineData.data;
    }
    
    return parts[0]?.text || "No response content";
  } catch (error) {
    console.error("Image editing error:", error);
    throw new Error("编辑图片失败。");
  }
};
