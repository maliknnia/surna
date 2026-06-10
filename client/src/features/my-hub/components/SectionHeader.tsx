interface Props {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, action }: Props) {
  return (
    <div className="flex items-end justify-between mb-3">
      <div>
        <h2
          className="text-base font-bold"
          style={{ color: "var(--surna-text)" }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className="text-xs mt-0.5"
            style={{ color: "var(--surna-text-secondary)" }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
