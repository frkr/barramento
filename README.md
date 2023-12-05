# Exemplo de raiz de barramento

- Criar um projeto com o template do cloudflare
```shell
npm create cloudflare@latest barramento
```

- Configurações de deploy

```shell
wrangler r2 bucket create barramento
wrangler queues create barramento
```
