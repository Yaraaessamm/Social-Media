import { resolve } from "path";
import { config } from "dotenv";

const NODE_ENV = process.env.NODE_ENV;
config({ path: resolve(__dirname, `../../.env.${NODE_ENV}`) });

export const PORT: number = Number(process.env.PORT) || 7000;
export const MONGO_URL: string = process.env.MONGO_URL!;
export const SALT_ROUNDS: number = +process.env.SALT_ROUNDS!;
export const EMAIL: string = process.env.EMAIL!;
export const PASSWORD: string  = process.env.PASSWORD!;
export const REDIS_URL: string  = process.env.REDIS_URL!;
export const ACCESS_SECRET_KEY: string  = process.env.ACCESS_SECRET_KEY!;
export const REFRESH_SECRET_KEY: string  = process.env.REFRESH_SECRET_KEY!;
export const PREFIX: string  = process.env.PREFIX!;
export const SECRET_KEY: string  = process.env.SECRET_KEY!;
export const CLIENT_ID: string  = process.env.CLIENT_ID!;
export const AWS_RESGIN: string  = process.env.AWS_RESGIN!;
export const AWS_BUCKET_NAME: string  = process.env.AWS_BUCKET_NAME!;
export const AWS_ACCESS_KEY: string  = process.env.AWS_ACCESS_KEY!;
export const AWS_SECRET_ACCESS_KEY: string  = process.env.AWS_SECRET_ACCESS_KEY!;
export const FIREBASE_SERVICE_ACCOUNT: string  = process.env.FIREBASE_SERVICE_ACCOUNT!;