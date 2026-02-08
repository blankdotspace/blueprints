import { FastifyPluginAsync } from 'fastify';

const feedbackRoutes: FastifyPluginAsync = async (fastify) => {
    // Submit feedback
    fastify.post('/', async (request: any, reply) => {
        const { rating, comment } = request.body as { rating: number; comment?: string };

        if (!rating || rating < 1 || rating > 5) {
            return reply.status(400).send({ message: 'Rating must be between 1 and 5' });
        }

        const { data, error } = await fastify.supabase
            .from('feedback')
            .insert([{
                user_id: request.userId,
                rating,
                comment
            }])
            .select();

        if (error) {
            fastify.log.error({ error, userId: request.userId }, 'Failed to save feedback');
            return reply.status(500).send({ message: 'Failed to save feedback', error: error.message });
        }

        const result = Array.isArray(data) ? data[0] : data;
        return { message: 'Feedback received', data: result };

        return { message: 'Feedback received', data };
    });

    // Get own feedback
    fastify.get('/me', async (request: any) => {
        const { data, error } = await fastify.supabase
            .from('feedback')
            .select('*')
            .eq('user_id', request.userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    });
};

export default feedbackRoutes;
