import "server-only";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { env } from "../env";
import { log } from "../logger";

/**
 * Outbound email/SMS. Content arrives already rendered from linted templates (no PHI).
 * The outbox provider keeps messages in memory for development and tests; nothing is sent.
 */
export interface OutboundMessage {
  channel: "email" | "sms";
  to: string;
  subject: string | null;
  body: string;
  templateKey: string;
}

export interface MessageProvider {
  send(msg: OutboundMessage): Promise<void>;
}

export const outbox: OutboundMessage[] = [];

class OutboxProvider implements MessageProvider {
  async send(msg: OutboundMessage) {
    outbox.push(msg);
    if (outbox.length > 500) outbox.shift();
    log.info("notification queued to dev outbox", { event: msg.templateKey, provider: msg.channel });
  }
}

class AwsProvider implements MessageProvider {
  private ses = new SESv2Client({});
  private sns = new SNSClient({});
  async send(msg: OutboundMessage) {
    if (msg.channel === "email") {
      await this.ses.send(
        new SendEmailCommand({
          FromEmailAddress: env.EMAIL_FROM,
          Destination: { ToAddresses: [msg.to] },
          Content: { Simple: { Subject: { Data: msg.subject ?? "" }, Body: { Text: { Data: msg.body } } } },
        }),
      );
    } else {
      await this.sns.send(new PublishCommand({ PhoneNumber: msg.to, Message: msg.body }));
    }
  }
}

let instance: MessageProvider | null = null;
export function messageProvider(channel: "email" | "sms"): MessageProvider {
  const useAws = channel === "email" ? env.EMAIL_PROVIDER === "ses" : env.SMS_PROVIDER === "sns";
  if (!useAws) return (instance ??= new OutboxProvider());
  return new AwsProvider();
}
