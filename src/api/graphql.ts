import { withBase } from "./config";

export type MeResponse = {
  data?: { me?: any };
  errors?: Array<{ message: string }>;
};

export type UpdateMeResponse = {
  data?: { updateMe?: any };
  errors?: Array<{ message: string }>;
};

export type UpdateLocationResponse = {
  data?: { updateLocation?: any };
  errors?: Array<{ message: string }>;
};

export type NearbyUsersResponse = {
  data?: { nearbyUsers?: any[] };
  errors?: Array<{ message: string }>;
};

export type UsersInAreaResponse = {
  data?: { usersInArea?: any[] };
  errors?: Array<{ message: string }>;
};

export type UpdatePreferencesResponse = {
  data?: { updatePreferences?: any };
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
        about
        interests
        needs
        profilePhotoUrl
        instagramUsername
        invisibleMode
        is_suspended
        suspension_reason
        suspended_at
        suspension_ends_at
        deleted_at
        deletion_reason
        location {
          latitude
          longitude
          address
          city
          country
          updatedAt
        }
        preferences {
          locationPreference
          agePreference
          friendshipLocationPriority
          relationshipDistanceFlexible
          updatedAt
        }
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
        about
        interests
        needs
        profilePhotoUrl
        instagramUsername
        invisibleMode
        location {
          latitude
          longitude
          address
          city
          country
          updatedAt
        }
        createdAt
      }
    }
  `;
  const json = await gqlFetch<UpdateMeResponse>(mutation, { input }, token);
  if (json.errors?.length) throw new Error(json.errors[0].message || "GraphQL error");
  return json.data?.updateMe ?? null;
}

export async function updateLocationGql(
  input: {
    latitude: number;
    longitude: number;
    address?: string;
    city?: string;
    country?: string;
  },
  token?: string | null
) {
  const mutation = `
    mutation UpdateLocation($input: LocationInput!) {
      updateLocation(input: $input) {
        id
        firstName
        lastName
        location {
          latitude
          longitude
          address
          city
          country
          updatedAt
        }
      }
    }
  `;
  const json = await gqlFetch<UpdateLocationResponse>(mutation, { input }, token);
  if (json.errors?.length) throw new Error(json.errors[0].message || "GraphQL error");
  return json.data?.updateLocation ?? null;
}

export async function nearbyUsersGql(
  latitude: number,
  longitude: number,
  radiusKm: number = 50,
  limit: number = 100,
  token?: string | null
) {
  const query = `
    query NearbyUsers($latitude: Float!, $longitude: Float!, $radiusKm: Float, $limit: Int) {
      nearbyUsers(latitude: $latitude, longitude: $longitude, radiusKm: $radiusKm, limit: $limit) {
        id
        firstName
        lastName
        age
        gender
        profilePhotoUrl
        instagramUsername
        interests
        needs
        distance
        location {
          latitude
          longitude
          address
          city
          country
        }
      }
    }
  `;
  const json = await gqlFetch<NearbyUsersResponse>(query, { latitude, longitude, radiusKm, limit }, token);
  if (json.errors?.length) throw new Error(json.errors[0].message || "GraphQL error");
  return json.data?.nearbyUsers ?? [];
}

export async function usersInAreaGql(
  northEast: { latitude: number; longitude: number },
  southWest: { latitude: number; longitude: number },
  limit: number = 100,
  token?: string | null
) {
  const query = `
    query UsersInArea($northEast: CoordinateInput!, $southWest: CoordinateInput!, $limit: Int) {
      usersInArea(northEast: $northEast, southWest: $southWest, limit: $limit) {
        id
        firstName
        lastName
        age
        gender
        profilePhotoUrl
        instagramUsername
        interests
        needs
        distance
        location {
          latitude
          longitude
          address
          city
          country
        }
      }
    }
  `;
  const json = await gqlFetch<UsersInAreaResponse>(query, { northEast, southWest, limit }, token);
  if (json.errors?.length) throw new Error(json.errors[0].message || "GraphQL error");
  return json.data?.usersInArea ?? [];
}

export async function updatePreferencesGql(
  input: {
    locationPreference?: string;
    agePreference?: string;
    friendshipLocationPriority?: boolean;
    relationshipDistanceFlexible?: boolean;
  },
  token?: string | null
) {
  const mutation = `
    mutation UpdatePreferences($input: PreferencesInput!) {
      updatePreferences(input: $input) {
        id
        preferences {
          locationPreference
          agePreference
          friendshipLocationPriority
          relationshipDistanceFlexible
          updatedAt
        }
      }
    }
  `;
  const json = await gqlFetch<UpdatePreferencesResponse>(mutation, { input }, token);
  if (json.errors?.length) throw new Error(json.errors[0].message || "GraphQL error");
  return json.data?.updatePreferences ?? null;
}
