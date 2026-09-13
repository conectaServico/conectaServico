import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logClientError } from '@/utils/errorLog';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional custom fallback. When omitted, the default pt-BR screen is rendered. */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * App-wide crash guard. Renders a friendly pt-BR screen instead of a white page
 * when a render or a lifecycle throws. Uses only React + Tailwind tokens from
 * src/index.css so a chunk-load failure that broke an icon bundle still renders.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
    logClientError(error.message, { stack: error.stack || info.componentStack || undefined, source: 'ErrorBoundary' });
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleHome = (): void => {
    window.location.assign('/');
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </div>

          <h1 className="mb-2 text-xl font-extrabold text-slate-900">Algo deu errado</h1>
          <p className="mb-6 leading-relaxed text-slate-600">
            Encontramos um erro inesperado. Tente recarregar a página. Se o problema continuar,
            entre em contato com o suporte.
          </p>

          {import.meta.env.DEV && this.state.error ? (
            <pre className="mb-6 max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-100 p-3 text-left text-xs text-slate-700">
              {this.state.error.message}
            </pre>
          ) : null}

          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-xl bg-primary px-5 py-2.5 font-bold text-white shadow-sm transition-colors hover:bg-primary-hover"
            >
              Recarregar
            </button>
            <button
              type="button"
              onClick={this.handleHome}
              className="rounded-xl bg-slate-100 px-5 py-2.5 font-bold text-slate-700 transition-colors hover:bg-slate-200"
            >
              Voltar ao início
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
