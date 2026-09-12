export const money=(cents:number)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'EUR'}).format(cents/100);
export function parseEuro(input:string):number|null {
 if(!/^\d+(\.\d{1,2})?$/.test(input))return null;
 const [whole,fraction='']=input.split('.');const cents=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 return Number.isSafeInteger(cents)?cents:null;
}
