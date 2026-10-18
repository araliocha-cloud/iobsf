# IOBSF 연맹 홈페이지

국제아웃도어바비큐스포츠연맹(International Outdoor Barbecue Sports Federation) 공식 홈페이지다.
GitHub Pages로 운영한다. 빌드 과정이 없다. 저장소에 올리면 그대로 공개된다.

## 원칙

화면과 내용을 나눴다. 화면(HTML, CSS, JS)은 그릇이고, 내용은 모두 `data/` 폴더의 JSON 파일에 담긴다.
선수가 늘고, 대회가 열리고, 기록이 쌓여도 그릇은 바꾸지 않는다. JSON에 한 줄을 더하면 사이트에 반영된다.

## 언어

영어가 기본이다. 그 아래에 두 번째 언어를 병기한다. 방문자가 머리글에서 한국어, 일본어, 중국어 중 하나를 고른다.
모든 문장은 `{"en": "", "ko": "", "ja": "", "zh": ""}` 형식이다. 비어 있는 언어는 표시되지 않는다.

## 언어 체계 (확정)

| 이름 | 문장 |
|---|---|
| 모토 (Motto) | 너와 나, 그리고 우리 / You and I, and We |
| 경기정신 (Spirit of the Game) | 스포츠바비큐는 희생 위에 세운 승리가 아니라, 나눔 위에 세운 영광이다. |
| 프로바비큐어 신조 (Pro Barbecuer's Creed) | 스포츠바비큐의 승리는 누군가의 패배로 이룬 것이 아니라, 패자의 추대로 얻은 영광이다. |
| 슬로건 (Slogan) | DO NOT DO IF NOT FUN |

공식 용어: 프로바비큐어는 집전자(執典者, Officiant)다.

## 데이터 파일

| 파일 | 담는 것 |
|---|---|
| `data/site.json` | 연맹 정보, 언어 체계, 사명, 메뉴, 외부 연결 |
| `data/barbecuers.json` | 프로바비큐어 명단, 집전 선언, 기록, 명예 |
| `data/rankings.json` | 시즌 포인트 순위, 분배 4요소 명예 정의 |
| `data/events.json` | 대회, 8단계 의례, 결과, The Table(모든 참가팀의 이야기) |
| `data/nations.json` | 회원국과 회원 단체 |
| `data/heritage.json` | 각국 전통 바비큐 기록 |
| `data/history.json` | 연혁 |
| `data/pathway.json` | 프로바비큐어 육성 과정 |
| `data/chronicle.json` | 대회 서사와 영상 |
| `data/partners.json` | 파트너 등급과 후원사 |

각 파일 맨 위 `_schema`에 칸마다 무엇을 쓰는지 적어 두었다.
`"sample": true`가 붙은 항목은 예시다. 실제 데이터가 들어오면 지운다.

## 페이지

`index.html` 첫 화면, `fire.html` The Fire, `barbecuers.html` 명단, `barbecuer.html?id=` 개인 페이지,
`rankings.html` 순위, `events.html` 대회 목록, `event.html?id=` 대회 상세, `pathway.html` 육성 과정,
`heritage.html` 헤리티지와 연혁, `chronicle.html` 기록, `federation.html` 연맹, `partners.html` 파트너.

## 남은 일

- 연맹 엠블럼을 `assets/img/emblem.png`(투명 배경)로 넣는다.
- kooba.kr 연혁 2000~2024년을 `data/history.json`에 옮긴다.
- 분배 4요소 명예를 시즌 포인트에 반영할지 정한다. 지금은 별도 명예로 표시한다 (`honors_scored: false`).
- 추대 의례(참가팀 대표가 우승자에게 영광을 건넴)를 대회 규정으로 할지 정한다. `events.json`의 `acclaimed_by` 칸이 준비되어 있다.
- 전용 도메인(iobsf.org 등)을 연결한다.
