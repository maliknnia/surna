export function useLocalization() {
  const formatDate = (date: Date | string, options?: Intl.DateTimeFormatOptions) =>
    new Date(date).toLocaleDateString(undefined, options);

  const formatTime = (date: Date | string, options?: Intl.DateTimeFormatOptions) =>
    new Date(date).toLocaleTimeString(undefined, options);

  const formatDateTime = (date: Date | string, options?: Intl.DateTimeFormatOptions) =>
    new Date(date).toLocaleString(undefined, options);

  const formatRelativeTime = (date: Date | string) => {
    const diffMs = new Date(date).getTime() - Date.now();
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
    const abs = Math.abs(diffMs);
    if (abs < 60_000) return rtf.format(Math.round(diffMs / 1000), "second");
    if (abs < 3_600_000) return rtf.format(Math.round(diffMs / 60_000), "minute");
    if (abs < 86_400_000) return rtf.format(Math.round(diffMs / 3_600_000), "hour");
    return rtf.format(Math.round(diffMs / 86_400_000), "day");
  };

  const formatCurrency = (amount: number, currency = "EUR") =>
    new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);

  const formatNumber = (n: number, options?: Intl.NumberFormatOptions) =>
    new Intl.NumberFormat(undefined, options).format(n);

  const formatDistance = (meters: number, showUnit = true) => {
    const km = meters / 1000;
    const value = km >= 1 ? `${km.toFixed(1)}` : `${Math.round(meters)}`;
    const unit = km >= 1 ? "km" : "m";
    return showUnit ? `${value} ${unit}` : value;
  };

  const formatWeight = (kilograms: number, showUnit = true) =>
    showUnit ? `${kilograms.toFixed(1)} kg` : `${kilograms.toFixed(1)}`;

  const formatTemperature = (celsius: number, showUnit = true) =>
    showUnit ? `${Math.round(celsius)}°C` : `${Math.round(celsius)}`;

  const t = (key: string, fallback?: string) => fallback ?? key;

  return {
    formatDate,
    formatTime,
    formatDateTime,
    formatRelativeTime,
    formatCurrency,
    formatNumber,
    formatDistance,
    formatWeight,
    formatTemperature,
    t,
  };
}
