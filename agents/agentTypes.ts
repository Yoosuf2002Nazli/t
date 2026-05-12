import { Category, ReceiptItem } from '../types';

/**
 * Core agent types and interfaces for the receipt processing system
 */

export interface AgentConfig {
  apiKey: string;
  model: string;
  timeout?: number;
  retries?: number;
}

export interface AgentResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    processingTime?: number;
    retryCount?: number;
    confidence?: number;
  };
}

export interface ReceiptAnalysisResult {
  isReadable: boolean;
  storeName?: string;
  date?: string;
  time?: string;
  total?: number;
  category?: Category;
  items?: ReceiptItem[];
  rawText?: string;
}

export interface AgentTask {
  id: string;
  type: 'receipt_analysis' | 'image_processing' | 'data_validation';
  payload: any;
  priority?: 'low' | 'normal' | 'high';
  retries?: number;
  maxRetries?: number;
}

export interface AgentExecutionContext {
  taskId: string;
  timestamp: number;
  userId?: string;
  metadata?: Record<string, any>;
}

export enum AgentState {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  RETRYING = 'RETRYING'
}

export interface Agent<T = any> {
  name: string;
  version: string;
  execute(payload: any, context: AgentExecutionContext): Promise<AgentResponse<T>>;
  validate(payload: any): boolean;
  reset?(): void;
}
