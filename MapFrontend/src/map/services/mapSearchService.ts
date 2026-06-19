import Feature from 'ol/Feature';
import VectorSource from 'ol/source/Vector';

export interface SearchResultRegion {
    name: string;
    feature: Feature;
}

export const mapSearchService = {
    searchRegions(getSource: () => VectorSource, query: string): SearchResultRegion[] {
        const cleanQuery = query.trim().toLowerCase();
        if (!cleanQuery) return [];

        const source = getSource();
        if (!source) return [];
        
        const features = source.getFeatures();
        const results: SearchResultRegion[] = [];
        const MAX_RESULTS = 7;

        const len = features.length;
        for (let i = 0; i < len; i++) {
            const feature = features[i];
            if (!feature) continue;
            const regionName = feature.get('name') as string || '';

            if (regionName.toLowerCase().includes(cleanQuery)) {
                results.push({
                    name: regionName,
                    feature: feature,
                });

                if (results.length === MAX_RESULTS) {
                    break;
                }
            }
        }

        return results;
    }
}