const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';

export interface ApiResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

class ApiService {
  private accessToken: string | null = localStorage.getItem('access_token');
  private refreshToken: string | null = localStorage.getItem('refresh_token');

  private setTokens(access: string, refresh: string, usuario?: any) {
    this.accessToken = access;
    this.refreshToken = refresh;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    if (usuario) {
      localStorage.setItem('usuario', JSON.stringify(usuario));
    }
  }

  private clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('usuario');
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers = new Headers(options.headers);
    if (this.accessToken) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }
    
    // Se for FormData, deixa o browser definir o Content-Type (com boundary)
    if (!(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    try {
      let response = await fetch(url, { ...options, headers });

      // Handle 401 Unauthorized (Expired Token)
      if (response.status === 401 && this.refreshToken) {
        const refreshed = await this.refreshTokens();
        if (refreshed) {
          headers.set('Authorization', `Bearer ${this.accessToken}`);
          response = await fetch(url, { ...options, headers });
        } else {
          // Force logout
          this.clearTokens();
          window.location.href = '/login';
          throw new Error('Session expired');
        }
      }

      const data = response.status === 204 ? {} : await response.json();
      
      if (!response.ok) {
        return { error: data.error || { code: 'UNKNOWN_ERROR', message: 'Erro desconhecido' } };
      }

      return { data: data.data };
    } catch (error: any) {
      return { error: { code: 'NETWORK_ERROR', message: error.message } };
    }
  }

  async raw<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = new Headers(options.headers);
    if (this.accessToken) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }
    if (!(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    try {
      let response = await fetch(url, { ...options, headers });
      if (response.status === 401 && this.refreshToken) {
        const refreshed = await this.refreshTokens();
        if (refreshed) {
          headers.set('Authorization', `Bearer ${this.accessToken}`);
          response = await fetch(url, { ...options, headers });
        }
      }
      const data = response.status === 204 ? undefined : await response.json();
      if (!response.ok) {
        return { error: data?.error || { code: 'UNKNOWN_ERROR', message: 'Erro desconhecido' } };
      }
      return { data };
    } catch (error: any) {
      return { error: { code: 'NETWORK_ERROR', message: error.message } };
    }
  }

  async blob(endpoint: string): Promise<ApiResponse<Blob>> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = new Headers();
    if (this.accessToken) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }

    try {
      let response = await fetch(url, { headers });
      if (response.status === 401 && this.refreshToken) {
        const refreshed = await this.refreshTokens();
        if (refreshed) {
          headers.set('Authorization', `Bearer ${this.accessToken}`);
          response = await fetch(url, { headers });
        }
      }

      if (!response.ok) {
        return { error: { code: 'REQUEST_ERROR', message: 'Erro ao abrir ficheiro' } };
      }

      return { data: await response.blob() };
    } catch (error: any) {
      return { error: { code: 'NETWORK_ERROR', message: error.message } };
    }
  }

  async refreshTokens(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.refreshToken })
      });

      if (!response.ok) return false;

      const result = await response.json();
      this.setTokens(result.data.access_token, result.data.refresh_token);
      return true;
    } catch {
      return false;
    }
  }

  async login(credentials: any): Promise<ApiResponse<any>> {
    const result = await this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });

    if (result.data) {
      this.setTokens(result.data.access_token, result.data.refresh_token, result.data.usuario);
    }
    return result;
  }

  async switchInstitution(instituicaoId: number): Promise<ApiResponse<any>> {
    const result = await this.request<any>('/auth/switch-institution', {
      method: 'POST',
      body: JSON.stringify({ instituicao_id: instituicaoId, institution_id: instituicaoId })
    });

    if (result.data) {
      this.setTokens(result.data.access_token, result.data.refresh_token, result.data.usuario);
    }
    return result;
  }

  getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem('usuario') || '{}');
    } catch {
      return {};
    }
  }

  logout() {
    this.request('/auth/logout', { method: 'POST' });
    this.clearTokens();
    window.location.href = '/login';
  }

  // Documentos
  async getDocumentos(params: any = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any[]>(`/documents?${query}`);
  }

  async getDocumento(id: number) {
    return this.request<any>(`/documents/${id}`);
  }

  // Dashboard Stats
  async getDashboardStats() {
    // Note: We might need to implement a specific stats endpoint in the backend 
    // or aggregate from multiple calls. For now, let's assume we use /documents stats.
    return this.request<any>('/documents/stats'); 
  }
}

export const api = new ApiService();
