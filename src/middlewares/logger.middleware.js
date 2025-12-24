const morgan = require("morgan");
const logger = require("../utils/logger");

// Custom token for response time
morgan.token("response-time-ms", (req, res) => {
  if (!req._startAt || !res._startAt) {
    return;
  }

  const ms =
    (res._startAt[0] - req._startAt[0]) * 1e3 +
    (res._startAt[1] - req._startAt[1]) * 1e-6;

  return ms.toFixed(3);
});

// Morgan stream
const stream = {
  write: (message) => logger.info(message.trim()),
};

// Development format
const developmentFormat = morgan(
  ":method :url :status :response-time ms - :res[content-length]",
  { stream },
);

// Production format
const productionFormat = morgan(
  ":remote-addr - :remote-user [:date[clf]] \":method :url HTTP/:http-version\" :status :res[content-length] \":referrer\" \":user-agent\" :response-time-ms ms",
  { stream },
);

// Request logger
const requestLogger =
  process.env.NODE_ENV === "production" ? productionFormat : developmentFormat;

module.exports = requestLogger;
