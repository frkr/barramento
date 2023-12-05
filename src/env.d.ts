interface Env {

    barramentoDO: DurableObjectNamespace;
    barramentomq: Queue<MQMessage>;
    barramentor2: R2Bucket;

}

interface MQMessage {
    id: string;
    url: string;
    file: string;
}

interface ResponseBarramento {
    persist: boolean;
    steps: string[];
    body?: string;
    headers?: any;
    method?: string;
    url?: URL;
    response?: Response;
}
