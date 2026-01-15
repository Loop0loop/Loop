---
applyTo: "src/main/services/OpenAIService.ts,src/main/services/**/*AI*.ts,src/shared/ai/**/*.ts"
description: Instructions for Loop's AI integration features
---

# AI Integration Guidelines

You are working on Loop's AI integration features using OpenAI and Google Gemini for writing assistance and project analysis.

## Architecture Overview

Loop uses a dual AI approach:
- **OpenAI GPT-4**: Primary writing assistance, editing, and content generation
- **Google Gemini**: Project analysis, character development, plot analysis

All AI services run in the main process. Renderer communicates via IPC.

## Security First

**Never expose API keys to renderer**:
```typescript
// ❌ WRONG - Never do this
const apiKey = process.env.OPENAI_API_KEY;
return { apiKey }; // Don't send to renderer

// ✅ CORRECT - Keep in main process
class OpenAIService {
  private apiKey: string;
  
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }
  }
}
```

**Environment variables**:
```bash
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
AI_TIMEOUT=30000
AI_MAX_RETRIES=3
```

## OpenAI Service Implementation

```typescript
import OpenAI from 'openai';

export class OpenAIService {
  private client: OpenAI;
  private rateLimiter: RateLimiter;
  
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000,
      maxRetries: 3,
    });
    
    this.rateLimiter = new RateLimiter({
      maxRequests: 60,
      perMilliseconds: 60000,
    });
  }
  
  async generateText(params: GenerateTextParams): Promise<GenerateTextResponse> {
    await this.rateLimiter.waitForToken();
    
    try {
      const completion = await this.client.chat.completions.create({
        model: params.model || 'gpt-4',
        messages: [
          { role: 'system', content: params.systemPrompt || '' },
          { role: 'user', content: params.prompt },
        ],
        max_tokens: params.maxTokens || 1000,
        temperature: params.temperature || 0.7,
      });
      
      return {
        text: completion.choices[0]?.message?.content || '',
        tokensUsed: completion.usage?.total_tokens || 0,
        model: completion.model,
        finishReason: completion.choices[0]?.finish_reason || 'stop',
      };
    } catch (error) {
      logger.error('OpenAI generation failed:', error);
      throw new AIServiceError('Text generation failed', error);
    }
  }
  
  async streamText(
    params: GenerateTextParams,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const stream = await this.client.chat.completions.create({
      model: params.model || 'gpt-4',
      messages: [
        { role: 'system', content: params.systemPrompt || '' },
        { role: 'user', content: params.prompt },
      ],
      stream: true,
    });
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        onChunk(content);
      }
    }
  }
}
```

## Gemini Service Implementation

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }
  
  async analyzeProject(projectData: ProjectAnalysisInput): Promise<ProjectAnalysis> {
    const prompt = this.buildProjectAnalysisPrompt(projectData);
    
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return this.parseProjectAnalysis(text);
    } catch (error) {
      logger.error('Gemini project analysis failed:', error);
      throw new AIServiceError('Project analysis failed', error);
    }
  }
  
  private buildProjectAnalysisPrompt(data: ProjectAnalysisInput): string {
    return `
      Analyze this writing project:
      
      Title: ${data.title}
      Genre: ${data.genre}
      
      Characters: ${JSON.stringify(data.characters)}
      Plot Points: ${JSON.stringify(data.plotPoints)}
      
      Provide:
      1. Character consistency analysis
      2. Plot structure assessment
      3. Pacing recommendations
      4. Theme coherence evaluation
    `;
  }
}
```

## Context Management

Build rich context for AI from project data:

```typescript
export class AIContextBuilder {
  async buildProjectContext(projectId: string): Promise<AIContext> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        chapters: true,
        characters: true,
        plotPoints: true,
        notes: true,
      },
    });
    
    if (!project) {
      throw new Error('Project not found');
    }
    
    return {
      project: {
        title: project.name,
        genre: project.genre,
        summary: project.description,
      },
      characters: project.characters.map(c => ({
        name: c.name,
        traits: c.traits,
        role: c.role,
      })),
      plot: project.plotPoints.map(p => ({
        title: p.title,
        description: p.description,
        order: p.order,
      })),
      worldbuilding: project.notes
        .filter(n => n.category === 'worldbuilding')
        .map(n => n.content),
    };
  }
}
```

## Conversation History

Maintain conversation context for continuity:

```typescript
export class AIConversationManager {
  async saveMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<void> {
    await prisma.aIMessage.create({
      data: {
        conversationId,
        role,
        content,
        timestamp: new Date(),
      },
    });
  }
  
  async getConversationHistory(
    conversationId: string,
    limit: number = 10
  ): Promise<AIMessage[]> {
    return await prisma.aIMessage.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }
  
  async buildMessagesForAPI(conversationId: string): Promise<ChatMessage[]> {
    const history = await this.getConversationHistory(conversationId);
    
    return history.reverse().map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
  }
}
```

## Rate Limiting

Implement rate limiting to avoid API quota issues:

```typescript
export class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number;
  private lastRefill: number;
  
  constructor(config: RateLimitConfig) {
    this.maxTokens = config.maxRequests;
    this.tokens = config.maxRequests;
    this.refillRate = config.maxRequests / (config.perMilliseconds / 1000);
    this.lastRefill = Date.now();
  }
  
  async waitForToken(): Promise<void> {
    this.refill();
    
    if (this.tokens < 1) {
      const waitTime = (1 - this.tokens) / this.refillRate * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.refill();
    }
    
    this.tokens -= 1;
  }
  
  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    const tokensToAdd = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}
```

## Error Handling

Handle AI-specific errors gracefully:

```typescript
export class AIServiceError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
    public readonly retryable: boolean = true
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (error instanceof AIServiceError && !error.retryable) {
        throw error;
      }
      
      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}
```

## Token Usage Tracking

Monitor token consumption for cost management:

```typescript
export class TokenTracker {
  async recordUsage(
    service: 'openai' | 'gemini',
    model: string,
    tokensUsed: number
  ): Promise<void> {
    await prisma.aIUsage.create({
      data: {
        service,
        model,
        tokensUsed,
        timestamp: new Date(),
      },
    });
  }
  
  async getUsageStats(timeRange: TimeRange): Promise<UsageStats> {
    const usage = await prisma.aIUsage.findMany({
      where: {
        timestamp: {
          gte: timeRange.start,
          lte: timeRange.end,
        },
      },
    });
    
    return {
      totalTokens: usage.reduce((sum, u) => sum + u.tokensUsed, 0),
      byService: this.groupByService(usage),
      estimatedCost: this.calculateCost(usage),
    };
  }
}
```

## IPC Integration

Expose AI functionality through IPC:

```typescript
// In main process
ipcMain.handle('ai:generate-text', async (_, params: GenerateTextParams) => {
  const openAIService = OpenAIService.getInstance();
  return await openAIService.generateText(params);
});

ipcMain.handle('ai:analyze-project', async (_, projectId: string) => {
  const geminiService = GeminiService.getInstance();
  const contextBuilder = new AIContextBuilder();
  
  const context = await contextBuilder.buildProjectContext(projectId);
  return await geminiService.analyzeProject(context);
});
```

## Testing AI Services

Mock AI APIs in tests:

```typescript
describe('OpenAIService', () => {
  let service: OpenAIService;
  
  beforeEach(() => {
    vi.mock('openai', () => ({
      default: class {
        chat = {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [{ message: { content: 'Test response' } }],
              usage: { total_tokens: 100 },
            }),
          },
        };
      },
    }));
    
    service = new OpenAIService();
  });
  
  it('should generate text', async () => {
    const result = await service.generateText({
      prompt: 'Test prompt',
    });
    
    expect(result.text).toBe('Test response');
    expect(result.tokensUsed).toBe(100);
  });
});
```