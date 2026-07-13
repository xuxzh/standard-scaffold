import { Injectable } from "@nestjs/common";

export type AiRunPublicEvent =
  | { type: "message.delta"; runId: string; messageId: string; delta: string }
  | {
      type: "evidence.updated";
      runId: string;
      evidence: Record<string, unknown>;
    }
  | { type: "run.completed"; runId: string; message: Record<string, unknown> }
  | { type: "run.stopped"; runId: string; message: Record<string, unknown> }
  | { type: "run.failed"; runId: string; errorCode: string; message: string };

type RunState = {
  events: AiRunPublicEvent[];
  abortController: AbortController;
  subscribers: Set<AsyncEventQueue>;
  completed: boolean;
};

@Injectable()
export class AiRunEventBroker {
  private readonly runs = new Map<string, RunState>();

  createRun(runId: string): AbortSignal {
    if (this.runs.has(runId)) {
      throw new Error("AI run is already registered");
    }
    const abortController = new AbortController();
    this.runs.set(runId, {
      events: [],
      abortController,
      subscribers: new Set(),
      completed: false,
    });
    return abortController.signal;
  }

  publish(runId: string, event: AiRunPublicEvent): boolean {
    const state = this.runs.get(runId);
    if (!state || state.completed) {
      return false;
    }
    state.events.push(event);
    if (state.events.length > 256) {
      state.events.shift();
    }
    for (const subscriber of state.subscribers) {
      subscriber.push(event);
    }
    return true;
  }

  async *subscribe(
    runId: string,
    signal?: AbortSignal,
  ): AsyncIterable<AiRunPublicEvent> {
    const state = this.runs.get(runId);
    if (!state) {
      throw new Error("AI run is not registered");
    }
    const queue = new AsyncEventQueue();
    const closeQueue = () => queue.close();
    signal?.addEventListener("abort", closeQueue, { once: true });
    if (!state.completed) {
      state.subscribers.add(queue);
    }
    const replay = [...state.events];

    try {
      for (const event of replay) {
        yield event;
      }
      if (state.completed) {
        return;
      }
      for await (const event of queue) {
        yield event;
      }
    } finally {
      signal?.removeEventListener("abort", closeQueue);
      state.subscribers.delete(queue);
      queue.close();
    }
  }

  stop(runId: string): boolean {
    const state = this.runs.get(runId);
    if (!state) {
      return false;
    }
    state.abortController.abort();
    return true;
  }

  complete(runId: string): boolean {
    const state = this.runs.get(runId);
    if (!state) {
      return false;
    }
    if (!state.completed) {
      state.completed = true;
      for (const subscriber of state.subscribers) {
        subscriber.close();
      }
    }
    return true;
  }

  cleanup(runId: string): boolean {
    const state = this.runs.get(runId);
    if (!state) {
      return false;
    }
    state.abortController.abort();
    for (const subscriber of state.subscribers) {
      subscriber.close();
    }
    state.subscribers.clear();
    this.runs.delete(runId);
    return true;
  }
}

class AsyncEventQueue implements AsyncIterableIterator<AiRunPublicEvent> {
  private readonly events: AiRunPublicEvent[] = [];
  private readonly waiters: Array<
    (result: IteratorResult<AiRunPublicEvent>) => void
  > = [];
  private closed = false;

  [Symbol.asyncIterator](): AsyncIterableIterator<AiRunPublicEvent> {
    return this;
  }

  next(): Promise<IteratorResult<AiRunPublicEvent>> {
    const event = this.events.shift();
    if (event) {
      return Promise.resolve({ done: false, value: event });
    }
    if (this.closed) {
      return Promise.resolve({ done: true, value: undefined });
    }
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  push(event: AiRunPublicEvent): void {
    if (this.closed) {
      return;
    }
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter({ done: false, value: event });
    } else {
      this.events.push(event);
    }
  }

  close(): void {
    if (this.closed) {
      return;
    }
    this.closed = true;
    for (const waiter of this.waiters.splice(0)) {
      waiter({ done: true, value: undefined });
    }
  }
}
