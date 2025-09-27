import { withBase } from "./config";

export type MeResponse = {
  data?: { me?: any };
  errors?: Array<{ message: string }>;
};

export type UpdateMeResponse = {
  data?: { updateMe?: any };
  errors?: Array<{ message: string }>;
};

async function gqlFetch<T>(query: string, variables: any = {}, token?: string | null): Promise<T> {
  const res = await fetch(withBase("/graphql"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  return (await res.json()) as T;
}

export async function meGql(token?: string | null) {
  const query = `
    query Me {
      me {
        id
        email
        username
        firstName
        lastName
        age
        gender
        phoneNumber
        interests
        needs
        profilePhotoUrl
        createdAt
      }
    }
  `;
  const json = await gqlFetch<MeResponse>(query, {}, token);
  if (json.errors?.length) throw new Error(json.errors[0].message || "GraphQL error");
  return json.data?.me ?? null;
}

export async function updateMeGql(input: any, token?: string | null) {
  const mutation = `
    mutation UpdateMe($input: UpdateMeInput!) {
      updateMe(input: $input) {
        id
        email
        username
        firstName
        lastName
        age
        gender
        phoneNumber
        interests
        needs
        profilePhotoUrl
        createdAt
      }
    }
  `;
  const json = await gqlFetch<UpdateMeResponse>(mutation, { input }, token);
  if (json.errors?.length) throw new Error(json.errors[0].message || "GraphQL error");
  return json.data?.updateMe ?? null;
}
