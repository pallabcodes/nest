/**
 * Neat Framework - Pipe Executor
 *
 * Executes pipes in sequence and handles data transformation and validation.
 * Pipes can transform data types and validate input values.
 */

import type { Pipe, PipeResult, PipeMetadata } from './pipe.interface';

/**
 * Pipe execution result.
 */
export interface PipeExecutionResult<T = any> {
  readonly success: boolean;
  readonly value?: T;
  readonly errors?: Array<{
    readonly parameterIndex: number;
    readonly errors: any[];
  }>;
}

/**
 * Pipe executor that manages pipe execution lifecycle.
 */
export class PipeExecutor {
  private readonly pipes = new Map<string, Pipe>();

  /**
   * Register a pipe instance.
   */
  registerPipe(name: string, pipe: Pipe): void {
    this.pipes.set(name, pipe);
  }

  /**
   * Execute pipes for method parameters.
   */
  async executePipes(
    values: any[],
    pipeNames: (string | any)[][],
    metadata: PipeMetadata[]
  ): Promise<PipeExecutionResult[]> {
    const results: PipeExecutionResult[] = [];

    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      const paramPipes = pipeNames[i] || [];
      const paramMetadata = metadata[i] || {};

      let currentValue = value;
      const paramErrors: any[] = [];

      // Execute pipes for this parameter
      for (const pipeName of paramPipes) {
        const pipe = typeof pipeName === 'string' ?
          this.pipes.get(pipeName) :
          pipeName;

        if (!pipe) {
          paramErrors.push(`Pipe '${pipeName}' not found`);
          continue;
        }

        try {
          const result: PipeResult = await pipe.transform(currentValue, paramMetadata);

          if (!result.success) {
            paramErrors.push(...(result.errors || []));
          } else {
            currentValue = result.value;
          }
        } catch (error) {
          paramErrors.push({
            field: `param_${i}`,
            message: error instanceof Error ? error.message : 'Pipe execution failed',
            value: currentValue
          });
        }
      }

      results[i] = {
        success: paramErrors.length === 0,
        value: currentValue,
        errors: paramErrors.length > 0 ? paramErrors : undefined
      };
    }

    return results;
  }

  /**
   * Get all registered pipes.
   */
  getRegisteredPipes(): string[] {
    return Array.from(this.pipes.keys());
  }

  /**
   * Clear all registered pipes.
   */
  clearPipes(): void {
    this.pipes.clear();
  }
}

/**
 * Create a pipe executor instance.
 */
export function createPipeExecutor(): PipeExecutor {
  return new PipeExecutor();
}
