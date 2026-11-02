// Run from the repository root: node tests/AstroBucketList/readable-save.cjs
// Use the actual portable model and disk I/O functions, with real UTF-8 files.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),os=require('node:os'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.resolve(__dirname,'../../TGScripts_repository/src/scripts/TGScripts/AstroBucketList.js'),'utf8');
const root=fs.mkdtempSync(path.join(path.resolve(os.tmpdir()),'abl-readable-save-')),stage=path.join(root,'stage');fs.mkdirSync(stage);
let mutations=0;
function bytes(p){const b=fs.readFileSync(p);b.toBase64=()=>b.toString('base64');return b;}
const File={systemTempDirectory:stage,exists:fs.existsSync,readFile:bytes,readTextFile:p=>fs.readFileSync(p,'utf8'),
 createDirectory(p){++mutations;fs.mkdirSync(p);},removeDirectory:p=>fs.rmdirSync(p),
 writeTextFile(p,s){++mutations;fs.writeFileSync(p,s,'utf8');},writeFile(p,b){++mutations;fs.writeFileSync(p,b);},remove:p=>fs.unlinkSync(p)};
const context=vm.createContext({File,console:{warningln:()=>{}}});
vm.runInContext(source.slice(source.indexOf('// BEGIN ABL_PORTABLE'),source.indexOf('// END ABL_PORTABLE')),context);
vm.runInContext(source.slice(source.indexOf('function ablRow('),source.indexOf('// Bound downloads')),context);
const A=context.ABL,limit=32*1024*1024,checks=[];
function test(name,f){f();checks.push(name);}
function encoded(doc){return JSON.stringify(doc,null,2)+'\n';}
function padded(size,char='x'){
 const d={observingLists:{boundary:{name:'Boundary',objects:[]}},padding:''};
 d.padding=char.repeat(size-encoded(d).length);assert.equal(encoded(d).length,size);return d;
}
 test('The real 17 MiB legacy collection cannot silently become an unreadable 34 MiB save',()=>{
  const doc=A.normalizeDocument({observingLists:{a:{name:'Legacy',objects:[{designation:'M 31',reviewFixturePayload:'x'.repeat(17*1024*1024)}]}}});
  const out=A.exportDocument(doc),target=path.join(root,'expanded.sol');assert(encoded(out).length>limit);
  const before=mutations;assert.throws(()=>context.ablWrite(target,out),/32 MB/);assert.equal(mutations,before);assert(!fs.existsSync(target));
 });
 test('A write exactly at the read limit succeeds and reopens',()=>{
  const target=path.join(root,'boundary.sol'),doc=padded(limit);context.ablWrite(target,doc);assert.equal(fs.statSync(target).size,limit);assert.equal(context.ablRead(target).padding.length,doc.padding.length);
 });
 test('One character over the limit is rejected by both read and write',()=>{
  const doc=padded(limit+1),target=path.join(root,'too-large.sol');fs.writeFileSync(target,encoded(doc));assert.throws(()=>context.ablRead(target),/32 MB/);
  const before=mutations;assert.throws(()=>context.ablWrite(path.join(root,'new.sol'),doc),/32 MB/);assert.equal(mutations,before);assert(!fs.existsSync(path.join(root,'new.sol')));
 });
 test('Oversized replacement preserves the primary and existing backup byte for byte',()=>{
  const target=path.join(root,'replace.sol');context.ablWrite(target,A.newDocument());const prior=fs.readFileSync(target);fs.writeFileSync(target+'.bak','Earlier backup α\r\n');const backup=fs.readFileSync(target+'.bak'),before=mutations;
  assert.throws(()=>context.ablWrite(target,padded(limit+1)),/32 MB/);assert.equal(mutations,before);assert.deepEqual(fs.readFileSync(target),prior);assert.deepEqual(fs.readFileSync(target+'.bak'),backup);
 });
 test('Validation includes JSON escaping, indentation and the final newline',()=>{
  const doc={observingLists:{a:{name:'Escaped',objects:[]}},padding:'\n'.repeat(17*1024*1024)};assert(doc.padding.length<limit);assert(encoded(doc).length>limit);
  assert.throws(()=>context.ablWrite(path.join(root,'escaped.sol'),doc),/32 MB/);
 });
 test('Unicode retains the existing decoded-text limit and every accepted file reopens',()=>{
  const doc=padded(limit,'ö'),target=path.join(root,'unicode.sol');context.ablWrite(target,doc);assert(fs.statSync(target).size>limit);assert.equal(context.ablRead(target).padding,doc.padding);
 });
 test('Successful replacements still reopen and retain the immediately preceding version',()=>{
  const target=path.join(root,'small.sol'),doc=A.newDocument();A.addObject(doc,'',{designation:'M 42',ra:83.8,dec:-5.4});context.ablWrite(target,A.exportDocument(doc));const prior=fs.readFileSync(target);
  A.addObject(doc,'',{designation:'M 31',ra:10.68,dec:41.26});context.ablWrite(target,A.exportDocument(doc));assert.equal(A.records(context.ablRead(target)).length,2);assert.deepEqual(fs.readFileSync(target+'.bak'),prior);
 });
console.log(JSON.stringify({status:'ok',version:A.VERSION,checks},null,2));
// Only discard this run's isolated synthetic files after complete success.
assert(path.dirname(root)===path.resolve(os.tmpdir())&&path.basename(root).startsWith('abl-readable-save-'));fs.rmSync(root,{recursive:true});
