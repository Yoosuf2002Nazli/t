import { Agent, AgentResponse, AgentExecutionContext, ReceiptAnalysisResult } from './agentTypes';
import { AgentPrompts } from './agentPrompts';
import { Category, ReceiptItem } from '../types';

/**
 * Receipt Analysis Agent
 * Responsible for analyzing receipt images using Google Gemini API
 */
export class ReceiptAnalysisAgent implements Agent<ReceiptAnalysisResult> {
  name = 'ReceiptAnalysisAgent';
  version = '1.0.0';
  private apiKey: string;
  private model = 'gemini-2.5-flash';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.EXPO_PUBLIC_API_KEY || '';
    if (!this.apiKey) {
      console.warn('ReceiptAnalysisAgent: No API key provided');
    }
  }

  /**
   * Validates receipt image payload
   */
  validate(payload: any): boolean {
    if (!payload || typeof payload !== 'object') return false;
    if (!payload.base64Image || typeof payload.base64Image !== 'string') return false;
    if (payload.base64Image.length < 100) return false; // Sanity check
    return true;
  }

  /**
   * Main execution method - analyzes receipt image
   */
  async execute(
    payload: { base64Image: string },
    context: AgentExecutionContext
  ): Promise<AgentResponse<ReceiptAnalysisResult>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!this.validate(payload)) {
        return {
          success: false,
          error: 'Invalid payload: base64Image is required and must be a valid string',
          metadata: { processingTime: Date.now() - startTime }
        };
      }

      // Check API key
      if (!this.apiKey) {
        return {
          success: false,
          error: 'EXPO_PUBLIC_API_KEY environment variable is missing',
          metadata: { processingTime: Date.now() - startTime }
        };
      }

      // Call Gemini API
      const result = await this.analyzeWithGemini(payload.base64Image, context.taskId);

      return {
        success: true,
        data: result,
        metadata: {
          processingTime: Date.now() - startTime,
          confidence: result.isReadable ? 0.95 : 0.0
        }
      };
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error during receipt analysis';
      console.error(`[${this.name}] Error:`, errorMessage);

      return {
        success: false,
        error: errorMessage,
        metadata: { processingTime: Date.now() - startTime }
      };
    }
  }

  /**
   * Calls Google Gemini API with image analysis prompt
   */
  private async analyzeWithGemini(
    base64Image: string,
    taskId: string
  ): Promise<ReceiptAnalysisResult> {
    const prompt = AgentPrompts.getReceiptAnalysisPrompt();
    const schema = AgentPrompts.getReceiptResponseSchema();

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
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
            responseSchema: schema
          }
        })
      }
    );

    const body = await response.json();

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please wait about 15 seconds and try again.");
      }
      throw new Error(body.error?.message || `API error: ${response.status}`);
    }

    // Parse response
    const text = body.candidates[0]?.content?.parts[0]?.text || '{}';
    const parsed = JSON.parse(text);

    // Sanitize and validate response
    return this.sanitizeReceiptData(parsed);
  }

  /**
   * Sanitizes and validates receipt data from API response
   */
  private sanitizeReceiptData(data: any): ReceiptAnalysisResult {
    const defaults = AgentPrompts.getReceiptDefaults();

    const result: ReceiptAnalysisResult = {
      isReadable: data.isReadable !== false,
    };

    if (!result.isReadable) {
      return result;
    }

    // Validate and set store name
    if (typeof data.storeName === 'string' && data.storeName.trim()) {
      result.storeName = data.storeName.trim();
    } else {
      result.storeName = defaults.storeName;
    }

    // Validate and set date
    if (typeof data.date === 'string' && data.date.trim()) {
      result.date = data.date.trim();
    } else {
      result.date = defaults.date;
    }

    // Validate and set time
    if (typeof data.time === 'string' && data.time.trim()) {
      result.time = data.time.trim();
    } else {
      result.time = defaults.time;
    }

    // Validate and set total
    if (typeof data.total === 'number' && data.total >= 0) {
      result.total = data.total;
    } else {
      result.total = defaults.total;
    }

    // Validate and set category
    if (typeof data.category === 'string' && AgentPrompts.isValidCategory(data.category)) {
      result.category = data.category as Category;
    } else {
      result.category = defaults.category;
    }

    // Validate and sanitize items
    if (Array.isArray(data.items)) {
      result.items = data.items
        .filter((item: any) => {
          if (!item || typeof item !== 'object') return false;
          if (typeof item.name !== 'string' || !item.name.trim()) return false;
          if (typeof item.price !== 'number' || item.price < 0) return false;
          if (!AgentPrompts.isValidCategory(item.category)) return false;
          return true;
        })
        .map((item: any) => ({
          name: item.name.trim(),
          price: item.price,
          category: item.category as Category
        }));
    } else {
      result.items = defaults.items;
    }

    return result;
  }

  /**
   * Reset agent state
   */
  reset(): void {
    // Currently stateless, but can be extended
    console.log(`[${this.name}] Agent reset`);
  }

  /**
   * Updates API key (useful for testing)
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Gets current agent info
   */
  getInfo() {
    return {
      name: this.name,
      version: this.version,
      model: this.model,
      hasApiKey: !!this.apiKey
    };
  }
}