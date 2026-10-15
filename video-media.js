'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function serveVideo(req,res,file){
 const size=fs.statSync(file).size,headers={'Content-Type':'video/mp4','Accept-Ranges':'bytes','Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff'};let start=0,end=size-1,status=200;
 if(req.headers.range){const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);if(!m||!m[1]&&!m[2]){res.writeHead(416,{'Content-Range':`bytes */${size}`});return res.end();}if(!m[1])start=Math.max(0,size-Number(m[2]));else{start=Number(m[1]);if(m[2])end=Math.min(Number(m[2]),size-1);}if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=size){res.writeHead(416,{'Content-Range':`bytes */${size}`});return res.end();}status=206;headers['Content-Range']=`bytes ${start}-${end}/${size}`;}
 headers['Content-Length']=String(end-start+1);res.writeHead(status,headers);if(req.method==='HEAD')return res.end();const stream=fs.createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
}
function initializeVideo({session,fail,rate,json,mediaDir,audit}){
 let uploading=false;
 async function handle(req,res,url){if(url.pathname!=='/api/admin/upload-video')return false;const s=session(req);if(req.method!=='POST')fail(405,'Phương thức không hỗ trợ');if(req.headers['x-csrf-token']!==s.csrf)fail(403,'Phiên yêu cầu không hợp lệ');rate(req,'video-upload',3);if((req.headers['content-type']||'').split(';')[0]!=='video/mp4')fail(415,'Chọn video MP4');const limit=40*1024*1024,length=Number(req.headers['content-length']);if(length>limit)fail(413,'Video tối đa 40 MB');if(uploading)fail(429,'Đang tải một video khác. Vui lòng chờ.');uploading=true;
 const name=crypto.randomBytes(16).toString('hex')+'.mp4',temporary=path.join(mediaDir,name+'.upload'),target=path.join(mediaDir,name);let file,total=0,header=Buffer.alloc(0);
 try{file=await fs.promises.open(temporary,'wx',0o600);for await(const chunk of req){total+=chunk.length;if(total>limit)fail(413,'Video tối đa 40 MB');if(header.length<32)header=Buffer.concat([header,chunk.subarray(0,32-header.length)]);await file.write(chunk);}await file.close();file=null;if(total<32||header.toString('ascii',4,8)!=='ftyp')fail(400,'Tệp chưa phải video MP4 hợp lệ');await fs.promises.rename(temporary,target);audit('video-upload',name);json(res,201,{video:'/media/'+name,size:total});return true;}finally{await file?.close().catch(()=>{});await fs.promises.unlink(temporary).catch(()=>{});uploading=false;}
 }
 return{handle};
}
module.exports={serveVideo,initializeVideo};
