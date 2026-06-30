module.exports = {
  apps: [
    {
      name: "hik-attendance",
      script: "/home/amdtechno/projects/hik-attendance/src/app.js",        // 👈 change if needed
      cwd: "/home/amdtechno/projects/hik-attendance",
      exec_mode: "cluster",
      instances: 1,                  // increase later if needed
      watch: false,
      autorestart: true,
      max_memory_restart: "512M",

      env: {
        NODE_ENV: "production",
        PORT: 9001
      },

      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss"
    }
  ]
};
