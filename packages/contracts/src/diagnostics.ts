import {z} from 'zod';
const version=z.string().regex(/^[0-9A-Za-z.+_-]+$/).max(60),hash=z.string().regex(/^[a-f0-9]{64}$/);
export const buildInfoSchema=z.strictObject({appVersion:version,sourceCommit:z.string().regex(/^[a-f0-9]{40}$/).nullable(),sourceDirty:z.boolean(),lockHash:hash,rendererHash:hash.nullable()});
export type BuildInfo=z.infer<typeof buildInfoSchema>;
export const diagnosticRecordSchema=z.strictObject({operation:z.enum(['roster-list','roster-import','audio-settings','save-audio-settings','dream-save','dream-list','dream-load','save','list','load','diagnostics','export-diagnostics']),milliseconds:z.number().int().nonnegative().max(86400000),error:z.enum(['INVALID_COMMAND','INVALID_SAVE','FUTURE_SAVE','IO_ERROR']).nullable()});
export type DiagnosticRecord=z.infer<typeof diagnosticRecordSchema>;
export const diagnosticPayloadSchema=z.strictObject({schema:z.literal(1),build:buildInfoSchema,runtime:z.strictObject({platform:version,architecture:version,electron:version,chrome:version,node:version,packaged:z.boolean()}),records:z.array(diagnosticRecordSchema).max(100)});
export type DiagnosticPayload=z.infer<typeof diagnosticPayloadSchema>;
export type DiagnosticReport={payload:DiagnosticPayload;checksum:string};
