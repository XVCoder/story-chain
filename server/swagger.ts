import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import type { Express } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Story Chain API',
      version: '1.0.0',
      description: '故事接龙游戏 API 文档',
      contact: {
        name: 'API Support',
        email: 'support@storychain.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:8080/api',
        description: '本地开发服务器'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: [
    path.join(__dirname, './routes/*.js'),
    path.join(__dirname, './controllers/*.js')
  ]
};

let swaggerSpec: any;
try {
  swaggerSpec = swaggerJsdoc(options);
} catch (error) {
  console.error('Error generating swagger spec:', error);
  swaggerSpec = {
    openapi: '3.0.0',
    info: {
      title: 'Story Chain API',
      version: '1.0.0',
      description: '故事接龙游戏 API 文档'
    },
    servers: [
      {
        url: 'http://localhost:3001/api',
        description: '本地开发服务器'
      }
    ],
    paths: {}
  };
}

export const setupSwagger = (app: Express): void => {
  app.get('/api-docs.json', (req, res) => {
    res.json(swaggerSpec);
  });
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customSiteTitle: 'Story Chain API Docs'
  }));
};

export default swaggerSpec;