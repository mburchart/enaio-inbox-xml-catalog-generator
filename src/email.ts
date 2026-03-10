import Config from "./config";
import nodemailer from "nodemailer";
import Logger from "./logger";

const logger = Logger.get();

export default class Email {

    private static instance: Email | null = null;
    private transport: nodemailer.Transporter | null = null;
    
    public static get(): Email {
        if (Email.instance) return Email.instance;
        Email.instance = new Email();
        return Email.instance;
    }

    constructor(){
        const host = Config.readString("EMAIL_HOST", "");
        const user = Config.readString("EMAIL_USER", "");
        const pass = Config.readString("EMAIL_PASSWORD", "");
        if (host !== "" && user !== "" && pass !== "") {
            this.transport = nodemailer.createTransport({
                host: Config.readString("EMAIL_HOST", ""),
                port: Config.readNumber("EMAIL_PORT", 587),
                secure: Config.readBoolean("EMAIL_SECURE", false),
                auth: {
                    user: Config.readString("EMAIL_USER", ""),
                    pass: Config.readString("EMAIL_PASSWORD", "")
                }
            });
        }
    }

    public async sendMail(to: string, subject: string, text: string): Promise<void> {
        if (!this.transport) {
            logger.warn("E-Mail-Transport ist nicht konfiguriert. Versand wird uebersprungen.");
            return;
        }
        try {
            await this.transport.sendMail({
                from: Config.readString("EMAIL_FROM", ""),
                to,
                subject,
                text
            });
        } catch (error) {
            logger.error("E-Mail-Versand fehlgeschlagen:", error);
        }
    }
}
