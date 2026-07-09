import { http } from "./http";

export interface UserDTO {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  age: number; // server-computed from date_of_birth, read-only
  dateOfBirth?: string | null;
  gender: string;
  phoneNumber?: string | null;
  interests: string[];
  needs: string[];
  profilePhotoUrl?: string | null;
}

export interface AuthResponse {
  access_token: string;
  user: UserDTO;
  needsDobMigration?: boolean;
}

// Sent on every login/signup so the backend can tie the new session to a
// device (see CircleReact's src/services/deviceId.js for deviceId). All
// optional -- older/unpatched call sites simply omit them.
export interface DeviceInfo {
  deviceId?: string;
  deviceType?: string;
  deviceName?: string;
}

export interface LoginBody extends DeviceInfo {
  identifier: string; // email or username
  password: string;
}

export interface SignupBody extends DeviceInfo {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO date, must be at least MIN_AGE years old
  gender: string;
  email: string;
  phoneNumber?: string;
  interests?: string[];
  needs?: string[];
  username: string; // Required: 3-30, alnum._-
  password: string; // min 6
  about?: string;
  instagramUsername?: string;
}

export interface GoogleAuthResponse {
  access_token?: string;
  user?: UserDTO;
  isNewUser: boolean;
  googleProfile?: {
    email: string;
    firstName: string;
    lastName: string;
    profilePhotoUrl?: string | null;
    emailVerified: boolean;
  };
}

export interface GoogleCompleteSignupBody extends DeviceInfo {
  idToken: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  username: string;
  phoneNumber?: string;
  interests?: string[];
  needs?: string[];
  instagramUsername?: string;
  about?: string;
}

export interface LogoutBody {
  deviceId?: string | null;
  // The push token (not the JWT) -- a fallback match for rows still
  // missing a deviceId, mirrors /api/notifications/unregister-token.
  token?: string | null;
}

export const authApi = {
  login: (body: LoginBody) => http.post<AuthResponse, LoginBody>("/api/auth/login", body),
  signup: (body: SignupBody) => http.post<AuthResponse, SignupBody>("/api/auth/signup", body),
  usernameAvailable: (username: string) => http.get<{ available: boolean }>(`/api/auth/username-available?username=${encodeURIComponent(username)}`),
  googleAuth: (idToken: string, device?: DeviceInfo) =>
    http.post<GoogleAuthResponse, { idToken: string } & DeviceInfo>("/api/auth/google", { idToken, ...device }),
  googleCompleteSignup: (body: GoogleCompleteSignupBody) => http.post<AuthResponse, GoogleCompleteSignupBody>("/api/auth/google/complete-signup", body),
  // Pass the token explicitly -- called during logOut() right before the
  // in-memory/AsyncStorage token is cleared, so relying on http.ts's
  // storage-lookup fallback would risk a race.
  logout: (body: LogoutBody, token: string) => http.post<{ success: boolean; message: string }, LogoutBody>("/api/auth/logout", body, token),
};
