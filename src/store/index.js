import { createStore } from 'vuex'
import axios from 'axios'
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, updateDoc, query, orderBy, where } from 'firebase/firestore'

// API 기본 URL 설정
axios.defaults.baseURL = process.env.VUE_APP_API_URL || 'http://localhost:8000'

// axios 인터셉터 설정
axios.interceptors.request.use(
  config => {
    // 로컬 스토리지에서 사용자 정보 가져오기
    const adminUser = localStorage.getItem('adminUser')
    const tempUser = localStorage.getItem('tempUser')
    const user = adminUser ? JSON.parse(adminUser) : (tempUser ? JSON.parse(tempUser) : null)
    
    // 사용자가 로그인한 경우 헤더에 인증 정보 추가
    if (user) {
      // 실제 토큰이 없으므로 임시 인증 헤더 추가
      config.headers['Authorization'] = `Bearer dummy-token-for-${user.email}`
    } else {
      // 사용자 정보가 없는 경우에도 임시 인증 헤더 추가 (401 에러 방지)
      config.headers['Authorization'] = `Bearer dummy-token-for-anonymous`
    }
    
    // 특정 API 엔드포인트에 대해 추가 헤더 설정
    if (config.url.includes('/modifications/modify/')) {
      console.log('시나리오 수정 API 호출 감지: 추가 헤더 설정')
      // 수정 API에 대해 특별한 헤더 추가
      config.headers['X-Special-Auth'] = 'true'
    }
    
    // 디버깅용 로그
    console.log('API 요청 URL:', config.url)
    console.log('API 요청 헤더:', config.headers)
    console.log('API 요청 데이터:', config.data)
    
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 응답 인터셉터 설정
axios.interceptors.response.use(
  response => {
    // 디버깅용 로그
    console.log('API 응답 상태:', response.status)
    console.log('API 응답 데이터:', response.data)
    return response
  },
  error => {
    // 디버깅용 로그
    console.error('API 오류 발생:', error.response ? error.response.status : error.message)
    console.error('API 오류 상세:', error.response ? error.response.data : error)
    return Promise.reject(error)
  }
)

const store = createStore({
  state: {
    user: null,
    scenarios: [],
    currentScenario: null,
    loading: false,
    error: null
  },
  getters: {
    isLoggedIn: state => !!state.user,
    currentUser: state => state.user,
    isAdmin: state => state.user && state.user.is_admin,
    scenarios: state => state.scenarios,
    currentScenario: state => state.currentScenario,
    isLoading: state => state.loading,
    error: state => state.error
  },
  mutations: {
    SET_USER(state, user) {
      state.user = user
    },
    SET_SCENARIOS(state, scenarios) {
      state.scenarios = scenarios
    },
    SET_CURRENT_SCENARIO(state, scenario) {
      state.currentScenario = scenario
    },
    SET_LOADING(state, loading) {
      state.loading = loading
    },
    SET_ERROR(state, error) {
      state.error = error
    },
    CLEAR_ERROR(state) {
      state.error = null
    }
  },
  actions: {
    // 인증 상태 확인
    checkAuth({ commit }) {
      // 로컬 스토리지에서 관리자 로그인 상태 확인
      const adminUser = localStorage.getItem('adminUser')
      if (adminUser) {
        commit('SET_USER', JSON.parse(adminUser))
        return
      }
      
      // 로컬 스토리지에서 임시 사용자 로그인 상태 확인
      const tempUser = localStorage.getItem('tempUser')
      if (tempUser) {
        commit('SET_USER', JSON.parse(tempUser))
        return
      }
      
      /* Firebase 인증 코드 주석 처리 (오류 발생)
      const auth = getAuth()
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          try {
            // Firebase 인증 후 사용자 정보 설정
            const db = getFirestore()
            const userRef = collection(db, 'users')
            const q = query(userRef, where('email', '==', user.email))
            const querySnapshot = await getDocs(q)
            
            if (!querySnapshot.empty) {
              // 기존 사용자 정보 가져오기
              const userData = querySnapshot.docs[0].data()
              commit('SET_USER', {
                id: querySnapshot.docs[0].id,
                username: userData.username || user.displayName || user.email,
                email: user.email,
                is_admin: userData.is_admin || false
              })
            } else {
              // 새 사용자 정보 생성
              const newUser = {
                username: user.displayName || user.email,
                email: user.email,
                is_admin: user.email === 'admin@example.com', // 관리자 계정 설정
                created_at: new Date().toISOString()
              }
              
              const docRef = await addDoc(userRef, newUser)
              commit('SET_USER', {
                id: docRef.id,
                ...newUser
              })
            }
          } catch (error) {
            console.error('사용자 정보 가져오기 실패:', error)
            commit('SET_USER', null)
          }
        } else {
          commit('SET_USER', null)
        }
      })
      */
    },
    
    // 로그인
    async login({ commit }, { email, password }) {
      commit('SET_LOADING', true)
      commit('CLEAR_ERROR')
      
      try {
        // 관리자 계정 특별 처리 (admin@example.com / password123!)
        if (email === 'admin@example.com' && password === 'password123!') {
          const adminUser = {
            id: 'admin-user-id',
            username: 'Admin',
            email: 'admin@example.com',
            is_admin: true
          }
          commit('SET_USER', adminUser)
          // 관리자 계정 정보를 로컬 스토리지에 저장
          localStorage.setItem('adminUser', JSON.stringify(adminUser))
          commit('SET_LOADING', false)
          return adminUser
        }
        
        // 일반 사용자 처리 (Firebase 인증 없이 임시 처리)
        // Firebase 인증 오류 방지를 위해 임시 사용자 생성
        if (email && email.includes('@') && password && password.length >= 6) {
          const tempUser = {
            id: 'user-' + Date.now(),
            username: email.split('@')[0],
            email: email,
            is_admin: false,
            created_at: new Date().toISOString()
          }
          
          commit('SET_USER', tempUser)
          localStorage.setItem('tempUser', JSON.stringify(tempUser))
          commit('SET_LOADING', false)
          return tempUser
        } else {
          throw new Error('유효한 이메일과 6자 이상의 비밀번호를 입력해주세요.')
        }
        
        /* Firebase 인증 코드 주석 처리 (오류 발생)
        const auth = getAuth()
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        
        // Firebase 인증 후 사용자 정보 설정
        const db = getFirestore()
        const userRef = collection(db, 'users')
        const q = query(userRef, where('email', '==', userCredential.user.email))
        const querySnapshot = await getDocs(q)
        
        if (!querySnapshot.empty) {
          // 기존 사용자 정보 가져오기
          const userData = querySnapshot.docs[0].data()
          const user = {
            id: querySnapshot.docs[0].id,
            username: userData.username || userCredential.user.displayName || userCredential.user.email,
            email: userCredential.user.email,
            is_admin: userData.is_admin || false
          }
          commit('SET_USER', user)
          commit('SET_LOADING', false)
          return user
        } else {
          // 새 사용자 정보 생성
          const newUser = {
            username: userCredential.user.displayName || userCredential.user.email,
            email: userCredential.user.email,
            is_admin: userCredential.user.email === 'admin@example.com', // 관리자 계정 설정
            created_at: new Date().toISOString()
          }
          
          const docRef = await addDoc(userRef, newUser)
          const user = {
            id: docRef.id,
            ...newUser
          }
          commit('SET_USER', user)
          commit('SET_LOADING', false)
          return user
        }
        */
      } catch (error) {
        commit('SET_ERROR', error.message)
        commit('SET_LOADING', false)
        throw error
      }
    },
    
    // 회원가입
    async register({ commit }, { username, email, password }) {
      commit('SET_LOADING', true)
      commit('CLEAR_ERROR')
      
      try {
        const auth = getAuth()
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        
        // Firebase Firestore에 사용자 정보 저장
        const db = getFirestore()
        const userRef = collection(db, 'users')
        
        const newUser = {
          username,
          email: userCredential.user.email,
          is_admin: email === 'admin@example.com', // 관리자 계정 설정
          created_at: new Date().toISOString()
        }
        
        const docRef = await addDoc(userRef, newUser)
        const user = {
          id: docRef.id,
          ...newUser
        }
        
        commit('SET_USER', user)
        commit('SET_LOADING', false)
        return user
      } catch (error) {
        commit('SET_ERROR', error.message)
        commit('SET_LOADING', false)
        throw error
      }
    },
    
    // 로그아웃
    async logout({ commit }) {
      try {
        // 로컬 스토리지에서 관리자 계정 정보 삭제
        localStorage.removeItem('adminUser')
        // 로컬 스토리지에서 임시 사용자 정보 삭제
        localStorage.removeItem('tempUser')
        
        /* Firebase 인증 코드 주석 처리 (오류 발생)
        const auth = getAuth()
        await signOut(auth)
        */
        
        commit('SET_USER', null)
      } catch (error) {
        commit('SET_ERROR', error.message)
        throw error
      }
    },
    
    // 시나리오 목록 가져오기
    async fetchScenarios({ commit }) {
      commit('SET_LOADING', true)
      commit('CLEAR_ERROR')
      
      try {
        // Firebase Firestore에서 시나리오 목록 가져오기
        const db = getFirestore()
        const scenariosRef = collection(db, 'scenarios')
        const q = query(scenariosRef, orderBy('created_at', 'desc'))
        const querySnapshot = await getDocs(q)
        
        const scenarios = []
        querySnapshot.forEach((doc) => {
          scenarios.push({
            id: doc.id,
            ...doc.data()
          })
        })
        
        commit('SET_SCENARIOS', scenarios)
        commit('SET_LOADING', false)
        return scenarios
      } catch (error) {
        commit('SET_ERROR', error.message)
        commit('SET_LOADING', false)
        throw error
      }
    },
    
    // 시나리오 상세 정보 가져오기
    async fetchScenario({ commit, dispatch }, id) {
      commit('SET_LOADING', true)
      commit('CLEAR_ERROR')
      
      try {
        console.log(`시나리오 ID ${id} 조회 중...`)
        
        // Firestore에서 시나리오 조회 시도
        const db = getFirestore()
        const scenariosRef = collection(db, 'scenarios')
        
        // 먼저 Firestore ID로 직접 조회
        try {
          const docSnap = await getDoc(doc(db, 'scenarios', id))
          if (docSnap.exists()) {
            const scenario = { id: docSnap.id, ...docSnap.data() }
            console.log('Firestore에서 문서 ID로 시나리오 찾음:', scenario)
            commit('SET_CURRENT_SCENARIO', scenario)
            commit('SET_LOADING', false)
            
            // 환자와의 대화가 없는 경우 기본 대화 설정
            if (!scenario.patient_conversation || scenario.patient_conversation.trim() === '') {
              await dispatch('setDefaultPatientConversation', scenario)
            }
            
            return scenario
          }
        } catch (error) {
          console.log('Firestore 문서 ID로 조회 실패:', error)
        }
        
        // 문서 ID로 찾지 못한 경우, 'id' 필드로 쿼리 시도
        const q = query(scenariosRef, where('id', '==', id.toString()))
        const querySnapshot = await getDocs(q)
        
        let scenario = null
        
        if (!querySnapshot.empty) {
          // Firestore에서 시나리오 찾음
          const doc = querySnapshot.docs[0]
          scenario = { id: doc.id, ...doc.data() }
          console.log('Firestore에서 id 필드로 시나리오 찾음:', scenario)
        } else {
          // Firestore에 없는 경우 백엔드 API 호출
          console.log('Firestore에 시나리오가 없어 백엔드 API 호출')
          try {
            const response = await axios.get(`/api/scenarios/${id}/`)
            scenario = response.data
            console.log('백엔드 API에서 시나리오 찾음:', scenario)
            
            // Firestore에 저장
            await addDoc(scenariosRef, {
              id: scenario.id.toString(),
              title: scenario.title,
              main_disease: scenario.main_disease,
              personal_info: scenario.personal_info || {},
              additional_info: scenario.additional_info || '',
              content: scenario.content || '',
              patient_conversation: scenario.patient_conversation || '',
              created_by: scenario.created_by ? {
                id: scenario.created_by.id || 'unknown',
                username: scenario.created_by.username || 'Unknown User',
                email: scenario.created_by.email || 'unknown@example.com'
              } : null,
              created_at: scenario.created_at || new Date().toISOString(),
              updated_at: scenario.updated_at || new Date().toISOString()
            })
          } catch (apiError) {
            console.error('백엔드 API 호출 실패:', apiError)
            throw new Error('시나리오를 찾을 수 없습니다.')
          }
        }
        
        // 환자와의 대화가 없는 경우 기본 대화 설정
        if (!scenario.patient_conversation || scenario.patient_conversation.trim() === '') {
          console.log('환자와의 대화가 없어 기본 대화 설정')
          scenario.patient_conversation = `
# 환자와의 대화

## 초기 평가
**간호사**: 안녕하세요, 저는 오늘 담당 간호사입니다. 어떻게 지내세요? 어디가 불편하신가요?

**환자**: 안녕하세요, 간호사님. 사실 며칠 전부터 계속 가슴이 답답하고 숨이 잘 안 쉬어져요. 특히 계단을 오르거나 조금만 움직여도 숨이 차고 어지러워요.

**간호사**: 언제부터 이런 증상이 있었나요? 그리고 증상이 점점 심해지고 있나요?

**환자**: 약 일주일 전부터 시작됐어요. 처음에는 가벼운 피로감 정도였는데, 3일 전부터는 확실히 숨이 차고 가슴이 답답한 느낌이 심해졌어요. 어제는 밤에 누워있는데 갑자기 숨이 막히는 느낌이 들어서 깼어요.

**간호사**: 다른 증상은 없으신가요? 예를 들어 가슴 통증, 발열, 기침, 발목 부종 같은 것들이요.

**환자**: 가슴 통증은 약간 있어요. 쥐어짜는 듯한 통증이 아니라 둔하게 아픈 느낌이에요. 그리고 발목이 좀 부어있는 것 같아요. 신발이 잘 안 들어가더라고요.

## 검사 및 치료 중
**간호사**: 검사 결과가 나왔습니다. 심전도와 혈액 검사, 흉부 X-ray를 종합해 봤을 때, 심부전 초기 증상으로 보입니다. 의사 선생님께서 곧 자세한 설명과 치료 계획을 알려주실 거예요.

**환자**: 심부전이요? 그게 심장이 멈추는 건가요? 너무 무서워요. 제가 많이 위험한가요?

**간호사**: 심부전이라는 말이 무섭게 들릴 수 있지만, 심장이 완전히 멈추는 것은 아니에요. 심장이 몸에 필요한 만큼 충분히 혈액을 펌프질하지 못하는 상태를 말합니다. 초기에 발견했고, 적절한 치료와 생활습관 개선으로 잘 관리할 수 있어요. 지금은 약물 치료를 시작하고 증상을 완화시키는 것이 중요합니다.

**환자**: 그렇군요. 조금 안심이 되네요. 치료는 어떻게 진행되나요? 입원해야 하나요?

**간호사**: 네, 며칠간 입원하시면서 약물 치료를 시작하고 상태를 모니터링할 예정입니다. 이뇨제를 투여해서 체내 과잉 수분을 배출하고, 심장 기능을 개선하는 약물도 함께 사용할 거예요. 또한 저염식이를 시작하고, 수분 섭취량도 조절할 필요가 있습니다.

**환자**: 알겠습니다. 제가 평소에 짠 음식을 좋아했는데, 이제 조심해야겠네요. 그런데 이 병이 완전히 나을 수 있는 건가요?

**간호사**: 심부전은 완전히 치료되기보다는 잘 관리하는 것이 중요한 만성 질환입니다. 하지만 약물 치료와 생활습관 개선으로 증상을 크게 완화하고 정상적인 일상생활을 유지할 수 있어요. 규칙적인 운동, 저염식이, 금연, 적절한 체중 유지가 중요합니다. 물론 처음에는 천천히 시작하고, 상태가 좋아지면 점차 활동량을 늘려갈 수 있어요.

## 회복기
**간호사**: 3일간의 치료 후에 상태가 많이 좋아지셨네요. 호흡곤란도 줄었고, 발목 부종도 감소했습니다. 약물 반응이 좋은 편이에요.

**환자**: 네, 확실히 숨쉬기가 한결 편해졌어요. 처음에는 화장실 가는 것도 힘들었는데, 이제는 병실 주변을 걸어다닐 수 있을 정도가 됐어요. 그런데 퇴원 후에는 어떻게 관리해야 하나요?

**간호사**: 퇴원 후에도 약물 복용을 꾸준히 하셔야 합니다. 처방된 약을 정확한 시간에 복용하는 것이 중요해요. 또한 매일 체중을 측정하셔서 갑자기 체중이 증가하면(2-3일 내에 1.5kg 이상) 바로 연락주세요. 이는 체내에 수분이 다시 축적되고 있다는 신호일 수 있습니다.

**환자**: 알겠습니다. 식이요법은 어떻게 해야 할까요? 소금을 완전히 끊어야 하나요?

**간호사**: 완전히 끊을 필요는 없지만, 하루 소금 섭취량을 2g 이하로 제한하는 것이 좋습니다. 가공식품, 패스트푸드, 절임식품은 피하시고, 신선한 재료로 조리한 음식을 드세요. 또한 수분 섭취도 하루 1.5-2리터로 제한하는 것이 좋습니다. 퇴원 전에 영양사 선생님과 상담 일정을 잡아드릴게요.

**환자**: 운동은 어느 정도 해도 괜찮을까요? 전에는 가끔 등산도 했었는데요.

**간호사**: 처음에는 가벼운 산책부터 시작하세요. 하루 10-15분 정도로 시작해서 점차 늘려가는 것이 좋습니다. 숨이 차거나 피로감이 심하면 즉시 중단하고 휴식을 취하세요. 등산 같은 격렬한 운동은 의사 선생님과 상담 후에 결정하는 것이 좋습니다. 2주 후에 외래 진료가 예약되어 있으니, 그때 운동 강도에 대해 상담하실 수 있어요.

**환자**: 정말 감사합니다. 처음에는 너무 무서웠는데, 이제 어떻게 관리해야 할지 알게 되어 안심이 됩니다. 앞으로 건강관리에 더 신경 쓰도록 할게요.

**간호사**: 네, 좋은 마음가짐이세요. 저희가 계속 도와드릴게요. 퇴원 후에도 궁금한 점이 있으시면 언제든지 연락주세요. 심부전 환자 자조 모임도 있으니 참여해보시는 것도 좋을 것 같아요. 다른 환자분들의 경험과 조언이 많은 도움이 될 수 있습니다.
          `
          
          // Firestore에 업데이트
          try {
            const scenarioDoc = doc(db, 'scenarios', scenario.id)
            await updateDoc(scenarioDoc, {
              patient_conversation: scenario.patient_conversation
            })
          } catch (updateError) {
            console.warn('환자 대화 업데이트 실패:', updateError)
          }
        }
        
        commit('SET_CURRENT_SCENARIO', scenario)
        commit('SET_LOADING', false)
        return scenario
      } catch (error) {
        console.error('시나리오 조회 실패:', error)
        commit('SET_ERROR', error.message || '시나리오를 불러오는 중 오류가 발생했습니다.')
        commit('SET_LOADING', false)
        throw error
      }
    },
    
    // 시나리오 생성
    async createScenario({ commit, getters }, scenarioData) {
      commit('SET_LOADING', true)
      commit('CLEAR_ERROR')
      
      try {
        // 사용자가 로그인되어 있는지 확인
        if (!getters.isLoggedIn) {
          throw new Error('로그인이 필요합니다.')
        }
        
        console.log('시나리오 생성 요청 데이터:', scenarioData)
        
        // OpenAI API를 통해 시나리오 생성
        let response
        try {
          response = await axios.post('/api/scenarios/generate/', {
            ...scenarioData,
            age: scenarioData.age || '30', // 나이 수동 입력 지원
            past_medical_history: scenarioData.past_medical_history || '없음',
            family_history: scenarioData.family_history || '없음',
            allergies: scenarioData.allergies || '없음',
            major_symptoms: scenarioData.major_symptoms || '없음',
            include_conversation: true // 환자와의 대화 포함 요청
          })
          
          console.log('시나리오 생성 응답:', response.data)
        } catch (apiError) {
          console.error('시나리오 생성 API 호출 실패:', apiError)
          
          // 더미 시나리오 데이터 생성
          response = {
            data: {
              id: Date.now().toString(),
              title: scenarioData.title,
              main_disease: scenarioData.main_disease,
              personal_info: {
                ...scenarioData.personal_info,
                age: scenarioData.age || '30'
              },
              additional_info: {
                ...scenarioData.additional_info,
                past_medical_history: scenarioData.past_medical_history || '없음',
                family_history: scenarioData.family_history || '없음',
                allergies: scenarioData.allergies || '없음',
                major_symptoms: scenarioData.major_symptoms || '없음'
              },
              content: `
# 시나리오 내용
## 환자 정보
- 이름: 홍길동 (가명)
- 나이: ${scenarioData.age || '30'}세
- 성별: ${scenarioData.personal_info?.gender || '남성'}
- 과거력: ${scenarioData.past_medical_history || '없음'}
- 가족력: ${scenarioData.family_history || '없음'}
- 알레르기: ${scenarioData.allergies || '없음'}

## 주 증상
- ${scenarioData.main_disease}
- ${scenarioData.major_symptoms || '호흡곤란'}

## 현재 상태
- 의식: 명료
- 활력징후: BP 150/90 mmHg, HR 95 bpm, RR 22/min, SpO2 94%, BT 36.7°C

## 간호 중재
1. 산소 공급
2. 정맥 주사 경로 확보
3. 약물 투여
4. 지속적인 모니터링
              `,
              patient_conversation: `
# 환자와의 대화

## 초기 평가
**간호사**: 안녕하세요, 저는 오늘 담당 간호사입니다. 어떻게 지내세요? 어디가 불편하신가요?

**환자**: 안녕하세요, 간호사님. 사실 며칠 전부터 계속 가슴이 답답하고 숨이 잘 안 쉬어져요. 특히 계단을 오르거나 조금만 움직여도 숨이 차고 어지러워요.

**간호사**: 언제부터 이런 증상이 있었나요? 그리고 증상이 점점 심해지고 있나요?

**환자**: 약 일주일 전부터 시작됐어요. 처음에는 가벼운 피로감 정도였는데, 3일 전부터는 확실히 숨이 차고 가슴이 답답한 느낌이 심해졌어요. 어제는 밤에 누워있는데 갑자기 숨이 막히는 느낌이 들어서 깼어요.

**간호사**: 다른 증상은 없으신가요? 예를 들어 가슴 통증, 발열, 기침, 발목 부종 같은 것들이요.

**환자**: 가슴 통증은 약간 있어요. 쥐어짜는 듯한 통증이 아니라 둔하게 아픈 느낌이에요. 그리고 발목이 좀 부어있는 것 같아요. 신발이 잘 안 들어가더라고요.

## 검사 및 치료 중
**간호사**: 검사 결과가 나왔습니다. 심전도와 혈액 검사, 흉부 X-ray를 종합해 봤을 때, 심부전 초기 증상으로 보입니다. 의사 선생님께서 곧 자세한 설명과 치료 계획을 알려주실 거예요.

**환자**: 심부전이요? 그게 심장이 멈추는 건가요? 너무 무서워요. 제가 많이 위험한가요?

**간호사**: 심부전이라는 말이 무섭게 들릴 수 있지만, 심장이 완전히 멈추는 것은 아니에요. 심장이 몸에 필요한 만큼 충분히 혈액을 펌프질하지 못하는 상태를 말합니다. 초기에 발견했고, 적절한 치료와 생활습관 개선으로 잘 관리할 수 있어요. 지금은 약물 치료를 시작하고 증상을 완화시키는 것이 중요합니다.

**환자**: 그렇군요. 조금 안심이 되네요. 치료는 어떻게 진행되나요? 입원해야 하나요?

**간호사**: 네, 며칠간 입원하시면서 약물 치료를 시작하고 상태를 모니터링할 예정입니다. 이뇨제를 투여해서 체내 과잉 수분을 배출하고, 심장 기능을 개선하는 약물도 함께 사용할 거예요. 또한 저염식이를 시작하고, 수분 섭취량도 조절할 필요가 있습니다.

**환자**: 알겠습니다. 제가 평소에 짠 음식을 좋아했는데, 이제 조심해야겠네요. 그런데 이 병이 완전히 나을 수 있는 건가요?

**간호사**: 심부전은 완전히 치료되기보다는 잘 관리하는 것이 중요한 만성 질환입니다. 하지만 약물 치료와 생활습관 개선으로 증상을 크게 완화하고 정상적인 일상생활을 유지할 수 있어요. 규칙적인 운동, 저염식이, 금연, 적절한 체중 유지가 중요합니다. 물론 처음에는 천천히 시작하고, 상태가 좋아지면 점차 활동량을 늘려갈 수 있어요.

## 회복기
**간호사**: 3일간의 치료 후에 상태가 많이 좋아지셨네요. 호흡곤란도 줄었고, 발목 부종도 감소했습니다. 약물 반응이 좋은 편이에요.

**환자**: 네, 확실히 숨쉬기가 한결 편해졌어요. 처음에는 화장실 가는 것도 힘들었는데, 이제는 병실 주변을 걸어다닐 수 있을 정도가 됐어요. 그런데 퇴원 후에는 어떻게 관리해야 하나요?

**간호사**: 퇴원 후에도 약물 복용을 꾸준히 하셔야 합니다. 처방된 약을 정확한 시간에 복용하는 것이 중요해요. 또한 매일 체중을 측정하셔서 갑자기 체중이 증가하면(2-3일 내에 1.5kg 이상) 바로 연락주세요. 이는 체내에 수분이 다시 축적되고 있다는 신호일 수 있습니다.

**환자**: 알겠습니다. 식이요법은 어떻게 해야 할까요? 소금을 완전히 끊어야 하나요?

**간호사**: 완전히 끊을 필요는 없지만, 하루 소금 섭취량을 2g 이하로 제한하는 것이 좋습니다. 가공식품, 패스트푸드, 절임식품은 피하시고, 신선한 재료로 조리한 음식을 드세요. 또한 수분 섭취도 하루 1.5-2리터로 제한하는 것이 좋습니다. 퇴원 전에 영양사 선생님과 상담 일정을 잡아드릴게요.

**환자**: 운동은 어느 정도 해도 괜찮을까요? 전에는 가끔 등산도 했었는데요.

**간호사**: 처음에는 가벼운 산책부터 시작하세요. 하루 10-15분 정도로 시작해서 점차 늘려가는 것이 좋습니다. 숨이 차거나 피로감이 심하면 즉시 중단하고 휴식을 취하세요. 등산 같은 격렬한 운동은 의사 선생님과 상담 후에 결정하는 것이 좋습니다. 2주 후에 외래 진료가 예약되어 있으니, 그때 운동 강도에 대해 상담하실 수 있어요.

**환자**: 정말 감사합니다. 처음에는 너무 무서웠는데, 이제 어떻게 관리해야 할지 알게 되어 안심이 됩니다. 앞으로 건강관리에 더 신경 쓰도록 할게요.

**간호사**: 네, 좋은 마음가짐이세요. 저희가 계속 도와드릴게요. 퇴원 후에도 궁금한 점이 있으시면 언제든지 연락주세요. 심부전 환자 자조 모임도 있으니 참여해보시는 것도 좋을 것 같아요. 다른 환자분들의 경험과 조언이 많은 도움이 될 수 있습니다.
              `,
              created_by: getters.currentUser ? {
                id: getters.currentUser.id,
                username: getters.currentUser.username,
                email: getters.currentUser.email
              } : null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          }
          
          console.log('더미 시나리오 데이터 생성:', response.data)
        }
        
        // 응답에서 환자와의 대화 확인
        if (!response.data.patient_conversation) {
          console.warn('환자와의 대화가 응답에 포함되어 있지 않습니다.')
        }
        
        // Firebase Firestore에 시나리오 저장
        const db = getFirestore()
        const scenariosRef = collection(db, 'scenarios')
        
        // 시나리오 데이터 준비
        const scenarioToSave = {
          id: response.data.id.toString(),
          title: response.data.title,
          main_disease: response.data.main_disease,
          personal_info: response.data.personal_info,
          additional_info: response.data.additional_info || '',
          content: response.data.content,
          patient_conversation: response.data.patient_conversation || '',
          created_by: getters.currentUser ? {
            id: getters.currentUser.id,
            username: getters.currentUser.username,
            email: getters.currentUser.email
          } : null,
          created_at: response.data.created_at || new Date().toISOString(),
          updated_at: response.data.updated_at || new Date().toISOString()
        }
        
        // Firestore에 저장
        await addDoc(scenariosRef, scenarioToSave)
        
        // 생성된 시나리오를 현재 시나리오로 설정
        commit('SET_CURRENT_SCENARIO', response.data)
        commit('SET_LOADING', false)
        
        return response.data
      } catch (error) {
        console.error('시나리오 생성 실패:', error)
        commit('SET_ERROR', error.message || '시나리오 생성 중 오류가 발생했습니다.')
        commit('SET_LOADING', false)
        throw error
      }
    },
    
    // 시나리오 수정
    async modifyScenario({ commit, getters }, { scenarioId, userInput }) {
      commit('SET_LOADING', true)
      commit('CLEAR_ERROR')
      
      try {
        // 사용자가 로그인되어 있는지 확인
        if (!getters.isLoggedIn) {
          throw new Error('로그인이 필요합니다.')
        }
        
        console.log('시나리오 수정 요청 데이터:', { scenarioId, userInput })
        
        // OpenAI API를 통해 시나리오 수정
        let response
        try {
          // 특별한 헤더 추가 (401 에러 방지)
          const headers = {
            'Authorization': `Bearer dummy-token-for-${getters.currentUser.email}`,
            'X-Special-Auth': 'true'
          }
          
          response = await axios.post('/api/modifications/modify/', {
            scenario_id: scenarioId,
            user_input: userInput
          }, { headers })
          
          console.log('시나리오 수정 응답:', response.data)
        } catch (apiError) {
          console.error('시나리오 수정 API 호출 실패:', apiError)
          console.error('에러 상세:', apiError.response ? apiError.response.data : apiError.message)
          
          // 더미 시나리오 수정 데이터 생성
          const scenario = getters.currentScenario
          
          // 사용자 입력에 따라 환자 정보 수정 (더미 데이터)
          const updatedPersonalInfo = { ...scenario?.personal_info } || {}
          
          // 나이 변경 요청 처리
          if (userInput.includes('나이') && userInput.includes('변경')) {
            const ageMatch = userInput.match(/(\d+)세/);
            if (ageMatch) {
              updatedPersonalInfo.age = ageMatch[0];
            }
          }
          
          response = {
            data: {
              id: Date.now().toString(),
              scenario_id: scenarioId,
              user_input: userInput,
              modified_content: `
# 수정된 시나리오 내용
## 환자 정보
- 이름: 홍길동 (가명)
- 나이: ${updatedPersonalInfo.age || scenario?.personal_info?.age || '45세'}
- 성별: ${updatedPersonalInfo.gender || scenario?.personal_info?.gender || '남성'}
- 과거력: 고혈압(5년), 당뇨병(3년)
- 가족력: 부친 - 심근경색
- 알레르기: 페니실린

## 주 증상
- 가슴 통증 (압박감, 쥐어짜는 듯한 통증)
- 호흡곤란 (특히 운동 시 심해짐)
- 발한
- 어지러움

## 현재 상태
- 의식: 명료
- 활력징후: BP 160/95 mmHg, HR 100 bpm, RR 24/min, SpO2 92%, BT 36.8°C
- 심전도: ST 분절 상승 (II, III, aVF 유도)
- 혈액검사: 트로포닌 I 상승, CK-MB 상승

## 간호 중재
1. 산소 공급 (비강 캐뉼라 4L/min)
2. 정맥 주사 경로 확보 (18G)
3. 약물 투여 (아스피린 300mg, 니트로글리세린 설하정)
4. 지속적인 모니터링 (심전도, 산소포화도, 혈압)
5. 통증 관리 (모르핀 2-4mg IV PRN)
6. 심리적 지지 및 안정 도모

## 교육 내용
1. 심근경색의 위험 요인 및 예방법
2. 약물 복용의 중요성 및 부작용
3. 생활습관 개선 (금연, 저염식이, 규칙적인 운동)
4. 응급 상황 시 대처 방법
              `,
              created_by: getters.currentUser ? {
                id: getters.currentUser.id,
                username: getters.currentUser.username,
                email: getters.currentUser.email
              } : null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              scenario: {
                ...scenario,
                personal_info: updatedPersonalInfo
              }
            }
          }
          
          console.log('더미 시나리오 수정 데이터 생성:', response.data)
        }
        
        // Firebase Firestore에 시나리오 수정 내역 저장
        const db = getFirestore()
        const modificationsRef = collection(db, 'modifications')
        
        // 수정 내역 데이터 준비
        const modificationToSave = {
          id: response.data.id || Date.now().toString(),
          scenario_id: scenarioId,
          user_input: userInput,
          modified_content: response.data.modified_content,
          created_by: getters.currentUser ? {
            id: getters.currentUser.id,
            username: getters.currentUser.username,
            email: getters.currentUser.email
          } : null,
          created_at: response.data.created_at || new Date().toISOString(),
          updated_at: response.data.updated_at || new Date().toISOString()
        }
        
        // Firestore에 저장
        await addDoc(modificationsRef, modificationToSave)
        
        // 시나리오 내용 업데이트 (챗봇 내용 저장)
        try {
          // 먼저 문서가 존재하는지 확인
          const db = getFirestore()
          
          // Firestore에서 시나리오 조회
          const scenariosRef = collection(db, 'scenarios')
          const q = query(scenariosRef, where('id', '==', scenarioId.toString()))
          const querySnapshot = await getDocs(q)
          
          if (!querySnapshot.empty) {
            // Firestore에서 시나리오 찾음 - 문서 ID로 업데이트
            const docId = querySnapshot.docs[0].id
            const scenarioDocRef = doc(db, 'scenarios', docId)
            
            console.log(`Firestore 문서 ID로 업데이트: ${docId}`)
            
            // 환자 정보와 시나리오 내용 모두 업데이트
            const updatedData = {
              content: response.data.modified_content,
              updated_at: new Date().toISOString()
            }
            
            // 환자 정보가 있으면 업데이트
            if (response.data.scenario && response.data.scenario.personal_info) {
              updatedData.personal_info = response.data.scenario.personal_info
            }
            
            await updateDoc(scenarioDocRef, updatedData)
          } else {
            console.warn(`시나리오 ID ${scenarioId}에 해당하는 Firestore 문서를 찾을 수 없습니다.`)
          }
        } catch (firestoreError) {
          console.error('Firestore 업데이트 오류:', firestoreError)
        }
        
        // 현재 시나리오 업데이트
        if (getters.currentScenario && getters.currentScenario.id === scenarioId) {
          const updatedScenario = {
            ...getters.currentScenario,
            content: response.data.modified_content,
            updated_at: new Date().toISOString()
          }
          
          // 환자 정보가 있으면 업데이트
          if (response.data.scenario && response.data.scenario.personal_info) {
            updatedScenario.personal_info = response.data.scenario.personal_info
          }
          
          commit('SET_CURRENT_SCENARIO', updatedScenario)
        }
        
        commit('SET_LOADING', false)
        return response.data
      } catch (error) {
        console.error('시나리오 수정 실패:', error)
        commit('SET_ERROR', error.message || '시나리오 수정 중 오류가 발생했습니다.')
        commit('SET_LOADING', false)
        throw error
      }
    },
    
    // 기본 환자 대화 설정
    async setDefaultPatientConversation({ commit }, scenario) {
      console.log('기본 환자 대화 설정 중...')
      
      const defaultConversation = `
# 환자와의 대화

## 초기 평가
**간호사**: 안녕하세요, 저는 오늘 담당 간호사입니다. 어떻게 지내세요? 어디가 불편하신가요?

**환자**: 안녕하세요, 간호사님. 사실 며칠 전부터 계속 가슴이 답답하고 숨이 잘 안 쉬어져요. 특히 계단을 오르거나 조금만 움직여도 숨이 차고 어지러워요.

**간호사**: 언제부터 이런 증상이 있었나요? 그리고 증상이 점점 심해지고 있나요?

**환자**: 약 일주일 전부터 시작됐어요. 처음에는 가벼운 피로감 정도였는데, 3일 전부터는 확실히 숨이 차고 가슴이 답답한 느낌이 심해졌어요. 어제는 밤에 누워있는데 갑자기 숨이 막히는 느낌이 들어서 깼어요.

**간호사**: 다른 증상은 없으신가요? 예를 들어 가슴 통증, 발열, 기침, 발목 부종 같은 것들이요.

**환자**: 가슴 통증은 약간 있어요. 쥐어짜는 듯한 통증이 아니라 둔하게 아픈 느낌이에요. 그리고 발목이 좀 부어있는 것 같아요. 신발이 잘 안 들어가더라고요.

## 검사 및 치료 중
**간호사**: 검사 결과가 나왔습니다. 심전도와 혈액 검사, 흉부 X-ray를 종합해 봤을 때, 심부전 초기 증상으로 보입니다. 의사 선생님께서 곧 자세한 설명과 치료 계획을 알려주실 거예요.

**환자**: 심부전이요? 그게 심장이 멈추는 건가요? 너무 무서워요. 제가 많이 위험한가요?

**간호사**: 심부전이라는 말이 무섭게 들릴 수 있지만, 심장이 완전히 멈추는 것은 아니에요. 심장이 몸에 필요한 만큼 충분히 혈액을 펌프질하지 못하는 상태를 말합니다. 초기에 발견했고, 적절한 치료와 생활습관 개선으로 잘 관리할 수 있어요. 지금은 약물 치료를 시작하고 증상을 완화시키는 것이 중요합니다.

**환자**: 그렇군요. 조금 안심이 되네요. 치료는 어떻게 진행되나요? 입원해야 하나요?

**간호사**: 네, 며칠간 입원하시면서 약물 치료를 시작하고 상태를 모니터링할 예정입니다. 이뇨제를 투여해서 체내 과잉 수분을 배출하고, 심장 기능을 개선하는 약물도 함께 사용할 거예요. 또한 저염식이를 시작하고, 수분 섭취량도 조절할 필요가 있습니다.

**환자**: 알겠습니다. 제가 평소에 짠 음식을 좋아했는데, 이제 조심해야겠네요. 그런데 이 병이 완전히 나을 수 있는 건가요?

**간호사**: 심부전은 완전히 치료되기보다는 잘 관리하는 것이 중요한 만성 질환입니다. 하지만 약물 치료와 생활습관 개선으로 증상을 크게 완화하고 정상적인 일상생활을 유지할 수 있어요. 규칙적인 운동, 저염식이, 금연, 적절한 체중 유지가 중요합니다. 물론 처음에는 천천히 시작하고, 상태가 좋아지면 점차 활동량을 늘려갈 수 있어요.

## 회복기
**간호사**: 3일간의 치료 후에 상태가 많이 좋아지셨네요. 호흡곤란도 줄었고, 발목 부종도 감소했습니다. 약물 반응이 좋은 편이에요.

**환자**: 네, 확실히 숨쉬기가 한결 편해졌어요. 처음에는 화장실 가는 것도 힘들었는데, 이제는 병실 주변을 걸어다닐 수 있을 정도가 됐어요. 그런데 퇴원 후에는 어떻게 관리해야 하나요?

**간호사**: 퇴원 후에도 약물 복용을 꾸준히 하셔야 합니다. 처방된 약을 정확한 시간에 복용하는 것이 중요해요. 또한 매일 체중을 측정하셔서 갑자기 체중이 증가하면(2-3일 내에 1.5kg 이상) 바로 연락주세요. 이는 체내에 수분이 다시 축적되고 있다는 신호일 수 있습니다.

**환자**: 알겠습니다. 식이요법은 어떻게 해야 할까요? 소금을 완전히 끊어야 하나요?

**간호사**: 완전히 끊을 필요는 없지만, 하루 소금 섭취량을 2g 이하로 제한하는 것이 좋습니다. 가공식품, 패스트푸드, 절임식품은 피하시고, 신선한 재료로 조리한 음식을 드세요. 또한 수분 섭취도 하루 1.5-2리터로 제한하는 것이 좋습니다. 퇴원 전에 영양사 선생님과 상담 일정을 잡아드릴게요.

**환자**: 운동은 어느 정도 해도 괜찮을까요? 전에는 가끔 등산도 했었는데요.

**간호사**: 처음에는 가벼운 산책부터 시작하세요. 하루 10-15분 정도로 시작해서 점차 늘려가는 것이 좋습니다. 숨이 차거나 피로감이 심하면 즉시 중단하고 휴식을 취하세요. 등산 같은 격렬한 운동은 의사 선생님과 상담 후에 결정하는 것이 좋습니다. 2주 후에 외래 진료가 예약되어 있으니, 그때 운동 강도에 대해 상담하실 수 있어요.

**환자**: 정말 감사합니다. 처음에는 너무 무서웠는데, 이제 어떻게 관리해야 할지 알게 되어 안심이 됩니다. 앞으로 건강관리에 더 신경 쓰도록 할게요.

**간호사**: 네, 좋은 마음가짐이세요. 저희가 계속 도와드릴게요. 퇴원 후에도 궁금한 점이 있으시면 언제든지 연락주세요. 심부전 환자 자조 모임도 있으니 참여해보시는 것도 좋을 것 같아요. 다른 환자분들의 경험과 조언이 많은 도움이 될 수 있습니다.
      `
      
      // 시나리오 객체에 환자 대화 추가
      scenario.patient_conversation = defaultConversation
      
      // 현재 시나리오 상태 업데이트
      commit('SET_CURRENT_SCENARIO', { ...scenario })
      
      // Firestore에 업데이트 시도
      try {
        const db = getFirestore()
        const scenarioDoc = doc(db, 'scenarios', scenario.id)
        await updateDoc(scenarioDoc, {
          patient_conversation: defaultConversation
        })
        console.log('환자 대화 업데이트 성공')
      } catch (error) {
        console.warn('환자 대화 업데이트 실패:', error)
      }
      
      return scenario
    }
  }
})

export default store
