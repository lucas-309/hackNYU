[**Recipe API Documentation**](../../README.md)

***

[Recipe API Documentation](../../modules.md) / [auth](../README.md) / verifyToken

# Function: verifyToken()

> **verifyToken**(`token`): [`JWTPayload`](../interfaces/JWTPayload.md)

Defined in: [src/auth.ts:60](https://github.com/arniber21/hackNYU-backend/blob/41dfafae9a025c928f718d5b479421bfcaba11bf/src/auth.ts#L60)

Verifies a JWT token

## Parameters

### token

`string`

The token to verify

## Returns

[`JWTPayload`](../interfaces/JWTPayload.md)

The decoded token payload

## Throws

If token is invalid
