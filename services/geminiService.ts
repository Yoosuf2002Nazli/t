import { AgentOrchestrator } from '../agents/agentOrchestrator';
import { ReceiptAnalysisAgent } from '../agents/receiptAgent';

// Initialize agent and orchestrator
const receiptAgent = new ReceiptAnalysisAgent();
const orchestrator = new AgentOrchestrator();
orchestrator.registerAgent(receiptAgent);

/**
 * Analyzes a receipt image using the ReceiptAnalysisAgent
 * @param base64Image - Base64 encoded image string
 * @returns Promise with extracted receipt data
 */
export const analyzeReceipt = async (base64Image: string): Promise<any> => {
  try {
    const result = await orchestrator.executeTask<any>(
      'ReceiptAnalysisAgent',
      { base64Image }
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to analyze receipt');
    }

    return result.data;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

/**
 * Legacy function - kept for backward compatibility
 * Gets agent info for debugging
 */
export const getAgentInfo = () => {
  return {
    agents: orchestrator.listAgents(),
    state: orchestrator.getState()
  };
};

/**
 * Reset orchestrator (useful for testing)
 */
export const resetOrchestrator = () => {
  orchestrator.reset();
};

