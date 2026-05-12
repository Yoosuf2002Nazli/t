# Agent System Documentation

### Code for building agents
develop agent logic in TypeScript, run/build, and test locally.

## Overview

The Agent System is a TypeScript-based framework for managing autonomous agents that perform specific tasks. Currently, it focuses on receipt analysis using Google Gemini API.

## Architecture

### Core Components

1. **agentTypes.ts** - Type definitions and interfaces
   - `Agent<T>` - Base interface all agents implement
   - `AgentResponse<T>` - Standardized response format
   - `AgentConfig` - Agent configuration
   - `AgentTask` - Task definition
   - `AgentState` - Agent state management

2. **receiptAgent.ts** - Receipt Analysis Agent
   - Analyzes receipt images using Google Gemini
   - Extracts store name, date, items, total, categories
   - Handles multi-language OCR (English, Sinhala, Tamil)
   - Performs currency conversion to LKR
   - Data validation and sanitization

3. **agentPrompts.ts** - Prompt Management
   - Centralized prompt templates
   - Response schema definitions
   - Category validation utilities
   - Default fallback values

4. **agentOrchestrator.ts** - Agent Orchestration
   - Agent registration and lifecycle
   - Task execution and retry logic
   - Queue management
   - State tracking
   - Concurrent task handling

## Usage

### Basic Usage

```typescript
import { ReceiptAnalysisAgent } from './agents/receiptAgent';

const agent = new ReceiptAnalysisAgent(process.env.EXPO_PUBLIC_API_KEY);

const result = await agent.execute(
  { base64Image: imageData },
  { taskId: 'task-123', timestamp: Date.now() }
);

if (result.success) {
  console.log('Receipt analyzed:', result.data);
} else {
  console.error('Analysis failed:', result.error);
}
```

### Using the Orchestrator

```typescript
import { ReceiptAnalysisAgent } from './agents/receiptAgent';
import { AgentOrchestrator } from './agents/agentOrchestrator';

const orchestrator = new AgentOrchestrator();
const agent = new ReceiptAnalysisAgent();

orchestrator.registerAgent(agent);

const result = await orchestrator.executeTask(
  'ReceiptAnalysisAgent',
  { base64Image: imageData }
);
```

### Using the Gemini Service (Integrated)

```typescript
import { analyzeReceipt, getAgentInfo } from './services/geminiService';

const receipt = await analyzeReceipt(base64Image);
console.log(receipt.storeName, receipt.total);

// Get agent system info
const info = getAgentInfo();
console.log('Registered agents:', info.agents);
```

## Agent Lifecycle

### ReceiptAnalysisAgent

1. **Validation** - Checks if payload contains valid base64 image
2. **API Call** - Sends image to Google Gemini API
3. **Response Parsing** - Extracts JSON response from API
4. **Sanitization** - Validates and cleans extracted data
5. **Return** - Returns standardized AgentResponse

## Response Format

### Success Response

```typescript
{
  success: true,
  data: {
    isReadable: true,
    storeName: "Store Name",
    date: "2024-01-01",
    time: "14:30",
    total: 5000,
    category: "Food",
    items: [
      { name: "Item 1", price: 2500, category: "Food" }
    ]
  },
  metadata: {
    processingTime: 2500,
    confidence: 0.95
  }
}
```

### Error Response

```typescript
{
  success: false,
  error: "Error message",
  metadata: {
    processingTime: 1000,
    retryCount: 2
  }
}
```

## Configuration

### Environment Variables

- `EXPO_PUBLIC_API_KEY` - Google Gemini API key (required)

### API Configuration

The system uses:
- **Model**: `gemini-2.5-flash`
- **API Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- **Response Format**: JSON with schema validation

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm test:watch

# Coverage report
npm test:coverage
```

### Test Files

- `agents/__tests__/agent.test.ts` - Unit tests for agent system
  - Agent registration and lifecycle
  - Data validation and sanitization
  - Orchestration and task management
  - Prompt generation

### Testing Utilities

```typescript
import { testUtils } from './agents/__tests__/agent.test';

// Create mock receipt
const mockReceipt = testUtils.createMockReceiptResult({
  storeName: 'Custom Store'
});

// Create mock image
const mockImage = testUtils.createMockBase64Image();

// Validate receipt structure
testUtils.validateReceiptResult(receiptData);
```

## Building

### Web Build

```bash
npm run build:web
```

### Development Server

```bash
npm start
```

## Error Handling

### Rate Limiting

If you encounter `429 Too Many Requests`:
- Wait 15 seconds before retrying
- The agent automatically retries with exponential backoff
- Maximum 3 retry attempts

### Invalid Image

If `isReadable: false` is returned:
- Image is too blurry or dark
- Image doesn't contain readable receipt
- Try with clearer image

### Missing API Key

Ensure `EXPO_PUBLIC_API_KEY` is set in your environment:

```bash
export EXPO_PUBLIC_API_KEY=your_api_key_here
```

## Features

### ✅ Multi-language OCR
- English, Sinhala, Tamil support
- Handwritten text recognition
- Character inference for unclear text

### ✅ Category Classification
- 10 predefined categories
- Item-level categorization
- Automatic "Other" fallback

### ✅ Currency Handling
- Automatic currency detection
- Real-time exchange rates
- Conversion to LKR

### ✅ Robust Validation
- Schema validation
- Data sanitization
- Fallback values for missing data

### ✅ Retry Logic
- Exponential backoff
- Configurable retry attempts
- Error recovery

### ✅ Task Management
- Queue management
- Concurrent execution (up to 3 tasks)
- Task prioritization

## Performance

### Processing Time

Typical processing time per receipt: **2-5 seconds**

- API call: 1-4 seconds
- Parsing/validation: 100-500ms
- Total with overhead: 2-5 seconds

### Concurrent Requests

Maximum concurrent tasks: **3**

Queue management ensures optimal API usage and prevents rate limiting.

## Future Enhancements

1. **Caching** - Cache frequently analyzed receipts
2. **Batch Processing** - Process multiple images in batch
3. **Custom Models** - Support for custom trained models
4. **Local Processing** - On-device OCR fallback
5. **Offline Mode** - Queue tasks for offline processing
6. **Analytics** - Track processing metrics and insights

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| API Key not found | Set `EXPO_PUBLIC_API_KEY` environment variable |
| Rate limit exceeded | Wait 15 seconds, will auto-retry |
| Image too blurry | Retake photo with better lighting |
| Unknown category returned | Check if category exists in `types.ts` |
| Timeout error | Image processing taking too long, try smaller image |

### Debug Mode

Enable detailed logging:

```typescript
const info = getAgentInfo();
console.log('Agent system:', info);
```

## Contributing

To add a new agent:

1. Create new file: `agents/myAgent.ts`
2. Implement `Agent<T>` interface
3. Register in orchestrator
4. Add tests in `agents/__tests__/`
5. Export from `agents/index.ts`

## License

Part of Batta App - Expense Tracking System
