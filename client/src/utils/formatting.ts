// Regional Formatting Utilities
// Using default US English locale for formatting

/**
 * Format date according to user's locale
 */
export function formatDate(
  date: Date | string,
  locale: string = 'en-US',
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  return new Intl.DateTimeFormat(locale, {
    ...defaultOptions,
    ...options,
  }).format(dateObj);
}

/**
 * Format time according to user's locale
 */
export function formatTime(
  date: Date | string,
  locale: string = 'en-US',
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };

  return new Intl.DateTimeFormat(locale, {
    ...defaultOptions,
    ...options,
  }).format(dateObj);
}

/**
 * Format datetime according to user's locale
 */
export function formatDateTime(
  date: Date | string,
  locale: string = 'en-US',
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };

  return new Intl.DateTimeFormat(locale, {
    ...defaultOptions,
    ...options,
  }).format(dateObj);
}

/**
 * Format currency according to user's locale
 */
export function formatCurrency(
  amount: number,
  locale: string = 'en-US',
  currency: string = 'USD'
): string {

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback to USD if currency is not supported
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
}

/**
 * Format number according to user's locale
 */
export function formatNumber(
  number: number,
  locale: string = 'en-US',
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(locale, options).format(number);
}

/**
 * Format distance (defaults to imperial/miles for US)
 */
export function formatDistance(
  meters: number,
  useMetric: boolean = false,
  showUnit: boolean = true
): string {
  if (!useMetric) {
    // Convert to miles
    const miles = meters * 0.000621371;
    const formatted = formatNumber(miles, 'en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: miles < 1 ? 2 : 1,
    });
    return showUnit ? `${formatted} mi` : formatted;
  } else {
    // Use kilometers for metric
    if (meters < 1000) {
      const formatted = formatNumber(meters, 'en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      return showUnit ? `${formatted} m` : formatted;
    } else {
      const km = meters / 1000;
      const formatted = formatNumber(km, 'en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: km < 10 ? 2 : 1,
      });
      return showUnit ? `${formatted} km` : formatted;
    }
  }
}

/**
 * Format weight (defaults to imperial/pounds for US)
 */
export function formatWeight(
  kilograms: number,
  useMetric: boolean = false,
  showUnit: boolean = true
): string {
  if (!useMetric) {
    // Convert to pounds
    const pounds = kilograms * 2.20462;
    const formatted = formatNumber(pounds, 'en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    });
    return showUnit ? `${formatted} lbs` : formatted;
  } else {
    const formatted = formatNumber(kilograms, 'en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    });
    return showUnit ? `${formatted} kg` : formatted;
  }
}

/**
 * Format temperature (defaults to Fahrenheit for US)
 */
export function formatTemperature(
  celsius: number,
  useMetric: boolean = false,
  showUnit: boolean = true
): string {
  if (!useMetric) {
    // Convert to Fahrenheit
    const fahrenheit = (celsius * 9/5) + 32;
    const formatted = formatNumber(fahrenheit, 'en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    });
    return showUnit ? `${formatted}°F` : formatted;
  } else {
    const formatted = formatNumber(celsius, 'en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    });
    return showUnit ? `${formatted}°C` : formatted;
  }
}

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(
  date: Date | string,
  locale: string = 'en-US'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  
  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    
    const intervals = [
      { unit: 'year' as const, seconds: 31536000 },
      { unit: 'month' as const, seconds: 2628000 },
      { unit: 'day' as const, seconds: 86400 },
      { unit: 'hour' as const, seconds: 3600 },
      { unit: 'minute' as const, seconds: 60 },
    ];
    
    for (const interval of intervals) {
      const count = Math.floor(Math.abs(diffInSeconds) / interval.seconds);
      if (count >= 1) {
        return rtf.format(diffInSeconds > 0 ? -count : count, interval.unit);
      }
    }
    
    return rtf.format(0, 'second');
  } catch (error) {
    // Fallback to English
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-diffInSeconds, 'second');
  }
}

/**
 * Get localized day/month names
 */
export function getLocalizedDateNames(locale: string = 'en-US') {
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(2024, i, 1);
    return {
      long: new Intl.DateTimeFormat(locale, { month: 'long' }).format(date),
      short: new Intl.DateTimeFormat(locale, { month: 'short' }).format(date),
    };
  });
  
  const weekdays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(2024, 0, i + 1); // Start from Sunday
    return {
      long: new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date),
      short: new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date),
    };
  });
  
  return { months, weekdays };
}

/**
 * Parse date input (supports common formats)
 */
export function parseDateInput(
  input: string
): Date | null {
  const dateFormat = 'MM/dd/yyyy'; // US format default
  
  // Try different common formats
  const formats = [
    dateFormat,
    'yyyy-MM-dd', // ISO format
    'MM/dd/yyyy', // US format
    'dd/MM/yyyy', // European format
    'dd.MM.yyyy', // German format
  ];
  
  for (const format of formats) {
    try {
      // Simple parsing - in a real app, you might want to use a library like date-fns
      const parts = input.split(/[\/\.\-]/);
      if (parts.length === 3) {
        let year, month, day;
        
        if (format.includes('yyyy')) {
          const yearIndex = format.indexOf('yyyy') / 5;
          const monthIndex = format.indexOf('MM') / 3;
          const dayIndex = format.indexOf('dd') / 3;
          
          year = parseInt(parts[yearIndex]);
          month = parseInt(parts[monthIndex]) - 1; // JS months are 0-indexed
          day = parseInt(parts[dayIndex]);
          
          const date = new Date(year, month, day);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }
    } catch (error) {
      continue;
    }
  }
  
  // Fallback to standard Date parsing
  const date = new Date(input);
  return isNaN(date.getTime()) ? null : date;
}