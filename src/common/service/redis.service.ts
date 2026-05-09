import { createClient, RedisClientType } from "redis";
import { REDIS_URL } from "../../config/config.service";
import { EmailEnum } from "../enum/email.enum";
import { Types } from "mongoose";

interface SetOptions {
  key: string;
  value: string | object;
  ttl?: number;
}
interface UpdateOptions {
  key: string;
  value: string | object;
}

class RedisService {
  private readonly client: RedisClientType;
  constructor() {
    this.client = createClient({ url: REDIS_URL! });
    this.handleEvents();
  }
  handleEvents() {
    this.client.on("error", (error) => {
      console.log("error to connect with redis", error);
    });
  }
  async connect() {
    this.client.connect();
    console.log("Successfully connected to Redis");
  }

  revoked_key = ({ userId, jti }: { userId: Types.ObjectId; jti: string }) =>
    `revoke_token::${userId}::${jti}`;

  get_key = (userId: Types.ObjectId) => `revoke_token::${userId}`;

  otp_key = ({
    email,
    subject = EmailEnum.confirmEmail,
  }: {
    email: string;
    subject?: string;
  }) => `otp::${email}::${subject}`;

  max_otp_key = (email: string) => `${this.otp_key({ email })}::max_tries`;
  block_otp_key = (email: string) => `${this.otp_key({ email })}::block`;

  login_attempts_key = (email: string) => `login::attempts::${email}`;
  login_block_key = (email: string) => `login::block::${email}`;

  
  async setValue({ key, value, ttl }: SetOptions): Promise<string | null> {
    try {
      const data = typeof value === "string" ? value : JSON.stringify(value);
      return ttl
        ? await this.client.set(key, data, { EX: ttl })
        : await this.client.set(key, data);
    } catch (error) {
      console.log("Error to set data in redis", error);
      return null;
    }
  }

  async updateValue({ key, value }: UpdateOptions): Promise<string | null | 0> {
    try {
      if (!(await this.client.exists(key))) return 0;
      const data = typeof value === "string" ? value : JSON.stringify(value);
      return await this.client.set(key, data);
    } catch (error) {
      console.log("Error to update data in redis", error);
      return null;
    }
  }

  async getValue(key: string): Promise<string | null> {
    try {
      const raw = await this.client.get(key);
      if (raw === null) return null;
      try {
        return JSON.parse(raw);
      } catch (err) {
        return raw;
      }
    } catch (error) {
      console.log("Error to get data in redis", error);
      return null;
    }
  }

  async delValue(key: string): Promise<number | null> {
    try {
      return await this.client.del(key);
    } catch (error) {
      console.log("Error to delete data in redis", error);
      return null;
    }
  }

  async keys(pattern: string): Promise<string[] | null> {
    try {
      return await this.client.keys(`${pattern}*`);
    } catch (error) {
      console.log("Error to keys data in redis", error);
      return null;
    }
  }

  async exists(key: string): Promise<number | null> {
    try {
      return await this.client.exists(key);
    } catch (error) {
      console.error("Redis [exists] error:", error);
      return null;
    }
  }

  async ttl(key: string): Promise<number | null> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      console.error("Redis [ttl] error:", error);
      return null;
    }
  }

  async incr(key: string): Promise<number | null> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      console.error("Redis [ttl] error:", error);
      return null;
    }
  }

  key = (userId: Types.ObjectId) => `user:FCM:${userId}`;

  addFCM = ({
    userId,
    FCMToken,
  }: {
    userId: Types.ObjectId;
    FCMToken: string;
  }) => this.client.sAdd(this.key(userId), FCMToken);

  removeFCM = ({
    userId,
    FCMToken,
  }: {
    userId: Types.ObjectId;
    FCMToken: string;
  }) => this.client.sRem(this.key(userId), FCMToken);

  getFCM = (userId: Types.ObjectId) => this.client.sMembers(this.key(userId));
  hasFCM = (userId: Types.ObjectId) => this.client.sCard(this.key(userId));
  removeFCMUser = (userId: Types.ObjectId) => this.client.del(this.key(userId));
}

export default new RedisService();