import {createHash} from 'node:crypto';
import {canonical} from '../../../../packages/contracts/src/index.ts';
import {diagnosticPayloadSchema,diagnosticRecordSchema,type DiagnosticPayload,type DiagnosticRecord,type DiagnosticReport} from '../../../../packages/contracts/src/diagnostics.ts';
export function createDiagnostics(input:Omit<DiagnosticPayload,'schema'|'records'>){
 const base=diagnosticPayloadSchema.parse({...input,schema:1,records:[]});const records:DiagnosticRecord[]=[];
 return {
  record(value:unknown){const parsed=diagnosticRecordSchema.safeParse(value);if(!parsed.success)return;records.push(parsed.data);if(records.length>100)records.shift();},
  report():DiagnosticReport{const payload=diagnosticPayloadSchema.parse({...base,records});return {payload,checksum:createHash('sha256').update(canonical(payload)).digest('hex')};}
 };
}
