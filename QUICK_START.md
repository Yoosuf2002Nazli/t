# Quick Start Guide

## Setup (One-time)

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Set API key
export EXPO_PUBLIC_API_KEY=your_google_gemini_api_key

# 3. Run tests to verify
npm test
```

## Common Commands

```bash
# Development
npm start              # Start development server
npm run android        # Run on Android emulator
npm run ios           # Run on iOS simulator
npm run web           # Run on web browser

# Testing
npm test              # Run all tests
npm test:watch       # Auto-rerun on changes
npm test:coverage    # Show coverage report

# Code Quality
npm run lint          # Check code style
npx tsc --noEmit     # Type check

# Building
npm run build:web    # Build web version

# Demo
npx tsx agents-demo.ts  # Run agent system demo
```

## Using the Agent System

### In Your App

```typescript
import { analyzeReceipt } from './services/geminiService';

// Analyze a receipt image
const receipt = await analyzeReceipt(base64ImageData);

// Handle result
if (receipt.isReadable) {
  console.log('Store:', receipt.storeName);
  console.log('Total:', receipt.total);
  console.log('Items:', receipt.items);
} else {
  console.log('Could not read receipt');
}
```

### Advanced Usage

```typescript
import { ReceiptAnalysisAgent } from './agents/receiptAgent';
import { AgentOrchestrator } from './agents/agentOrchestrator';

const orchestrator = new AgentOrchestrator();
const agent = new ReceiptAnalysisAgent(apiKey);

orchestrator.registerAgent(agent);

// Execute with custom task ID
const result = await orchestrator.executeTask(
  'ReceiptAnalysisAgent',
  { base64Image: imageData },
  'my-custom-task-id'
);

// Check result
if (result.success) {
  console.log('Analysis:', result.data);
  console.log('Time:', result.metadata?.processingTime, 'ms');
} else {
  console.error('Error:', result.error);
  console.log('Retry count:', result.metadata?.retryCount);
}
```

## Troubleshooting

### Tests Failing?
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npm test
```

### Type Errors?
```bash
# Check TypeScript
npx tsc --noEmit

# Restart IDE for intellisense
```

### API Errors?
```bash
# Verify API key
echo $EXPO_PUBLIC_API_KEY

# Get agent info for debugging
import { getAgentInfo } from './services/geminiService';
console.log('Agents:', getAgentInfo());
```

### Rate Limit Hit?
```
Error: "Rate limit exceeded"
Solution: Wait 15 seconds, system auto-retries
Max retries: 3 with exponential backoff (1s, 2s, 4s)
```

## Project Structure

```
agents/                    ← Agent system code
├── receiptAgent.ts       ← Main receipt analysis
├── agentOrchestrator.ts  ← Task management
├── agentPrompts.ts       ← Prompt templates
├── agentTypes.ts         ← Type definitions
└── __tests__/            ← Unit tests

services/
└── geminiService.ts      ← API facade

app/
├── index.tsx             ← Main screen
└── modal.tsx             ← Modal component

components/
├── CameraScanner.tsx     ← Camera UI
└── Dashboard.tsx         ← Analytics UI
```

## File Reference

| File | Purpose |
|------|---------|
| `agents/receiptAgent.ts` | Receipt OCR & analysis |
| `agents/agentOrchestrator.ts` | Task queue & execution |
| `agents/agentPrompts.ts` | Prompt templates |
| `services/geminiService.ts` | API integration |
| `BUILD_AND_TEST_REPORT.md` | Full build report |
| `ARCHITECTURE.md` | System design |
| `agents/README.md` | Agent docs |
| `agents-demo.ts` | Interactive demo |

## Key Endpoints

| API | Endpoint |
|-----|----------|
| Gemini | `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent` |
| Local Storage | AsyncStorage (React Native) |

## Features

✅ Multi-language OCR (English, Sinhala, Tamil)
✅ Automatic category classification (10 categories)
✅ Currency conversion to LKR
✅ Handwritten text recognition
✅ Error recovery with retry logic
✅ Concurrent task execution (max 3)
✅ Full TypeScript type safety

## Supported Categories

- Food
- Furniture
- Stationery
- Medicine
- Baby Accessories
- Mobile Accessories
- Pet Items
- Bank Payment
- Transport
- Other

## Response Format

```json
{
  "success": true,
  "data": {
    "isReadable": true,
    "storeName": "Store Name",
    "date": "2024-01-01",
    "time": "14:30",
    "total": 5000,
    "category": "Food",
    "items": [
      {
        "name": "Item 1",
        "price": 2500,
        "category": "Food"
      }
    ]
  },
  "metadata": {
    "processingTime": 2500,
    "confidence": 0.95
  }
}
```

## Test Coverage

- 21 total tests
- Agent registration ✓
- Input validation ✓
- Data sanitization ✓
- Error handling ✓
- Orchestrator state ✓
- Task execution ✓
- Category validation ✓

## Performance

- **Typical Time**: 2-5 seconds per receipt
- **API Call**: 1-4 seconds
- **Parsing**: 100-500ms
- **Max Concurrent**: 3 tasks
- **Max Retries**: 3 with exponential backoff

## Resources

- [Full Documentation](./agents/README.md)
- [Architecture Guide](./ARCHITECTURE.md)
- [Build Report](./BUILD_AND_TEST_REPORT.md)
- [Demo Script](./agents-demo.ts)

---

**Quick Help**: Check the documentation files in the `agents/` folder for detailed information on specific topics.
