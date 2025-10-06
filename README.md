# 🐧 Penglobe Frontend

Penglobe 프로젝트의 React Native (Expo) 기반 모바일 애플리케이션입니다.

## ✨ 주요 기능

- **메인 탭**
  - **홈**: 주요 기능 접근 및 대시보드
  - **탄소 계산기**: 식단, 교통 등 활동의 탄소 배출량 계산
  - **랭킹**: 사용자별 탄소 절감량 랭킹 확인
  - **상점**: 포인트를 사용하여 아이템 구매
  - **마이페이지**: 내 정보, 포인트 내역, 설정

- **사용자 인증**: 이메일 회원가입 및 카카오 소셜 로그인
- **활동 기록**: 식단, 도보, 자전거, 대중교통 이용 기록 및 관리
- **포인트 시스템**: 활동에 따른 포인트 적립 및 사용 내역 조회
- **기타**: 설문조사, FAQ, 관리자 페이지 등

## 🛠️ 기술 스택

- **Framework**: React Native (Expo)
- **Language**: TypeScript
- **Routing**: Expo Router
- **Styling**: NativeWind, Tailwind CSS
- **State Management**: React Context / Hooks
- **Data Fetching**: Axios
- **UI Components**: React Native Calendars, React Native Chart Kit
- **Authentication**: Expo Auth Session
- **Storage**: Async Storage, Expo Secure Store

## 📂 프로젝트 구조

```
front
├── app/                # Expo Router 기반 라우팅
│   ├── (tabs)/         # 메인 탭 네비게이션
│   │   ├── home/
│   │   ├── calculator/
│   │   ├── ranking/
│   │   ├── store/
│   │   └── mypage/
│   ├── auth/           # 인증 관련 로직 (카카오)
│   └── pages/          # 기타 서브 페이지
│       ├── diet/
│       ├── transport/
│       └── ...
├── assets/             # 폰트, 이미지, 아이콘 등 정적 파일
├── components/         # 공통 UI 컴포넌트
├── constants/          # 색상, 폰트 등 공통 상수
├── hooks/              # 커스텀 훅
├── services/           # API 서비스 로직
└── utils/              # 유틸리티 함수
```

## 🚀 시작하기

1. **프로젝트 클론**
   ```bash
   git clone https://github.com/your-repo/penglobe.git
   cd penglobe/front
   ```

2. **의존성 설치**
   ```bash
   npm install
   # 또는
   yarn install
   ```

3. **Expo Go 앱 설치**
   - [Android (Play Store)](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - [iOS (App Store)](https://apps.apple.com/kr/app/expo-go/id982107779)

4. **개발 서버 실행**
   ```bash
   npm start
   ```

5. **앱 실행**
   - 개발 서버가 실행되면 터미널에 QR 코드가 나타납니다.
   - Expo Go 앱을 열고 QR 코드를 스캔하여 앱을 실행합니다.

## 📜 사용 가능한 스크립트

- `npm start`: Metro 번들러를 시작합니다. (Expo Go 앱으로 접속)
- `npm run android`: Android 기기/에뮬레이터에서 앱을 실행합니다.
- `npm run ios`: iOS 시뮬레이터/기기에서 앱을 실행합니다. (macOS 전용)
- `npm run web`: 웹 브라우저에서 앱을 실행합니다.
