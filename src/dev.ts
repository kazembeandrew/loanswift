'use server';
import { config } from 'dotenv';
config();

import { spawn } from 'child_process';

const next = spawn('next', ['dev', '--turbopack'], {
  stdio: 'inherit',
  shell: true,
});

process.on('SIGINT', () => {
  next.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  next.kill('SIGTERM');
  process.exit(0);
});
