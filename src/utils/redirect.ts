export function getSafeNextPath(value: string | null, origin = window.location.origin) {
  if (!value?.startsWith('/')) return '/';

  try {
    const destination = new URL(value, origin);
    if (destination.origin !== origin) return '/';
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return '/';
  }
}
