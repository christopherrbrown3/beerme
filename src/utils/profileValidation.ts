export const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function validateUsername(value: string) {
  const username = normalizeUsername(value);

  if (!USERNAME_PATTERN.test(username)) {
    return 'Use 3–24 lowercase letters, numbers, or underscores.';
  }

  return null;
}

export function normalizeDisplayName(value: string | null | undefined): string | null {
  const displayName = value?.trim() ?? '';
  return displayName.length > 0 ? displayName : null;
}

export function validateDisplayName(value: string | null | undefined) {
  const displayName = normalizeDisplayName(value);

  if (displayName === null) return null;
  if (displayName.length > 50) {
    return 'Display name must be between 1 and 50 characters.';
  }

  return null;
}

export function getDisplayName(displayName: string | null | undefined, username: string) {
  return normalizeDisplayName(displayName) ?? username;
}
