import 'server-only';
import {createServerSupabaseClientWithAuth} from '@/lib/supabase-server';

export async function contentReviewAdmin() {
 const db=await createServerSupabaseClientWithAuth();
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user)return {status:401 as const,token:null};
 const {data:admin,error:roleError}=await db.rpc('has_role',{_user_id:user.id,_role:'admin'});
 if(roleError||admin!==true)return {status:403 as const,token:null};
 const {data:{session}}=await db.auth.getSession();
 if(!session?.access_token)return {status:401 as const,token:null};
 return {status:200 as const,token:session.access_token};
}
