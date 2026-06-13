import { ReactNode, HTMLAttributes, ButtonHTMLAttributes, forwardRef } from "react";
import { Link } from "wouter";

function cx(...parts: Array<string | false | null | undefined | 0 | "">) {
  return parts.filter(Boolean).join(" ");
}

/* Card ---------------------------------------------------------------- */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  interactive?: boolean;
}
export function Card({ padded = true, interactive, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cx(
        "pro-card",
        padded && "pro-card--padded",
        interactive && "pro-card--interactive",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/* SectionHeader ------------------------------------------------------- */
export function SectionHeader({
  title, subtitle, actions,
}: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="pro-section-header">
      <div>
        <h2 style={{ margin: 0 }}>{title}</h2>
        {subtitle && <p className="pro-text-muted" style={{ marginTop: 2, fontSize: "var(--pro-fs-sm)" }}>{subtitle}</p>}
      </div>
      {actions && <div className="pro-row" style={{ gap: 8 }}>{actions}</div>}
    </div>
  );
}

/* Button -------------------------------------------------------------- */
type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export interface ProButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
  href?: string;
}

export const Button = forwardRef<HTMLButtonElement, ProButtonProps>(
  ({ variant = "secondary", size = "md", leadingIcon, trailingIcon, fullWidth, className, children, href, ...rest }, ref) => {
    const classes = cx("pro-btn", `pro-btn--${variant}`, `pro-btn--${size}`, fullWidth && "pro-btn--block", className);
    const content = (
      <>
        {leadingIcon && <span className="pro-btn__icon">{leadingIcon}</span>}
        {children && <span>{children}</span>}
        {trailingIcon && <span className="pro-btn__icon">{trailingIcon}</span>}
      </>
    );
    if (href) {
      return (
        <Link href={href} className={classes}>
          {content}
        </Link>
      );
    }
    return (
      <button ref={ref} className={classes} {...rest}>
        {content}
      </button>
    );
  }
);
Button.displayName = "Button";

/* StatCard ------------------------------------------------------------ */
export function StatCard({
  label, value, delta, icon,
}: {
  label: ReactNode;
  value: ReactNode;
  delta?: { value: string; direction?: "up" | "down" | "flat" };
  icon?: ReactNode;
}) {
  return (
    <Card>
      <div className="pro-stat">
        <div className="pro-stat__label">
          {icon && <span className="pro-stat__icon">{icon}</span>}
          <span>{label}</span>
        </div>
        <div className="pro-stat__value">{value}</div>
        {delta && (
          <div className={cx("pro-stat__delta", `pro-stat__delta--${delta.direction || "flat"}`)}>
            {delta.value}
          </div>
        )}
      </div>
    </Card>
  );
}

/* Toolbar ------------------------------------------------------------- */
export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="pro-toolbar">{children}</div>;
}

/* EmptyState ---------------------------------------------------------- */
export function EmptyState({
  icon, title, description, action,
}: { icon?: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="pro-empty">
      {icon && <div className="pro-empty__icon">{icon}</div>}
      <div className="pro-empty__title">{title}</div>
      {description && <div className="pro-empty__desc">{description}</div>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

/* Tag ----------------------------------------------------------------- */
export function Tag({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "active" | "muted" | "danger" | "success" }) {
  return <span className={cx("pro-tag", `pro-tag--${tone}`)}>{children}</span>;
}

/* Tabs ---------------------------------------------------------------- */
export interface TabsProps<T extends string> {
  tabs: { key: T; label: ReactNode; count?: number; icon?: ReactNode }[];
  value: T;
  onChange: (key: T) => void;
}
export function Tabs<T extends string>({ tabs, value, onChange }: TabsProps<T>) {
  return (
    <div className="pro-tabs" role="tablist">
      {tabs.map((t) => {
        const active = value === t.key;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={cx("pro-tab", active && "pro-tab--active")}
            data-testid={`tab-${String(t.key)}`}
          >
            {t.icon && <span className="pro-tab__icon">{t.icon}</span>}
            <span>{t.label}</span>
            {t.count !== undefined && <span className="pro-tab__count">{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* Skeleton ------------------------------------------------------------ */
export function Skeleton({
  width, height = 12, radius, style,
}: { width?: number | string; height?: number | string; radius?: number | string; style?: React.CSSProperties }) {
  return (
    <span
      className="pro-skeleton"
      style={{
        width: width ?? "100%",
        height,
        borderRadius: radius ?? 6,
        ...style,
      }}
    />
  );
}

export function SkeletonText({ lines = 3, lastWidth = "60%" }: { lines?: number; lastWidth?: string | number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? lastWidth : "100%"} height={10} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <Card>
      <Skeleton width={80} height={10} style={{ marginBottom: 10 }} />
      <Skeleton width={140} height={26} style={{ marginBottom: 12 }} />
      <SkeletonText lines={2} />
    </Card>
  );
}

/* FilterChips --------------------------------------------------------- */
export interface FilterChipOption<T extends string> {
  key: T;
  label: ReactNode;
  count?: number;
}
export function FilterChips<T extends string>({
  options, value, onChange,
}: {
  options: FilterChipOption<T>[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="pro-chips" role="tablist">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className={cx("pro-chip", active && "pro-chip--active")}
            aria-pressed={active}
            data-testid={`chip-${String(o.key)}`}
          >
            <span>{o.label}</span>
            {o.count !== undefined && <span className="pro-chip__count">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ContextBar ---------------------------------------------------------- */
/* Answers "what can I do here?" — sits under the page header.         */
export interface ContextActionItem {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: Variant;
  disabled?: boolean;
  hidden?: boolean;
}
export function ContextBar({
  context, actions,
}: {
  context?: ReactNode;
  actions: ContextActionItem[];
}) {
  const visible = actions.filter((a) => !a.hidden);
  if (!context && visible.length === 0) return null;
  return (
    <div className="pro-context-bar">
      {context && <div className="pro-context-bar__context">{context}</div>}
      <div className="pro-context-bar__actions">
        {visible.map((a) => {
          const classes = cx("pro-btn", `pro-btn--${a.variant ?? "secondary"}`, "pro-btn--sm");
          const inner = (
            <>
              {a.icon && <span className="pro-btn__icon">{a.icon}</span>}
              <span>{a.label}</span>
            </>
          );
          if (a.href && !a.disabled) {
            return (
              <Link key={a.key} href={a.href} className={classes} data-testid={`ctx-${a.key}`}>
                {inner}
              </Link>
            );
          }
          return (
            <button
              key={a.key}
              type="button"
              onClick={a.onClick}
              disabled={a.disabled}
              className={classes}
              data-testid={`ctx-${a.key}`}
              title={a.disabled ? "Not available for your role" : undefined}
            >
              {inner}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* PageShell ----------------------------------------------------------- */
export interface PageShellProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  toolbar?: ReactNode;
  rightPanel?: ReactNode;
  children: ReactNode;
}
export function PageShell({ title, subtitle, actions, toolbar, rightPanel, children }: PageShellProps) {
  return (
    <div className={cx("pro-page", rightPanel && "pro-page--with-aside")}>
      <div className="pro-page__main">
        <header className="pro-page__header">
          <div>
            <h1 style={{ margin: 0 }}>{title}</h1>
            {subtitle && <p className="pro-text-muted" style={{ marginTop: 4, fontSize: "var(--pro-fs-sm)" }}>{subtitle}</p>}
          </div>
          {actions && <div className="pro-row" style={{ gap: 8 }}>{actions}</div>}
        </header>
        {toolbar && <div className="pro-page__toolbar">{toolbar}</div>}
        <div className="pro-page__content">{children}</div>
      </div>
      {rightPanel && <aside className="pro-page__aside">{rightPanel}</aside>}
    </div>
  );
}
