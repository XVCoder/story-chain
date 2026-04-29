import express from 'express';
import cors from 'cors';
import router from './routes/index.js';
import { initDatabase } from './db/database.js';
import { setupSwagger } from './swagger.js';

const app = express();
const PORT = parseInt(process.env.PORT || '8080', 10);

app.use(cors());
app.use(express.json());
app.use('/api', router);

setupSwagger(app);

initDatabase().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
    console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
  });
}).catch((err: any) => {
  console.error('Failed to initialize database:', err);
});
