# Video giới thiệu thiết kế Đức Tú

`duc-tu-design-showcase.mp4` là bản dựng biên tập từ các ảnh sản phẩm có sẵn:

- `yadea-orla-2024.png`
- `yadea-osta-2026-new.png`
- `yadea-icute-h-new.png`

Nguồn và checksum ảnh gốc được giữ trong catalog/yadea.json, catalog/new-models.json và các bài kiểm thử nguồn ảnh. Không thay đổi ảnh gốc. Video là trình chiếu giới thiệu thiết kế, không phải cảnh quay xe chạy thực tế hoặc mô hình 3D.

Định dạng: H.264 / yuv420p, 1280×720, 24fps, 10,5 giây, không âm thanh. Dựng lại bằng `bash scripts/build-showcase-video.sh` (cần ffmpeg); runtime website không cần ffmpeg.

SHA-256 bản đóng gói: `9b3600cbcb89358fb65b5f14b548076c1e144699c26ec42186238c5e78488078`.
