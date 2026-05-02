import {
  GetObjectCommand,
  ObjectCannedACL,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  AWS_ACCESS_KEY,
  AWS_BUCKET_NAME,
  AWS_RESGIN,
  AWS_SECRET_ACCESS_KEY,
} from "../../config/config.service";
import { randomUUID } from "node:crypto";
import { Store_Enum } from "../enum/multer.enum";
import fs from "fs";
import { AppError } from "../utils/general-error-handler";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class S3Service {
  private client: S3Client;
  constructor() {
    this.client = new S3Client({
      region: AWS_RESGIN,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  async uploadFile({
    file,
    store_type = Store_Enum.memory,
    path = "General",
    ACL = ObjectCannedACL.private,
  }: {
    file: Express.Multer.File;
    store_type?: Store_Enum;
    path?: string;
    ACL?: ObjectCannedACL;
  }): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: AWS_BUCKET_NAME,
      ACL,
      Key: `social_media_app/${path}/${randomUUID()}__${file.originalname}`,
      Body:
        store_type === Store_Enum.memory
          ? file.buffer
          : fs.createReadStream(file.path),
      ContentType: file.mimetype,
    });
    if (!command.input.Key) {
      throw new AppError("Fail to upload file");
    }
    await this.client.send(command);
    return command.input.Key;
  }

  async uploadLargeFile({
    file,
    store_type = Store_Enum.memory,
    path = "General",
    ACL = ObjectCannedACL.private,
  }: {
    file: Express.Multer.File;
    store_type?: Store_Enum;
    path?: string;
    ACL?: ObjectCannedACL;
  }): Promise<string> {
    const command = new Upload({
      client: this.client,
      params: {
        Bucket: AWS_BUCKET_NAME,
        ACL,
        Key: `social_media_app/${path}/${randomUUID()}__${file.originalname}`,
        Body:
          store_type === Store_Enum.memory
            ? file.buffer
            : fs.createReadStream(file.path),
        ContentType: file.mimetype,
      },
    });
    const result = await command.done();
    return result.Key as string;
  }

  async uploadFiles({
    files,
    store_type = Store_Enum.memory,
    path = "General",
    ACL = ObjectCannedACL.private,
    isLarge = false,
  }: {
    files: Express.Multer.File[];
    store_type?: Store_Enum;
    path?: string;
    ACL?: ObjectCannedACL;
    isLarge?: boolean;
  }) {
    let urls: string[] = [];
    if (isLarge) {
      urls = await Promise.all(
        files.map((file) => {
          return this.uploadFile({ file, store_type, path, ACL });
        }),
      );
    } else {
      urls = await Promise.all(
        files.map((file) => {
          return this.uploadFile({ file, store_type, path, ACL });
        }),
      );
    }
  }

  async createPreSignedUrl({
    path,
    fileName,
    ContentType,
    expiresIn = 60,
  }: {
    path?: string;
    fileName: string;
    ContentType: string;
    expiresIn?: number;
  }) {
    const Key = `social_media_app/${path}/${randomUUID()}__${fileName}`;
    const command = new PutObjectCommand({
      Bucket: AWS_BUCKET_NAME,
      Key,
      ContentType,
    });
    const url = await getSignedUrl(this.client, command, { expiresIn });
    return { url, Key };
  }

  async getFile(Key: string) {
    const command = new GetObjectCommand({
      Bucket: AWS_BUCKET_NAME,
      Key,
    });
    return await this.client.send(command);
  }
}