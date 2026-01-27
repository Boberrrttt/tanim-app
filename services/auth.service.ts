import apiClient from './api';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface SignupCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  status: string;
  message: string;
  data?: {
    farmer_id?: string;
    username: string;
  };
}

export interface AuthError {
  status: string;
  message: string;
  details?: any;
}

const handleError = (error: any): AuthError => {
  if (error.response) {
    return {
      status: 'error',
      message: error.response.data?.message || 'Server error occurred',
      details: error.response.data?.details,
    };
  } else if (error.request) {
    return {
      status: 'error',
      message: 'Network error. Please check your connection.',
    };
  } else {
    return {
      status: 'error',
      message: error.message || 'An unexpected error occurred',
    };
  }
};

export const loginFarmer = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  try {
    const response = await apiClient.post('/auth/login-farmer', credentials);
    return response.data;
  } catch (error: any) {
    throw handleError(error);
  }
};

export const signupFarmer = async (credentials: SignupCredentials): Promise<AuthResponse> => {
  try {
    const response = await apiClient.post('/auth/signup-farmer', credentials);
    return response.data;
  } catch (error: any) {
    throw handleError(error);
  }
};

export const loginAdmin = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  try {
    const response = await apiClient.post('/auth/login-admin', credentials);
    return response.data;
  } catch (error: any) {
    throw handleError(error);
  }
};

export const signupAdmin = async (credentials: SignupCredentials): Promise<AuthResponse> => {
  try {
    const response = await apiClient.post('/auth/signup-admin', credentials);
    return response.data;
  } catch (error: any) {
    throw handleError(error);
  }
};
