# 간호 시뮬레이션 시나리오 생성 플랫폼

이 프로젝트는 간호 시뮬레이션 시나리오를 생성, 수정 및 열람할 수 있는 웹 기반 플랫폼입니다.

## 주요 기능

- **로그인 및 사용자 관리**
  - 일반 사용자 및 관리자 계정 구분
  - 관리자 계정은 시나리오 생성 권한 보유

- **시나리오 생성**
  - 관리자 계정을 통해 시나리오 생성
  - 시나리오명, 주요 질병, 기본 인적 사항, 기타 사항 입력
  - 기본 인적 사항은 체크박스 형태로 선택 가능
  - GPT-3.5를 이용하여 시나리오 생성

- **시나리오 수정**
  - 챗봇 기능을 통해 GPT-3.5와 상호작용하며 시나리오 수정

- **시나리오 열람**
  - 생성된 시나리오는 모든 사용자가 열람 가능

## 기술 스택

- **프론트엔드**: Vue.js
- **백엔드**: Django
- **LLM**: GPT-3.5
- **데이터베이스**: Firebase

## 설치 및 실행 방법

### 프론트엔드 (Vue.js)

```bash
# 프론트엔드 디렉토리로 이동
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run serve
```

### 백엔드 (Django)

```bash
# 백엔드 디렉토리로 이동
cd backend

# 가상환경 생성 및 활성화
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 개발 서버 실행
python manage.py runserver
```

## 관리자 계정 정보

- **아이디**: admin
- **비밀번호**: password123! 