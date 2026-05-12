import { Category } from '../types';

/**
 * Manages all agent prompts and prompt templates
 */

export class AgentPrompts {
  static readonly RECEIPT_ANALYSIS_PROMPT = (currencies: string[]): string => `You are a high-precision OCR and financial analysis agent.

TASK:
1. Carefully scan the provided image, which may contain a HANDWRITTEN receipt. The receipt text may be in English, Sinhala, or Tamil languages.
2. Perform deep OCR to extract the Store Name, Date, Total Price, and individual line items (name and price), accurately reading English, Sinhala, and Tamil characters.
3. Handwriting may be messy, slanted, or use non-standard symbols. Infer the most likely text based on context across English, Sinhala, and Tamil.
4. Categorize the entire receipt into exactly ONE of these categories: ${Object.values(Category).join(", ")}.
   * Note: If the image is an ATM receipt, bank deposit, bank transfer, or card payment slip, use "Bank Payment". If it is an Uber, PickMe, taxi, train, or bus ticket, use "Transport".
5. Categorize EACH INDIVIDUAL ITEM into EXACTLY ONE of the allowed categories: ${Object.values(Category).join(", ")}. If an item does not clearly fit into any of these, you MUST use "Other". Do not make up new categories.
6. CURRENCY CONVERSION: Identify the original currency displayed on the receipt. If it is NOT Sri Lankan Rupees (LKR), internally determine the current real-time exchange rate and CONVERT the Total Price and ALL individual item prices strictly into Sri Lankan Rupees (LKR).

CRITICAL INSTRUCTIONS:
- TRANSLATION MANDATORY: All text output (like storeName, item name, category) MUST be translated to English and returned using ONLY English letters. Do not return any Sinhala or Tamil characters in the JSON output.
- All price and total fields MUST be returned only in LKR. Do not return foreign currency amounts.
- If the image is too blurry, too dark, or does not contain a recognizable receipt with readable text/numbers, set the 'isReadable' field to false.
- Otherwise, set 'isReadable' to true and extract all details.

Return ONLY a valid JSON object following the provided schema, with no markdown code blocks.`;

  static readonly CURRENCY_CODES = ['LKR', 'USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD'];

  static getReceiptAnalysisPrompt(): string {
    return this.RECEIPT_ANALYSIS_PROMPT(this.CURRENCY_CODES);
  }

  /**
   * Gets the response schema for receipt analysis
   */
  static getReceiptResponseSchema() {
    return {
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
    };
  }

  /**
   * Validates if a string is a valid category
   */
  static isValidCategory(category: string): boolean {
    return Object.values(Category).includes(category as Category);
  }

  /**
   * Gets fallback values for missing receipt data
   */
  static getReceiptDefaults() {
    return {
      storeName: 'Unknown Store',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      category: Category.Other,
      items: [],
      total: 0
    };
  }
}
