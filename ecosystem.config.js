module.exports = {
  apps: [
    {
      name: "CokeBot",
      script: "index.js",
      cwd: "./",

      // Tự động restart khi process thoát
      autorestart: true,

      // Sử dụng Exponential Backoff để tự động giãn cách thời gian restart khi cần
      exp_backoff_restart_delay: 2000,

      // Đảm bảo bot chạy ổn định trên VPS
      min_uptime: "10s",
      max_restarts: 50,

      // Giới hạn RAM: tự động dọn dẹp & restart nếu RAM vượt 1.2GB tránh VPS bị treo đơ
      max_memory_restart: "1200M",

      // Node args tối ưu V8 garbage collector và RAM cho VPS
      node_args: "--max-old-space-size=2048",

      // Không watch file (tắt auto-reload khi code thay đổi)
      watch: false,

      // Log
      out_file: "./logs/bot-out.log",
      error_file: "./logs/bot-error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,

      // Khởi động lại lúc 4 giờ sáng mỗi ngày (giảm memory leak tích tụ)
      cron_restart: "0 4 * * *",

      // Biến môi trường
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
