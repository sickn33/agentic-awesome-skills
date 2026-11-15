'use strict';
const {openStore}=require('../lib/maintenance-state');
function record(root,directory,phase,kind,now=()=>new Date().toISOString()){
 if(!['start','end'].includes(phase)||!['review','repair','preflight','queue','dispatch'].includes(kind))throw Error('Use start|end and review|repair|preflight|queue|dispatch');
 const store=openStore(directory,root),unlock=store.acquireLock('activity');
 try{const state=store.readBatch('activity')||{events:[]};
 const active=state.events.filter(e=>e.kind===kind).at(-1);
 if((phase==='end'&&active?.phase!=='start')||(phase==='start'&&active?.phase==='start'))throw Error('Unpaired activity transition');
 state.events.push({phase,kind,at:now()});store.writeBatch('activity',state);return state;
 }finally{unlock();}
}
module.exports={record};
if(require.main===module){try{const [directory,phase,kind]=process.argv.slice(2);console.log(JSON.stringify(record(process.cwd(),directory,phase,kind)));}catch(e){console.error(e.message);process.exitCode=1;}}
