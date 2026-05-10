/**
 * JS equivalent of Drift's ValueSerializer — normalises raw SQLite values
 * when reading rows (fromJson) and serialising values for writes (toJson).
 */
class AppDefaultSerializer {
  /**
   * Convert a raw DB value to the expected JS type based on a type hint string.
   * @param {*} value  Raw value from SQLite row
   * @param {string} type  One of 'DateTime', 'double', 'Uint8Array', or any primitive
   */
  fromJson(value, type) {
    if (value === null || value === undefined) return null;

    switch (type) {
      case 'DateTime': {
        if (typeof value === 'number') return new Date(value);
        if (typeof value === 'string') return new Date(value);
        return value;
      }

      case 'double':
      case 'num': {
        if (typeof value === 'number') return value;
        return parseFloat(value);
      }

      case 'int': {
        if (typeof value === 'number') return Math.trunc(value);
        return parseInt(value, 10);
      }

      case 'bool': {
        if (typeof value === 'boolean') return value;
        return value === 1 || value === '1' || value === 'true';
      }

      case 'Uint8Array': {
        if (value instanceof Uint8Array) return value;
        if (Array.isArray(value)) return new Uint8Array(value);
        return value;
      }

      default:
        return value;
    }
  }

  /**
   * Serialise a JS value for storage / JSON transport.
   */
  toJson(value) {
    if (value === null || value === undefined) return null;

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (value instanceof Uint8Array) {
      return Array.from(value);
    }

    return value;
  }
}

export const appDefaultSerializer = new AppDefaultSerializer();
