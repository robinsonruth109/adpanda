import {currentUser} from '@/lib/auth';
import {db} from '@/lib/db';
import Link from 'next/link';
import MerchantMenuWorkspace from '@/components/merchant-menu-workspace';

export const dynamic='force-dynamic';
export default async function MerchantMenuPage(){
 const user=await currentUser();
 if(!user)return <main className="section container"><h1>Menu management</h1><Link href="/merchant/login" className="btn">Merchant sign in</Link></main>;
 const memberships=await db.merchantMember.findMany({
  where:{userId:user.id},
  include:{
   merchant:{
    select:{
     status:true,
     kitchens:{
      include:{
       categories:{
        include:{items:true},
        orderBy:{sortOrder:'asc'}
       }
      }
     }
    }
   }
  }
 });
 const kitchens=memberships.flatMap(m=>m.merchant.kitchens.map(k=>({
  id:k.id,name:k.name,approved:m.merchant.status==='APPROVED',
  categories:k.categories.map(cat=>({id:cat.id,name:cat.name,active:cat.active})),
  items:k.categories.flatMap(cat=>cat.items.map(item=>({
   id:item.id,name:item.name,description:item.description||'',
   price:Number(item.price),available:item.available,categoryId:cat.id,hasImage:Boolean(item.imageKey),imageVersion:item.imageVersion
  })))
 })));
 return <section className="merchant-workspace-page">
  <div className="merchant-page-intro">
   <div><span className="merchant-kicker">MENU MANAGEMENT</span><h1>Food menu & categories</h1><p>Organize food, manage prices and toggle item availability in real time.</p></div>
   <a className="merchant-primary-button" href="#add-item">+ Add item</a>
  </div>
  <MerchantMenuWorkspace kitchens={kitchens}/>
 </section>;
}
