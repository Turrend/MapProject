import Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import { FetchFeaturesParams } from '@/types';

const API_BASE_URL = 'http://localhost:3000/api';

export const geoService = {
  async getFeatures({ sourceId, bbox, zoom, limit = 1000 }: FetchFeaturesParams, signal?: AbortSignal): Promise<Feature[]> {
    const geoJSONParser = new GeoJSON();
    const stringBbox = bbox.join(',');
    const url = `${API_BASE_URL}/features/${sourceId}?bbox=${stringBbox}&zoom=${zoom}&limit=${limit}`;

    try {
      const response = await fetch(url, { signal });
      
      if (!response.ok) {
        console.error(`[GeoService] Ошибка сервера: ${response.status} (${response.statusText}) при запросе к ${url}`);
        return [];
      }
      
      const geojsonData = await response.json();

      const features = geoJSONParser.readFeatures(geojsonData, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      }) as Feature[];

      return features;

    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return [];
      }

      if (error instanceof Error) {
        console.error(`[GeoService] Ошибка при загрузке или обработке данных: ${error.message}`);
      } else {
        console.error('[GeoService] Произошла неизвестная ошибка при взаимодействии с API бэкенда.');
      }

      return [];
    }
  }

  
};
