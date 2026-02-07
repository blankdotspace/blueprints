import http from 'node:http';

export const docker = {
    async _request(method: string, path: string, body?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const options = {
                socketPath: '/var/run/docker.sock',
                path: `/v1.44${path}`,
                method,
                headers: body ? { 'Content-Type': 'application/json' } : {}
            };

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 400) {
                        const err = new Error(`Docker API Error (${res.statusCode}): ${data}`);
                        (err as any).status = res.statusCode;
                        (err as any).data = data;
                        return reject(err);
                    }
                    try {
                        resolve(data ? JSON.parse(data) : {});
                    } catch (e) {
                        resolve(data);
                    }
                });
            });

            req.on('error', (err) => reject(err));
            if (body) req.write(JSON.stringify(body));
            req.end();
        });
    },

    async listContainers() {
        return this._request('GET', '/containers/json?all=true');
    },

    async getContainer(name: string) {
        return {
            inspect: () => this._request('GET', `/containers/${name}/json`),
            start: () => this._request('POST', `/containers/${name}/start`),
            stop: () => this._request('POST', `/containers/${name}/stop`),
            remove: () => this._request('DELETE', `/containers/${name}?v=true&force=true`)
        };
    },

    async createContainer(config: any) {
        const { name, ...rest } = config;
        const data = await this._request('POST', `/containers/create?name=${name}`, rest);
        return this.getContainer(data.Id || data.Id);
    },

    async createExec(id: string, config: any) {
        return this._request('POST', `/containers/${id}/exec`, config);
    },

    async startExec(execId: string, config: any) {
        return this._request('POST', `/exec/${execId}/start`, config);
    }
};
