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
  search = window.location.search,
) {
  let storedPath: string | null = null;
  try {
    storedPath = storage.getItem('beerme:redirect');
    if (storedPath !== null) storage.removeItem('beerme:redirect');
  } catch {
    // Storage may be unavailable under restrictive browser privacy settings.
  }

  const fallbackPath = new URLSearchParams(search).get('redirect');
  const redirectPath = storedPath ?? fallbackPath;
  if (redirectPath === null) return;

  history.replaceState(null, '', getSafeNextPath(redirectPath, origin));
}
