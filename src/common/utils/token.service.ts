import jwt from "jsonwebtoken";
import type {
  Jwt,
  JwtPayload,
  PrivateKey,
  PublicKey,
  Secret,
  SignOptions,
  VerifyOptions,
} from "jsonwebtoken";

interface JwtCustomPayload extends JwtPayload {
  id: string;
  email: string;
}

export const GenerateToken = ({
  payload,
  secret_key,
  options = {},
}: {
  payload: string | Buffer | object;
  secret_key: Secret | PrivateKey;
  options?: SignOptions;
}): string => {
  return jwt.sign(payload, secret_key, options);
};

export const VerifyToken = ({
  token,
  secret_key,
  options,
}: {
  token: string;
  secret_key: Secret | PublicKey;
  options?: VerifyOptions & { complete: true };
}): JwtCustomPayload => {
  return jwt.verify(token, secret_key, options);
};