interface MQMessage {
    id: string;
    url: string;
    file: string;
}

interface ResponseBarramento {
    persist: boolean;
    steps: string[];
    url?: URL;
    body?: string;
    headers?: any;
    method?: string;
    response?: string;
    status?: number;
}
