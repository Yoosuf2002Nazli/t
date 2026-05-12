/**
 * Agent System Index
 * Central export point for all agent-related modules
 */

export { ReceiptAnalysisAgent } from './receiptAgent';
export { AgentOrchestrator } from './agentOrchestrator';
export { AgentPrompts } from './agentPrompts';
export {
  Agent,
  AgentConfig,
  AgentResponse,
  AgentTask,
  AgentExecutionContext,
  AgentState,
  ReceiptAnalysisResult
} from './agentTypes';

/**
 * Quick factory function to create and initialize the agent system
 */
export function initializeAgentSystem(apiKey?: string) {
  const receiptAgent = new (require('./receiptAgent')).ReceiptAnalysisAgent(apiKey);
  const orchestrator = new (require('./agentOrchestrator')).AgentOrchestrator();

  orchestrator.registerAgent(receiptAgent);

  return {
    receiptAgent,
    orchestrator,
    agentPrompts: require('./agentPrompts').AgentPrompts
  };
}