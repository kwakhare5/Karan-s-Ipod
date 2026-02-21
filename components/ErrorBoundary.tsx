import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-white p-8 text-center">
                    <h1 className="text-2xl font-bold mb-4 text-red-500">Something went wrong.</h1>
                    <p className="mb-4 text-gray-400">The classic iPod interface collapsed.</p>
                    <div className="p-4 bg-gray-900 rounded border border-gray-800 text-left overflow-auto max-w-full max-h-64 mb-6">
                        <code className="text-xs font-mono text-gray-300">
                            {this.state.error?.toString()}
                        </code>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-full font-semibold transition-colors"
                    >
                        Restart iPod
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
