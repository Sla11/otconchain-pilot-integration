// Reference client only. No server implementation, wallet, signature or chain broadcast.
import fs from 'node:fs/promises';
const examples=JSON.parse(await fs.readFile(new URL('../examples/partner.json',import.meta.url),'utf8'));
if (!process.argv.includes('--send')) {
 console.log(JSON.stringify({mode:'dry-run',networkCalls:0,method:'POST',path:'/v1/pilot/requests',body:examples.createRequest},null,2));
} else {
 const base=process.env.PILOT_BASE_URL, credential=process.env.PILOT_TERMINAL_TOKEN;
 if(!base||!credential)throw new Error('Set the jointly approved HTTPS PILOT_BASE_URL and server-only PILOT_TERMINAL_TOKEN.');
 const url=new URL(base);
 if(url.protocol!=='https:'||url.hostname.endsWith('.invalid'))throw new Error('Use the approved HTTPS sandbox, not a documentation placeholder.');
 const capabilityResponse=await fetch(new URL('/v1/pilot/capabilities',url),{headers:{Authorization:'Bearer '+credential},signal:AbortSignal.timeout(20000)});
 if(!capabilityResponse.ok)throw new Error('Capabilities unavailable: '+capabilityResponse.status);
 const capabilities=await capabilityResponse.json();
 if(capabilities.contractVersion!=='0.1.0-draft'||!capabilities.modes?.includes(examples.createRequest.mode))throw new Error('Contract version or mode differs from the approved fixture.');
 const response=await fetch(new URL('/v1/pilot/requests',url),{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+credential,'Idempotency-Key':examples.createRequest.clientRequestId,'X-Request-Timestamp':String(Math.floor(Date.now()/1000))},body:JSON.stringify(examples.createRequest),signal:AbortSignal.timeout(20000)});
 console.log(response.status,await response.text());
 if(!response.ok)process.exitCode=1;
}
