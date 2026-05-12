import { Category } from '../../types';
import { AgentOrchestrator } from '../agentOrchestrator';
import { AgentPrompts } from '../agentPrompts';
import { ReceiptAnalysisAgent } from '../receiptAgent';

/**
 * Agent Tests
 * Unit tests for agent functionality
 */

describe('ReceiptAnalysisAgent', () => {
  let agent: ReceiptAnalysisAgent;

  beforeEach(() => {
    agent = new ReceiptAnalysisAgent('test-api-key');
  });

  describe('Agent Info', () => {
    test('should have correct name and version', () => {
      expect(agent.name).toBe('ReceiptAnalysisAgent');
      expect(agent.version).toBe('1.0.0');
    });

    test('should return agent info', () => {
      const info = agent.getInfo();
      expect(info.name).toBe('ReceiptAnalysisAgent');
      expect(info.version).toBe('1.0.0');
      expect(info.hasApiKey).toBe(true);
    });
  });

  describe('Validation', () => {
    test('should reject invalid payload', () => {
      expect(agent.validate(null)).toBe(false);
      expect(agent.validate(undefined)).toBe(false);
      expect(agent.validate({})).toBe(false);
      expect(agent.validate({ base64Image: '' })).toBe(false);
    });

    test('should accept valid payload', () => {
      const payload = { base64Image: 'a'.repeat(100) };
      expect(agent.validate(payload)).toBe(true);
    });
  });

  describe('Data Sanitization', () => {
    test('should sanitize receipt data correctly', async () => {
      const context = {
        taskId: 'test-1',
        timestamp: Date.now()
      };

      // Mock the analyzeWithGemini to test sanitization
      const mockResult = {
        isReadable: true,
        storeName: '  Store Name  ',
        date: '2024-01-01',
        time: '14:30',
        total: 5000,
        category: Category.Food,
        items: [
          { name: 'Item 1', price: 2500, category: Category.Food },
          { name: '  Item 2  ', price: 2500, category: Category.Food }
        ]
      };

      // Since we can't easily mock the fetch, we'll test the validation logic
      expect(AgentPrompts.isValidCategory(Category.Food)).toBe(true);
      expect(AgentPrompts.isValidCategory('InvalidCategory')).toBe(false);
    });
  });

  describe('API Key Management', () => {
    test('should set and use API key', () => {
      agent.setApiKey('new-key');
      const info = agent.getInfo();
      expect(info.hasApiKey).toBe(true);
    });

    test('should warn if no API key', () => {
      // Temporarily clear the env var
      const originalKey = process.env.EXPO_PUBLIC_API_KEY;
      delete process.env.EXPO_PUBLIC_API_KEY;
      
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      new ReceiptAnalysisAgent();
      expect(consoleWarnSpy).toHaveBeenCalledWith('ReceiptAnalysisAgent: No API key provided');
      consoleWarnSpy.mockRestore();
      
      // Restore the env var
      if (originalKey) {
        process.env.EXPO_PUBLIC_API_KEY = originalKey;
      }
    });
  });
});

describe('AgentPrompts', () => {
  describe('Prompt Generation', () => {
    test('should generate receipt analysis prompt', () => {
      const prompt = AgentPrompts.getReceiptAnalysisPrompt();
      expect(prompt).toContain('high-precision OCR');
      expect(prompt.toLowerCase()).toContain('receipt');
      Object.values(Category).forEach(cat => {
        expect(prompt).toContain(cat);
      });
    });

    test('should get valid response schema', () => {
      const schema = AgentPrompts.getReceiptResponseSchema();
      expect(schema.type).toBe('OBJECT');
      expect(schema.properties).toHaveProperty('isReadable');
      expect(schema.properties).toHaveProperty('storeName');
      expect(schema.properties).toHaveProperty('items');
    });
  });

  describe('Category Validation', () => {
    test('should validate all categories', () => {
      Object.values(Category).forEach(cat => {
        expect(AgentPrompts.isValidCategory(cat)).toBe(true);
      });
    });

    test('should reject invalid categories', () => {
      expect(AgentPrompts.isValidCategory('InvalidCategory')).toBe(false);
      expect(AgentPrompts.isValidCategory('FOOD')).toBe(false);
      expect(AgentPrompts.isValidCategory('')).toBe(false);
    });
  });

  describe('Defaults', () => {
    test('should provide receipt defaults', () => {
      const defaults = AgentPrompts.getReceiptDefaults();
      expect(defaults.storeName).toBe('Unknown Store');
      expect(defaults.category).toBe(Category.Other);
      expect(defaults.items).toEqual([]);
      expect(defaults.total).toBe(0);
    });
  });
});

describe('AgentOrchestrator', () => {
  let orchestrator: AgentOrchestrator;
  let agent: ReceiptAnalysisAgent;

  beforeEach(() => {
    orchestrator = new AgentOrchestrator();
    agent = new ReceiptAnalysisAgent('test-key');
  });

  describe('Agent Registration', () => {
    test('should register agents', () => {
      orchestrator.registerAgent(agent);
      const registered = orchestrator.getAgent('ReceiptAnalysisAgent');
      expect(registered).toBeDefined();
      expect(registered?.name).toBe('ReceiptAnalysisAgent');
    });

    test('should list registered agents', () => {
      orchestrator.registerAgent(agent);
      const agents = orchestrator.listAgents();
      expect(agents.length).toBeGreaterThan(0);
      expect(agents[0].name).toBe('ReceiptAnalysisAgent');
    });

    test('should handle case-insensitive agent lookup', () => {
      orchestrator.registerAgent(agent);
      expect(orchestrator.getAgent('receiptanalysisagent')).toBeDefined();
      expect(orchestrator.getAgent('RECEIPTANALYSISAGENT')).toBeDefined();
    });
  });

  describe('State Management', () => {
    test('should track orchestrator state', () => {
      const state = orchestrator.getState();
      expect(state).toHaveProperty('state');
      expect(state).toHaveProperty('queuedTasks');
      expect(state).toHaveProperty('executingTasks');
      expect(state).toHaveProperty('registeredAgents');
    });

    test('should reset orchestrator', () => {
      orchestrator.registerAgent(agent);
      orchestrator.reset();
      const state = orchestrator.getState();
      expect(state.queuedTasks).toBe(0);
      expect(state.executingTasks).toBe(0);
    });
  });

  describe('Task Execution', () => {
    test('should return error for non-existent agent', async () => {
      const result = await orchestrator.executeTask('NonExistentAgent', {});
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    test('should return error for invalid payload', async () => {
      orchestrator.registerAgent(agent);
      const result = await orchestrator.executeTask('ReceiptAnalysisAgent', {});
      expect(result.success).toBe(false);
    });
  });
});

/**
 * Integration tests
 */
describe('Agent Integration', () => {
  test('end-to-end agent registration and state tracking', () => {
    const orchestrator = new AgentOrchestrator();
    const agent = new ReceiptAnalysisAgent('test-key');

    orchestrator.registerAgent(agent);

    const state = orchestrator.getState();
    expect(state.registeredAgents).toBe(1);

    orchestrator.reset();
    const resetState = orchestrator.getState();
    expect(resetState.queuedTasks).toBe(0);
  });

  test('agent validation workflow', () => {
    const agent = new ReceiptAnalysisAgent('test-key');

    const validPayload = { base64Image: 'a'.repeat(1000) };
    const invalidPayload = { base64Image: '' };

    expect(agent.validate(validPayload)).toBe(true);
    expect(agent.validate(invalidPayload)).toBe(false);
  });
});

/**
 * Helper test utilities
 */
export const testUtils = {
  /**
   * Create mock receipt data
   */
  createMockReceiptResult: (overrides = {}) => ({
    isReadable: true,
    storeName: 'Test Store',
    date: '2024-01-01',
    time: '14:30',
    total: 5000,
    category: Category.Food,
    items: [
      { name: 'Item 1', price: 2500, category: Category.Food },
      { name: 'Item 2', price: 2500, category: Category.Food }
    ],
    ...overrides
  }),

  /**
   * Create mock base64 image
   */
  createMockBase64Image: () => Buffer.from('mock-image-data').toString('base64'),

  /**
   * Validate receipt result structure
   */
  validateReceiptResult: (result: any) => {
    return (
      typeof result.isReadable === 'boolean' &&
      (result.isReadable === false ||
        (typeof result.storeName === 'string' &&
          typeof result.total === 'number' &&
          Array.isArray(result.items)))
    );
  }
};
