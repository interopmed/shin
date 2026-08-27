const { spawn } = require('child_process');
const options = { stdio: 'ignore', detached: true, shell: true, cwd: process.cwd() };
const back = spawn('start', ['"SHIN Backend"', 'cmd.exe', '/K', 'npm run backend:dev'], options);
back.unref();
