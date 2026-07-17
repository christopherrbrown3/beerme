const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function formatFriendlyTimestamp(value: string, now = Date.now()) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return '';

  const seconds = Math.round((timestamp - now) / 1000);
  const absoluteSeconds = Math.abs(seconds);

  if (absoluteSeconds < 60) return relativeTime.format(seconds, 'second');
  if (absoluteSeconds < 3_600) return relativeTime.format(Math.round(seconds / 60), 'minute');
  if (absoluteSeconds < 86_400) return relativeTime.format(Math.round(seconds / 3_600), 'hour');
  if (absoluteSeconds < 604_800) return relativeTime.format(Math.round(seconds / 86_400), 'day');

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: new Date(value).getFullYear() === new Date(now).getFullYear() ? undefined : 'numeric',
  }).format(new Date(value));
}
