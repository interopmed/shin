import { spawn } from "node:child_process";
import readline from "node:readline";

const isWindows = process.platform === "win32";

function startProcess(label, command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: process.env,
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });

  const prefixStream = (stream, output = process.stdout) => {
    const rl = readline.createInterface({ input: stream });
    rl.on("line", (line) => output.write(`[${label}] ${line}\n`));
    return rl;
  };

  const stdout = prefixStream(child.stdout);
  const stderr = prefixStream(child.stderr, process.stderr);

  child.on("exit", (code, signal) => {
    stdout.close();
    stderr.close();
    if (signal) {
      console.log(`[${label}] exited with signal ${signal}`);
    } else {
      console.log(`[${label}] exited with code ${code ?? 0}`);
    }
  });

  return child;
}

const frontend = startProcess(
  "frontend",
  "npm",
  ["run", "frontend:dev"],
);

const backend = startProcess(
  "backend",
  "npm",
  ["run", "backend:dev"],
);

const children = [frontend, backend];
let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`\nShutting down SHIN dev processes after ${signal}...`);

  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

Promise.race(
  children.map(
    (child) =>
      new Promise((resolve) => {
        child.once("exit", (code, signal) => resolve({ code, signal }));
      })
  )
).then((result) => {
  if (!shuttingDown) {
    shutdown(`child exit ${result.signal ?? result.code ?? 0}`);
  }

  process.exit(typeof result.code === "number" ? result.code : 0);
});
