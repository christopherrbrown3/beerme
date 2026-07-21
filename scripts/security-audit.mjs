import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const BLOCKING_SEVERITIES = new Set(['high', 'critical']);
const SUPPORTED_EXCEPTION_TOOLS = new Set(['npm-audit']);

export function runAuditGate() {
  const exceptions = loadExceptions();
  validateExceptions(exceptions);

  const audit = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['audit', '--json'], {
    encoding: 'utf8',
  });

  if (audit.error) {
    throw audit.error;
  }

  let report;
  try {
    report = JSON.parse(audit.stdout);
  } catch {
    throw new Error(audit.stderr || 'npm audit did not return valid JSON.');
  }

  if (report.error || ![0, 1].includes(audit.status)) {
    throw new Error(report.error?.summary ?? audit.stderr ?? 'npm audit failed unexpectedly.');
  }

  const blockingFindings = getBlockingFindings(report);
  const activeExceptions = exceptions.filter((exception) => exception.tool === 'npm-audit');
  const unexceptedFindings = getUnexceptedFindings(blockingFindings, activeExceptions);

  for (const [packageName, vulnerability] of blockingFindings) {
    const exception = activeExceptions.find((candidate) =>
      findingAliases(packageName, vulnerability).has(candidate.finding),
    );

    if (exception) {
      console.warn(
        `Allowed ${vulnerability.severity} npm finding ${packageName} through ${exception.expires}: ${exception.rationale}`,
      );
    }
  }

  if (unexceptedFindings.length > 0) {
    const findings = unexceptedFindings
      .map(([packageName, vulnerability]) => `- ${packageName}: ${vulnerability.severity}`)
      .join('\n');
    throw new Error(
      `High or critical npm audit findings must be fixed or explicitly excepted:\n${findings}`,
    );
  }

  console.log(`Dependency security gate passed (${blockingFindings.length} blocking findings).`);
}

export function validateExceptions(configuredExceptions, now = new Date()) {
  if (!Array.isArray(configuredExceptions)) {
    throw new Error('security-exceptions.json must contain an exceptions array.');
  }

  const ids = new Set();

  for (const exception of configuredExceptions) {
    for (const field of ['id', 'tool', 'finding', 'owner', 'rationale', 'expires']) {
      if (typeof exception[field] !== 'string' || exception[field].trim().length === 0) {
        throw new Error(`Every security exception requires a non-empty ${field}.`);
      }
    }

    if (ids.has(exception.id)) {
      throw new Error(`Duplicate security exception id: ${exception.id}`);
    }
    ids.add(exception.id);

    if (!SUPPORTED_EXCEPTION_TOOLS.has(exception.tool)) {
      throw new Error(
        `Security exception ${exception.id} uses unsupported tool ${exception.tool}.`,
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(exception.expires)) {
      throw new Error(`Security exception ${exception.id} has an invalid expiry date.`);
    }

    const expiresAt = new Date(`${exception.expires}T23:59:59.999Z`);
    if (
      Number.isNaN(expiresAt.valueOf()) ||
      expiresAt.toISOString().slice(0, 10) !== exception.expires
    ) {
      throw new Error(`Security exception ${exception.id} has an invalid expiry date.`);
    }

    if (expiresAt < now) {
      throw new Error(`Security exception ${exception.id} expired on ${exception.expires}.`);
    }
  }
}

export function getBlockingFindings(report) {
  return Object.entries(report.vulnerabilities ?? {}).filter(([, vulnerability]) =>
    BLOCKING_SEVERITIES.has(vulnerability.severity),
  );
}

export function getUnexceptedFindings(blockingFindings, activeExceptions) {
  return blockingFindings.filter(
    ([packageName, vulnerability]) =>
      !activeExceptions.some((exception) =>
        findingAliases(packageName, vulnerability).has(exception.finding),
      ),
  );
}

export function findingAliases(packageName, vulnerability) {
  const aliases = new Set([packageName]);

  for (const cause of vulnerability.via ?? []) {
    if (typeof cause === 'string') {
      aliases.add(cause);
      continue;
    }

    if (cause.source !== undefined) aliases.add(String(cause.source));
    if (typeof cause.url === 'string') {
      aliases.add(cause.url);
      const identifier = cause.url.split('/').filter(Boolean).at(-1);
      if (identifier) aliases.add(identifier);
    }
  }

  return aliases;
}

function loadExceptions() {
  const contents = readFileSync(
    new URL('../.github/security-exceptions.json', import.meta.url),
    'utf8',
  );
  const config = JSON.parse(contents);
  return config.exceptions;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  try {
    runAuditGate();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
