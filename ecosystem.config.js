module.exports = {
  apps: [
    {
      name: "CokeBot",
      script: "index.js",
      cwd: "./",

      // Tự động restart khi process thoát (mất mạng, crash, v.v.)
      autorestart: true,

      // Chờ 3 giây trước khi restart (để tránh restart liên tục khi mất mạng kéo dài)
      restart_delay: 3000,

      // Số lần restart tối đa trong vòng 60 giây để tránh restart loop vô hạn
      max_restarts: 10,
      min_uptime: 10000, // Phải sống ít nhất 10 giây mới tính là restart ổn định

      // Không watch file (tắt auto-reload khi code thay đổi)
      watch: false,

      // Log
      out_file: "./logs/bot-out.log",
      error_file: "./logs/bot-error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,

      // Khởi động lại lúc 4 giờ sáng mỗi ngày (giảm memory leak, có thể tắt nếu không cần)
      cron_restart: "0 4 * * *",

      // Biến môi trường (đọc từ .env có sẵn)
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
