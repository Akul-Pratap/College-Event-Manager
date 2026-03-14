/**
 * lib/upstash.ts — Upstash Redis client + rate limiting for LTSU Events
 * Uses @upstash/redis and @upstash/ratelimit
 *
 * Rate limiting strategy:
 *   - API routes:        20 requests / 10 seconds per IP
 *   - Auth endpoints:    10 requests / 1 hour per IP
 *   - Payment uploads:    5 requests / 1 hour per user
 *   - AI endpoints:      30 requests / 1 minute per user
 */

import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { NextRequest } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// Redis Client
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upstash Redis REST client.
 * Reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from env.
 * Falls back gracefully to a no-op stub in development if keys are missing.
 */
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[upstash] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is not set. " +
          "Rate limiting is disabled in development."
      );
    }
    return null;
  }

  redis = new Redis({ url, token });
  return redis;
}

export { getRedis };

// ─────────────────────────────────────────────────────────────────────────────
// Rate Limiter Instances
// ─────────────────────────────────────────────────────────────────────────────

/**
 * General API rate limiter — 20 requests per 10 seconds.
 * Apply to most API routes.
 */
export function getApiRateLimiter(): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;
  return new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(20, "10 s"),
    analytics: true,
    prefix: "ltsu:rl:api",
  });
}

/**
 * Auth rate limiter — 10 requests per hour.
 * Apply to /sign-in, /sign-up, and password reset endpoints.
 */
export function getAuthRateLimiter(): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;
  return new Ratelimit({
    redis: r,
    limiter: Ratelimit.fixedWindow(10, "1 h"),
    analytics: true,
    prefix: "ltsu:rl:auth",
  });
}

/**
 * Payment upload rate limiter — 5 requests per hour per user.
 * Prevents spamming the Gemini Vision verification endpoint.
 */
export function getPaymentRateLimiter(): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;
  return new Ratelimit({
    redis: r,
    limiter: Ratelimit.fixedWindow(5, "1 h"),
    analytics: true,
    prefix: "ltsu:rl:payment",
  });
}

/**
 * AI endpoint rate limiter — 30 requests per minute per user.
 * Covers /api/ai/feed, /api/ai/chatbot, /api/ai/suggest-form, etc.
 */
export function getAiRateLimiter(): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;
  return new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(30, "1 m"),
    analytics: true,
    prefix: "ltsu:rl:ai",
  });
}

/**
 * Registration rate limiter — 10 registrations per hour per user.
 * Prevents a single student from flooding event registrations.
 */
export function getRegistrationRateLimiter(): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;
  return new Ratelimit({
    redis: r,
    limiter: Ratelimit.fixedWindow(10, "1 h"),
    analytics: true,
    prefix: "ltsu:rl:registration",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Rate Limit Result Type
// ─────────────────────────────────────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number;       // Unix timestamp (ms) when the window resets
  limit: number;
  identifier: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core: Check rate limit
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check a rate limit for a given identifier.
 * Returns a RateLimitResult with allowed=true if Redis is unavailable
 * (fail open in development).
 *
 * @param limiter    A Ratelimit instance (from one of the getXxxRateLimiter functions).
 * @param identifier A unique string key — typically an IP address or user ID.
 *
 * @example
 *   const rl = getApiRateLimiter();
 *   const result = await checkRateLimit(rl, getClientIp(req));
 *   if (!result.allowed) return rateLimitResponse(result);
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<RateLimitResult> {
  if (!limiter) {
    // No Redis configured — allow all requests (dev mode)
    return {
      allowed: true,
      remaining: 999,
      reset: Date.now() + 60_000,
      limit: 999,
      identifier,
    };
  }

  try {
    const result = await limiter.limit(identifier);
    return {
      allowed: result.success,
      remaining: result.remaining,
      reset: result.reset,
      limit: result.limit,
      identifier,
    };
  } catch (err) {
    console.error("[upstash] Rate limit check failed:", err);
    // Fail open — do not block users if Redis is temporarily unreachable
    return {
      allowed: true,
      remaining: 0,
      reset: Date.now() + 60_000,
      limit: 0,
      identifier,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// IP Extraction Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract the real client IP from a Next.js request, respecting Vercel's
 * X-Forwarded-For and x-real-ip headers.
 *
 * @param req  A NextRequest or standard Request object.
 */
export function getClientIp(req: NextRequest | Request): string {
  const forwarded =
    (req.headers as Headers).get("x-forwarded-for") ??
    (req.headers as Headers).get("x-real-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  // Fallback for local development
  return "127.0.0.1";
}

// ─────────────────────────────────────────────────────────────────────────────
// Response Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a standard 429 Too Many Requests JSON response with rate limit headers.
 *
 * @example
 *   if (!result.allowed) {
 *     return rateLimitResponse(result);
 *   }
 */
export function rateLimitResponse(result: RateLimitResult): Response {
  const resetDate = new Date(result.reset);

  return new Response(
    JSON.stringify({
      error: "Too many requests. Please slow down and try again later.",
      retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
      resetAt: resetDate.toISOString(),
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": resetDate.toUTCString(),
        "Retry-After": String(Math.ceil((result.reset - Date.now()) / 1000)),
      },
    }
  );
}

/**
 * Add standard rate limit headers to an existing Response.
 * Use this to inform clients of their remaining quota on successful requests.
 *
 * @example
 *   const response = NextResponse.json({ data });
 *   return addRateLimitHeaders(response, result);
 */
export function addRateLimitHeaders(
  response: Response,
  result: RateLimitResult
): Response {
  const headers = new Headers(response.headers);
  headers.set("X-RateLimit-Limit", String(result.limit));
  headers.set("X-RateLimit-Remaining", String(result.remaining));
  headers.set("X-RateLimit-Reset", new Date(result.reset).toUTCString());

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Brute Force IP Block (stored in Redis)
// ─────────────────────────────────────────────────────────────────────────────

const BLOCK_KEY_PREFIX = "ltsu:blocked:ip:";
const BLOCK_TTL_SECONDS = 15 * 60; // 15 minutes

/**
 * Manually block an IP address for BLOCK_TTL_SECONDS (15 minutes).
 * Called by the Flask API after detecting brute force, or by Next.js middleware.
 *
 * @param ip  The IP address to block.
 */
export async function blockIp(ip: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.set(`${BLOCK_KEY_PREFIX}${ip}`, "1", { ex: BLOCK_TTL_SECONDS });
  } catch (err) {
    console.error("[upstash] blockIp failed:", err);
  }
}

/**
 * Check if an IP address is currently blocked.
 *
 * @param ip  The IP address to check.
 * @returns   true if the IP is blocked.
 */
export async function isIpBlocked(ip: string): Promise<boolean> {
  const r = getRedis();
  if (!r) return false;
  try {
    const val = await r.get(`${BLOCK_KEY_PREFIX}${ip}`);
    return val !== null;
  } catch {
    return false;
  }
}

/**
 * Unblock an IP address early (e.g. after manual review).
 *
 * @param ip  The IP address to unblock.
 */
export async function unblockIp(ip: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.del(`${BLOCK_KEY_PREFIX}${ip}`);
  } catch (err) {
    console.error("[upstash] unblockIp failed:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Session / Cache Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cache an arbitrary value in Redis with a TTL.
 * Useful for caching expensive database queries (e.g. department list).
 *
 * @param key    Cache key.
 * @param value  Value to store (will be JSON-serialised).
 * @param ttlSec TTL in seconds (default: 5 minutes).
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSec = 300
): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.set(`ltsu:cache:${key}`, JSON.stringify(value), { ex: ttlSec });
  } catch (err) {
    console.error("[upstash] cacheSet failed:", err);
  }
}

/**
 * Retrieve a cached value from Redis.
 * Returns null on cache miss or error.
 *
 * @param key  Cache key (same as used in cacheSet).
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    const raw = await r.get<string>(`ltsu:cache:${key}`);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Invalidate (delete) a cached entry.
 *
 * @param key  Cache key to delete.
 */
export async function cacheDelete(key: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.del(`ltsu:cache:${key}`);
  } catch (err) {
    console.error("[upstash] cacheDelete failed:", err);
  }
}

/**
 * Invalidate all cache entries matching a pattern prefix.
 * Use with care — scans the entire key space.
 *
 * @example
 *   await cacheClearByPrefix("events:dept:");
 */
export async function cacheClearByPrefix(prefix: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    const keys = await r.keys(`ltsu:cache:${prefix}*`);
    if (keys.length > 0) {
      await r.del(...keys);
    }
  } catch (err) {
    console.error("[upstash] cacheClearByPrefix failed:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Notification Queue (lightweight pub/sub via Redis Lists)
// ─────────────────────────────────────────────────────────────────────────────

const NOTIFICATION_QUEUE_KEY = "ltsu:queue:notifications";

export interface QueuedNotification {
  userId: string;
  type: string;
  message: string;
  eventId?: string;
  createdAt: string;
}

/**
 * Push a notification job onto the Redis queue.
 * A background worker (or cron route) can process these asynchronously.
 *
 * @param notification  The notification payload to enqueue.
 */
export async function enqueueNotification(
  notification: QueuedNotification
): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.rpush(
      NOTIFICATION_QUEUE_KEY,
      JSON.stringify({
        ...notification,
        createdAt: notification.createdAt ?? new Date().toISOString(),
      })
    );
  } catch (err) {
    console.error("[upstash] enqueueNotification failed:", err);
  }
}

/**
 * Dequeue and return up to `count` notifications from the queue.
 * Returns an empty array if the queue is empty or Redis is unavailable.
 */
export async function dequeueNotifications(
  count = 10
): Promise<QueuedNotification[]> {
  const r = getRedis();
  if (!r) return [];
  try {
    const results: QueuedNotification[] = [];
    for (let i = 0; i < count; i++) {
      const raw = await r.lpop<string>(NOTIFICATION_QUEUE_KEY);
      if (raw === null) break;
      try {
        results.push(JSON.parse(raw) as QueuedNotification);
      } catch {
        // Skip malformed entries
      }
    }
    return results;
  } catch {
    return [];
  }
}
