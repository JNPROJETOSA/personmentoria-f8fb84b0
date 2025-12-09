import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message?: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: undefined };
  }

  static getDerivedStateFromError(error: unknown) {
    // Filter out the removeChild DOM error - it's a known Radix UI issue
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('removeChild') || errorMessage.includes('not a child')) {
      console.warn('Suppressed DOM manipulation error:', errorMessage);
      return { hasError: false };
    }
    return { hasError: true, message: errorMessage };
  }

  componentDidCatch(error: unknown, errorInfo: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Only log non-DOM manipulation errors
    if (!errorMessage.includes('removeChild') && !errorMessage.includes('not a child')) {
      console.error("App crashed with error:", error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
          <div className="max-w-md w-full space-y-4 text-center">
            <h1 className="text-2xl font-bold">Opa, algo deu errado 😅</h1>
            <p className="text-muted-foreground">
              Detectamos um erro inesperado. Clique em "Recarregar" para tentar novamente.
            </p>
            {this.state.message && (
              <p className="text-xs text-muted-foreground break-words mt-2">
                <span className="font-semibold">Detalhes técnicos:</span> {this.state.message}
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors mt-4"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider delayDuration={0}>
        <BrowserRouter>
          <AppErrorBoundary>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppErrorBoundary>
        </BrowserRouter>
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
