import { app } from './app.js';
import { logger } from './utils/logger.js';

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, () => {
  logger.info(`The Socratic Paradox API listening on port ${PORT}`);
});
