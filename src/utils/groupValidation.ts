export function normalizeGroupName(value: string) {
  return value.trim();
}

export function validateGroupName(value: string) {
  const name = normalizeGroupName(value);

  if (name.length < 1 || name.length > 60) {
    return 'Group name must be between 1 and 60 characters.';
  }

  return null;
}

export function normalizeGroupDescription(value: string) {
  const description = value.trim();
  return description.length > 0 ? description : null;
}

export function validateGroupDescription(value: string) {
  if (value.trim().length > 280) {
    return 'Description must be 280 characters or fewer.';
  }

  return null;
}

export function extractInviteToken(value: string) {
  const trimmedValue = value.trim();

  try {
    const url = new URL(trimmedValue);
    const segments = url.pathname.split('/').filter(Boolean);
    return segments.at(-1) ?? '';
  } catch {
    return trimmedValue.split('/').filter(Boolean).at(-1) ?? '';
  }
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
