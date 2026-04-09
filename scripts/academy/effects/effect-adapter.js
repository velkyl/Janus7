import{applyEffectIds}from'./effect-applier.js';
import { emitHook, HOOKS } from '../../../core/hooks/emitter.js';
export class JanusEffectAdapter{
  constructor({state,validator,logger,registry}){this.state=state;this.validator=validator;this.logger=logger;this.registry=registry;}
  async applyEffects(effectIds,context={}){
    const{actorId,source:_source='unknown',reason:_reason=''}=context;
    if(!effectIds||effectIds.length===0)return{success:true,changes:[]};
    try{
      const result=await this.state.transaction(async()=>{
        const tx={
          get:(key)=>this.state.get(key,actorId),
          set:(key,value)=>{
            const schema=this.validator?.getStateSchema?.()?.[key];
            if(schema){
              if(schema.min!==undefined&&value<schema.min)value=schema.min;
              if(schema.max!==undefined&&value>schema.max)value=schema.max;
            }
            this.state.set(key,value,actorId);
          }
        };
        const changes=applyEffectIds(effectIds,this.registry,tx);
        return{changes};
      });
      this.logger?.info?.("Effects applied",{effectIds,changes:result.changes});
      emitHook(HOOKS.EFFECTS_APPLIED,{effectIds,changes:result.changes,context});
      return{success:true,changes:result.changes};
    }catch(err){
      this.logger?.error?.("Effect application failed",err);
      return{success:false,changes:[],error:err.message};
    }
  }
}
