import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { verifyTypedData, Signature } from 'ethers';
import { RFQ_TYPES } from '../maker-kit/src/protocol.mjs';
const root=process.cwd();
async function walk(dir){const files=[];for(const entry of await fs.readdir(dir,{withFileTypes:true})){if(['.git','node_modules'].includes(entry.name))continue;const file=path.join(dir,entry.name);if(entry.isDirectory())files.push(...await walk(file));else files.push(file);}return files;}
const files=await walk(root);
function anchors(text){const seen=new Map();return text.split('\n').filter(x=>/^#{1,6} /.test(x)).map(x=>{const base=x.replace(/^#+ /,'').toLowerCase().replace(/[^\p{L}\p{N}_\- ]/gu,'').replaceAll(' ','-'),n=seen.get(base)||0;seen.set(base,n+1);return base+(n?'-'+n:'');});}
test('Local Markdown links and fragments resolve within the repository',async()=>{
 for(const file of files.filter(f=>f.endsWith('.md'))){const text=await fs.readFile(file,'utf8');assert.doesNotMatch(text,/^:::/m);for(const match of text.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)){const url=match[1];if(/^(https?:|mailto:)/.test(url))continue;const [relative,fragment]=url.split('#'),target=path.resolve(path.dirname(file),decodeURIComponent(relative||path.basename(file)));assert.ok(target.startsWith(root+path.sep)||target===root);await fs.access(target);if(fragment&&target.endsWith('.md'))assert.ok(anchors(await fs.readFile(target,'utf8')).includes(fragment),`${path.relative(root,file)}: ${url}`);}}
});
test('Published contracts match the source record and standalone kit',async()=>{
 const record=JSON.parse(await fs.readFile('SOURCE-RECORD.json','utf8'));
 for(const [file,expected]of Object.entries(record.artifacts)){assert.equal(createHash('sha256').update(await fs.readFile(file)).digest('hex'),expected,file);}
 assert.deepEqual(JSON.parse(await fs.readFile('examples/maker.json','utf8')),JSON.parse(await fs.readFile('maker-kit/docs/examples.json','utf8')));
 assert.deepEqual(JSON.parse(await fs.readFile('contracts/maker-adapter.openapi.json','utf8')),JSON.parse(await fs.readFile('maker-kit/docs/maker-adapter.openapi.json','utf8')));
});
test('Signed maker fixture recovers its disposable teaching identity',async()=>{
 const {firm}=JSON.parse(await fs.readFile('examples/maker.json','utf8'));
 assert.equal(verifyTypedData(firm.domain,RFQ_TYPES,firm.order,Signature.from(firm.signature).serialized),firm.order.maker);
});
