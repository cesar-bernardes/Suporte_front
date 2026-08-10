# Suporte_front

Frontend do Portal de Ocorrências de Suporte.

## Executar localmente

```bash
npm install
npm run dev
```

## Backend

As requisições para `/api/*` são encaminhadas pelo Next.js para o backend.

Na Vercel, configure `BACKEND_URL` com a URL pública do projeto backend. Se a variável não estiver definida, será usado `https://suport-backend.vercel.app`.
