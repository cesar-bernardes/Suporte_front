export default function AdminCleanupPage() {
  return (
    <main style={{ padding: 32, fontFamily: "sans-serif" }}>
      <h1>Limpeza de dados antigos</h1>
      <p>Esta ação apenas oculta os registros conhecidos da antiga demonstração.</p>
      <form action="/api/admin/cleanup-demo-data" method="post">
        <button type="submit">Executar limpeza</button>
      </form>
    </main>
  );
}
