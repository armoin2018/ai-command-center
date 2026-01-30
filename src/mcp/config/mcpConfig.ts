// src/mcp/config/mcpConfig.ts
import Ajv from 'ajv';
import { logger } from '../../logger';

export interface MCPConfig {
  enabled: boolean;
  transport: 'stdio' | 'http';
  port?: number;
  logging: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
  };
  tools: {
    enabled: boolean;
    timeout: number;
  };
  resources: {
    enabled: boolean;
    cacheSize: number;
  };
  prompts: {
    enabled: boolean;
  };
}

export const MCP_CONFIG_SCHEMA = {
  type: 'object',
  properties: {
    enabled: {
      type: 'boolean',
      description: 'Enable MCP server'
    },
    transport: {
      type: 'string',
      enum: ['stdio', 'http'],
      description: 'Transport protocol for MCP server'
    },
    port: {
      type: 'number',
      minimum: 1024,
      maximum: 65535,
      nullable: true,
      description: 'Port number for HTTP transport'
    },
    logging: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        level: {
          type: 'string',
          enum: ['debug', 'info', 'warn', 'error']
        }
      },
      required: ['enabled', 'level']
    },
    tools: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        timeout: {
          type: 'number',
          minimum: 1000,
          maximum: 60000,
          description: 'Tool execution timeout in ms'
        }
      },
      required: ['enabled', 'timeout']
    },
    resources: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        cacheSize: {
          type: 'number',
          minimum: 0,
          maximum: 1000,
          description: 'Resource cache size'
        }
      },
      required: ['enabled', 'cacheSize']
    },
    prompts: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' }
      },
      required: ['enabled']
    }
  },
  required: ['enabled', 'transport', 'logging', 'tools', 'resources', 'prompts']
};

export const DEFAULT_MCP_CONFIG: MCPConfig = {
  enabled: true,
  transport: 'stdio',
  logging: {
    enabled: true,
    level: 'info'
  },
  tools: {
    enabled: true,
    timeout: 30000
  },
  resources: {
    enabled: true,
    cacheSize: 100
  },
  prompts: {
    enabled: true
  }
};

export class MCPConfigValidator {
  private ajv: any;
  private validate: any;

  constructor() {
    this.ajv = new Ajv();
    this.validate = this.ajv.compile(MCP_CONFIG_SCHEMA);
  }

  validateConfig(config: unknown): MCPConfig {
    if (!this.validate(config)) {
      const errors = this.validate.errors || [];
      const errorMessages = errors.map((e: any) =>
        `${e.instancePath} ${e.message}`
      ).join(', ');

      logger.error('MCP config validation failed', {
        component: 'MCPConfigValidator',
        errors: errorMessages
      });

      throw new Error(`Invalid MCP configuration: ${errorMessages}`);
    }

    const mcpConfig = config as MCPConfig;

    // Additional validation for HTTP transport
    if (mcpConfig.transport === 'http' && !mcpConfig.port) {
      throw new Error('Port is required for HTTP transport');
    }

    logger.debug('MCP config validated successfully', {
      component: 'MCPConfigValidator',
      transport: mcpConfig.transport
    });

    return mcpConfig;
  }
}
