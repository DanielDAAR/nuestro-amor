import { useState } from 'react';

export function ErrorBoundary({ children, fallback }) {
  const [hasError, setHasError] = useState(null);

  if (hasError) {
    if (typeof fallback === 'function') return fallback(hasError);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-paper text-ink">
        <h2 className="text-4xl font-handwritingBold text-heart mb-4">Algo salió mal 💔</h2>
        <p className="font-mono text-center mb-8">{hasError.message}</p>
        <button
          onClick={() => {
            setHasError(null);
            window.location.reload();
          }}
          className="btn-heart"
        >
          Recargar página
        </button>
      </div>
    );
  }

  return children;
}

export function withErrorBoundary(Component) {
  return function ErrorBoundaryWrapper(props) {
    return (
      <ErrorBoundary>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}