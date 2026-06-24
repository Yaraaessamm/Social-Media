import admin from "firebase-admin";
import { FIREBASE_SERVICE_ACCOUNT } from "../../config/config.service";

class NotificationService {
  private readonly client: admin.app.App;

  constructor() {
    const serviceAccount = JSON.parse(
      FIREBASE_SERVICE_ACCOUNT,
    ) as admin.ServiceAccount;
    this.client = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  async sendNotification({
    token,
    data,
  }: {
    token: string;
    data: { title: string; body: string };
  }) {
    const message = { token, data };
    return await this.client.messaging().send(message);
  }

  async sendNotifications({
    tokens,
    data,
  }: {
    tokens: string[];
    data: { title: string; body: string };
  }) {
    await Promise.all(
      tokens.map((token) => {
        return this.sendNotification({ token, data });
      }),
    );
  }
}

export default new NotificationService();