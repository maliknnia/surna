import { createRoot } from "react-dom/client";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/plus-jakarta-sans/700.css";
import App from "./App";
import "./index.css";
import ErrorBoundary from "@/components/ErrorBoundary";
import { bumpHomeLoadGeneration } from "@/lib/personalizedDemoFeed";

if (typeof window !== "undefined") {
  bumpHomeLoadGeneration();
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
