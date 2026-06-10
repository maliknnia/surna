// Stage 7: Localized Text Components
import { useLocalization } from "@/hooks/useLocalization";

interface LocalizedDateProps {
  date: Date | string;
  options?: Intl.DateTimeFormatOptions;
  relative?: boolean;
}

/**
 * Component for displaying localized dates
 */
export function LocalizedDate({ date, options, relative = false }: LocalizedDateProps) {
  const { formatDate, formatRelativeTime } = useLocalization();
  
  if (relative) {
    return <span>{formatRelativeTime(date)}</span>;
  }
  
  return <span>{formatDate(date, options)}</span>;
}

interface LocalizedTimeProps {
  date: Date | string;
  options?: Intl.DateTimeFormatOptions;
}

/**
 * Component for displaying localized times
 */
export function LocalizedTime({ date, options }: LocalizedTimeProps) {
  const { formatTime } = useLocalization();
  return <span>{formatTime(date, options)}</span>;
}

interface LocalizedDateTimeProps {
  date: Date | string;
  options?: Intl.DateTimeFormatOptions;
}

/**
 * Component for displaying localized date and time
 */
export function LocalizedDateTime({ date, options }: LocalizedDateTimeProps) {
  const { formatDateTime } = useLocalization();
  return <span>{formatDateTime(date, options)}</span>;
}

interface LocalizedCurrencyProps {
  amount: number;
  currency?: string;
  className?: string;
}

/**
 * Component for displaying localized currency
 */
export function LocalizedCurrency({ amount, currency, className }: LocalizedCurrencyProps) {
  const { formatCurrency } = useLocalization();
  return <span className={className}>{formatCurrency(amount, currency)}</span>;
}

interface LocalizedNumberProps {
  number: number;
  options?: Intl.NumberFormatOptions;
  className?: string;
}

/**
 * Component for displaying localized numbers
 */
export function LocalizedNumber({ number, options, className }: LocalizedNumberProps) {
  const { formatNumber } = useLocalization();
  return <span className={className}>{formatNumber(number, options)}</span>;
}

interface LocalizedDistanceProps {
  meters: number;
  showUnit?: boolean;
  className?: string;
}

/**
 * Component for displaying localized distance
 */
export function LocalizedDistance({ meters, showUnit = true, className }: LocalizedDistanceProps) {
  const { formatDistance } = useLocalization();
  return <span className={className}>{formatDistance(meters, showUnit)}</span>;
}

interface LocalizedWeightProps {
  kilograms: number;
  showUnit?: boolean;
  className?: string;
}

/**
 * Component for displaying localized weight
 */
export function LocalizedWeight({ kilograms, showUnit = true, className }: LocalizedWeightProps) {
  const { formatWeight } = useLocalization();
  return <span className={className}>{formatWeight(kilograms, showUnit)}</span>;
}

interface LocalizedTemperatureProps {
  celsius: number;
  showUnit?: boolean;
  className?: string;
}

/**
 * Component for displaying localized temperature
 */
export function LocalizedTemperature({ celsius, showUnit = true, className }: LocalizedTemperatureProps) {
  const { formatTemperature } = useLocalization();
  return <span className={className}>{formatTemperature(celsius, showUnit)}</span>;
}