import fs from 'fs/promises';
import path from 'path';
import RBush from 'rbush';
import bbox from '@turf/bbox';
import simplify from '@turf/simplify';
import { GeoJSONFeature, GeoJSONFeatureCollection, RBushItem } from '../types.js';

class GeoStorage {
    private storage = new Map<string, { tree: RBush<RBushItem>; features: GeoJSONFeature[] }>();
    private dataDir = path.resolve('data');

    private getTolerance(zoom: number): number {
        if (zoom <= 1) return 0.2;
        if (zoom <= 5) return 0.02;
        if (zoom <= 9) return 0.002;
        if (zoom <= 13) return 0.0002;
        return 0;
    };

    private async loadFile(filePath: string, logger: any): Promise<void> {
        try {
            const sourceId = path.basename(filePath, path.extname(filePath));
            const rawData = await fs.readFile(filePath, 'utf-8');
            const geojson = JSON.parse(rawData) as GeoJSONFeatureCollection;

            if (!geojson || geojson.type != 'FeatureCollection' || !Array.isArray(geojson.features)) {
                logger.error(`[GeoStorage] Файл ${path.basename(filePath)} имеет неправильный формат GeoJSON.`);
                return;
            }

            const tree = new RBush<RBushItem>();

            const items: RBushItem[] = [];

            geojson.features.forEach((feature, index) => {
                if (!feature || !feature.geometry || !feature.geometry.coordinates) {
                    return;
                }

                const [minX, minY, maxX, maxY] = bbox(feature);

                items.push({minX, minY, maxX, maxY, featureIndex: index, });
            });

            tree.load(items);

            this.storage.set(sourceId, { tree: tree, features: geojson.features });

            logger.info(`[GeoStorage] Источник ${sourceId} успешно загружен в память. Объектов: ${geojson.features.length}`);
        } catch(error) {
            logger.error(`[GeoStorage] Ошибка при чтении файла ${path.basename(filePath)}: ${(error as Error).message}`);
        }
    }

    
    public hasSource(sourceId: string): boolean {
        return this.storage.has(sourceId);
    }

    public getFeatures(sourceId: string, params: {bboxCoords: number[], zoom: number, limit: number}): GeoJSONFeatureCollection  {
        const { bboxCoords, zoom, limit } = params;
        const source = this.storage.get(sourceId)!;
        const [w, s, e, n] = bboxCoords;

        const matchedItems = source.tree.search({ minX: w, minY: s, maxX: e, maxY: n });
        const limitedItems = matchedItems.slice(0, limit);
        const tolerance = this.getTolerance(zoom);

        const processedFeatures = limitedItems.map(item => {
            const originalFeature = source.features[item.featureIndex];
            const featureCopy = structuredClone(originalFeature) as GeoJSONFeature;

            if (tolerance > 0 && featureCopy.geometry.type != 'Point') {
                return simplify(featureCopy as any, { tolerance, highQuality: false, mutate: true}) as unknown as GeoJSONFeature;
            }

            return featureCopy;
        })
        return {
            type: 'FeatureCollection',
            features: processedFeatures
        };
    }
    
    public async init(logger: any): Promise<void> {
        try {
            await fs.mkdir(this.dataDir, { recursive: true });
            
            const files = await fs.readdir(this.dataDir);
    
            for (const file  of files) {
                const ext = path.extname(file);
    
                if (ext === '.json' || ext === '.geojson') {
                    logger.info(`[GeoStorage] Обнаружен файл данных ${file}`);
                    const filePath = path.join(this.dataDir, file);
                    await this.loadFile(filePath, logger);
    
                }
                
            }
    
            logger.info(`[GeoStorage] Сканирование папки данных завершено.`);
    
        } catch (error) {
            logger.error(`[GeoStorage] Ошибка при инициализации хранилища: ${(error as Error).message}`);
        }
    }
    
    public searchFeatures(sourceId: string, query: string, limit: number): GeoJSONFeature[] {
        const source = this.storage.get(sourceId);
        if (!source) return [];

        const cleanQuery = query.trim().toLowerCase();
        if (!cleanQuery) return [];

        const results: GeoJSONFeature[] = [];

        const len = source.features.length;
        for (let i = 0; i < len; i++) {
            const feature = source.features[i];
            if (!feature) continue;
            const regionName = String(feature.properties.name || '');

            if (regionName.toLowerCase().includes(cleanQuery)) {
                results.push(feature);

                if (results.length === limit) {
                    break;
                }
            }
        }

        return results;
    }
};

export const geoStorage = new GeoStorage();