import { Annotation } from "../types";

const PROXY_URL = "https://gemini-proxy.jasoncmait.workers.dev";

/**
 * 基础请求函数 - 尝试切回 v1beta 
 * 因为 v1beta 对 responseMimeType 等新特性的支持最完整
 */
const callGeminiApi = async (modelName: string, payload: any) => {
  // 注意：这里改回了 v1beta
  const endpoint = `${PROXY_URL}/v1beta/models/${modelName}:generateContent`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("Gemini API Error:", responseData);
    throw new Error(responseData.error?.message || `Status: ${response.status}`);
  }

  return responseData;
};

export const translateImageText = async (base64Image: string, mimeType: string = "image/jpeg"): Promise<Annotation[]> => {
  const payload = {
    contents: [{
      parts: [
        { inlineData: { mimeType, data: base64Image } },
        { text: "Identify all text segments in this image and translate English to Simplified Chinese. Return as a JSON list with bounding boxes [ymin, xmin, ymax, xmax]." }
      ]
    }],
    generationConfig: { // 1. 回到小驼峰
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
    systemInstruction: { // 2. 回到小驼峰
      parts: [{ text: "You are an expert OCR and translation assistant." }]
    }
  };

  try {
    // 3. 使用 2.0 版本，这个模型通常在 v1beta 下功能最全
    const data = await callGeminiApi("gemini-2.0-flash", payload);
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return resultText ? JSON.parse(resultText) : [];
  } catch (error) {
    console.error("Translation Error:", error);
    throw new Error("翻译失败，请检查 API 版本兼容性。");
  }
};

/**
 * 编辑图像函数
 */
export const editImageWithPrompt = async (base64Image: string, prompt: string, mimeType: string = "image/jpeg"): Promise<string> => {
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
    throw new Error("编辑图片失败。");
  }
};
