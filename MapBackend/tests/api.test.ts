import Fastify, { FastifyInstance } from 'fastify';
import { featureRoutes } from '../src/routes/features.js';
import { geoStorage } from '../src/services/geoStorage.js';

describe('Интеграционные тесты', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    app.register(featureRoutes);

    const mockTree: any = {
      search: () => [{ featureIndex: 0 }]
    };

    const mockFeatures = [
      {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [37.6, 55.7] },
        properties: { name: 'Москва' }
      }
    ];

    (geoStorage as any).storage.set('test-source', { tree: mockTree, features: mockFeatures });
    
    await app.ready();
  });


  afterAll(async () => {
    await app.close();
  });


  test('GET /api/features/:sourceId — Успешный запрос', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/features/test-source?bbox=37,55,38,56&zoom=10'
    });


    expect(response.statusCode).toBe(200);

    const json = JSON.parse(response.body);

    expect(json.type).toBe('FeatureCollection');
    expect(Array.isArray(json.features)).toBe(true);
    expect(json.features[0].properties.name).toBe('Москва');
  });


  test('GET /api/features/:sourceId — Отсутствие zoom возвращает HTTP 400', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/features/test-source?bbox=37,55,38,56'
    });

    expect(response.statusCode).toBe(400);
  });

  test('GET /api/features/:sourceId — Неизвестный sourceId возвращает HTTP 400', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/features/unknown-source?bbox=37,55,38,56&zoom=10'
    });

    expect(response.statusCode).toBe(400);
    const json = JSON.parse(response.body);
    expect(json.message).toContain('Неизвестный источник данных');
  });
});
