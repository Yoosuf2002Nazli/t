/**
 * Agent System Index
 * Central export point for all agent-related modules
 */

export { AgentOrchestrator } from './agentOrchestrator';
export { AgentPrompts } from './agentPrompts';
export {
    Agent,
    AgentConfig, AgentExecutionContext, AgentResponse, AgentState, AgentTask, ReceiptAnalysisResult
} from './agentTypes';
export { ReceiptAnalysisAgent } from './receiptAgent';

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
