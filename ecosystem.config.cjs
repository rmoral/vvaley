// PM2 ecosystem file for the EC2 host.
// Start:  pm2 start ecosystem.config.cjs
// Reload: pm2 reload vvaley
module.exports = {
  apps: [
    {
      name: "vvaley",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
      max_memory_restart: "512M",
      out_file: "./logs/pm2-out.log",
      error_file: "./logs/pm2-err.log",
      merge_logs: true,
      time: true,
    },
  ],
};
