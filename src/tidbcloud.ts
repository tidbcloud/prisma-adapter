import * as TiDBCloud from "@tidbcloud/serverless";
import { Debug, ok } from "@prisma/driver-adapter-utils";
import type {
  ConnectionInfo,
  SqlQuery,
  SqlResultSet,
  SqlQueryable,
  Transaction,
  TransactionOptions,
  IsolationLevel,
  SqlDriverAdapter,
  SqlDriverAdapterFactory,
} from "@prisma/driver-adapter-utils";
import {
  type TiDBCloudColumnType,
  fieldToColumnType,
  customDecoder,
} from "./conversion";
import { name as packageName } from "../package.json";

const debug = Debug("prisma:driver-adapter:tidbcloud");

const defaultDatabase = "test";

class RollbackError extends Error {
  constructor() {
    super("ROLLBACK");
    this.name = "RollbackError";

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RollbackError);
    }
  }
}

class TiDBCloudQueryable<ClientT extends TiDBCloud.Connection | TiDBCloud.Tx>
  implements SqlQueryable
{
  readonly provider = "mysql";
  readonly adapterName = packageName;
  constructor(protected client: ClientT) {}

  /**
   * Execute a query given as SQL, interpolating the given parameters.
   */
  async queryRaw(query: SqlQuery): Promise<SqlResultSet> {
    const tag = "[js::query_raw]";
    debug(`${tag} %O`, query);

    const result = await this.performIO(query);
    const fields = result.types as TiDBCloud.Types;
    const rows = result.rows as TiDBCloud.Row[];
    const lastInsertId = result.lastInsertId?.toString();

    const columnNames = Object.keys(fields) as string[];
    const columnRawTypes = Object.values(fields) as string[];

    const resultSet: SqlResultSet = {
      columnNames,
      columnTypes: columnRawTypes.map((field) =>
        fieldToColumnType(field as TiDBCloudColumnType)
      ),
      rows: rows as SqlResultSet["rows"],
      lastInsertId,
    };
    return resultSet;
  }

  /**
   * Execute a query given as SQL, interpolating the given parameters and
   * returning the number of affected rows.
   * Note: Queryable expects a u64, but napi.rs only supports u32.
   */
  async executeRaw(query: SqlQuery): Promise<number> {
    const tag = "[js::execute_raw]";
    debug(`${tag} %O`, query);

    const result = await this.performIO(query);
    const rowsAffected = result.rowsAffected as number;
    return rowsAffected;
  }

  /**
   * Run a query against the database, returning the result set.
   * Should the query fail due to a connection error, the connection is
   * marked as unhealthy.
   */
  private async performIO(query: SqlQuery) {
    const { sql, args: values } = query;

    try {
      const result = await this.client.execute(sql, values, {
        arrayMode: true,
        fullResult: true,
        decoders: customDecoder,
      });
      return result as TiDBCloud.FullResult;
    } catch (e) {
      const error = e as Error;
      debug("Error in performIO: %O", error);
      throw error;
    }
  }
}

class TiDBCloudTransaction
  extends TiDBCloudQueryable<TiDBCloud.Tx>
  implements Transaction
{
  finished = false;

  constructor(tx: TiDBCloud.Tx, readonly options: TransactionOptions) {
    super(tx);
  }

  async commit(): Promise<void> {
    debug(`[js::commit]`);

    this.finished = true;
    await this.client.commit();
    return Promise.resolve(undefined);
  }

  async rollback(): Promise<void> {
    debug(`[js::rollback]`);

    this.finished = true;
    await this.client.rollback();
    return Promise.resolve(undefined);
  }

  dispose(): void {
    if (!this.finished) {
      this.rollback().catch(console.error);
    }
    return undefined;
  }
}

export class PrismaTiDBCloudAdapter
  extends TiDBCloudQueryable<TiDBCloud.Connection>
  implements SqlDriverAdapter
{
  constructor(connect: TiDBCloud.Connection) {
    super(connect);
  }

  executeScript(_script: string): Promise<void> {
    throw new Error("Not implemented yet");
  }

  getConnectionInfo(): ConnectionInfo {
    const config = this.client.getConfig();
    const dbName = config.database ? config.database : defaultDatabase;
    return {
      schemaName: dbName,
    };
  }

  async startTransaction(
    isolationLevel?: IsolationLevel
  ): Promise<Transaction> {
    const options: TransactionOptions = {
      usePhantomQuery: true,
    };

    const tag = "[js::startTransaction]";
    debug("%s option: %O", tag, options);

    const tx = await this.client.begin();
    return new TiDBCloudTransaction(tx, options);
  }

  async dispose(): Promise<void> {}
}

export class PrismaTiDBCloudAdapterFactory
  implements SqlDriverAdapterFactory
{
  readonly provider = "mysql";
  readonly adapterName = packageName;

  constructor(private readonly config: TiDBCloud.Config) {}

  async connect(): Promise<SqlDriverAdapter> {
    return new PrismaTiDBCloudAdapter(new TiDBCloud.Connection(this.config));
  }
}
