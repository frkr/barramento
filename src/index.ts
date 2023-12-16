export {BarramentoDO} from './BarramentoDO';

import {getAssetFromKV} from '@cloudflare/kv-asset-handler';
// @ts-ignore
import manifestJSON from '__STATIC_CONTENT_MANIFEST';
import moment from 'moment-timezone';
import 'moment/locale/pt-br';

const assetManifest = JSON.parse(manifestJSON);


const timeZone = 'America/Sao_Paulo';
const now = moment.tz(timeZone).format('YYYYMMDDHHmmss');

export default {
    async nextId(request: Request, env: Env, ctx: ExecutionContext): Promise<string> {
        const dao: DurableObjectStub = env.barramentoDO.get(env.barramentoDO.idFromName('BarramentoDO'));
        return (await dao.fetch(request.url)).text();
    },
    //async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext) {},
    //async email(email: EmailMessage, env: Env, ctx: ExecutionContext) {},
    async fetch(request: Request, env: Env, ctx: ExecutionContext) {
        const url = new URL(request.url);
        const pathname = url.pathname;
        const data: ResponseBarramento = {persist: false, url, method: request.method, steps: []};

        if (request.method === 'OPTIONS') {
            return HTTP_OK();
        } else {

            if (request.method === 'GET' && !pathname.startsWith('/api/')) {

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

            } else {

                let step = data.url.pathname.split('/').pop();
                data.steps.push(step);

                try {

                    data.body = await request.text();
                    data.headers = Object.fromEntries(request.headers.entries());


                    // XXX Provavelmente será usado apenas metodos dentro desse Switch
                    switch (step) {
                        case 'test': {
                            data.persist = true;
                            data.response = JSON.stringify({
                                now,
                            });
                        }
                    }

                    // Outra formas de fazer
                    // if (url.pathname.startsWith('/api/')) {
                    // return apiRouter.handle(request);
                    // }


                } catch (e) {
                    console.error('FATAL', e, e.stack);
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
        }
        return data.response ?
            new Response(data.response, {
                status: data.status ? data.status : 201,
                headers: {
                    'content-type': 'application/json;charset=UTF-8',
                },
            }) :
            HTTP_UNPROCESSABLE_ENTITY();
    },
    async queue(batch: MessageBatch<MQMessage>, env: Env): Promise<void> {
        console.log('queue:', batch.queue);
        for (const msg of batch.messages) {
            try {

                const data = msg.body as MQMessage;
                console.log('queue msg:', data.id, data.url, data.file);
                //console.log(await (await env.wchatr2.get(msg.body.file)).text());

                const contentRaw = await (await env.barramentor2.get(msg.body.file)).text();

                try {
                    //const content = JSON.parse(contentRaw);

                    // XXX É também é uma maneira de fazer processamento de request no futuro.
                    switch (data.url.split('/').pop()) {
                        case 'test': {

                            console.log("test", contentRaw)

                            break;
                        }

                    }

                } catch (e) {
                    console.error("ERRO MENSAGEM INVALIDA", e, e.stack);
                    console.error(contentRaw);
                }


            } catch (e) {
                console.error('queue err:', e, e.stack);
                // try {
                // 	await env.tmsbackr2.delete(msg.body.id + ".txt");
                // } catch (e) {
                // }
            } finally {
                msg.ack();
            }
        }
    },
}

const HTTP_OK = () => new Response('200 Ok', {status: 200});
const HTTP_CREATED = () => new Response('201 Created', {status: 201});
const HTTP_UNPROCESSABLE_ENTITY = () => new Response('422 Unprocessable Content', {status: 422});
