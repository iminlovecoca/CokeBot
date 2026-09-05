"use strict";

const TRANSIENT_NETWORK_CODES = new Set([
  "EAI_AGAIN",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "ENOTFOUND",
  "ECONNREFUSED",
  "ECONNRESET",
  "EPIPE",
  "ETIMEDOUT",
  "ECONNTIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
]);

const SAFE_DISCORD_RETRY_CODES = new Set([
  "EAI_AGAIN",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "ENOTFOUND",
  "ECONNREFUSED",
  "UND_ERR_CONNECT_TIMEOUT",
]);

const TRANSIENT_NETWORK_NAMES = new Set([
  "ConnectTimeoutError",
  "HeadersTimeoutError",
  "BodyTimeoutError",
  "SocketError",
  "FetchError",
]);

const TRANSIENT_NETWORK_PATTERN = /(?:getaddrinfo|network|socket|connect timeout|connection (?:reset|refused|timed out)|timed out|timeout of \d+ms exceeded|EAI_AGAIN|ENETUNREACH|EHOSTUNREACH|ENOTFOUND|ECONNREFUSED|ECONNRESET|EPIPE|UND_ERR_CONNECT_TIMEOUT)/i;

const DISCORD_REQUEST_MAX_ATTEMPTS = 3;
const DISCORD_REQUEST_RETRY_DELAYS_MS = [250, 750];

function getErrorEntries(error) {
  const entries = [];
  const visited = new Set();
  let current = error;

  while (current && (typeof current === "object" || typeof current === "function") && !visited.has(current)) {
    visited.add(current);
    entries.push({
      code: typeof current.code === "string" ? current.code.toUpperCase() : "",
      name: typeof current.name === "string" ? current.name : "",
      message: typeof current.message === "string" ? current.message : String(current),
    });
    current = current.cause;
  }

  return entries;
}

function isTransientNetworkError(error) {
  return getErrorEntries(error).some(({ code, name, message }) =>
    TRANSIENT_NETWORK_CODES.has(code) ||
    TRANSIENT_NETWORK_NAMES.has(name) ||
    TRANSIENT_NETWORK_PATTERN.test(`${name} ${message}`),
  );
}

function isSafeToRetryDiscordRequest(error) {
  return getErrorEntries(error).some(({ code }) => SAFE_DISCORD_RETRY_CODES.has(code));
}

function getErrorCode(error) {
  const entry = getErrorEntries(error).find(({ code, name }) => code || name);
  return entry?.code || entry?.name || "UNKNOWN";
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withDiscordRequestRetry(makeRequest) {
  if (typeof makeRequest !== "function") {
    throw new TypeError("makeRequest must be a function");
  }

  return async (...args) => {
    for (let attempt = 0; attempt < DISCORD_REQUEST_MAX_ATTEMPTS; attempt += 1) {
      try {
        return await makeRequest(...args);
      } catch (error) {
        const canRetry =
          isSafeToRetryDiscordRequest(error) &&
          attempt < DISCORD_REQUEST_MAX_ATTEMPTS - 1;
        if (!canRetry) throw error;
        await wait(DISCORD_REQUEST_RETRY_DELAYS_MS[attempt]);
      }
    }

    throw new Error("Discord request retry loop exited unexpectedly");
  };
}

module.exports = {
  getErrorCode,
  isSafeToRetryDiscordRequest,
  isTransientNetworkError,
  withDiscordRequestRetry,
};
