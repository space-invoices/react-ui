import pc from "picocolors";

export const logger = {
  info: (msg: string) => console.log(pc.blue("info"), msg),
  success: (msg: string) => console.log(pc.green("success"), msg),
  warn: (msg: string) => console.log(pc.yellow("warn"), msg),
  error: (msg: string) => console.log(pc.red("error"), msg),
  log: (msg: string) => console.log(msg),
  break: () => console.log(""),
};

export function spinner(text: string) {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  return {
    start: () => {
      process.stdout.write(`\r${pc.cyan(frames[0])} ${text}`);
      intervalId = setInterval(() => {
        i = (i + 1) % frames.length;
        process.stdout.write(`\r${pc.cyan(frames[i])} ${text}`);
      }, 80);
    },
    stop: (finalText?: string) => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      process.stdout.write(`\r${" ".repeat(text.length + 4)}\r`);
      if (finalText) {
        console.log(finalText);
      }
    },
    succeed: (msg?: string) => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      process.stdout.write(`\r${" ".repeat(text.length + 4)}\r`);
      console.log(`${pc.green("✓")} ${msg || text}`);
    },
    fail: (msg?: string) => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      process.stdout.write(`\r${" ".repeat(text.length + 4)}\r`);
      console.log(`${pc.red("✗")} ${msg || text}`);
    },
  };
}

export function highlight(text: string) {
  return pc.cyan(text);
}

export function dim(text: string) {
  return pc.dim(text);
}
