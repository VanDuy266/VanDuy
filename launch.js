'use strict';
// Prompt without echoing the password. Plaintext is never written to disk or logs; the server stores a salted hash.
try{const fs=require('node:fs'),path=require('node:path'),file=path.join(__dirname,'.site-url');if(!process.env.SITE_URL&&fs.existsSync(file))process.env.SITE_URL=fs.readFileSync(file,'utf8').trim();}catch{}
function start(){console.log('Mở '+(process.env.SITE_URL||'http://localhost:'+(process.env.PORT||3000))+' trên trình duyệt máy này. Giữ cửa sổ này mở.');require('./server');}
let configured=false;try{const fs=require('node:fs'),path=require('node:path'),{DatabaseSync}=require('node:sqlite'),file=path.join(process.env.DATA_DIR||path.join(__dirname,'data'),'store.sqlite');if(fs.existsSync(file)){const db=new DatabaseSync(file,{readOnly:true});configured=!!db.prepare("SELECT 1 FROM sqlite_master WHERE name='admin_credentials'").get()&&!!db.prepare('SELECT 1 FROM admin_credentials WHERE id=1').get();db.close();}}catch{}
if(process.env.ADMIN_PASSWORD||configured){start();}
else if(!process.stdin.isTTY){console.error('Đặt ADMIN_PASSWORD (không để trống) trước khi chạy trong terminal không tương tác.');process.exitCode=1;}
else{
 let password='';process.stdout.write('Chọn mật khẩu quản trị (không để trống; ký tự sẽ không hiện): ');process.stdin.setRawMode(true);process.stdin.resume();process.stdin.setEncoding('utf8');
 const onData=chunk=>{for(const char of chunk){if(char==='\u0003'){process.stdin.setRawMode(false);process.stdout.write('\nĐã hủy.\n');process.exit(0);}if(char==='\r'||char==='\n'){if(!password.length){process.stdout.write('\nMật khẩu không được để trống. Nhập lại: ');password='';continue;}process.stdin.removeListener('data',onData);process.stdin.setRawMode(false);process.stdin.pause();process.env.ADMIN_PASSWORD=password;password='';process.stdout.write('\n');start();return;}if(char==='\u007f'||char==='\b')password=password.slice(0,-1);else if(char>=' '&&password.length<256)password+=char;}};process.stdin.on('data',onData);
}
