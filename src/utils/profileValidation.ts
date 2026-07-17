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

export function normalizeDisplayName(value: string) {
  return value.trim();
}

export function validateDisplayName(value: string) {
  const displayName = normalizeDisplayName(value);

  if (displayName.length < 1 || displayName.length > 50) {
    return 'Display name must be between 1 and 50 characters.';
  }

  return null;
}
