'use strict';
const presets={
 showroom:{label:'Bộ sưu tập Đức Tú',eyebrow:'ĐỨC TÚ PHÚ QUỐC · YADEA',title:'Chọn phong cách.\nKhởi hành cùng Đức Tú.',description:'Khám phá màu xe, so sánh từng mẫu và chọn chiếc xe phù hợp với hành trình mỗi ngày.',image:'/assets/yadea-orla-2024.png',link:'/xe-dien',cta:'Khám phá bộ sưu tập',led:'Xe Điện Đức Tú • Hotline: 0326 262 859 – 0866 975 540'},
 school:{label:'Mùa tựu trường',eyebrow:'BACK TO SCHOOL · KHỞI ĐẦU MỚI',title:'Gu mới đến trường.\nHành trình thêm sắc màu.',description:'Khám phá xe nhỏ gọn và các phong cách YADEA. Trao đổi với cửa hàng để kiểm tra đúng phiên bản, điều kiện sử dụng và quy định trước khi mua.',image:'/assets/yadea-orla-2024.png',link:'/xe-dien?category=compact',cta:'Khám phá xe nhỏ gọn',led:'Xe Điện Đức Tú • Hotline: 0326 262 859 – 0866 975 540'},
 tet:{label:'Sắc xuân',eyebrow:'SẮC XUÂN ĐỨC TÚ · HÀNH TRÌNH MỚI',title:'Đón sắc xuân.\nKhởi đầu hành trình mới.',description:'Lựa chọn mẫu xe và màu sắc bạn yêu thích cho những hành trình mới. Giá, lịch nhận xe và chương trình thực tế được cửa hàng xác nhận.',image:'/assets/yadea-orla-2024.png',link:'/xe-dien',cta:'Khám phá xe đón xuân',led:'Xe Điện Đức Tú • Hotline: 0326 262 859 – 0866 975 540'},
 summer:{label:'Sắc hè Phú Quốc',eyebrow:'PHÚ QUỐC · SẮC HÈ NĂNG ĐỘNG',title:'Sắc hè năng động.\nChọn gu của riêng bạn.',description:'Từ thanh lịch đến cá tính, khám phá các mẫu xe và màu sắc cho nhu cầu đi lại mỗi ngày tại Phú Quốc.',image:'/assets/yadea-orla-2024.png',link:'/xe-dien?category=sport',cta:'Khám phá phong cách',led:'Xe Điện Đức Tú • Hotline: 0326 262 859 – 0866 975 540'}
};
function resolveSeason(config,date=new Date()){
 const mode=config.seasonalMode||'auto';if(config.showEditorial===false||mode==='off')return null;
 const month=Number(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Ho_Chi_Minh',month:'numeric'}).format(date));
 const key=mode==='auto'?(month<=2?'tet':month>=8&&month<=9?'school':month>=5&&month<=7?'summer':'showroom'):mode;
 return{key:presets[key]?key:'showroom',...presets[key]||presets.showroom,automatic:mode==='auto'};
}
module.exports={resolveSeason,presets};
