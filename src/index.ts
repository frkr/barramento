//region assets
import {getAssetFromKV} from '@cloudflare/kv-asset-handler';
// @ts-ignore
import manifestJSON from '__STATIC_CONTENT_MANIFEST';
const assetManifest = JSON.parse(manifestJSON);
//endregion

import moment from 'moment-timezone';
import 'moment/locale/pt-br';

export {BarramentoDO} from './BarramentoDO';

const time = moment.tz('America/Sao_Paulo');
const now = time.format('YYYYMMDDHHmmss');


export default {
    async nextId(request: Request, env: Env, ctx: ExecutionContext): Promise<string> {
        const dao: DurableObjectStub = env.barramentoDO.get(env.barramentoDO.idFromName('BarramentoDO'));
        return (await dao.fetch(request.url)).text();
    },
    //async scheduled(event, env, ctx)
    async fetch(request: Request, env: Env, ctx: ExecutionContext) {
        try {
            if (request.method === 'OPTIONS') {
                return HTTP_OK();
            } else {

                //region Backup dos requests
                const id = await this.nextId(request, env, ctx);
                const url = request.url;
                const file = `${now}-${id}-request.txt`;
                const fileResponse = `${now}-${id}-response.txt`;
                const data = await request.text();
                await env.barramentor2.put(file, data);
                // Nao esta enviando para a fila porque nao tem o que fazer com isso
                //await env.tmsback.send({ url, id, file } as MQMessage, { contentType: 'json' });
                let dataResponse = "";
                //endregion

                try {

                    if (request.url.indexOf( '/test') !== -1 ) {
                        return new Response(
                            JSON.stringify({
                                id,
                            })
                            , {status: 200});
                    } else if (request.method === 'GET') {

                        //region GET
                        try {
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

                } finally {

                    //region Backup das respostas
                    await env.barramentor2.put(fileResponse, dataResponse);
                    //endregion

                }

            }

            return HTTP_CREATED();
        } catch (e) {
            console.error('FATAL', e, e.stack);
        }
        return HTTP_UNPROCESSABLE_ENTITY();
    }
    ,
    async queue(batch: MessageBatch<MQMessage>, env: Env): Promise<void> {
        for (const msg of batch.messages) {
            try {

                console.log('queue', msg.body.id, msg.body.url, msg.body.file);

                console.log(await (await env.barramentor2.get(msg.body.file)).text());

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
