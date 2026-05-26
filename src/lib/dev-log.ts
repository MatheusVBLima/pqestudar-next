const isDev = process.env.NODE_ENV !== "production";

export function devLog(...args: unknown[]) {
  if (isDev) console.log(...args);
}

export function devInfo(...args: unknown[]) {
  if (isDev) console.info(...args);
}

export function devDebug(...args: unknown[]) {
  if (isDev) console.debug(...args);
}
