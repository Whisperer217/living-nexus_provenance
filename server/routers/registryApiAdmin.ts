import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import {
  createRegistryApiClient,
  issueRegistryApiCredential,
  listRegistryApiClients,
  revokeRegistryApiClient,
  revokeRegistryApiCredential,
  rotateRegistryApiCredential,
} from "../registry/credentialService";
import { REGISTRY_R1_SCOPES } from "../registry/scopes";

const scopeSchema = z.enum(REGISTRY_R1_SCOPES);

export const registryApiAdminRouter = router({
  listClients: adminProcedure.query(() => listRegistryApiClients()),

  createClient: adminProcedure.input(z.object({
    ownerUserId: z.number().int().positive(),
    name: z.string().trim().min(1).max(128),
    clientType: z.enum(["FIRST_PARTY", "PARTNER", "PERSONAL"]),
    environment: z.enum(["TEST", "LIVE"]),
    maximumScopes: z.array(scopeSchema).min(1).max(REGISTRY_R1_SCOPES.length),
    dailyLimit: z.number().int().positive().optional(),
  })).mutation(({ input, ctx }) => createRegistryApiClient({ ...input, actorUserId: ctx.user.id })),

  issueCredential: adminProcedure.input(z.object({
    clientId: z.number().int().positive(),
    name: z.string().trim().min(1).max(128),
    scopes: z.array(scopeSchema).min(1).max(REGISTRY_R1_SCOPES.length),
    expiresAt: z.coerce.date(),
  })).mutation(({ input, ctx }) => issueRegistryApiCredential({ ...input, actorUserId: ctx.user.id })),

  rotateCredential: adminProcedure.input(z.object({
    credentialId: z.number().int().positive(),
    expiresAt: z.coerce.date(),
  })).mutation(({ input, ctx }) => rotateRegistryApiCredential({ ...input, actorUserId: ctx.user.id })),

  revokeCredential: adminProcedure.input(z.object({ credentialId: z.number().int().positive() }))
    .mutation(({ input, ctx }) => revokeRegistryApiCredential({ ...input, actorUserId: ctx.user.id }).then(() => ({ success: true }))),

  revokeClient: adminProcedure.input(z.object({ clientId: z.number().int().positive() }))
    .mutation(({ input, ctx }) => revokeRegistryApiClient({ ...input, actorUserId: ctx.user.id }).then(() => ({ success: true }))),
});
