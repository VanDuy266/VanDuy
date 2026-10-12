'use strict';
// Prompt without echoing the password. Nothing is written to disk or logs.
function start(){console.log('Mở '+(process.env.SITE_URL||'http://localhost:'+(process.env.PORT||3000))+' trên trình duyệt máy này. Giữ cửa sổ này mở.');require('./server');}
if(process.env.ADMIN_PASSWORD){start();}
else if(!process.stdin.isTTY){console.error('Đặt ADMIN_PASSWORD (ít nhất 16 ký tự) trước khi chạy trong terminal không tương tác.');process.exitCode=1;}
else{
 let password='';process.stdout.write('Chọn mật khẩu quản trị (ít nhất 16 ký tự; ký tự sẽ không hiện): ');process.stdin.setRawMode(true);process.stdin.resume();process.stdin.setEncoding('utf8');
 const onData=chunk=>{for(const char of chunk){if(char==='\u0003'){process.stdin.setRawMode(false);process.stdout.write('\nĐã hủy.\n');process.exit(0);}if(char==='\r'||char==='\n'){if(password.length<16){process.stdout.write('\nMật khẩu cần ít nhất 16 ký tự. Nhập lại: ');password='';continue;}process.stdin.removeListener('data',onData);process.stdin.setRawMode(false);process.stdin.pause();process.env.ADMIN_PASSWORD=password;password='';process.stdout.write('\n');start();return;}if(char==='\u007f'||char==='\b')password=password.slice(0,-1);else if(char>=' '&&password.length<256)password+=char;}};process.stdin.on('data',onData);
}
