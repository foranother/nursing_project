import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import mitt from 'mitt'

// 이벤트 버스 생성
const emitter = mitt()

// Firebase 설정
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, addDoc, getDocs, query, where } from "firebase/firestore";

// Firebase 설정 정보
const firebaseConfig = {
  apiKey: "AIzaSyA_YTNdyRJbG0L7CZPJRZ0PfVJYjYtg3_s",
  authDomain: "nursing-project-851bf.firebaseapp.com",
  projectId: "nursing-project-851bf",
  storageBucket: "nursing-project-851bf.firebasestorage.app",
  messagingSenderId: "715554144996",
  appId: "1:715554144996:web:d446cfd57c060b282da2f1",
  measurementId: "G-50WSFRN6DK"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// 샘플 시나리오 생성
async function createSampleScenarios() {
  try {
    // 이미 샘플 시나리오가 있는지 확인
    const scenariosRef = collection(db, 'scenarios');
    const q = query(scenariosRef, where("isSample", "==", true));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      // 샘플 시나리오 1: 급성 심근경색
      await addDoc(scenariosRef, {
        title: "급성 심근경색 환자 간호",
        main_disease: "급성 심근경색",
        personal_info: {
          age: "65",
          gender: "남성",
          occupation: "회사원"
        },
        additional_info: {
          past_medical_history: "고혈압, 당뇨병",
          family_history: "부친이 심근경색으로 사망",
          allergies: "없음",
          major_symptoms: "가슴 통증, 호흡곤란, 발한"
        },
        content: `
# 급성 심근경색 환자 간호 시나리오

## 환자 정보
- 이름: 김철수 (가명)
- 나이: 65세
- 성별: 남성
- 직업: 회사원
- 과거력: 고혈압(10년), 당뇨병(5년)
- 가족력: 부친이 심근경색으로 사망
- 알레르기: 없음

## 주 증상
- 갑작스러운 가슴 통증 (압박감, 쥐어짜는 듯한 통증)
- 왼쪽 어깨와 턱으로 방사되는 통증
- 호흡곤란
- 과도한 발한
- 오심

## 현재 상태
- 의식: 명료
- 활력징후: BP 160/95 mmHg, HR 110 bpm, RR 24/min, SpO2 92%, BT 36.8°C
- ECG: ST 분절 상승
- 통증 점수: 8/10 (NRS)

## 간호 중재
1. 산소 공급 (비강 캐뉼라 4L/min)
2. 정맥 주사 경로 확보
3. 약물 투여:
   - 아스피린 300mg (씹어서 복용)
   - 니트로글리세린 설하 투여
   - 모르핀 2-4mg IV (통증 조절)
4. 지속적인 심전도 모니터링
5. 환자 안정 및 불안 감소 중재
6. 검사 준비:
   - 심장 효소 검사
   - 심장 초음파
   - 관상동맥 조영술

## 간호 평가
- 통증 감소 여부
- 활력징후 안정화
- 부정맥 발생 여부
- 합병증 발생 여부 (심부전, 쇼크)

## 환자 교육
- 약물 복용 방법 및 중요성
- 위험 요인 관리 (고혈압, 당뇨병)
- 생활 습관 개선 (금연, 식이 조절, 운동)
- 응급 상황 대처 방법
        `,
        patient_conversation: `
# 환자와의 대화

## 초기 평가
**간호사**: 안녕하세요, 김철수 님. 어떻게 지내세요? 어디가 불편하신가요?

**환자**: (얼굴을 찡그리며) 가슴이 너무 아파요. 마치 누군가가 가슴을 꽉 누르는 것 같아요. 숨쉬기도 힘들고...

**간호사**: 언제부터 통증이 시작되었나요?

**환자**: 약 30분 전에 갑자기 시작됐어요. 처음에는 소화불량인 줄 알았는데, 점점 심해져서...

**간호사**: 통증이 어디에서 시작되어 어디로 퍼지나요?

**환자**: 가슴 중앙에서 시작해서 왼쪽 어깨와 턱까지 퍼져요. 이런 통증은 처음이에요.

## 활력징후 측정 후
**간호사**: 혈압이 조금 높고 심박수도 빠르네요. 지금 산소와 심전도 모니터를 연결해 드릴게요.

**환자**: (불안한 표정으로) 심장에 문제가 있는 건가요? 제 아버지가 심장마비로 돌아가셨어요.

**간호사**: 지금 검사 중이니 정확한 진단을 위해 의사 선생님과 상담할 거예요. 가족력을 말씀해주셔서 감사합니다. 그 정보가 중요해요.

## 약물 투여 시
**간호사**: 이 약은 아스피린인데, 씹어서 드세요. 혈액 순환을 도와줄 거예요. 그리고 이 약은 니트로글리세린인데, 혀 밑에 넣으시면 통증 완화에 도움이 됩니다.

**환자**: (약을 복용한 후) 약을 먹으니 조금 나아지는 것 같아요. 하지만 여전히 아파요.

**간호사**: 통증이 얼마나 심한지 0부터 10까지 중에 말씀해 주실 수 있나요? 0은 통증 없음, 10은 상상할 수 있는 가장 심한 통증입니다.

**환자**: 음... 8정도요. 정말 견디기 힘들어요.

## 검사 준비 시
**간호사**: 지금 심장 효소 검사를 위해 혈액 검사를 할 거예요. 그리고 심장 초음파와 관상동맥 조영술도 준비하고 있어요.

**환자**: (걱정스러운 표정으로) 그게 다 뭔가요? 위험한가요?

**간호사**: 이 검사들은 심장의 상태를 정확히 파악하기 위한 중요한 검사들이에요. 관상동맥 조영술은 심장 혈관을 보는 검사인데, 의사 선생님이 자세히 설명해 드릴 거예요.

## 안정화 후
**간호사**: 약물 치료 후 통증이 어떠세요?

**환자**: 많이 나아졌어요. 아까보다 숨쉬기도 편해졌고요.

**간호사**: 다행이네요. 앞으로 몇 가지 생활 습관 변화가 필요할 수 있어요. 고혈압과 당뇨병 관리, 금연, 식이 조절, 규칙적인 운동이 중요해요.

**환자**: 네, 이제 건강에 더 신경 써야겠어요. 정말 무서웠거든요.

**간호사**: 이해해요. 저희가 계속 옆에서 도와드릴게요. 불편하시거나 궁금한 점 있으시면 언제든지 말씀해주세요.
        `,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        isSample: true,
        created_by: {
          id: "admin-user-id",
          username: "Admin",
          email: "admin@example.com",
          is_admin: true
        }
      });
      
      // 샘플 시나리오 2: 당뇨병성 케톤산증
      await addDoc(scenariosRef, {
        title: "당뇨병성 케톤산증 환자 간호",
        main_disease: "당뇨병성 케톤산증",
        personal_info: {
          age: "22",
          gender: "여성",
          occupation: "대학생"
        },
        additional_info: {
          past_medical_history: "제1형 당뇨병(10년)",
          family_history: "없음",
          allergies: "페니실린",
          major_symptoms: "구갈, 다뇨, 복통, 오심, 구토"
        },
        content: `
# 당뇨병성 케톤산증 환자 간호 시나리오

## 환자 정보
- 이름: 이지영 (가명)
- 나이: 22세
- 성별: 여성
- 직업: 대학생
- 과거력: 제1형 당뇨병(10년)
- 가족력: 없음
- 알레르기: 페니실린

## 주 증상
- 극심한 갈증과 구갈
- 다뇨
- 복통
- 오심, 구토
- 전신 쇠약감
- 의식 저하

## 현재 상태
- 의식: 기면 상태
- 활력징후: BP 100/60 mmHg, HR 120 bpm, RR 28/min, SpO2 95%, BT 37.2°C
- 검사 결과:
  - 혈당: 450 mg/dL
  - 동맥혈 가스 분석: pH 7.21, HCO3- 12 mEq/L
  - 소변 케톤: 강양성
  - 혈중 케톤: 양성
  - 혈중 나트륨: 132 mEq/L
  - 혈중 칼륨: 5.2 mEq/L

## 간호 중재
1. 정맥 주사 경로 확보 (2개 이상)
2. 수액 요법:
   - 0.9% 생리식염수 1L를 첫 1시간 동안 빠르게 주입
   - 이후 수액 속도 조절 (250-500 mL/hr)
3. 인슐린 요법:
   - 인슐린 0.1 unit/kg/hr 지속 정맥 주입
4. 전해질 교정:
   - 칼륨 보충 (필요시)
5. 지속적인 모니터링:
   - 활력징후
   - 혈당 (매시간)
   - 전해질 (4-6시간마다)
   - 동맥혈 가스 분석 (4-6시간마다)
   - 소변량
   - 의식 상태
6. 산-염기 균형 모니터링

## 간호 평가
- 혈당 정상화 (150-200 mg/dL)
- 케톤산증 교정 (pH > 7.3, HCO3- > 18 mEq/L)
- 의식 상태 개선
- 전해질 균형 회복
- 탈수 교정

## 환자 교육
- 인슐린 투여 방법 및 중요성
- 혈당 모니터링 방법
- 식이 관리
- 감염 예방
- 케톤산증 예방 및 조기 증상 인식
- 아픈 날 관리 지침
        `,
        patient_conversation: `
# 환자와의 대화

## 초기 평가 (의식이 약간 저하된 상태)
**간호사**: 이지영 씨, 저는 담당 간호사입니다. 지금 제 말이 들리시나요?

**환자**: (느리게 눈을 깜빡이며) 네... 들려요... 너무 목이 말라요... 물 좀 주세요...

**간호사**: 네, 곧 도와드릴게요. 지금 어떤 느낌이 드나요?

**환자**: (약한 목소리로) 너무 힘들어요... 배도 아프고... 계속 토했어요... 화장실도 자주 가고...

**간호사**: 언제부터 이런 증상이 있었나요?

**환자**: 이틀 전부터요... 감기 같아서 약만 먹었는데... 점점 심해졌어요... 인슐린도 제대로 못 맞았어요...

## 검사 결과 확인 후
**간호사**: 이지영 씨, 혈당이 많이 높고 케톤산증이 있어요. 지금 수액과 인슐린 치료를 시작할 거예요.

**환자**: (걱정스러운 표정으로) 심각한가요?

**간호사**: 상태가 좋지 않아 빠른 치료가 필요해요. 하지만 적절한 치료를 받으면 곧 좋아질 거예요.

## 치료 시작 시
**간호사**: 지금 정맥주사를 두 군데 놓을 거예요. 하나는 수액을 빠르게 공급하기 위한 것이고, 다른 하나는 인슐린을 지속적으로 주입하기 위한 거예요.

**환자**: (약간 움찔하며) 아파요...

**간호사**: 죄송해요, 곧 끝날 거예요. 이 치료가 몸의 수분을 보충하고 혈당을 내리는 데 도움이 될 거예요.

## 모니터링 중
**간호사**: 한 시간마다 혈당을 체크하고 있어요. 지금은 400으로 조금 내려갔어요. 어떻게 느껴지세요?

**환자**: (조금 더 또렷한 목소리로) 아직 목이 마르고 머리가 아프지만, 아까보다는 나아진 것 같아요.

**간호사**: 좋은 징후예요. 수액이 들어가면서 탈수 증상이 개선되고 있어요. 계속 상태를 지켜볼게요.

## 의식이 개선된 후
**간호사**: 이지영 씨, 의식이 많이 또렷해졌네요. 지금 기분이 어떠세요?

**환자**: 많이 나아졌어요. 근데 왜 이렇게 됐을까요? 평소에 당뇨 관리를 잘 하고 있었는데...

**간호사**: 감염이나 스트레스, 약물 복용 중단 등 여러 요인이 케톤산증을 유발할 수 있어요. 이번에는 감기 증상과 인슐린 투여 중단이 원인이 된 것 같아요.

## 회복기
**간호사**: 혈당이 180으로 내려왔고, 산-염기 균형도 많이 개선됐어요. 이제 경구 섭취를 시작해볼까요?

**환자**: 네, 조금 배고픈 것 같아요.

**간호사**: 앞으로 아플 때 당뇨 관리에 대해 이야기해 볼게요. 아플 때는 더 자주 혈당을 체크하고, 충분한 수분을 섭취하는 것이 중요해요. 그리고 케톤 검사도 해야 해요.

**환자**: 네, 이번 일을 통해 많이 배웠어요. 앞으로는 아플 때 더 주의할게요.

**간호사**: 그래요. 당뇨병 관리는 평소에도 중요하지만, 아플 때는 특히 더 신경 써야 해요. 퇴원 전에 '아픈 날 관리' 교육을 자세히 해드릴게요.
        `,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        isSample: true,
        created_by: {
          id: "admin-user-id",
          username: "Admin",
          email: "admin@example.com",
          is_admin: true
        }
      });
      
      console.log("샘플 시나리오가 성공적으로 생성되었습니다.");
    } else {
      console.log("샘플 시나리오가 이미 존재합니다.");
    }
  } catch (error) {
    console.error("샘플 시나리오 생성 중 오류 발생:", error);
  }
}

// 샘플 시나리오 생성 함수 호출
createSampleScenarios();

// Vue 앱 생성 및 마운트
const vueApp = createApp(App)

// mitt를 전역 속성으로 등록
vueApp.config.globalProperties.$mitt = emitter

vueApp.use(store).use(router).mount('#app') 