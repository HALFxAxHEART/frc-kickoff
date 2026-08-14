import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@frckickoff/server";
import { TRPCProvider } from "./lib/trpc";
import { App } from "./App";
import "./styles/index.css";

const queryClient = new QueryClient();

const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      fetch: (url, options) => fetch(url, { ...options, credentials: "include" }),
    }),
  ],
});

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </TRPCProvider>
    </QueryClientProvider>
  </StrictMode>,
);
