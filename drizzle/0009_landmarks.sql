CREATE TABLE IF NOT EXISTS landmarks (
  id text PRIMARY KEY NOT NULL,
  name_vi text NOT NULL,
  name_en text NOT NULL DEFAULT '',
  description_vi text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT '',
  latitude real,
  longitude real,
  building_ids_json text NOT NULL DEFAULT '[]',
  published integer NOT NULL DEFAULT 1,
  deleted integer NOT NULL DEFAULT 0,
  position integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_landmarks_visible ON landmarks (published, deleted, position);
CREATE TABLE IF NOT EXISTS travel_time_cache (
  building_id text NOT NULL,
  landmark_id text NOT NULL,
  duration_seconds integer NOT NULL,
  distance_meters integer NOT NULL,
  expires_at integer NOT NULL,
  PRIMARY KEY (building_id, landmark_id)
);
INSERT OR IGNORE INTO landmarks (id,name_vi,name_en,latitude,longitude,position) VALUES
('my-khe-beach','Bãi biển Mỹ Khê','My Khe Beach',16.0756254,108.2468784,1),
('my-an-beach','Bãi biển Mỹ An','My An Beach',16.0250950,108.2595335,2),
('non-nuoc-beach','Bãi biển Non Nước','Non Nuoc Beach',16.0056684,108.2687971,3),
('dragon-bridge','Cầu Rồng','Dragon Bridge',16.0611682,108.2278968,4),
('han-river-bridge','Cầu Sông Hàn','Han River Bridge',16.0723604,108.2284106,5),
('tran-thi-ly-bridge','Cầu Trần Thị Lý','Tran Thi Ly Bridge',16.0502245,108.2300162,6),
('thuan-phuoc-bridge','Cầu Thuận Phước','Thuan Phuoc Bridge',16.0951418,108.2205974,7),
('apec-park','Công viên APEC','APEC Park',16.0587532,108.2235123,8),
('cham-museum','Bảo tàng Điêu khắc Chăm','Da Nang Museum of Cham Sculpture',16.0601209,108.2230840,9),
('dong-dinh-museum','Bảo tàng Đồng Đình','Dong Dinh Museum',16.1012126,108.2755096,10),
('han-market','Chợ Hàn','Han Market',16.0683525,108.2242830,11),
('con-market','Chợ Cồn','Con Market',16.0681275,108.2145213,12),
('son-tra-night-market','Chợ đêm Sơn Trà','Son Tra Night Market',16.0607228,108.2315158,13),
('danang-cathedral','Nhà thờ Chính tòa Đà Nẵng','Da Nang Cathedral',16.0666827,108.2230584,14),
('phap-lam-pagoda','Chùa Pháp Lâm','Phap Lam Pagoda',16.0622864,108.2155343,15),
('linh-ung-son-tra','Chùa Linh Ứng Sơn Trà','Linh Ung Pagoda Son Tra',16.1001567,108.2784112,16),
('ban-co-peak','Đỉnh Bàn Cờ','Ban Co Peak',16.1189286,108.2720036,17),
('bai-but','Bãi Bụt','Bai But',16.1027851,108.2842859,18),
('tien-sa-beach','Bãi biển Tiên Sa','Tien Sa Beach',16.1243646,108.2210009,19),
('am-phu-cave','Động Âm Phủ','Am Phu Cave',16.0031975,108.2639113,20),
('tam-thai-pagoda','Chùa Tam Thai','Tam Thai Pagoda',16.0038895,108.2627912,21),
('golden-bridge','Cầu Vàng Bà Nà','Golden Bridge Ba Na Hills',15.9950915,107.9964120,22),
('ba-na-hills','Bà Nà Hills','Ba Na Hills',15.9958569,107.9890712,23),
('hoi-an-old-town','Phố cổ Hội An','Hoi An Ancient Town',15.8771291,108.3286631,24),
('cua-dai-beach','Bãi biển Cửa Đại','Cua Dai Beach',15.8980583,108.3662256,25);
