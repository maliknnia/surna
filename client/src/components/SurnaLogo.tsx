import { SURNA_LOGO_URL } from "@/lib/ownerAvatar";

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
  size = "sm",
}: SurnaLogoProps) {
  const imgSizes = {
    sm: "h-7 w-7",
    md: "h-9 w-9",
    lg: "h-11 w-11",
  };

  const logoImg = (
    <img
      src={SURNA_LOGO_URL}
      alt="SURNA"
      className={`${imgSizes[size]} shrink-0 rounded-full object-cover`}
    />
  );

  if (variant === "mobile-hero") {
    const textSizes = {
      sm: "text-2xl",
      md: "text-3xl",
      lg: "text-4xl",
    };

    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
        {logoImg}
        {showText && (
          <span
            className={`${textSizes[size]} font-black tracking-tight text-token-text`}
            style={{
              fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              letterSpacing: "-0.02em",
            }}
          >
            SURNA
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {logoImg}
      {showText && (
        <span
          className="text-xl font-black tracking-tight text-token-text"
          style={{
            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            letterSpacing: "-0.02em",
          }}
        >
          SURNA
        </span>
      )}
    </div>
  );
}
