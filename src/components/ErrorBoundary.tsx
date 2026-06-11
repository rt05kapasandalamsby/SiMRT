/**
 * ErrorBoundary — Global error catcher for React component errors
 * Prevents white screen of death and provides user-friendly fallback
 */
import { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // In production, you could send to error tracking service (Sentry, etc.)
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.href = '/';
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-slate-800 mb-2">
              Terjadi Kesalahan
            </h1>

            {/* Message */}
            <p className="text-slate-600 mb-6">
              Aplikasi mengalami masalah yang tidak terduga. Silakan coba muat ulang halaman atau kembali ke beranda.
            </p>

            {/* Error details (development only) */}
            {import.meta.env.DEV && this.state.error && (
              <details className="text-left mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <summary className="text-sm font-semibold text-slate-700 cursor-pointer mb-2">
                  Detail Error (Dev Mode)
                </summary>
                <pre className="text-xs text-red-600 overflow-auto max-h-32">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Kembali ke Beranda
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
              >
                Muat Ulang
              </button>
            </div>

            {/* Help text */}
            <p className="text-xs text-slate-400 mt-4">
              Jika masalah terus berlanjut, hubungi pengurus RT 05
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
