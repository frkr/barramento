# Exemplo de raiz de barramento

- Criar um projeto com o template do cloudflare
```shell
npm create cloudflare@latest barramento
```

- Configurações de deploy

```shell
npx wrangler r2 bucket create barramento
npx wrangler queues create barramento
```
