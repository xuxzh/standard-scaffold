import { describe, expect, it } from "vitest";

import {
  AiRunEventBroker,
  type AiRunPublicEvent,
} from "./ai-run-event-broker.js";

describe("AiRunEventBroker", () => {
  it("replays only the latest 256 events to a late subscriber", async () => {
    const broker = new AiRunEventBroker();
    broker.createRun("run-1");
    for (let index = 0; index < 260; index += 1) {
      broker.publish("run-1", deltaEvent(String(index)));
    }
    broker.complete("run-1");

    const events = await collect(broker.subscribe("run-1"));

    expect(events).toHaveLength(256);
    expect(events[0]).toEqual(deltaEvent("4"));
    expect(events.at(-1)).toEqual(deltaEvent("259"));
  });

  it("delivers live events and closes subscribers after completion", async () => {
    const broker = new AiRunEventBroker();
    broker.createRun("run-1");
    const iterator = broker.subscribe("run-1")[Symbol.asyncIterator]();
    const nextEvent = iterator.next();

    broker.publish("run-1", deltaEvent("live"));

    await expect(nextEvent).resolves.toEqual({
      done: false,
      value: deltaEvent("live"),
    });
    broker.complete("run-1");
    await expect(iterator.next()).resolves.toEqual({ done: true, value: undefined });
  });

  it("stops a known run idempotently and returns false for an unknown run", () => {
    const broker = new AiRunEventBroker();
    const signal = broker.createRun("run-1");

    expect(broker.stop("run-1")).toBe(true);
    expect(signal.aborted).toBe(true);
    expect(broker.stop("run-1")).toBe(true);
    expect(broker.stop("missing-run")).toBe(false);
  });

  it("returns false for unknown runs and releases state during cleanup", () => {
    const broker = new AiRunEventBroker();
    broker.createRun("run-1");

    expect(broker.cleanup("run-1")).toBe(true);
    expect(broker.publish("run-1", deltaEvent("late"))).toBe(false);
    expect(broker.stop("run-1")).toBe(false);
    expect(broker.complete("run-1")).toBe(false);
    expect(broker.cleanup("run-1")).toBe(false);
  });
});

function deltaEvent(delta: string): AiRunPublicEvent {
  return {
    type: "message.delta",
    runId: "run-1",
    messageId: "message-1",
    delta,
  };
}

async function collect(
  events: AsyncIterable<AiRunPublicEvent>,
): Promise<AiRunPublicEvent[]> {
  const collected: AiRunPublicEvent[] = [];
  for await (const event of events) {
    collected.push(event);
  }
  return collected;
}
