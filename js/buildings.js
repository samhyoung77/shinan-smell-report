// 효천마을 신안인스빌 — 12개 동 하드코딩
// 좌표는 원본 지도 이미지(2278 x 937) 픽셀 기준.
// SVG viewBox="0 0 2278 937"로 그대로 사용.
// 튜닝 필요 시 이 파일만 편집.

export const BUILDINGS = [
  { id: 'b101', name: '101동', complex: '1단지', cx:  140, cy: 220, r:  90 },
  { id: 'b102', name: '102동', complex: '1단지', cx:  355, cy: 200, r: 100 },
  { id: 'b103', name: '103동', complex: '1단지', cx:  420, cy: 460, r:  80 },
  { id: 'b104', name: '104동', complex: '1단지', cx:  680, cy: 420, r:  70 },
  { id: 'b105', name: '105동', complex: '1단지', cx:  760, cy: 700, r:  80 },
  { id: 'b201', name: '201동', complex: '2단지', cx: 1200, cy: 320, r: 100 },
  { id: 'b202', name: '202동', complex: '2단지', cx: 1470, cy: 380, r: 100 },
  { id: 'b203', name: '203동', complex: '2단지', cx: 1220, cy: 860, r:  70 },
  { id: 'b204', name: '204동', complex: '2단지', cx: 1470, cy: 860, r:  70 },
  { id: 'b205', name: '205동', complex: '2단지', cx: 1720, cy: 790, r:  80 },
  { id: 'b206', name: '206동', complex: '2단지', cx: 1960, cy: 500, r:  90 },
  { id: 'b207', name: '207동', complex: '2단지', cx: 2170, cy: 380, r:  90 },
];

export const MAP_IMAGE = {
  src: './assets/map.jpg',
  naturalWidth: 2278,
  naturalHeight: 937,
};

export const COMPLEXES = ['1단지', '2단지'];

export function findBuilding(id) {
  return BUILDINGS.find(b => b.id === id) || null;
}
