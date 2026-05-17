import { Category } from '../types';

export const analyzeReceipt = async (base64Image: string): Promise<any> => {
  const prompt = `You are a high-precision OCR and financial analysis agent. 
  TASK:
  1. Carefully scan the provided image, which may contain a HANDWRITTEN receipt. The receipt text may be in English, Sinhala, or Tamil languages.
  2. Perform deep OCR to extract the Store Name, Date, Total Price, and individual line items (name and price), accurately reading English, Sinhala, and Tamil characters.
  3. Handwriting may be messy, slanted, or use non-standard symbols. Infer the most likely text based on context across English, Sinhala, and Tamil.
  4. Categorize the entire receipt into exactly ONE of these categories: ${Object.values(Category).join(", ")}.
     * Note: If the image is an ATM receipt, bank deposit, bank transfer, or card payment slip, use "Bank Payment". If it is an Uber, PickMe, taxi, train, or bus ticket, use "Transport".
  5. Categorize EACH INDIVIDUAL ITEM into EXACTLY ONE of the allowed categories: ${Object.values(Category).join(", ")}. If an item does not clearly fit into any of these, you MUST use "Other". Do not make up new categories.
  6. CURRENCY CONVERSION: Identify the original currency displayed on the receipt. If it is NOT Sri Lankan Rupees (LKR), internally determine the current real-time exchange rate on Google and CONVERT the Total Price and ALL individual item prices strictly into Sri Lankan Rupees (LKR).
  
  CRITICAL INSTRUCTION:
  - TRANSLATION MANDATORY: All text output (like storeName, item name, category) MUST be translated to English and returned using ONLY English letters. Do not return any Sinhala or Tamil characters in the JSON output.
  - All price and total fields MUST be returned only in LKR. Do not return foreign currency amounts.
  - If the image is too blurry, too dark, or does not contain a recognizable receipt with readable text/numbers, set the 'isReadable' field to false.
  - Otherwise, set 'isReadable' to true and extract all details.

  Return ONLY a valid JSON object following the provided schema, with no markdown code blocks.`;

  try {
    const apiKey = process.env.EXPO_PUBLIC_API_KEY;
    if (!apiKey) {
      throw new Error("EXPO_PUBLIC_API_KEY environment variable is missing.");
    }
    
    // Use the native fetch approach for safety in React Native without node polyfills
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: base64Image
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              isReadable: { 
                type: "BOOLEAN",
                description: "Whether the receipt data could be successfully extracted from the image."
              },
              storeName: { type: "STRING" },
              date: { type: "STRING" },
              time: { type: "STRING" },
              total: { type: "NUMBER" },
              category: { 
                type: "STRING",
                description: `Must be one of: ${Object.values(Category).join(", ")}`
              },
              items: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    name: { type: "STRING" },
                    price: { type: "NUMBER" },
                    category: { 
                      type: "STRING",
                      description: `Must be one of: ${Object.values(Category).join(", ")}. Default to "Other" if completely unsure.`
                    }
                  },
                  required: ["name", "price", "category"]
                }
              }
            },
            required: ["isReadable"]
          }
        }
      })
    });

    const body = await response.json();
    if (!response.ok) {
       if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please wait about 15 seconds and try again.");
       }
       throw new Error(body.error?.message || "Failed to analyze receipt");
    }
    
    const text = body.candidates[0]?.content?.parts[0]?.text || '{}';
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};
