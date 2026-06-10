interface SurnaLogoProps {
  className?: string;
  showText?: boolean;
  variant?: "default" | "mobile-hero";
  size?: "sm" | "md" | "lg";
}

export default function SurnaLogo({ 
  className = "h-5 w-auto", 
  showText = true, 
  variant = "default",
  size = "sm" 
}: SurnaLogoProps) {
  
  if (variant === "mobile-hero") {
    const sizes = {
      sm: { text: "text-2xl", tracking: "tracking-tight" },
      md: { text: "text-3xl", tracking: "tracking-tight" },
      lg: { text: "text-4xl", tracking: "tracking-tight" }
    };

    const { text, tracking } = sizes[size];

    return (
      <div className={`flex items-center ${className}`}>
        <span 
          className={`${text} font-black ${tracking} text-token-text`}
          style={{
            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            letterSpacing: '-0.02em'
          }}
        >
          SURNA
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center">
      <span 
        className="text-xl font-black tracking-tight text-token-text"
        style={{
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          letterSpacing: '-0.02em'
        }}
      >
        SURNA
      </span>
    </div>
  );
}
