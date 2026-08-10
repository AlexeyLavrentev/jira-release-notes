import type { CSSProperties, ReactNode } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

/**
 * StateView (CONTEXT.md D-13) — the single shared empty/loading/error/connected component.
 *
 * One pattern across StatusPage, IssueTable, EditPage, ExportPage: a centered stack of
 *   icon (semantic color) → heading (font-md / 600) → description (text-muted / font-sm)
 *   → optional CTA (caller-provided ReactNode, so this stays navigation-agnostic).
 *
 * Loading differs: instead of an icon + heading, it renders three shimmer bars
 * (`.rn-shimmer` in index.css) inside an `aria-busy` wrapper. The shimmer respects
 * `prefers-reduced-motion: reduce` (degrades to a static 0.6-opacity bar — index.css).
 *
 * Token-driven (no magic numbers): spacing via `--space-*`, font sizes via `--font-*`,
 * radius via `--radius-*`, colors via `--error` / `--text-muted`.
 */
export type StateViewVariant = 'empty' | 'error' | 'loading' | 'connected';

export interface StateViewProps {
  variant: StateViewVariant;
  /** Custom icon. If omitted, error → AlertCircle (red), connected → CheckCircle (green). */
  icon?: ReactNode;
  /** Heading text. For the loading variant this becomes the aria-label of the wrapper. */
  heading: string;
  /** Optional muted description below the heading. */
  description?: string;
  /** Optional call-to-action (a <Link>, <button>, …). Caller owns the navigation wiring. */
  cta?: ReactNode;
  'data-testid'?: string;
}

const containerStyle: CSSProperties = {
  textAlign: 'center',
  maxWidth: 480,
  width: '100%',
  padding: 'var(--space-6) var(--space-4)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  // gap: 0 — rhythm is controlled by per-element marginTop so icon ↔ heading, heading ↔
  // description, and description ↔ CTA each get their own spacing token (D-13 spacing scale).
  gap: 0,
  margin: '0 auto',
};

const headingStyle: CSSProperties = {
  margin: 0,
  marginTop: 'var(--space-4)',
  fontSize: 'var(--font-md)',
  fontWeight: 600,
  color: 'var(--text)',
};

const descriptionStyle: CSSProperties = {
  margin: 0,
  marginTop: 'var(--space-2)',
  fontSize: 'var(--font-sm)',
  color: 'var(--text-muted)',
};

const ctaWrapperStyle: CSSProperties = {
  marginTop: 'var(--space-5)',
};

export function StateView({
  variant,
  icon,
  heading,
  description,
  cta,
  ...rest
}: StateViewProps) {
  if (variant === 'loading') {
    // Three shimmer bars: one heading-width (1.5rem tall), two line-widths (1rem tall).
    return (
      <div
        aria-busy="true"
        aria-label={heading}
        data-testid={rest['data-testid']}
        style={loadingWrapperStyle}
      >
        <div className="rn-shimmer" style={{ ...shimmerBar, height: '1.5rem', width: '60%' }} />
        <div className="rn-shimmer" style={{ ...shimmerBar, height: '1rem', width: '100%' }} />
        <div className="rn-shimmer" style={{ ...shimmerBar, height: '1rem', width: '85%' }} />
      </div>
    );
  }

  const resolvedIcon = icon ?? defaultIcon(variant);

  return (
    <div
      role={variant === 'error' ? 'alert' : undefined}
      data-testid={rest['data-testid']}
      style={containerStyle}
    >
      {resolvedIcon}
      <h2 style={headingStyle}>{heading}</h2>
      {description && <p style={descriptionStyle}>{description}</p>}
      {cta && <div style={ctaWrapperStyle}>{cta}</div>}
    </div>
  );
}

function defaultIcon(variant: StateViewVariant): ReactNode | undefined {
  if (variant === 'error') {
    return <AlertCircle size={48} color="var(--error)" aria-hidden="true" />;
  }
  if (variant === 'connected') {
    return <CheckCircle size={48} color="var(--success)" aria-hidden="true" />;
  }
  return undefined;
}

const loadingWrapperStyle: CSSProperties = {
  width: '100%',
  maxWidth: 480,
  margin: '0 auto',
  padding: 'var(--space-6) var(--space-4)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-2)',
};

const shimmerBar: CSSProperties = {
  borderRadius: 'var(--radius-sm)',
};
