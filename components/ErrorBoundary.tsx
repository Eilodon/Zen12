import * as React from 'react';

interface Props {
  children?: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex flex-col items-center justify-center p-8 text-center">
          <div className="text-6xl mb-6">😔</div>
          <h1 className="text-2xl font-bold text-stone-800 mb-2">Đã có lỗi xảy ra</h1>
          <p className="text-stone-600 mb-6">Vui lòng tải lại trang</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-orange-500 text-white rounded-full font-medium hover:bg-orange-600 shadow-lg transition-transform hover:scale-105"
          >
            Tải lại
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}