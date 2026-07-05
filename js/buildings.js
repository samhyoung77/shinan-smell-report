// 효천마을 신안인스빌 — 12개 동 하드코딩
// 좌표는 광역 개략도 좌표계(2039 x 1025) 픽셀 기준.
// SVG viewBox="0 0 2039 1025"로 그대로 사용.
// 튜닝 필요 시 이 파일만 편집. (id/name/complex 문자열은 계약이므로 불변)

export const BUILDINGS = [
  { id: 'b101', name: '101동', complex: '1단지', cx:  505, cy: 253, r: 54 },
  { id: 'b102', name: '102동', complex: '1단지', cx:  685, cy: 306, r: 54 },
  { id: 'b103', name: '103동', complex: '1단지', cx:  641, cy: 385, r: 50 },
  { id: 'b104', name: '104동', complex: '1단지', cx:  791, cy: 365, r: 50 },
  { id: 'b105', name: '105동', complex: '1단지', cx:  816, cy: 498, r: 54 },
  { id: 'b201', name: '201동', complex: '2단지', cx:  995, cy: 306, r: 56 },
  { id: 'b202', name: '202동', complex: '2단지', cx: 1114, cy: 326, r: 56 },
  { id: 'b203', name: '203동', complex: '2단지', cx:  982, cy: 554, r: 52 },
  { id: 'b204', name: '204동', complex: '2단지', cx: 1130, cy: 546, r: 52 },
  { id: 'b205', name: '205동', complex: '2단지', cx: 1267, cy: 510, r: 52 },
  { id: 'b206', name: '206동', complex: '2단지', cx: 1329, cy: 364, r: 52 },
  { id: 'b207', name: '207동', complex: '2단지', cx: 1479, cy: 345, r: 52 },
];

// 배경은 map-overlay.js가 인라인 벡터 개략도(map-bg SVG)로 렌더한다.
// (기존 ./assets/map.jpg 는 롤백용으로 남겨둠 — 더 이상 로드하지 않음.)
// naturalWidth/naturalHeight 는 오버레이·배경 SVG의 viewBox 좌표계로 계속 사용.
export const MAP_IMAGE = {
  naturalWidth: 2039,
  naturalHeight: 1025,
};

export const COMPLEXES = ['1단지', '2단지'];

export function findBuilding(id) {
  return BUILDINGS.find(b => b.id === id) || null;
}
