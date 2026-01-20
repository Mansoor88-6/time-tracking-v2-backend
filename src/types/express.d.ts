declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        name: string;
        tenantId?: number;
        role: string;
        type: 'user' | 'superadmin';
      };
    }
  }
}

export {};
