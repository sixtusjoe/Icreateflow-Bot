function timestamp() {
  return new Date().toISOString();
}

function write(level, ...args) {
  const prefix = `[${timestamp()}][${level}]`;
  if (level === 'ERROR') {
    console.error(prefix, ...args);
  } else {
    console.log(prefix, ...args);
  }
}

export const log = {
  info:  (...args) => write('INFO',  ...args),
  warn:  (...args) => write('WARN',  ...args),
  error: (...args) => write('ERROR', ...args),
};
