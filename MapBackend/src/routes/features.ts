
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { geoStorage } from '../services/geoStorage.js';
import { sourceMapsEnabled } from 'process';

interface RequestParams {
  sourceId: string;
};

interface RequestQuery {
  bbox: string;
  zoom: number;
  limit?: number;
};

interface SearchQuery {
  q: string;
  limit?: number;
};

// GET /api/features/:sourceId?bbox=<w,s,e,n>&zoom=<z>&limit=<N>
export async function featureRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
    fastify.get<{ Params: RequestParams; Querystring: SearchQuery}>(
        '/api/features/:sourceId/search',
        {
            schema: {
                params: {
                    type: 'object',
                    required: ['sourceId'],
                    properties: { sourceId: { type: 'string' } }
                },
                querystring: {
                    type: 'object',
                    required: ['q'],
                    properties: {
                        q: { type: 'string', minLength: 1},
                        limit: {type: 'number', minimum: 1, maximum: 7},
                    }
                }
            }
        },
        async (request, reply) => {
            const { sourceId } = request.params;
            const { q, limit = 7} = request.query;

            if (!geoStorage.hasSource(sourceId)) {
                return reply.status(400).send({
                statusCode: 400,
                error: 'Bad Request',
                message: `Неизвестный источник данных (sourceId): '${sourceId}'`
                });
            };

            try {
                const matchedFeatures = geoStorage.searchFeatures(sourceId, q, limit);
                return matchedFeatures;
            } catch(error) {
                request.log.error(error);
                return reply.status(500).send({
                    statusCode: 500,
                    error: 'Internal Server Error',
                    message: 'Внутренняя ошибка сервера при фильтрации геоданных'
                });
            }
        }

    )
    fastify.get<{Params: RequestParams; Querystring: RequestQuery }>(
        '/api/features/:sourceId',
        {
            schema: {
                params: {
                    type: 'object',
                    required: ['sourceId'],
                    properties: {
                        sourceId: { type: 'string'},
                    }
                },
                querystring: {
                    type: 'object',
                    required: ['bbox', 'zoom',],
                    properties: {
                        bbox: { type: 'string' },
                        zoom: { type: 'integer', minimum: 0, maximum: 24 },
                        limit: { type: 'integer', minimum: 1, default: 1000 },
                    },
                }
            }
        },
        async (request, reply) => {
            const { sourceId } = request.params;
            const { bbox, zoom, limit = 1000} = request.query;

            if (!geoStorage.hasSource(sourceId)) {
                return reply.status(400).send({
                statusCode: 400,
                error: 'Bad Request',
                message: `Неизвестный источник данных (sourceId): '${sourceId}'`
                });
            }

            const bboxCoords = bbox.split(',').map(Number);

            try {
                const geojsonResponse = geoStorage.getFeatures(sourceId, {bboxCoords, zoom, limit});
                return geojsonResponse;
            } catch(error) {
                request.log.error(error);
                return reply.status(500).send({
                    statusCode: 500,
                    error: 'Internal Server Error',
                    message: 'Внутренняя ошибка сервера при фильтрации геоданных'
                });
            }
        }
    );
}

