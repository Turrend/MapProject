import Map from 'ol/Map';
import Feature from 'ol/Feature';
import Geometry from 'ol/geom/Geometry';
import Layer from 'ol/layer/Layer';
import { type Pixel } from 'ol/pixel';
import { getRegionColor } from '../MapStyle';
import { ClickedRegionData } from '@/types';

class MapInteractionService {
    private featureIndex: Record<string, Feature<Geometry>> = {};

    public indexFeatures(features: Feature<Geometry>[]): void {
        this.featureIndex = {};
        features.forEach((feature) => {
            const name = feature.get('name') as string || 'Неизвестный регион';
            this.featureIndex[name] = feature;
        } )
    }

    public getFeatureByName(name: string): Feature<Geometry> | null {
        return this.featureIndex[name] || null;
    }

    public getRegionAtPixel(map: Map, pixel: Pixel, targetLayer: Layer): ClickedRegionData | null {
        let foundData: ClickedRegionData | null = null;

        map.forEachFeatureAtPixel(
            pixel,
            (featureLike) => {
                if (!(featureLike instanceof Feature)) {
                    return false;
                }
                
                const regionName = featureLike.get('name') as string || 'Неизвестный регион';
                const rawLifeExp = featureLike.get('life_exp') as number | undefined;
                console.log(rawLifeExp)
                const regionLifeExp = rawLifeExp ?? 'Неизвестна продолжительность жизни в этом регионе';
                const regionColor = getRegionColor(regionLifeExp);    
                foundData = {
                    name: regionName,
                    id: regionName,
                    life_exp: regionLifeExp,
                    color: regionColor,
                    coord: null,
                };
                return true;
            },
            {
                layerFilter: (layer) => layer === targetLayer
            }
        );

        return foundData;
    }
}
    
export const mapInteractionService = new MapInteractionService();