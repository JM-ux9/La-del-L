import { obtenerToken } from "./auth";

const GRAPHQL_ENDPOINT = "http://localhost:8000/graphql";

export async function fetchGraphQL(query, variables = {}) {
  const token = typeof localStorage === "undefined" ? null : obtenerToken();

  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Error del servidor: ${response.status}`);
  }

  const { data, errors } = await response.json();

  if (errors) {
    throw new Error(errors[0].message);
  }

  return data;
}