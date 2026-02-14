import { FastifyPluginAsync } from 'fastify';

const runtimeRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get('/', async () => {
        const { data, error } = await fastify.supabase
            .from('runtimes')
            .select('*');

        if (error) throw error;
        return data;
    });

    fastify.get('/:id', async (request) => {
        const { id } = request.params as { id: string };
        const { data, error } = await fastify.supabase
            .from('runtimes')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    });
};

export default runtimeRoutes;
