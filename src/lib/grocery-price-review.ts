import 'server-only';
import type {Prisma} from '@prisma/client';
/** Invalidates signoff when a grocery product or category changes.
 * Call BEFORE the change inside the same transaction, to synchronize with review's version lock.
 */
export async function invalidateGroceryPrices(tx:Prisma.TransactionClient,kitchenId:string){
 await tx.kitchen.updateMany({where:{id:kitchenId,storeType:'GROCERY'},data:{
  groceryReviewedDate:null,groceryCatalogVersion:{increment:1}
 }});
}
