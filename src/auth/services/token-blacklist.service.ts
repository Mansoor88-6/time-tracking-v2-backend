import { Injectable } from '@nestjs/common';

interface BlacklistedToken {
  token: string;
  expiresAt: number;
}

@Injectable()
export class TokenBlacklistService {
  private blacklistedTokens: Map<string, number> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired tokens every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredTokens();
    }, 5 * 60 * 1000);
  }

  /**
   * Add a token to the blacklist
   * @param token - The JWT token to blacklist
   * @param expiresAt - The expiration timestamp of the token (in milliseconds)
   */
  addToken(token: string, expiresAt: number): void {
    this.blacklistedTokens.set(token, expiresAt);
  }

  /**
   * Check if a token is blacklisted
   * @param token - The JWT token to check
   * @returns true if the token is blacklisted, false otherwise
   */
  isBlacklisted(token: string): boolean {
    const expiresAt = this.blacklistedTokens.get(token);
    
    if (!expiresAt) {
      return false;
    }

    // If token has expired, remove it from blacklist and return false
    if (Date.now() >= expiresAt) {
      this.blacklistedTokens.delete(token);
      return false;
    }

    return true;
  }

  /**
   * Remove a token from the blacklist (useful for testing or manual cleanup)
   * @param token - The JWT token to remove
   */
  removeToken(token: string): void {
    this.blacklistedTokens.delete(token);
  }

  /**
   * Clean up expired tokens from the blacklist
   */
  private cleanupExpiredTokens(): void {
    const now = Date.now();
    const tokensToRemove: string[] = [];

    this.blacklistedTokens.forEach((expiresAt, token) => {
      if (now >= expiresAt) {
        tokensToRemove.push(token);
      }
    });

    tokensToRemove.forEach((token) => {
      this.blacklistedTokens.delete(token);
    });
  }

  /**
   * Clear all blacklisted tokens (useful for testing)
   */
  clearAll(): void {
    this.blacklistedTokens.clear();
  }

  /**
   * Get the number of blacklisted tokens
   */
  getBlacklistSize(): number {
    return this.blacklistedTokens.size;
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

