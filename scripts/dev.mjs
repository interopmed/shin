import { spawn } from "node:child_process";
import readline from "node:readline";

const isWindows = process.platform === "win32";

if (isWindows) {
  const options = { stdio: "ignore", detached: true, shell: true, cwd: process.cwd() };
  const front = spawn('start "SHIN Frontend" cmd.exe /K "npm run frontend:dev"', options);
  const back = spawn('start "SHIN Backend" cmd.exe /K "cd backend && .\\venv\\Scripts\\activate && python manage.py runserver 127.0.0.1:8000"', options);
  front.unref();
  back.unref();
  console.log("Dev servers launched in separate CMD windows.");
  process.exit(0);
}

function startProcess(label, command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: process.env,
    shell: false,
    // Keep stdin attached so long-running dev servers stay alive.
    stdio: ["inherit", "pipe", "pipe"],
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

function startNpmScript(label, scriptName) {
  return startProcess(label, "npm", ["run", scriptName]);
}

const frontend = startNpmScript("frontend", "frontend:dev");
const backend = startProcess("backend", "bash", ["-c", "cd backend && source venv/bin/activate && python manage.py runserver 127.0.0.1:8000"]);

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
