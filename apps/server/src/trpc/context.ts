import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

// No auth in this app — single-user tool, everyone who reaches it shares one workspace.
export async function createContext({ resHeaders }: FetchCreateContextFnOptions) {
  return { resHeaders };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
