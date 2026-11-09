import {redirect} from 'next/navigation';
import {contentReviewAdmin} from '@/lib/content-review-server';
import {ReviewCenter} from '@/components/admin/content-review/ReviewCenter';
export const dynamic='force-dynamic';
export default async function ContentReviewPage(){
 const auth=await contentReviewAdmin();
 if(auth.status===401)redirect('/login');
 if(auth.status!==200)return <div className="p-8"><h1 className="text-2xl font-bold">Acesso restrito</h1><p>Esta central está disponível apenas para administradores.</p></div>;
 return <ReviewCenter/>;
}
