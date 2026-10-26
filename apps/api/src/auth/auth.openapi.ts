import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
export const userResponseSchema: SchemaObject = {
  type: 'object',
  required: ['id', 'businessId', 'role', 'name', 'email'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', format: 'uuid' },
    businessId: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
    role: { type: 'string', enum: ['CLIENT', 'STAFF', 'ADMIN', 'OWNER', 'SUPERADMIN'] },
    staffId: { type: 'string', format: 'uuid' },
    customerId: { type: 'string', format: 'uuid' },
    emailVerified: { type: 'boolean' },
  },
};
export const authResponseSchema: SchemaObject = {
  type: 'object',
  required: ['accessToken', 'expiresIn', 'user'],
  additionalProperties: false,
  properties: {
    accessToken: { type: 'string' },
    refreshToken: {
      type: 'string',
      description: 'Solo para platform=mobile. En web se entrega mediante cookie httpOnly.',
    },
    expiresIn: { type: 'integer', example: 900 },
    user: userResponseSchema,
  },
};
export const refreshRequestSchema: SchemaObject = {
  type: 'object',
  additionalProperties: false,
  properties: {
    platform: { type: 'string', enum: ['web', 'mobile'], default: 'web' },
    refreshToken: { type: 'string', minLength: 40, maxLength: 200 },
  },
};
export const messageResponseSchema: SchemaObject = {
  type: 'object',
  required: ['message'],
  properties: { message: { type: 'string' } },
};
export const emailRequestSchema: SchemaObject = {
  type: 'object',
  required: ['email'],
  additionalProperties: false,
  properties: { email: { type: 'string', format: 'email' } },
};
export const tokenRequestSchema: SchemaObject = {
  type: 'object',
  required: ['token'],
  additionalProperties: false,
  properties: { token: { type: 'string', minLength: 40, maxLength: 200 } },
};
