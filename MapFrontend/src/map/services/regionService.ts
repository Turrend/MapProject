import Feature from 'ol/Feature';
import TopoJSON from 'ol/format/TopoJSON';

// ничо не делает в проекте
export const regionService = {
    async loadAllRegions(): Promise<Feature[]> {
        const topoJSONParser = new TopoJSON();

        try {
            const response = await fetch('/data/regions/light_output_rus.json');
            if (!response.ok) throw new Error('Не удалось скачать файл слоя регионов');
            
            const topojsonData = await response.json();

            const features = topoJSONParser.readFeatures(topojsonData, {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857' 
            }) as Feature[];

            return features;
        } catch (error) {
            console.error('Сервис: Ошибка при обработке TopoJSON данных:', error);
            return [];
        }
    }
};
