---
source: https://github.com/voltagent/awesome-design-md/tree/main/design-md/linear.app
brand: Linear
license: Curated reference. Colors and specs are Linear's canonical marketing system, provided for AI-assisted UI generation.
adaptation_notes: |
  이 프로젝트는 아파트 주민용 모바일 웹앱(신고/통계)이다. Linear의 마케팅 시스템을 웹앱 UX에 응용한다.
  - **다크가 기본 (Linear 정체성 유지)** — 야외 낮 사용 대비 라이트 모드는 시스템 감지 후 자동 대체 팔레트로.
  - **모바일 우선.** Linear의 데스크톱 마케팅 그리드/스크린샷 카드 패턴은 참고만.
  - **라벤더(#5e6ad2)는 극도로 아껴서만.** 브랜드 마크, 주요 CTA, 포커스 링, 활성 링크만.
  - **강도(intensity)는 라벤더 아님.** 서페이스 라더 + 뉴트럴 톤 위에서 별개 3색으로 표현. 색맹 대응 라벨 병기.
---

# Linear Design System – Full Text

```yaml
version: alpha
name: Linear-design-analysis
description: "A near-black product-focused marketing canvas built around #010102 (the deepest dark surface of any tool in this collection), light gray text (#f7f8f8), and the signature Linear lavender-blue (#5e6ad2) used as the single chromatic accent. The system reads as software-craft documentation: dense, technical, and quietly luxurious. Display type is set in the Linear custom sans (SF Pro Display fallback) at 500–700 with measured negative tracking. Cards live as charcoal panels (#0f1011) with hairline borders. The accent lavender appears on the brand mark, focus rings, and a few intentional CTAs — never decoratively. Page rhythm leans on product UI screenshots framed in dark panels rather than atmospheric color."

colors:
  primary: "#5e6ad2"
  on-primary: "#ffffff"
  primary-hover: "#828fff"
  primary-focus: "#5e69d1"
  ink: "#f7f8f8"
  ink-muted: "#d0d6e0"
  ink-subtle: "#8a8f98"
  ink-tertiary: "#62666d"
  canvas: "#010102"
  surface-1: "#0f1011"
  surface-2: "#141516"
  surface-3: "#18191a"
  surface-4: "#191a1b"
  hairline: "#23252a"
  hairline-strong: "#34343a"
  hairline-tertiary: "#3e3e44"
  inverse-canvas: "#ffffff"
  inverse-surface-1: "#f5f6f6"
  inverse-surface-2: "#f6f7f7"
  inverse-ink: "#000000"
  brand-secure: "#7a7fad"
  semantic-success: "#27a644"
  semantic-overlay: "#000000"

typography:
  display-xl:
    fontFamily: Linear Display
    fontSize: 80px
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: -3.0px
  display-lg:
    fontFamily: Linear Display
    fontSize: 56px
    fontWeight: 600
    lineHeight: 1.10
    letterSpacing: -1.8px
  display-md:
    fontFamily: Linear Display
    fontSize: 40px
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: -1.0px
  headline:
    fontFamily: Linear Display
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.20
    letterSpacing: -0.6px
  card-title:
    fontFamily: Linear Display
    fontSize: 22px
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: -0.4px
  subhead:
    fontFamily: Linear Display
    fontSize: 20px
    fontWeight: 400
    lineHeight: 1.40
    letterSpacing: -0.2px
  body-lg:
    fontFamily: Linear Text
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.50
    letterSpacing: -0.1px
  body:
    fontFamily: Linear Text
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.50
    letterSpacing: -0.05px
  body-sm:
    fontFamily: Linear Text
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.50
    letterSpacing: 0
  caption:
    fontFamily: Linear Text
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.40
    letterSpacing: 0
  button:
    fontFamily: Linear Text
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.20
    letterSpacing: 0
  eyebrow:
    fontFamily: Linear Text
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.30
    letterSpacing: 0.4px
  mono:
    fontFamily: Linear Mono
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.50
    letterSpacing: 0

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  xxl: 24px
  pill: 9999px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 96px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 8px 14px
  button-secondary:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 8px 14px
  feature-card:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: 24px
  text-input:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 8px 12px
  status-badge:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 2px 8px
  top-nav:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.xs}"
    height: 56px
```

## Overview

Linear의 캔버스는 이 컬렉션에서 가장 깊은 다크(#010102). 그 위에 서페이스 1~4 라더가 카드/패널의 계층을 만든다. 텍스트는 라이트 그레이(#f7f8f8). **유일한 크로매틱 액센트는 라벤더-블루(#5e6ad2)** — 브랜드 마크, 포커스 링, 주 CTA에만.

Display 타입은 SF Pro Display 폴백 위 500~700, 강한 네거티브 트래킹. 카드는 12px 라운드에 헤어라인 보더 (`#23252a`). 그림자 대신 서페이스 리프트로 깊이 표현.

**핵심 특성:**
- Deepest dark canvas (#010102) — 완전 검정 아닌 미세 파랑 tint
- 라벤더 액센트를 아껴서 (브랜드, CTA, 포커스만)
- 4단 서페이스 라더 (그림자 없이)
- Display에 강한 네거티브 tracking
- 카드는 12px 라운드 + 1px 헤어라인 (필/16px는 예외적)
- 제품 UI 스크린샷이 페이지의 주인공 (마케팅 크롬은 프레임)
- 2차 크로매틱 컬러 없음, 대기감 그라디언트 없음

## Colors

### Brand & Accent
- **Lavender-Blue** (#5e6ad2): 주 CTA, 브랜드 마크, 링크 강조.
- **Lavender Hover** (#828fff), **Focus** (#5e69d1)
- **Brand Secure** (#7a7fad): Linear Security 표면 전용.

### Surface (4단 라더)
- Canvas #010102 → Surface-1 #0f1011 → Surface-2 #141516 → Surface-3 #18191a → Surface-4 #191a1b
- Hairline: #23252a / #34343a / #3e3e44

### Text
- Ink #f7f8f8, Ink-muted #d0d6e0, Ink-subtle #8a8f98, Ink-tertiary #62666d

### Semantic
- Success #27a644, Overlay #000000. **다른 semantic 색은 없다.**

## Typography

Linear Display (헤드라인) + Linear Text (본문) + Linear Mono. 프리 폴백: **Inter** (500/600/700). Mono 폴백: **JetBrains Mono** 또는 **Geist Mono**.

- Display-XL 80px/600/1.05/-3.0px
- Display-LG 56px/600/1.10/-1.8px
- Display-MD 40px/600/1.15/-1.0px
- Headline 28px/600/1.20/-0.6px
- Card-title 22px/500/1.25/-0.4px
- Body 16px/400/1.50/-0.05px
- Body-sm 14px, Caption 12px, Button 14px/500, Eyebrow 13px/500/**+0.4px**

원칙: Display에 공격적 네거티브 tracking. Body는 400. Eyebrow만 positive tracking으로 분류 표시.

## Layout & Spacing

- 4px base. 4/8/12/16/24/32/48/96.
- 카드 패딩 24px, 테스티모니얼 32px, CTA 배너 48px.
- 버튼 패딩 8/14, 인풋 8/12.
- 콘텐츠 max-width 1280px. 모바일 단일 열.

**공백 철학:** 다크 캔버스가 곧 여백이다. 섹션은 흰 gap이 아닌 서페이스-1 리프트로 나눈다.

## Elevation

| Level | 처리 | 용도 |
|---|---|---|
| 0 | shadow/border 없음 | 본문 |
| 1 | Surface-1 + 1px hairline | 카드 |
| 2 | Surface-2 + 1px hairline-strong | 강조 카드/hover |
| 3 | Surface-3 | 서브 nav, 드롭다운 |
| 4 | 2px primary-focus outline @50% | 포커스 |

그림자 없음. 라더 + 헤어라인이 깊이 담당.

## Shape (Radius)

- 4 xs, 6 sm, 8 md (버튼/인풋), 12 lg (카드), 16 xl (스크린샷 패널), 24 xxl (드묾), pill(토글/뱃지), full(아바타)

## Components

**Button-primary** — 라벤더 CTA (`#5e6ad2`, 텍스트 흰색, 8/14 패딩, md 라운드).
**Button-secondary** — Surface-1 배경, 헤어라인 보더.
**Feature-card / Pricing-card** — Surface-1, lg 라운드, 24 패딩.
**Featured card** — Surface-2로 리프트.
**Text-input** — Surface-1, md 라운드, 8/12. 포커스는 2px 라벤더 outline.
**Status-badge** — Surface-2, pill, 2/8, caption.
**Top-nav** — Canvas 배경, 56px height, body-sm.

## Do & Don't

**Do**
- Canvas #010102 그대로 유지 (미세 파랑 tint 의도적).
- 라벤더는 브랜드/CTA/포커스/링크 강조만.
- 4단 라더로 계층. 건너뛰지 말 것.
- Display 네거티브 tracking 공격적으로.
- 카드는 md/lg 라운드. Pill CTA 안 씀.

**Don't**
- 라이트 마케팅 페이지 배포 (하지만 이 프로젝트는 시스템 다크/라이트 대응).
- 라벤더를 배경/필로 씀.
- 2차 크로매틱 액센트 추가.
- 대기감 그라디언트/스포트라이트 카드.
- Pill CTA. #000 순수 검정 캔버스.

## Responsive

| Break | Width | 핵심 변화 |
|---|---|---|
| Desktop-XL | 1440 | 기본 |
| Desktop | 1280 | 3-up 유지 |
| Tablet | 1024 | 3-up → 2-up |
| Mobile-Lg | 768 | 아코디언, 햄버거 |
| Mobile | 480 | 단일 열, Display-XL 80→36 |

**터치 타겟:** CTA ≥40px, 폼 ≥44px, pill ≥36 (터치는 ≥44).

## Iteration Guide

1. 한 번에 하나의 컴포넌트만 손댄다.
2. 새 섹션이면 먼저 어느 서페이스 레벨인지 정한다.
3. Body 기본은 body/400.
4. 새 변형은 별도 컴포넌트 엔트리로.
5. 라벤더는 희소 자원처럼. 브랜드/CTA/포커스/링크 강조에만.

## 이 프로젝트에서의 응용 규칙

Linear는 데스크톱 마케팅 캔버스 위주. 이 프로젝트는 모바일 신고/통계 앱이므로 다음을 명시적으로 응용:

- **다크 기본 + 라이트 자동 대체.** 야외 낮 사용성을 위해 `prefers-color-scheme: light` 시 대체 팔레트 자동 활성화. 라이트 팔레트 초안:
  - canvas: `#fafafa` / surface-1: `#ffffff` / surface-2: `#f2f3f5`
  - hairline: `#e5e7eb` / ink: `#0d0e10` / ink-muted: `#4a4d55`
  - primary/success/error는 다크와 동일 유지.
- **강도 색상은 라벤더가 아니다.** intensity-1(#8a8f98 subtle), intensity-2(#e0a000 앰버), intensity-3(#e15353 붉은톤). 색만이 아닌 라벨/숫자 병기.
- **히트맵 셀** — 서페이스 라더를 강도에 매핑:
  - level-0: canvas (빈 셀)
  - level-1: surface-2 + 라벤더 텍스트
  - level-2: 앰버 tint (#4a3a0a 다크 / #fef3c7 라이트)
  - level-3: 붉은 tint (#4a1a1a 다크 / #fee2e2 라이트)
- **CTA "지금 냄새 남"** — button-primary 그대로 (라벤더). 강도 선택은 secondary → 선택된 것만 primary.
- **날짜 선택기** — top-nav 옆에 status-badge 스타일 (pill, caption). 오늘이 아니면 라벤더 tint로 강조.
- **지도 이미지 컨테이너** — product-screenshot-card 패턴 (Surface-1, rounded-xl 16px, hairline).
- **아파트 동 원형 히트 영역** — 기본은 hairline stroke, 선택 시 라벤더 fill @20% + hairline-strong. 신고 건수 뱃지는 status-badge 스타일.

## Known Gaps
- Linear 커스텀 폰트는 프리 라이선스 없음. **Inter**(500/600/700) 사용.
- 폼 에러 스타일 미명시 → 프로젝트 규칙: input 하단에 caption + `#e15353` 텍스트.
- Linear는 라이트 마케팅 없음 → 이 프로젝트는 위 응용 규칙대로 라이트 자동 대응.
