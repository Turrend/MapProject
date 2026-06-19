import RBush from 'rbush';
import { geoStorage } from '../src/services/geoStorage.js';
import { GeoJSONFeatureCollection, RBushItem } from '../src/types.js';

describe('Тесты (Фильтрация и Генерализация)', () => {
  
  beforeAll(() => {
    const mockFeatures: GeoJSONFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [10.0, 10.0],
              [12.0, 15.0],
              [11.0, 20.0],
              [15.0, 25.0],
              [13.0, 35.0],
              [10.0, 50.0],
              [25.0, 45.0],
              [40.0, 50.0],
              [30.0, 20.0],
              [10.0, 10.0]
            ]]
          },
          properties: { name: 'Тестовый регион' }
        }
      ]
    };

    const tree = new RBush<RBushItem>();
    const [minX, minY, maxX, maxY] = [10.0, 10.0, 40.0, 50.0];
    tree.load([{ minX, minY, maxX, maxY, featureIndex: 0 }]);

    (geoStorage as any).storage.set('unit-source', { tree, features: mockFeatures.features });
  });

  test('Фильтрация — должен вернуть объект, если он пересекает BBOX экрана', () => {
    const result = geoStorage.getFeatures('unit-source', {
      bboxCoords: [0.0, 0.0, 60.0, 60.0], 
      zoom: 15, 
      limit: 10
    });

    expect(result.features.length).toBe(1);
    expect(result.features[0].properties.name).toBe('Тестовый регион');
  });

  test('Фильтрация — должен вернуть пустую коллекцию, если BBOX экрана далеко от объекта', () => {
    const result = geoStorage.getFeatures('unit-source', {
      bboxCoords: [80.0, 80.0, 90.0, 90.0], 
      zoom: 15,
      limit: 10
    });

    expect(result.type).toBe('FeatureCollection');
    expect(result.features.length).toBe(0);
  });

  test('Генерализация — должен уменьшить детализацию геометрии на маленьком зуме (zoom=3)', () => {
    const result = geoStorage.getFeatures('unit-source', {
      bboxCoords: [0.0, 0.0, 60.0, 60.0],
      zoom: 3,
      limit: 10
    });

    const originalPointsCount = 10; 


    const simplifiedPointsCount = result.features[0].geometry.coordinates[0].length;


    expect(simplifiedPointsCount).toBeLessThan(originalPointsCount);
  });
});
