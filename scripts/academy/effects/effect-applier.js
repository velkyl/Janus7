function parseEffectExpr(expr){
  const m=expr.match(/^(.+?):([+\-=])(.+)$/);
  if(!m)return null;
  return{key:m[1].trim(),op:m[2],value:parseFloat(m[3])};
}
export function applyEffectIds(effectIds,registry,tx){
  const results=[];
  for(const eid of effectIds){
    const effect=registry.by.effect.get(eid);
    if(!effect){results.push({effectId:eid,success:false,reason:'unknown_effect'});continue;}
    const parsed=parseEffectExpr(effect.expr);
    if(!parsed){results.push({effectId:eid,success:false,reason:'invalid_expr'});continue;}
    const current=tx.get(parsed.key);
    let newValue;
    switch(parsed.op){case'+':newValue=current+parsed.value;break;case'-':newValue=current-parsed.value;break;case'=':newValue=parsed.value;break;default:newValue=current;}
    tx.set(parsed.key,newValue);
    results.push({effectId:eid,success:true,key:parsed.key,from:current,to:newValue});
  }
  return results;
}
