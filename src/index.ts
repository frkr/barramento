// imports

//region assets
import {getAssetFromKV} from '@cloudflare/kv-asset-handler';
// @ts-ignore
import manifestJSON from '__STATIC_CONTENT_MANIFEST';
import moment from 'moment-timezone';
import 'moment/locale/pt-br';

const assetManifest = JSON.parse(manifestJSON);
//endregion

export {BarramentoDO} from './BarramentoDO';

const time = moment.tz('America/Sao_Paulo');
const now = time.format('YYYYMMDDHHmmss');


export default {
    async nextId(request: Request, env: Env, ctx: ExecutionContext): Promise<string> {
        const dao: DurableObjectStub = env.barramentoDO.get(env.barramentoDO.idFromName('BarramentoDO'));
        return (await dao.fetch(request.url)).text();
    },
    //async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext) {},
    async fetch(request: Request, env: Env, ctx: ExecutionContext) {
        const data: ResponseBarramento = {persist: false, steps: []};

        if (request.method === 'OPTIONS') {
            return HTTP_OK();
        } else {
            try {

                data.url = new URL(request.url);
                data.body = await request.text();
                data.headers = Object.fromEntries(request.headers.entries());
                data.method = request.method;

                switch (data.url.pathname) {
                    case '/test': {
                        data.persist = true;
                        data.steps.push('test');
                        data.response = new Response(
                            JSON.stringify({
                                now,
                            }),
                            {
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                status: 200,
                            });
                        return data.response;
                    }
                }

                // Outra formas de fazer
                // if (url.pathname.startsWith('/api/')) {
                // return apiRouter.handle(request);
                // }

                if (request.method === 'GET') {
                    //region GET
                    try {
                        data.persist = false;
                        return await getAssetFromKV(
                            // @ts-ignore
                            {
                                request,
                                waitUntil(promise) {
                                    return ctx.waitUntil(promise);
                                },
                            },
                            {
                                // @ts-ignore
                                ASSET_NAMESPACE: env.__STATIC_CONTENT,
                                ASSET_MANIFEST: assetManifest,
                            },
                        );
                    } catch (e) {
                        // if (e instanceof NotFoundError) {
                        // } else if (e instanceof MethodNotAllowedError) {
                    }
                    //endregion
                }

            } catch (e) {
                console.error('FATAL', e, e.stack);
                data.response = HTTP_UNPROCESSABLE_ENTITY();
            } finally {
                if (data.persist) {

                    //region Request / Response
                    const id = await this.nextId(request, env, ctx);
                    const file = `${now}-${id}.txt`;
                    await env.barramentor2.put(file, JSON.stringify(data));
                    await env.barramentomq.send({url: request.url, id, file} as MQMessage, {contentType: 'json'});
                    //endregion

                }
            }
        }
        return data.response ? data.response : HTTP_UNPROCESSABLE_ENTITY();
    },
    async queue(batch: MessageBatch<MQMessage>, env: Env): Promise<void> {
        for (const msg of batch.messages) {
            try {

                console.log('queue', msg.body.id, msg.body.url, msg.body.file);

                //console.log(await (await env.barramentor2.get(msg.body.file)).text());

            } catch (e) {
                console.error('queue', e, e.stack);
                // try {
                // 	await env.tmsbackr2.delete(msg.body.id + ".txt");
                // } catch (e) {
                // }
            } finally {
                msg.ack();
            }
        }
    }
}

const HTTP_OK = () => new Response('200 Ok', {status: 200});
const HTTP_CREATED = () => new Response('201 Created', {status: 201});
const HTTP_UNPROCESSABLE_ENTITY = () => new Response('422 Unprocessable Content', {status: 422});
