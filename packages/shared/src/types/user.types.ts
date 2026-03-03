import { UserRole } from '../constants/roles';

export interface IUser {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  batch?: string;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ICreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  batch?: string;
}

export interface IUpdateUserRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  batch?: string;
  isActive?: boolean;
  role?: UserRole;
}
