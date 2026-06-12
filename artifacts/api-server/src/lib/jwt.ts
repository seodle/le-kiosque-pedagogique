import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? process.env.SESSION_SECRET ?? "kiosque-dev-secret";

export type TokenPayload =
  | { type: "staff"; userId: number; role: string; username: string }
  | { type: "teacher"; ticketId: number };

export function signToken(payload: TokenPayload, expiresIn: string): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}
