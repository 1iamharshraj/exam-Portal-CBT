import { IUser } from './user.types';

export interface ILoginRequest {
  email: string;
  password: string;
}

export interface IAuthTokens {
  accessToken: string;
}

export interface ILoginResponse {
  user: IUser;
  accessToken: string;
}

export interface IForgotPasswordRequest {
  email: string;
}

export interface IResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface IChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface IAuthState {
  user: IUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
