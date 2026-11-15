'use strict';
const fs=require('node:fs'),os=require('node:os');
function checkSpace(directory=os.tmpdir(), minimum=3*1024**3, statfs=fs.statfsSync){
 const s=statfs(directory);const available=Number(s.bavail)*Number(s.bsize);
 if(!Number.isSafeInteger(available)||available<minimum)throw Error(`Insufficient release scratch space: ${available} bytes available; ${minimum} required. Clean only inactive run-owned temporary directories.`);
 return {directory,available,minimum};
}
module.exports={checkSpace};
