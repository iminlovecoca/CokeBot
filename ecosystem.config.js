module.exports = {
  apps: [
    {
      name: "CokeBot",
      script: "index.js",
      cwd: "./",

      // Tự động restart khi process thoát (mất mạng, crash, v.v.)
      autorestart: true,

      // Sử dụng Exponential Backoff để tự động giãn cách thời gian restart khi mất mạng lâu
      exp_backoff_restart_delay: 3000,

      // Cấu hình restart vô hạn, không giới hạn số lần và không tắt bot hẳn
      max_restarts: 0,

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
