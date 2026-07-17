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

export function restoreStoredRedirect(
  storage: Pick<Storage, 'getItem' | 'removeItem'>,
  history: Pick<History, 'replaceState'>,
  origin = window.location.origin,
) {
  const storedPath = storage.getItem('beerme:redirect');
  if (storedPath === null) return;

  storage.removeItem('beerme:redirect');
  history.replaceState(null, '', getSafeNextPath(storedPath, origin));
}
