import { FastifyPluginAsync } from 'fastify';

const upgradeFeedbackRoutes: FastifyPluginAsync = async (fastify) => {
    // Submit upgrade survey feedback
    fastify.post('/', async (request: any, reply) => {
        const { id, plan_selected, payment_method, crypto_type, desired_plans, rating, comments } = request.body as {
            id?: string;
            plan_selected: string;
            payment_method: string;
            crypto_type?: string;
            desired_plans: any[];
            rating: number;
            comments?: string;
        };

        const payload = {
            user_id: request.userId,
            plan_selected,
            payment_method,
            crypto_type,
            desired_plans,
            rating,
            comments
        };

        const { data, error } = id
            ? await fastify.supabase.from('upgrade_feedback').upsert({ id, ...payload }).select()
            : await fastify.supabase.from('upgrade_feedback').insert([payload]).select();

        if (error) {
            fastify.log.error({ error, payload, userId: request.userId }, 'Failed to save upgrade survey');
            return reply.status(500).send({
                message: 'Failed to save upgrade survey',
                error: error.message,
                details: error.details
            });
        }

        const result = Array.isArray(data) ? data[0] : data;
        return { message: 'Transmission received.', data: result };
    });
};

export default upgradeFeedbackRoutes;
