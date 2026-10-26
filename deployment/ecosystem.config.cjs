const path = require('node:path');
const root = path.resolve(__dirname, '..');

module.exports = {
  apps: [
    {
      name: 'agenda-api',
      cwd: path.join(root, 'apps/api'),
      script: 'dist/main.js',
      exec_mode: 'cluster',
      instances: Number(process.env.API_INSTANCES || 2),
      env: { NODE_ENV: 'production', PORT: '3001' },
      max_memory_restart: '512M',
      kill_timeout: 10000,
      listen_timeout: 15000,
      time: true,
    },
    {
      name: 'agenda-web',
      cwd: path.join(root, 'apps/web'),
      script: 'node_modules/next/dist/bin/next',
      args: 'start --hostname 127.0.0.1 --port 3000',
      exec_mode: 'fork',
      instances: 1,
      env: { NODE_ENV: 'production' },
      max_memory_restart: '512M',
      time: true,
    },
    {
      name: 'agenda-worker',
      cwd: path.join(root, 'apps/api'),
      script: 'dist/operations/worker.js',
      exec_mode: 'fork',
      instances: 1,
      env: { NODE_ENV: 'production' },
      max_memory_restart: '256M',
      kill_timeout: 30000,
      time: true,
    },
  ],
};
