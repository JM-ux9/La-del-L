import { fetchGraphQL } from "../services/api";

export async function GET() {
  const data = await fetchGraphQL(`
    query {
      productos(limite: 100) {
        id
        nombre
        precio
        imagen
        disponible
        categoria {
          id
          nombre
        }
      }
    }
  `);

  return new Response(JSON.stringify(data.productos), {
    headers: { "Content-Type": "application/json" },
  });
}