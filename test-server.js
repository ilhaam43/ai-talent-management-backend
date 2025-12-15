// Simple test to check if the server starts
const { spawn } = require('child_process');

console.log('Starting server...');

const server = spawn('node', ['dist/main.js'], {
  stdio: 'inherit',
  shell: true
});

server.on('error', (error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

server.on('exit', (code, signal) => {
  console.log(`Server exited with code ${code} and signal ${signal}`);
  process.exit(code);
});

// Give it 10 seconds to start
setTimeout(() => {
  console.log('Server should be running now. Check http://localhost:3000/docs');
}, 10000);


