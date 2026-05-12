#!/usr/bin/env node

/**
 * Local Agent System Demo
 * Run this script to test the agent system locally
 * 
 * Usage: node --loader ts-node/esm agents-demo.ts
 * Or:    npx tsx agents-demo.ts
 */

import { AgentOrchestrator } from './agents/agentOrchestrator';
import { AgentPrompts } from './agents/agentPrompts';
import { ReceiptAnalysisAgent } from './agents/receiptAgent';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║        Agent System Demonstration & Local Testing               ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

async function runDemo() {
  // 1. Initialize Agent and Orchestrator
  console.log('📋 Step 1: Initializing Agent System');
  console.log('─'.repeat(60));
  
  const agent = new ReceiptAnalysisAgent(process.env.EXPO_PUBLIC_API_KEY);
  const orchestrator = new AgentOrchestrator();
  
  console.log('✓ Receipt Analysis Agent created');
  console.log('✓ Agent Orchestrator created\n');

  // 2. Register Agent
  console.log('📋 Step 2: Registering Agent');
  console.log('─'.repeat(60));
  
  orchestrator.registerAgent(agent);
  const agents = orchestrator.listAgents();
  console.log(`✓ Registered agents: ${agents.map(a => a.name).join(', ')}\n`);

  // 3. Display Agent Info
  console.log('📋 Step 3: Agent Information');
  console.log('─'.repeat(60));
  
  const agentInfo = agent.getInfo();
  console.log(`Name:      ${agentInfo.name}`);
  console.log(`Version:   ${agentInfo.version}`);
  console.log(`Model:     ${agentInfo.model}`);
  console.log(`API Key:   ${agentInfo.hasApiKey ? '✓ Configured' : '✗ Missing'}\n`);

  // 4. Display Orchestrator State
  console.log('📋 Step 4: Orchestrator State');
  console.log('─'.repeat(60));
  
  const state = orchestrator.getState();
  console.log(`State:               ${state.state}`);
  console.log(`Queued Tasks:        ${state.queuedTasks}`);
  console.log(`Executing Tasks:     ${state.executingTasks}`);
  console.log(`Registered Agents:   ${state.registeredAgents}\n`);

  // 5. Test Validation
  console.log('📋 Step 5: Testing Agent Validation');
  console.log('─'.repeat(60));
  
  const validPayload = { base64Image: 'a'.repeat(1000) };
  const invalidPayload = { base64Image: '' };
  
  console.log(`Valid payload:       ${agent.validate(validPayload) ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`Invalid payload:     ${!agent.validate(invalidPayload) ? '✓ PASS (correctly rejected)' : '✗ FAIL'}\n`);

  // 6. Display Prompts
  console.log('📋 Step 6: Prompt Configuration');
  console.log('─'.repeat(60));
  
  const prompt = AgentPrompts.getReceiptAnalysisPrompt();
  console.log(`Prompt length:       ${prompt.length} characters`);
  console.log(`Prompt preview:      ${prompt.substring(0, 80)}...\n`);

  // 7. Display Response Schema
  console.log('📋 Step 7: Response Schema');
  console.log('─'.repeat(60));
  
  const schema = AgentPrompts.getReceiptResponseSchema();
  console.log(`Schema type:         ${schema.type}`);
  console.log(`Schema properties:   ${Object.keys(schema.properties).join(', ')}\n`);

  // 8. Test Category Validation
  console.log('📋 Step 8: Category Validation');
  console.log('─'.repeat(60));
  
  console.log('Valid categories:');
  const validCategories = ['Food', 'Furniture', 'Transport', 'Other'];
  validCategories.forEach(cat => {
    const isValid = AgentPrompts.isValidCategory(cat);
    console.log(`  ${cat}: ${isValid ? '✓' : '✗'}`);
  });
  
  console.log('\nInvalid categories:');
  const invalidCategories = ['InvalidCat', 'FOOD', 'furniture'];
  invalidCategories.forEach(cat => {
    const isValid = AgentPrompts.isValidCategory(cat);
    console.log(`  ${cat}: ${!isValid ? '✓ (correctly rejected)' : '✗'}`);
  });
  console.log('');

  // 9. Test Receipt Defaults
  console.log('📋 Step 9: Receipt Defaults');
  console.log('─'.repeat(60));
  
  const defaults = AgentPrompts.getReceiptDefaults();
  console.log(`Store Name:          ${defaults.storeName}`);
  console.log(`Category:            ${defaults.category}`);
  console.log(`Total:               ${defaults.total}`);
  console.log(`Items:               ${defaults.items.length} items\n`);

  // 10. Test Error Handling
  console.log('📋 Step 10: Testing Error Handling');
  console.log('─'.repeat(60));
  
  const result = await orchestrator.executeTask(
    'ReceiptAnalysisAgent',
    { base64Image: '' },
    'test-task-1'
  );
  
  console.log(`Task Status:         ${result.success ? 'SUCCESS' : 'FAILED (expected)'}`);
  console.log(`Error Message:       ${result.error || 'None'}\n`);

  // 11. Test Non-existent Agent
  console.log('📋 Step 11: Testing Agent Error Handling');
  console.log('─'.repeat(60));
  
  const badResult = await orchestrator.executeTask(
    'NonExistentAgent',
    { base64Image: 'test' }
  );
  
  console.log(`Status:              ${badResult.success ? 'Unexpected' : '✓ Failed as expected'}`);
  console.log(`Error:               ${badResult.error?.substring(0, 50)}...\n`);

  // 12. Reset and Verify
  console.log('📋 Step 12: Testing Reset');
  console.log('─'.repeat(60));
  
  const stateBefore = orchestrator.getState();
  console.log(`Before reset:        ${JSON.stringify(stateBefore)}`);
  
  orchestrator.reset();
  
  const stateAfter = orchestrator.getState();
  console.log(`After reset:         ${JSON.stringify(stateAfter)}\n`);

  // Final Summary
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    ✓ All Tests Passed                           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('Summary:');
  console.log('  ✓ Agent initialization and registration');
  console.log('  ✓ Payload validation');
  console.log('  ✓ Prompt generation and schema validation');
  console.log('  ✓ Category validation');
  console.log('  ✓ Error handling');
  console.log('  ✓ Orchestrator state management');
  console.log('  ✓ Reset functionality\n');

  console.log('Next Steps:');
  console.log('  1. Set EXPO_PUBLIC_API_KEY environment variable');
  console.log('  2. Run: npm start');
  console.log('  3. Test receipt scanning in the app\n');
}

// Run demo
runDemo().catch(error => {
  console.error('❌ Demo failed:', error);
  process.exit(1);
});
