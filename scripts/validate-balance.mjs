import {spawn,execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const folder=resolve('work/validation');await mkdir(folder,{recursive:true});
const report={generatedAt:new Date().toISOString(),platform:process.platform,node:process.version,source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim(),dirty:execFileSync('git',['status','--porcelain'],{encoding:'utf8',windowsHide:true}).trim().length>0,scope:'Automated invariants and balance signals; not human enjoyment or platform certification',passed:false,workloads:[]};
const save=()=>writeFile(resolve(folder,'latest.json'),JSON.stringify(report,null,2)+'\n');
for(const [name,file,timeout] of [['matches','scripts/probe.ts',60000],['career','scripts/long-career.ts',650000],['dream','scripts/dream-career.ts',180000]]){
 const start=performance.now();console.log('Running '+name+' validation...');
 const result=await new Promise(resolveResult=>{let stdout='',stderr='';const child=spawn(process.execPath,[file],{windowsHide:true,timeout});child.stdout.on('data',data=>{stdout+=data;});child.stderr.on('data',data=>{stderr+=data;});child.on('error',error=>{stderr+=error.message;});child.on('close',(code,signal)=>resolveResult({code,signal,stdout,stderr}));});
 let records=[];try{records=result.stdout.trim().split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));}catch(error){result.stderr+='\nInvalid report JSON: '+error.message;}
 const passed=result.code===0&&records.length>0&&result.stderr.length===0;
 report.workloads.push({name,passed,seconds:(performance.now()-start)/1000,records,...(!passed?{error:result.stderr||String(result.signal??result.code)}:{})});await save();
 console.log(name+': '+(passed?'passed':'FAILED'));
 if(!passed){process.exitCode=1;break;}
}
report.passed=report.workloads.length===3&&report.workloads.every(workload=>workload.passed);await save();console.log('Report: '+resolve(folder,'latest.json'));
