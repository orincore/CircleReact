import { http } from "./http";

export interface UserDTO {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  phoneNumber?: string | null;
  interests: string[];
  needs: string[];
  profilePhotoUrl?: string | null;
}

export interface AuthResponse {
  access_token: string;
  user: UserDTO;
}

export interface LoginBody {
  identifier: string; // email or username
  password: string;
}

export interface SignupBody {
  firstName: string;
  lastName: string;
  age: number; // 13-120
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

export interface GoogleCompleteSignupBody {
  idToken: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  username: string;
  phoneNumber?: string;
  interests?: string[];
  needs?: string[];
  instagramUsername?: string;
  about?: string;
}

export const authApi = {
  login: (body: LoginBody) => http.post<AuthResponse, LoginBody>("/api/auth/login", body),
  signup: (body: SignupBody) => http.post<AuthResponse, SignupBody>("/api/auth/signup", body),
  usernameAvailable: (username: string) => http.get<{ available: boolean }>(`/api/auth/username-available?username=${encodeURIComponent(username)}`),
  googleAuth: (idToken: string) => http.post<GoogleAuthResponse, { idToken: string }>("/api/auth/google", { idToken }),
  googleCompleteSignup: (body: GoogleCompleteSignupBody) => http.post<AuthResponse, GoogleCompleteSignupBody>("/api/auth/google/complete-signup", body),
};
