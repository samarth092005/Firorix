import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Top-level React Error Boundary to prevent unhandled render errors
 * from crashing the entire SPA to a blank screen.
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[Fiorify ErrorBoundary]', error, info.componentStack);
  }

  handleReload = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.assign('/overview');
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backgroundColor: 'var(--fiori-bg, #F8FAFC)',
            fontFamily: 'var(--font-sans)'
          }}
        >
          <div
            style={{
              maxWidth: '480px',
              width: '100%',
              backgroundColor: 'var(--fiori-surface, #FFFFFF)',
              border: '1px solid var(--fiori-border, #E2E8F0)',
              borderRadius: '10px',
              padding: '28px',
              boxShadow: 'var(--fiori-shadow-md)'
            }}
          >
            <h1 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600, color: 'var(--fiori-text-primary, #0F172A)' }}>
              Something went wrong
            </h1>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', lineHeight: 1.5, color: 'var(--fiori-text-secondary, #475569)' }}>
              An unexpected error occurred while rendering this view. You can return to the Overview dashboard to continue.
            </p>
            {this.state.error?.message && (
              <pre
                style={{
                  margin: '0 0 18px 0',
                  padding: '10px 12px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  backgroundColor: 'var(--fiori-neutral-bg, #F1F5F9)',
                  borderRadius: '6px',
                  color: 'var(--fiori-error, #B91C1C)',
                  overflowX: 'auto'
                }}
              >
                {this.state.error.message}
              </pre>
            )}
            <button
              type="button"
              onClick={this.handleReload}
              className="fiori-btn fiori-btn-primary"
            >
              Return to Overview
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
