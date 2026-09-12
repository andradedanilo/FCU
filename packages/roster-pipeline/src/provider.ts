import {z} from 'zod';

export type Page<T> = {items:T[]; nextCursor:string|null; total:number; requestFingerprint:string; fetchedAtUTC:string; sourceUpdatedAtUTC:string|null};
export type Capabilities = {membership:'current'|'season'; maxBatchSize:number; requestsPerMinute:number; sourceTimestamps:boolean};
export interface RosterProvider {
  id:string;
  capabilities():Promise<Capabilities>;
  listSeasons(competitionRef:string):Promise<Page<{ref:string; startYear:number}>>;
  listTeams(seasonRef:string,cursor:string|null):Promise<Page<{ref:string; name:string}>>;
  fetchSquad(teamRef:string,seasonRef:string,cursor:string|null):Promise<Page<{playerRef:string; teamRef:string}>>;
  fetchPlayers(ids:readonly string[],cursor:string|null):Promise<Page<{ref:string; name:string; dateOfBirth:string; role:string}>>;
}

export async function collectPages<T>(fetchPage:(cursor:string|null)=>Promise<unknown>, item:z.ZodType<T>, identity:(item:T)=>string, signal?:AbortSignal):Promise<{items:T[]; pages:Omit<Page<T>,'items'>[]}> {
  const schema = z.strictObject({items:z.array(item).max(5000),nextCursor:z.string().min(1).max(500).nullable(),total:z.number().int().nonnegative().max(50000),requestFingerprint:z.string().min(1).max(200),fetchedAtUTC:z.iso.datetime(),sourceUpdatedAtUTC:z.iso.datetime().nullable()});
  const cursors=new Set<string>(), ids=new Set<string>(), fingerprints=new Set<string>();
  const items:T[]=[], pages:Omit<Page<T>,'items'>[]=[];
  let cursor:string|null=null, total:number|null=null;
  do {
    signal?.throwIfAborted();
    const page=schema.parse(await fetchPage(cursor));
    signal?.throwIfAborted();
    if (total!==null&&total!==page.total) throw Error('CONTRADICTORY_TOTAL');
    total=page.total;
    if (fingerprints.has(page.requestFingerprint)) throw Error('REPEATED_REQUEST');
    fingerprints.add(page.requestFingerprint);
    if (pages.length>=1000 || items.length+page.items.length>50000) throw Error('FETCH_LIMIT');
    for (const entry of page.items) {const id=identity(entry);if(ids.has(id))throw Error('DUPLICATE_PROVIDER_ID');ids.add(id);items.push(entry);}
    pages.push({nextCursor:page.nextCursor,total:page.total,requestFingerprint:page.requestFingerprint,fetchedAtUTC:page.fetchedAtUTC,sourceUpdatedAtUTC:page.sourceUpdatedAtUTC});
    cursor=page.nextCursor;
    if (cursor!==null) {if(cursors.has(cursor)||page.items.length===0)throw Error('REPEATED_OR_EMPTY_PAGE');cursors.add(cursor);}
  } while(cursor!==null);
  if(items.length!==total)throw Error('INCOMPLETE_FETCH');
  return {items,pages};
}
