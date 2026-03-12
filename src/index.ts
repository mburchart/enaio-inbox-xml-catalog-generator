import Query from "./queries";
import Logger from "./logger";
import Config from "./config";
import XMLBuilder from "./xmlbuilder";
import Email from "./email";
import { Database } from "./db";

const logger = Logger.get();

process.on("unhandledRejection", (reason) => {
  logger.error(
    `Unbehandelte Promise-Ablehnung: ${
      reason instanceof Error ? reason.stack || reason.message : String(reason)
    }`,
  );
});

async function run(): Promise<void> {
  logger.info("Lade Benutzer und Gruppen aus der Datenbank...");
  try {
    const usersAndGroups = await Query.getUsersAndGroups();
    await XMLBuilder.buildPostalXML(usersAndGroups);
    await Database.close();
    logger.info("Erfolgreich abgeschlossen.");
  } catch (error) {
    const errorText =
      error instanceof Error
        ? `${error.message}\n\nStack:\n${error.stack}`
        : String(error);
    logger.error(`Fehler beim Ausführen des Skripts: ${errorText}`);
    const sendTo = Config.readString("EMAIL_ERROR_NOTIFICATION_TO", "");
    if (sendTo) {
      await Email.get().sendMail(
        sendTo,
        "Fehler beim enaio Posteingang XML Kataloggenerator",
        errorText,
      );
    }
  }
}

(async () => {
  await run();
})();
