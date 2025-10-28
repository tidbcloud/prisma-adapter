import {
  ArgType,
  ColumnTypeEnum,
  type ColumnType,
} from "@prisma/driver-adapter-utils";

export type TiDBCloudColumnType =
  | "NULL"
  | "TINYINT"
  | "UNSIGNED TINYINT"
  | "SMALLINT"
  | "UNSIGNED SMALLINT"
  | "MEDIUMINT"
  | "UNSIGNED MEDIUMINT"
  | "INT"
  | "UNSIGNED INT"
  | "YEAR"
  | "FLOAT"
  | "DOUBLE"
  | "BIGINT"
  | "UNSIGNED BIGINT"
  | "DECIMAL"
  | "CHAR"
  | "VARCHAR"
  | "BINARY"
  | "VARBINARY"
  | "TINYTEXT"
  | "TEXT"
  | "MEDIUMTEXT"
  | "LONGTEXT"
  | "TINYBLOB"
  | "BLOB"
  | "MEDIUMBLOB"
  | "LONGBLOB"
  | "DATE"
  | "TIME"
  | "DATETIME"
  | "TIMESTAMP"
  | "JSON"
  | "BIT"
  | "SET"
  | "ENUM";

/**
 * This is a simplification of quaint's value inference logic. Take a look at quaint's conversion.rs
 * module to see how other attributes of the field packet such as the field length are used to infer
 * the correct quaint::Value variant.
 */
export function fieldToColumnType(field: TiDBCloudColumnType): ColumnType {
  switch (field) {
    case "TINYINT":
    case "UNSIGNED TINYINT":
    case "SMALLINT":
    case "UNSIGNED SMALLINT":
    case "MEDIUMINT":
    case "UNSIGNED MEDIUMINT":
    case "INT":
    case "YEAR":
      return ColumnTypeEnum.Int32;
    case "UNSIGNED INT":
    case "BIGINT":
    case "UNSIGNED BIGINT":
      return ColumnTypeEnum.Int64;
    case "FLOAT":
      return ColumnTypeEnum.Float;
    case "DOUBLE":
      return ColumnTypeEnum.Double;
    case "TIMESTAMP":
    case "DATETIME":
      return ColumnTypeEnum.DateTime;
    case "DATE":
      return ColumnTypeEnum.Date;
    case "TIME":
      return ColumnTypeEnum.Time;
    case "DECIMAL":
      return ColumnTypeEnum.Numeric;
    case "CHAR":
    case "TINYTEXT":
    case "TEXT":
    case "MEDIUMTEXT":
    case "LONGTEXT":
    case "VARCHAR":
      return ColumnTypeEnum.Text;
    case "JSON":
      return ColumnTypeEnum.Json;
    case "TINYBLOB":
    case "BLOB":
    case "MEDIUMBLOB":
    case "LONGBLOB":
    case "BINARY":
    case "VARBINARY":
    case "BIT":
      return ColumnTypeEnum.Bytes;
    case "SET":
      return ColumnTypeEnum.Set;
    case "ENUM":
      return ColumnTypeEnum.Enum;
    case "NULL":
      // Fall back to Int32 for consistency with quaint.
      return ColumnTypeEnum.Int32;
    default:
      throw new Error(`Unsupported column type: ${field}`);
  }
}

// define the decoder because TiDB Cloud serverless driver returns Uint8Array for these type
export const customDecoder = {
  BINARY: (value: string) => Array.from(hexToUint8Array(value)),
  VARBINARY: (value: string) => Array.from(hexToUint8Array(value)),
  BLOB: (value: string) => Array.from(hexToUint8Array(value)),
  LONGBLOB: (value: string) => Array.from(hexToUint8Array(value)),
  TINYBLOB: (value: string) => Array.from(hexToUint8Array(value)),
  MEDIUMBLOB: (value: string) => Array.from(hexToUint8Array(value)),
  BIT: (value: string) => Array.from(hexToUint8Array(value)),
};

function hexToUint8Array(hexString: string): Uint8Array {
  const uint8Array = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    uint8Array[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
  }
  return uint8Array;
}

export function mapArg<A>(
  arg: A | Date,
  argType: ArgType
): null | BigInt | string | Uint8Array | A {
  if (arg === null) {
    return null;
  }

  if (typeof arg === "string" && argType.scalarType === "bigint") {
    return BigInt(arg);
  }

  if (typeof arg === "string" && argType.scalarType === "datetime") {
    arg = new Date(arg);
  }

  if (arg instanceof Date) {
    switch (argType.dbType) {
      case "TIME":
      case "TIME2":
        return formatTime(arg);
      case "DATE":
      case "NEWDATE":
        return formatDate(arg);
      default:
        return formatDateTime(arg);
    }
  }

  if (typeof arg === "string" && argType.scalarType === "bytes") {
    return Buffer.from(arg, "base64");
  }

  if (Array.isArray(arg) && argType.scalarType === "bytes") {
    return Buffer.from(arg);
  }

  if (ArrayBuffer.isView(arg)) {
    return Buffer.from(arg.buffer, arg.byteOffset, arg.byteLength);
  }

  return arg;
}

function formatDateTime(date: Date): string {
  const pad = (n: number, z = 2) => String(n).padStart(z, "0");
  const ms = date.getUTCMilliseconds();
  return (
    date.getUTCFullYear() +
    "-" +
    pad(date.getUTCMonth() + 1) +
    "-" +
    pad(date.getUTCDate()) +
    " " +
    pad(date.getUTCHours()) +
    ":" +
    pad(date.getUTCMinutes()) +
    ":" +
    pad(date.getUTCSeconds()) +
    (ms ? "." + String(ms).padStart(3, "0") : "")
  );
}

function formatDate(date: Date): string {
  const pad = (n: number, z = 2) => String(n).padStart(z, "0");
  return (
    date.getUTCFullYear() +
    "-" +
    pad(date.getUTCMonth() + 1) +
    "-" +
    pad(date.getUTCDate())
  );
}

function formatTime(date: Date): string {
  const pad = (n: number, z = 2) => String(n).padStart(z, "0");
  const ms = date.getUTCMilliseconds();
  return (
    pad(date.getUTCHours()) +
    ":" +
    pad(date.getUTCMinutes()) +
    ":" +
    pad(date.getUTCSeconds()) +
    (ms ? "." + String(ms).padStart(3, "0") : "")
  );
}
