const levels = ['debug', 'info', 'warn', 'error'];

const shouldLog = (level) => {
  const configured = process.env.LOG_LEVEL || 'info';
  return levels.indexOf(level) >= levels.indexOf(configured);
};

const write = (level, message, meta = {}) => {
  if (!shouldLog(level)) return;

  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta
  };

  const line = JSON.stringify(entry);
  if (level === 'error') return console.error(line);
  if (level === 'warn') return console.warn(line);
  console.log(line);
};

module.exports = {
  debug: (message, meta) => write('debug', message, meta),
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta)
};
