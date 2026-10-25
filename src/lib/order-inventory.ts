import type {Prisma} from '@prisma/client';
/**
 * Call exactly once after successfully transitioning an order to CANCELLED.
 * Updates tracked (non-null) stock only; old food catalogue quantities remain untracked.
 * Must be inside the same transaction as the status compare-and-swap.
 */
export async function releaseCancelledOrderStock(tx:Prisma.TransactionClient,orderId:string){
 const items=await tx.orderItem.findMany({where:{orderId},select:{menuItemId:true,quantity:true}});
 for(const item of items){
  if(!item.menuItemId)continue;
  await tx.menuItem.updateMany({
   where:{id:item.menuItemId,stockQty:{not:null}},
   data:{stockQty:{increment:item.quantity}}
  });
 }
}
