import Fastify from "fastify";
import { geoStorage } from "./services/geoStorage.js";
import { featureRoutes } from "./routes/features.js";
import cors from '@fastify/cors';

const fastify = Fastify ({
    logger: {
        transport: {
            target: 'pino-pretty',
            options: {
                translateTime: 'SYS:HH:MM:ss Z',
                ignore: 'pid,hostname',
                colorize: true,  
            }
        }
    }
});

await fastify.register(cors, {
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET'],
});

console.log('Гиги');

fastify.get('/ping', async (request, reply) => {
    return  {status: 'ok', message: 'Сервер работает'};
});

fastify.register(featureRoutes);

const start = async () => {
    try {
        await geoStorage.init(fastify.log);
        const address  = await fastify.listen({ port: 3000, host: '0.0.0.0' });
        console.log(`Сервер запущен. Адрес: ${address}`);
    } catch(error) {
        fastify.log.error(error);
        process.exit(1);
    }
};

start();