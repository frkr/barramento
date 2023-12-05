interface Env {

    barramentoDO: DurableObjectNamespace;
    barramentomq: Queue<MQMessage>;
    barramentor2: R2Bucket;

}
