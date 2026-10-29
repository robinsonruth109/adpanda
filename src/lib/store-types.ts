import type {StoreType} from '@prisma/client';
export const storeTypes=['FOOD','GROCERY','STATIONERY'] as const satisfies readonly StoreType[];
export type MarketplaceType=(typeof storeTypes)[number];
export const storeTypeContent:Record<StoreType,{name:string;bn:string;emoji:string;singular:string;products:string;tagline:string;categoryExamples:string[]}> = {
 FOOD:{name:'Food & Restaurants',bn:'খাবার',emoji:'🍔',singular:'Kitchen',products:'Food items',tagline:'Fresh food delivered from local kitchens',categoryExamples:['Momo','Biriyani','Fried Chicken','Drinks']},
 GROCERY:{name:'Groceries',bn:'মুদি বাজার',emoji:'🛒',singular:'Grocery shop',products:'Grocery products',tagline:'Everyday essentials delivered to your door',categoryExamples:['Rice & Dal','Oil & Spices','Snacks','Personal Care']},
 STATIONERY:{name:'Stationery',bn:'স্টেশনারি',emoji:'✏️',singular:'Stationery shop',products:'Stationery products',tagline:'Books, pens, notebooks and school/office supplies',categoryExamples:['Pens & Pencils','Exercise Books','Paper','Office Supplies']}
};
export function storeTypeName(type:StoreType){return storeTypeContent[type].singular}
export function isMarketplaceType(value:string):value is MarketplaceType{return (storeTypes as readonly string[]).includes(value)}
