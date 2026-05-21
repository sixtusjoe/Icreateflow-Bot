module.exports = {
  apps: [
    {
      name:         'discord-ticket-bot',
      script:       'src/index.js',
      interpreter:  'node',
      exec_mode:    'fork',
      instances:    1,
      cwd:          '/root/icreateflow-bot',
      out_file:     '/root/icreateflow-bot/logs/out.log',
      error_file:   '/root/icreateflow-bot/logs/err.log',
      log_date_format: 'YYYY-MM-DDTHH:mm:ss',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
