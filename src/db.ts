import sql from "mssql";
import Config from "./config";

type DbConfig = {
  user: string;
  password: string;
  server: string;
  database: string;
  port: number;
  encrypt: boolean;
  trustServerCertificate: boolean;
  requestTimeout: number;
  connectionTimeout: number;
};

export class Database {
  private static pool: sql.ConnectionPool | null = null;
  private static poolPromise: Promise<sql.ConnectionPool> | null = null;

  private static loadConfig(): DbConfig {
    return {
      user: Config.readString("DB_USER", "user"),
      password: Config.readString("DB_PASSWORD", "password"),
      server: Config.readString("DB_SERVER", "localhost"),
      database: Config.readString("DB_DATABASE", "osecm"),
      port: Config.readNumber("DB_PORT", 1433),
      encrypt: Config.readBoolean("DB_ENCRYPT", false),
      trustServerCertificate: Config.readBoolean("DB_TRUST_SERVER_CERT", false),
      requestTimeout: Config.readNumber("DB_REQUEST_TIMEOUT", 60000),
      connectionTimeout: Config.readNumber("DB_CONNECTION_TIMEOUT", 15000),
    };
  }

  static async getPool(): Promise<sql.ConnectionPool> {
    if (Database.pool) return Database.pool;
    if (!Database.poolPromise) {
      const config = Database.loadConfig();
      Database.poolPromise = new sql.ConnectionPool(config)
        .connect()
        .then((pool: sql.ConnectionPool) => {
          Database.pool = pool;
          return pool;
        })
        .catch((err: unknown) => {
          Database.poolPromise = null;
          throw err;
        });
    }
    return Database.poolPromise;
  }

  static async query<T = unknown>(
    text: string,
    params?: Record<string, unknown>,
  ): Promise<sql.IResult<T>> {
    const pool = await Database.getPool();
    const request = pool.request();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        request.input(key, value);
      }
    }
    return request.query<T>(text);
  }

  static async execute<T = unknown>(
    procName: string,
    params?: Record<string, unknown>,
  ): Promise<sql.IProcedureResult<T>> {
    const pool = await Database.getPool();
    const request = pool.request();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        request.input(key, value);
      }
    }
    return request.execute<T>(procName);
  }

  static async close(): Promise<void> {
    if (!Database.pool) return;
    await Database.pool.close();
    Database.pool = null;
    Database.poolPromise = null;
  }
}
