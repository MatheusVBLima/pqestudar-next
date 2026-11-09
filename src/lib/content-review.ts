export * from '../../supabase/functions/_shared/content-review';
import type {Claim,ContentKind} from '../../supabase/functions/_shared/content-review';
export interface ReviewTarget {id:string;kind:ContentKind;title:string;route:string;published:boolean;last_review?:string|null}
export interface ReviewRun {id:string;provider?:'openai'|'lovable';text_model?:string;search_model?:string;kind:ContentKind;content_id:string;title:string;route:string;snapshot:Record<string,string|null>;claims:Claim[];created_at:string;status:string;error?:string|null;version:number}
export interface ReviewHistory {id:string;created_at:string;actor_id:string;before_fields:Record<string,string|null>;after_fields:Record<string,string|null>;reverted_at:string|null;run_id:string;changes?:{type?:string}|unknown[]}
export const verdictLabels = {confirmed:'Confirmado na consulta',contradicted:'Contradito pela fonte',uncertain:'Precisa de confirmação',unverified:'Não verificado',editorial:'Avaliação editorial'};
