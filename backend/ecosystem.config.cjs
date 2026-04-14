module.exports = {
  apps: [{
    name: 'harvestgrow-backend',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    // Graceful shutdown — let in-flight requests finish
    kill_timeout: 5000,
    listen_timeout: 10000,
    // Zero-downtime reload
    wait_ready: true,
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
  }],
}
