
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
