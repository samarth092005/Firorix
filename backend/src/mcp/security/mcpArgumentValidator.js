/**
 * Validates tool arguments against discovered tool input schemas.
 * Enforces parameter types, required fields, size bounds, and rejects illegal properties.
 */

const MAX_ARGUMENT_PAYLOAD_BYTES = 50 * 1024; // 50KB limit for arguments

export class McpArgumentValidator {
  /**
   * Validates arguments object against the given tool inputSchema.
   *
   * @param {object} args Input arguments passed by client
   * @param {object} inputSchema JSON Schema definition from tool metadata
   * @returns {{ isValid: boolean, errors: string[] }}
   */
  validate(args, inputSchema) {
    const errors = [];

    // 1. Structural check
    if (args === null || typeof args !== 'object' || Array.isArray(args)) {
      return {
        isValid: false,
        errors: ['Arguments must be a valid JSON object.']
      };
    }

    // 2. Payload size check
    try {
      const serialized = JSON.stringify(args);
      if (Buffer.byteLength(serialized, 'utf8') > MAX_ARGUMENT_PAYLOAD_BYTES) {
        return {
          isValid: false,
          errors: [`Arguments exceed maximum allowed payload size of ${MAX_ARGUMENT_PAYLOAD_BYTES} bytes.`]
        };
      }
    } catch {
      return {
        isValid: false,
        errors: ['Arguments cannot be serialized to JSON.']
      };
    }

    if (!inputSchema || typeof inputSchema !== 'object') {
      return { isValid: true, errors: [] };
    }

    const schemaProperties = inputSchema.properties || {};
    const requiredFields = Array.isArray(inputSchema.required) ? inputSchema.required : [];
    const additionalProperties = inputSchema.additionalProperties !== false;

    // 3. Required properties check
    for (const reqField of requiredFields) {
      if (args[reqField] === undefined || args[reqField] === null) {
        errors.push(`Missing required property: "${reqField}".`);
      } else if (typeof args[reqField] === 'string' && !args[reqField].trim()) {
        errors.push(`Required property "${reqField}" cannot be an empty string.`);
      }
    }

    // 4. Disallow unexpected additional properties if additionalProperties is false
    if (!additionalProperties) {
      for (const key of Object.keys(args)) {
        if (!schemaProperties[key]) {
          errors.push(`Unexpected property "${key}" is not permitted by tool schema.`);
        }
      }
    }

    // 5. Basic type checking against declared properties
    for (const [key, value] of Object.entries(args)) {
      if (value === undefined || value === null) continue;
      const propDef = schemaProperties[key];
      if (!propDef) continue;

      const expectedType = propDef.type;
      if (expectedType) {
        if (expectedType === 'string' && typeof value !== 'string') {
          errors.push(`Property "${key}" must be a string, got ${typeof value}.`);
        } else if (expectedType === 'number' && typeof value !== 'number') {
          errors.push(`Property "${key}" must be a number, got ${typeof value}.`);
        } else if (expectedType === 'boolean' && typeof value !== 'boolean') {
          errors.push(`Property "${key}" must be a boolean, got ${typeof value}.`);
        } else if (expectedType === 'array' && !Array.isArray(value)) {
          errors.push(`Property "${key}" must be an array, got ${typeof value}.`);
        } else if (expectedType === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
          errors.push(`Property "${key}" must be an object, got ${typeof value}.`);
        }
      }

      // Check array items if specified
      if (Array.isArray(value) && propDef.items && propDef.items.type) {
        const itemType = propDef.items.type;
        for (let i = 0; i < value.length; i++) {
          if (typeof value[i] !== itemType) {
            errors.push(`Item at index ${i} in property "${key}" must be a ${itemType}.`);
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const mcpArgumentValidator = new McpArgumentValidator();
