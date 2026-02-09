import { FastifyPluginAsync } from 'fastify';

const adminRoutes: FastifyPluginAsync = async (fastify) => {
    // Apply admin guard to all routes in this prefix
    fastify.addHook('preHandler', fastify.adminGuard);

    // 1. System-wide stats
    fastify.get('/stats', async () => {
        const { count: userCount } = await fastify.supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        const { count: projectCount } = await fastify.supabase
            .from('projects')
            .select('*', { count: 'exact', head: true });

        const { count: agentCount } = await fastify.supabase
            .from('agents')
            .select('*', { count: 'exact', head: true });

        const { data: activeAgents } = await fastify.supabase
            .from('agent_actual_state')
            .select('status');

        const { data: feedbackData } = await fastify.supabase
            .from('feedback')
            .select('rating');

        const { data: upgradeData, error: uError } = await fastify.supabase
            .from('upgrade_feedback')
            .select('payment_method');

        if (uError) {
            fastify.log.error({ uError }, 'AdminDashboard: Failed to fetch payment method data');
        }

        const { count: upgradeCount } = await fastify.supabase
            .from('upgrade_feedback')
            .select('*', { count: 'exact', head: true });

        const paymentStats: Record<string, number> = {};
        if (upgradeData) {
            upgradeData.forEach((curr: any) => {
                const method = curr.payment_method || 'unselected';
                paymentStats[method] = (paymentStats[method] || 0) + 1;
            });
        }

        const runningCount = activeAgents?.filter(a => a.status === 'running').length || 0;
        const errorCount = activeAgents?.filter(a => a.status === 'error').length || 0;

        const averageRating = feedbackData && feedbackData.length > 0
            ? feedbackData.reduce((acc, f) => acc + f.rating, 0) / feedbackData.length
            : 0;

        const stats = {
            users: userCount || 0,
            projects: projectCount || 0,
            agents: agentCount || 0,
            runningAgents: runningCount,
            failingAgents: errorCount,
            averageRating: Number(averageRating.toFixed(1)),
            feedbackCount: feedbackData?.length || 0,
            upgradeCount: upgradeCount || 0,
            paymentStats,
            timestamp: new Date().toISOString()
        };

        fastify.log.info({ stats }, 'AdminDashboard: Stats response generated');
        return stats;
    });

    // 2. Users listing (Admin only)
    fastify.get('/users', async () => {
        const { data: profiles, error } = await fastify.supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return profiles;
    });

    // 3. Clusters (Projects) listing (Admin only)
    fastify.get('/clusters', async () => {
        const { data: projects, error } = await fastify.supabase
            .from('projects')
            .select('*, profiles(email), agents(count)')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return projects.map((p: any) => ({
            ...p,
            owner_email: p.profiles?.email || 'Unknown',
            agent_count: p.agents?.[0]?.count || 0
        }));
    });

    // 4. Upgrades listing (Admin only) - Alias for upgrade-feedback but with simpler path
    fastify.get('/upgrades', async () => {
        const { data: upgrades, error: uError } = await fastify.supabase
            .from('upgrade_feedback')
            .select('*')
            .order('created_at', { ascending: false });

        if (uError) throw uError;
        if (!upgrades || upgrades.length === 0) return [];

        const userIds = Array.from(new Set(upgrades.map((u: any) => u.user_id)));
        const { data: profiles, error: pError } = await fastify.supabase
            .from('profiles')
            .select('id, email')
            .in('id', userIds);

        if (pError) fastify.log.error(pError, 'Failed to fetch profiles for upgrades');

        return upgrades.map((u: any) => ({
            ...u,
            user_email: profiles?.find(p => p.id === u.user_id)?.email || 'Unknown',
            plan_selected: u.plan_selected || 'Unknown',
            payment_method: u.payment_method || 'Unknown',
        }));
    });

    // 2. Feedback listing (Admin only)
    fastify.get('/feedback', async () => {
        // Fetch feedbacks first
        const { data: feedbacks, error: fError } = await fastify.supabase
            .from('feedback')
            .select('*')
            .order('created_at', { ascending: false });

        if (fError) throw fError;
        if (!feedbacks || feedbacks.length === 0) return [];

        // Fetch profiles for these users
        const userIds = Array.from(new Set(feedbacks.map(f => f.user_id)));
        const { data: profiles, error: pError } = await fastify.supabase
            .from('profiles')
            .select('id, email')
            .in('id', userIds);

        if (pError) fastify.log.error(pError, 'Failed to fetch profiles for feedback');

        // Merge
        return feedbacks.map(f => ({
            ...f,
            user: profiles?.find(p => p.id === f.user_id) || { email: 'Unknown' }
        }));
    });

    // 3. Upgrade Feedback listing (Admin only)
    fastify.get('/upgrade-feedback', async () => {
        const { data: upgrades, error: uError } = await fastify.supabase
            .from('upgrade_feedback')
            .select('*')
            .order('created_at', { ascending: false });

        if (uError) throw uError;
        if (!upgrades || upgrades.length === 0) return [];

        const userIds = Array.from(new Set(upgrades.map(u => u.user_id)));
        const { data: profiles, error: pError } = await fastify.supabase
            .from('profiles')
            .select('id, email')
            .in('id', userIds);

        if (pError) fastify.log.error(pError, 'Failed to fetch profiles for upgrade feedback');

        return upgrades.map(u => ({
            ...u,
            user: profiles?.find(p => p.id === u.user_id) || { email: 'Unknown' }
        }));
    });

    // 4. All agents list (Admin view)
    fastify.get('/agents', async () => {
        const { data, error } = await fastify.supabase
            .from('agents')
            .select(`
                *,
                project:projects(name, tier, user_id),
                status:agent_actual_state(status, last_sync, endpoint_url, error_message),
                desired:agent_desired_state(enabled, updated_at)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    });

    // 3. System Management (Super Admin only)
    fastify.post('/deploy-super-agent', { preHandler: [fastify.superAdminGuard] }, async (request, reply) => {
        // Ensure Admin Project exists
        let { data: project, error: pError } = await fastify.supabase
            .from('projects')
            .select('id')
            .eq('name', 'Administrative Cluster')
            .eq('user_id', request.userId)
            .single();

        if (pError || !project) {
            const { data: newProject, error } = await fastify.supabase
                .from('projects')
                .insert([{ name: 'Administrative Cluster', user_id: request.userId, tier: 'enterprise' }])
                .select()
                .single();
            if (error || !newProject) throw error || new Error('Failed to create Administrative Cluster');
            project = newProject as any;
        }

        // Create Super Agent
        const { data: agent, error: agentError } = await fastify.supabase
            .from('agents')
            .insert([{
                project_id: (project as any).id,
                name: 'Super Auditor',
                framework: 'openclaw',
            }])
            .select()
            .single();

        if (agentError) throw agentError;

        // Initialize with root privileges
        const { error: stateError } = await fastify.supabase
            .from('agent_desired_state')
            .insert([{
                agent_id: agent.id,
                enabled: true,
                config: {
                    metadata: { security_tier: 'custom' },
                    agents: { defaults: { workspace: '/root/.openclaw' } },
                    auth: { profiles: { default: { provider: 'anthropic', mode: 'api_key', token: '' } } },
                    gateway: { auth: { mode: 'token', token: 'ADMIN_SECRET_' + Math.random().toString(36).substring(7) } }
                }
            }]);

        if (stateError) throw stateError;

        return { message: 'Super Agent deployed', agentId: agent.id };
    });

    fastify.get('/system', { preHandler: [fastify.superAdminGuard] }, async () => {
        return {
            message: 'System management interface active',
            dockerSupported: true
        };
    });
};

export default adminRoutes;
