export type LogLevel = "info" | "warn" | "error";

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

function write(level: LogLevel, message: string): void {
  const prefix = level.toUpperCase();
  const stream = level === "error" ? process.stderr : process.stdout;
  stream.write(`[${prefix}] ${message}\n`);
}

export const logger: Logger = {
  info(message) {
    write("info", message);
  },
  warn(message) {
    write("warn", message);
  },
  error(message) {
    write("error", message);
  },
};
