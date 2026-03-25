export class JanusContentRegistry{
  constructor(){
    this.quests=[];this.questNodes=[];this.events=[];this.options=[];this.effects=[];this.pools=[];
    this.by={quest:new Map(),node:new Map(),event:new Map(),option:new Map(),effect:new Map(),pool:new Map(),optionsByParent:new Map()};
  }
  loadFromObject(data){
    this.quests=data.quests||[];this.questNodes=data.questNodes||[];this.events=data.events||[];
    this.options=data.options||[];this.effects=data.effects||[];this.pools=data.pools||[];
    this.buildIndices();return this;
  }
  buildIndices(){
    this.quests.forEach(q=>this.by.quest.set(q.questId,q));
    this.questNodes.forEach(n=>this.by.node.set(n.nodeId,n));
    this.events.forEach(e=>this.by.event.set(e.eventId,e));
    this.options.forEach(o=>this.by.option.set(o.optionId,o));
    this.effects.forEach(e=>this.by.effect.set(e.effectId,e));
    this.pools.forEach(p=>this.by.pool.set(p.poolId,p));
    this.options.forEach(opt=>{
      const key=`${opt.parentType}:${opt.parentId}`;
      if(!this.by.optionsByParent.has(key))this.by.optionsByParent.set(key,[]);
      this.by.optionsByParent.get(key).push(opt);
    });
  }
  validate(){
    const errors=[],warnings=[];
    const seen=(label,arr,key)=>{const s=new Set();for(const e of arr){const v=e?.[key];if(!v)continue;if(s.has(v))errors.push(`${label} duplicate ${key}: ${v}`);s.add(v);}};
    seen('quest',this.quests,'questId');
    seen('node',this.questNodes,'nodeId');
    seen('event',this.events,'eventId');
    seen('option',this.options,'optionId');
    seen('effect',this.effects,'effectId');
    seen('pool',this.pools,'poolId');
    this.questNodes.forEach(node=>{
      if(!this.by.quest.has(node.questId))errors.push(`Node ${node.nodeId} unknown quest ${node.questId}`);
      if(node.type==='event'&&!this.by.event.has(node.eventId))errors.push(`Node ${node.nodeId} unknown event ${node.eventId}`);
      if(node.type==='effect'){for(const eff of (node.effectIds||[])){if(!this.by.effect.has(eff))errors.push(`Node ${node.nodeId} unknown effect ${eff}`);}}
    });
    this.options.forEach(opt=>{
      if(opt.parentType==='event' && !this.by.event.has(opt.parentId)) errors.push(`Option ${opt.optionId} unknown parent event ${opt.parentId}`);
      for(const eff of (opt.effectIds||[])){if(!this.by.effect.has(eff))errors.push(`Option ${opt.optionId} unknown effect ${eff}`);}
      if(opt.nextNodeId && !this.by.node.has(opt.nextNodeId)) warnings.push(`Option ${opt.optionId} unknown nextNodeId ${opt.nextNodeId}`);
    });
    this.pools.forEach(pool=>{ for(const eventId of (pool.events||[])){ if(!this.by.event.has(eventId)) errors.push(`Pool ${pool.poolId} unknown event ${eventId}`);} });
    return {errors,warnings};
  }
}
