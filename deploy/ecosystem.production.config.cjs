module.exports = {
  apps: [
    {
      name: 'harvestgrow-api',
      cwd: '/home/ubuntu/harvestgrow/backend',
      script: 'dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      kill_timeout: 5000,
      listen_timeout: 10000,
      wait_ready: true,
      env: {
        NODE_ENV: 'production',
        PORT: 3101,
      },
    },
  ],
}
