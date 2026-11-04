async function runAnalysisJob(kind,body){
 const start=await fetch('/api/jobs/'+kind,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const task=await start.json();if(start.status===404)throw Error('The app connection changed during an update. Refresh this page and try again.');if(!start.ok)throw Error(typeof task.detail==='string'?task.detail:JSON.stringify(task.detail));
 const deadline=Date.now()+240000;let failures=0;
 while(Date.now()<deadline){await new Promise(resolve=>setTimeout(resolve,1500));let response;
 try{response=await fetch('/api/jobs/'+encodeURIComponent(task.job_id),{cache:'no-store'});failures=0}catch(e){if(++failures<4)continue;throw e}
 const data=await response.json();if(!response.ok)throw Error(typeof data.detail==='string'?data.detail:'Analysis request failed.');if(data.status==='complete')return data.result;
 }throw Error('Analysis is taking longer than expected. Please wait before starting another request.');
}
