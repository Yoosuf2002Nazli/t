import { Agent, AgentResponse, AgentTask, AgentExecutionContext, AgentState } from './agentTypes';

/**
 * Agent Orchestrator
 * Manages agent execution, retries, and task scheduling
 */
export class AgentOrchestrator {
  private agents: Map<string, Agent> = new Map();
  private taskQueue: AgentTask[] = [];
  private executingTasks: Map<string, AgentTask> = new Map();
  private state: AgentState = AgentState.IDLE;
  private maxConcurrentTasks = 3;
  private retryDelay = 1000; // ms

  /**
   * Register an agent
   */
  registerAgent(agent: Agent): void {
    const key = agent.name.toLowerCase();
    this.agents.set(key, agent);
    console.log(`[AgentOrchestrator] Registered agent: ${agent.name}`);
  }

  /**
   * Get registered agent
   */
  getAgent(name: string): Agent | undefined {
    return this.agents.get(name.toLowerCase());
  }

  /**
   * List all registered agents
   */
  listAgents(): Array<{ name: string; version: string }> {
    return Array.from(this.agents.values()).map(agent => ({
      name: agent.name,
      version: agent.version
    }));
  }

  /**
   * Execute a task with a specific agent
   */
  async executeTask<T = any>(
    agentName: string,
    payload: any,
    taskId: string = this.generateTaskId()
  ): Promise<AgentResponse<T>> {
    const agent = this.getAgent(agentName);
    if (!agent) {
      return {
        success: false,
        error: `Agent '${agentName}' not found. Available agents: ${Array.from(this.agents.keys()).join(', ')}`
      };
    }

    const context: AgentExecutionContext = {
      taskId,
      timestamp: Date.now()
    };

    let lastError: any;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.state = AgentState.PROCESSING;
        console.log(`[AgentOrchestrator] Executing task ${taskId} with agent ${agentName} (attempt ${attempt}/${maxRetries})`);

        const result = await agent.execute(payload, context);

        this.state = AgentState.SUCCESS;
        return result;
      } catch (error: any) {
        lastError = error;
        console.error(`[AgentOrchestrator] Task ${taskId} failed (attempt ${attempt}):`, error?.message);

        if (attempt < maxRetries) {
          this.state = AgentState.RETRYING;
          // Exponential backoff
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          console.log(`[AgentOrchestrator] Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    this.state = AgentState.ERROR;
    return {
      success: false,
      error: lastError?.message || 'Task execution failed after all retries',
      metadata: { retryCount: maxRetries - 1 }
    };
  }

  /**
   * Queue a task for later execution
   */
  queueTask(task: AgentTask): void {
    this.taskQueue.push(task);
    console.log(`[AgentOrchestrator] Task ${task.id} queued. Queue size: ${this.taskQueue.length}`);
  }

  /**
   * Process task queue
   */
  async processQueue(): Promise<void> {
    while (this.taskQueue.length > 0 || this.executingTasks.size > 0) {
      // Process queued tasks if under concurrent limit
      while (this.taskQueue.length > 0 && this.executingTasks.size < this.maxConcurrentTasks) {
        const task = this.taskQueue.shift()!;
        this.processTask(task);
      }

      // Wait a bit before checking again
      await this.sleep(100);
    }

    console.log('[AgentOrchestrator] Queue processing complete');
  }

  /**
   * Process individual task
   */
  private async processTask(task: AgentTask): Promise<void> {
    this.executingTasks.set(task.id, task);

    try {
      const agent = this.getAgent(task.type);
      if (!agent) {
        console.error(`[AgentOrchestrator] No agent found for task type: ${task.type}`);
        return;
      }

      const context: AgentExecutionContext = {
        taskId: task.id,
        timestamp: Date.now()
      };

      await agent.execute(task.payload, context);
      console.log(`[AgentOrchestrator] Task ${task.id} completed`);
    } catch (error) {
      console.error(`[AgentOrchestrator] Task ${task.id} error:`, error);
    } finally {
      this.executingTasks.delete(task.id);
    }
  }

  /**
   * Get current orchestrator state
   */
  getState(): {
    state: AgentState;
    queuedTasks: number;
    executingTasks: number;
    registeredAgents: number;
  } {
    return {
      state: this.state,
      queuedTasks: this.taskQueue.length,
      executingTasks: this.executingTasks.size,
      registeredAgents: this.agents.size
    };
  }

  /**
   * Reset orchestrator
   */
  reset(): void {
    this.taskQueue = [];
    this.executingTasks.clear();
    this.state = AgentState.IDLE;

    // Reset all agents
    this.agents.forEach(agent => {
      if (agent.reset) {
        agent.reset();
      }
    });

    console.log('[AgentOrchestrator] Reset complete');
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}