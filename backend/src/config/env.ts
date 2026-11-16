import dotenv from 'dotenv';

dotenv.config();

const requiredValue = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`[config] Missing required environment variable: ${name}`);
  }
  return value;
};

const databaseUrl = requiredValue('DATABASE_URL');
let parsedDatabaseUrl: URL;

try {
  parsedDatabaseUrl = new URL(databaseUrl);
} catch {
  throw new Error('[config] DATABASE_URL must be a valid PostgreSQL connection URL.');
}

if (
  (parsedDatabaseUrl.protocol !== 'postgres:' && parsedDatabaseUrl.protocol !== 'postgresql:') ||
  !parsedDatabaseUrl.hostname ||
  parsedDatabaseUrl.pathname === '/'
) {
  throw new Error('[config] DATABASE_URL must include a PostgreSQL host and database name.');
}

const jwtSecret = requiredValue('JWT_SECRET');
if (jwtSecret.length < 32) {
  throw new Error('[config] JWT_SECRET must be at least 32 characters long.');
}

const configuredPort = process.env.PORT?.trim();
const port = configuredPort ? Number(configuredPort) : 5000;
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('[config] PORT must be an integer between 1 and 65535.');
}

const configuredCorsOrigins = process.env.CORS_ORIGINS
  ?.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean) ?? [];

const isProduction = process.env.NODE_ENV?.toLowerCase() === 'production';
if (isProduction && configuredCorsOrigins.length === 0) {
  throw new Error('[config] CORS_ORIGINS must list the frontend origin in production.');
}

const corsOrigins = configuredCorsOrigins.length > 0
  ? configuredCorsOrigins
  : ['http://localhost:5173'];

for (const origin of corsOrigins) {
  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(origin);
  } catch {
    throw new Error(`[config] Invalid CORS origin: ${origin}`);
  }

  if (
    (parsedOrigin.protocol !== 'http:' && parsedOrigin.protocol !== 'https:') ||
    parsedOrigin.origin !== origin
  ) {
    throw new Error(`[config] CORS origins must be exact http or https origins without paths: ${origin}`);
  }
}

export const env = {
  databaseUrl,
  jwtSecret,
  port,
  corsOrigins,
};
