import { readFile } from 'node:fs/promises';

const registryUrl = new URL('../.github/accessibility-exceptions.json', import.meta.url);
const registry = JSON.parse(await readFile(registryUrl, 'utf8'));

if (registry.version !== 1 || !Array.isArray(registry.exceptions)) {
  throw new Error('Accessibility exceptions must use version 1 and an exceptions array.');
}

const now = new Date();
const ids = new Set();

for (const [index, exception] of registry.exceptions.entries()) {
  const location = `Accessibility exception ${index + 1}`;
  const requiredTextFields = ['id', 'rule', 'target', 'owner', 'rationale', 'expires'];

  for (const field of requiredTextFields) {
    if (typeof exception[field] !== 'string' || exception[field].trim() === '') {
      throw new Error(`${location} requires a non-empty ${field}.`);
    }
  }

  if (ids.has(exception.id)) {
    throw new Error(`${location} duplicates id "${exception.id}".`);
  }
  ids.add(exception.id);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(exception.expires)) {
    throw new Error(`${location} expires must use YYYY-MM-DD.`);
  }
  const expiresAt = new Date(`${exception.expires}T23:59:59.999Z`);
  if (
    Number.isNaN(expiresAt.valueOf()) ||
    expiresAt.toISOString().slice(0, 10) !== exception.expires
  ) {
    throw new Error(`${location} expires must be a real calendar date.`);
  }
  if (expiresAt < now) {
    throw new Error(`${location} expired on ${exception.expires}.`);
  }
}

console.log(
  `Accessibility exception registry is valid (${registry.exceptions.length} active exception${
    registry.exceptions.length === 1 ? '' : 's'
  }).`,
);
