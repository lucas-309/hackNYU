[**Recipe API Documentation**](../../README.md)

***

[Recipe API Documentation](../../modules.md) / [auth](../README.md) / authenticateRequest

# Function: authenticateRequest()

> **authenticateRequest**(`request`): `Promise`\<[`JWTPayload`](../interfaces/JWTPayload.md)\>

Defined in: [src/auth.ts:70](https://github.com/arniber21/hackNYU-backend/blob/41dfafae9a025c928f718d5b479421bfcaba11bf/src/auth.ts#L70)

Authenticates a request by verifying its JWT token

## Parameters

### request

`FastifyRequest`\<`IncomingMessage`, `ResolveFastifyRequestType`\<`FastifyTypeProviderDefault`, `FastifySchema`, `RouteGenericInterface`\>\>

The incoming request

## Returns

`Promise`\<[`JWTPayload`](../interfaces/JWTPayload.md)\>

The decoded token payload

## Throws

If token is missing or invalid
