import { emailEnum } from "../../common/enum/email.enum";
import { redisClient } from "../redisDB";

export const Keys = {
  otp: ({
    email,
    subject = emailEnum.confirmEmail,
  }: {
    email: string;
    subject?: string;
  }) => `otp::${email}::${subject}`,

  otpMaxTries: (email: string) => `${Keys.otp({ email })}::max_tries`,

  otpBlock: (email: string) => `${Keys.otp({ email })}::block`,

  loginAttempts: (email: string) => `login::attempts::${email}`,

  loginBlock: (email: string) => `login::block::${email}`,
};

// Types
interface SetOptions {
  key: string;
  value: string | object;
  ttl?: number;
}
interface UpdateOptions {
  key: string;
  value: string | object;
}

// RedisRepository
class RedisRepository {
  constructor() {}

  async setValue({ key, value, ttl }: SetOptions): Promise<string | null> {
    try {
      const data = typeof value === "string" ? value : JSON.stringify(value);
      return ttl
        ? await redisClient.set(key, data, { EX: ttl })
        : await redisClient.set(key, data);
    } catch (error) {
      console.log("Error to set data in redis", error);
      return null;
    }
  }

  async updateValue({ key, value }: UpdateOptions): Promise<string | null | 0> {
    try {
      if (!(await redisClient.exists(key))) return 0;
      const data = typeof value === "string" ? value : JSON.stringify(value);
      return await redisClient.set(key, data);
    } catch (error) {
      console.log("Error to update data in redis", error);
      return null;
    }
  }

  async getValue(key: string): Promise<string | null> {
    try {
      const raw = await redisClient.get(key);
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
      return await redisClient.del(key);
    } catch (error) {
      console.log("Error to delete data in redis", error);
      return null;
    }
  }

  async keys(pattern: string): Promise<string[] | null> {
    try {
      return await redisClient.keys(`${pattern}*`);
    } catch (error) {
      console.log("Error to keys data in redis", error);
      return null;
    }
  }

  async exists(key: string): Promise<number | null> {
    try {
      return await redisClient.exists(key);
    } catch (error) {
      console.error("Redis [exists] error:", error);
      return null;
    }
  }

  async ttl(key: string): Promise<number | null> {
    try {
      return await redisClient.ttl(key);
    } catch (error) {
      console.error("Redis [ttl] error:", error);
      return null;
    }
  }

  async incr(key: string): Promise<number | null> {
    try {
      return await redisClient.incr(key);
    } catch (error) {
      console.error("Redis [ttl] error:", error);
      return null;
    }
  }
}

export default RedisRepository;