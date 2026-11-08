/* === CHAPTER3 PATCH 008 overrides === */


window.STORY_CUSTOM_EFFECTS['certificate-study'] = ({ layer, item }) => c3Mount(layer, `<div class="c3-study-book c3-study-book-v6">
  <div class="study-date">${c3Esc(item.date || '10.05.')}</div>
  <div class="book-spread">
    <section class="book-page left-page">
      <div class="left-sheet left-a">
        <small>ADsP · 기출문제</small><h3>데이터 분석 흐름</h3>
        <div class="highlight-board"><span class="marker mark-a">문제 키워드부터 체크</span><span class="marker mark-b">틀린 보기의 근거까지 정리</span><div class="study-summary"><b>오늘 목표</b><span>기출 확인 → 정답 체크 → 오답 개념 정리 → 직접 필기</span></div></div>
      </div>
      <div class="left-sheet left-b">
        <small>ADsP · 오답 노트</small><h3>모델링 / 검증 체크</h3>
        <div class="concept-box"><b>핵심 개념</b><p>학습 데이터는 모델 파라미터를 학습하는 데 사용한다.</p><p>검증 데이터는 모델·하이퍼파라미터 선택에 사용한다.</p><p>테스트 데이터는 최종 일반화 성능을 평가하는 용도다.</p></div>
        <div class="review-list"><p>검증 점수가 좋아도 데이터 누수 여부를 먼저 다시 확인한다.</p><p class="marker mark-c">분류 문제에서는 Precision, Recall, F1의 차이를 구분한다.</p><p class="marker mark-d">평가지표는 실제 분석 목적과 문제 유형에 맞춰 선택한다.</p></div>
        <div class="ruled-note note-target improved-note"><b>직접 필기</b><div class="note-lines"><span class="write-line w1" data-text="train / validation / test 역할 구분"></span><span class="write-line w2" data-text="데이터 누수 여부를 먼저 체크"></span><span class="write-line w3" data-text="지표는 목적에 맞게 Precision · Recall · F1 선택"></span></div></div>
      </div>
    </section>
    <div class="book-gutter"></div>
    <section class="book-page right-page">
      <div class="right-sheet right-a">
        <article class="q-card q1"><small>기출 01</small><h4>다음 중 데이터 분석에 대한 설명으로 옳은 것은?</h4><ol><li><span class="choice-no">①</span><span>표본은 항상 모집단과 동일하다.</span></li><li class="correct"><span class="choice-no">②</span><span>분석 목적에 따라 적절한 지표를 선택한다.</span><svg class="hand-check" viewBox="0 0 54 44"><path d="M5 23 C10 27,14 32,18 36 C26 26,35 14,49 6"/></svg></li><li><span class="choice-no">③</span><span>결측치는 항상 제거한다.</span></li><li><span class="choice-no">④</span><span>모든 변수는 서로 독립이다.</span></li></ol></article>
        <article class="q-card q2"><small>기출 02</small><h4>데이터 전처리 과정에 대한 설명으로 알맞은 것은?</h4><ol><li><span class="choice-no">①</span><span>이상치는 무조건 삭제한다.</span></li><li><span class="choice-no">②</span><span>변수의 단위 차이는 무시한다.</span></li><li class="correct"><span class="choice-no">③</span><span>결측값 처리 기준을 분석 전에 정한다.</span><svg class="hand-check" viewBox="0 0 54 44"><path d="M5 23 C10 27,14 32,18 36 C26 26,35 14,49 6"/></svg></li><li><span class="choice-no">④</span><span>데이터 분할은 모델 학습 후 수행한다.</span></li></ol></article>
        <div class="page-no">142</div>
      </div>
      <div class="right-sheet right-b">
        <article class="q-card q3"><small>기출 03</small><h4>모델 평가에 대한 설명으로 가장 적절한 것은?</h4><ol><li><span class="choice-no">①</span><span>정확도 하나만 확인하면 된다.</span></li><li class="correct"><span class="choice-no">②</span><span>문제 유형에 맞는 평가 지표를 선택한다.</span><svg class="hand-check" viewBox="0 0 54 44"><path d="M5 23 C10 27,14 32,18 36 C26 26,35 14,49 6"/></svg></li><li><span class="choice-no">③</span><span>과적합은 데이터가 적을수록 사라진다.</span></li><li><span class="choice-no">④</span><span>검증 데이터는 학습 중 계속 수정한다.</span></li></ol></article>
        <article class="q-card q4"><small>기출 04</small><h4>분석 프로젝트의 검증 과정으로 옳은 것은?</h4><ol><li><span class="choice-no">①</span><span>학습 데이터만으로 최종 성능을 확정한다.</span></li><li><span class="choice-no">②</span><span>결과가 좋으면 가정을 다시 확인하지 않는다.</span></li><li class="correct"><span class="choice-no">③</span><span>별도 검증 데이터로 일반화 성능을 확인한다.</span><svg class="hand-check" viewBox="0 0 54 44"><path d="M5 23 C10 27,14 32,18 36 C26 26,35 14,49 6"/></svg></li><li><span class="choice-no">④</span><span>평가 지표는 프로젝트 종료 뒤 정한다.</span></li></ol></article>
        <div class="quick-note concept-reminder"><b>개념 메모</b><p>최종 테스트 점수는 마지막에만 사용해야 함.</p><span class="quick-write" data-text="검증 데이터는 학습에 섞지 않는다."></span></div>
        <div class="page-no">143</div>
      </div>
    </section>
    <div class="flip-page"><div class="flip-front"></div><div class="flip-back"></div></div>
  </div>
  <div class="study-pen"><i></i></div>
</div>`, (root, later) => {
  const scene = root.querySelector('.c3-study-book');
  const pen = scene?.querySelector('.study-pen');
  const intervals = [];
  const movePen = (selector, x = 0.5, y = 0.5, immediate = false) => {
    const target = scene?.querySelector(selector);
    if (!target || !pen) return;
    const parentRect = (pen.offsetParent || scene).getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    if (immediate) pen.classList.add('no-transition');
    pen.style.left = `${targetRect.left - parentRect.left + targetRect.width * x}px`;
    pen.style.top = `${targetRect.top - parentRect.top + targetRect.height * y}px`;
    if (immediate) { void pen.offsetWidth; requestAnimationFrame(() => pen.classList.remove('no-transition')); }
  };
  const checkChoice = (qClass, at) => {
    later(() => { movePen(`.${qClass} .correct .choice-no`, 0.16, 0.72); scene?.classList.add('pen-scratch'); }, at);
    later(() => { scene?.classList.add(`solve-${qClass}`); movePen(`.${qClass} .correct .choice-no`, 0.52, 0.72); }, at + 180);
    later(() => movePen(`.${qClass} .correct .choice-no`, 0.86, 0.28), at + 380);
    later(() => scene?.classList.remove('pen-scratch'), at + 640);
  };
  const handWrite = (selector, text, at, duration = 1000) => later(() => {
    const target = scene?.querySelector(selector);
    if (!target) return;
    target.textContent = '';
    target.classList.add('is-writing');
    let index = 0;
    const step = Math.max(36, Math.floor(duration / Math.max(1, text.length)));
    movePen(selector, 0.06, 0.58);
    const id = setInterval(() => {
      index = Math.min(text.length, index + 1);
      target.textContent = text.slice(0, index);
      const ratio = 0.06 + 0.88 * (index / Math.max(1, text.length));
      movePen(selector, ratio, 0.58 + ((index % 3) - 1) * 0.02);
      if (index >= text.length) {
        clearInterval(id);
        target.classList.remove('is-writing');
        target.classList.add('is-written');
      }
    }, step);
    intervals.push(id);
  }, at);
  movePen('.mark-a', 0.18, 0.58, true);
  later(() => { scene?.classList.add('highlight-first'); movePen('.mark-a', 0.88, 0.58); }, 320);
  later(() => movePen('.mark-b', 0.88, 0.58), 900);
  checkChoice('q1', 1500);
  checkChoice('q2', 2720);
  later(() => { movePen('.right-page', 0.94, 0.94); scene?.classList.add('page-turning'); }, 4050);
  later(() => { scene?.classList.add('page-two', 'highlight-second'); movePen('.q3 .correct .choice-no', 0.16, 0.72, true); }, 4480);
  later(() => scene?.classList.remove('page-turning'), 5060);
  checkChoice('q3', 5320);
  checkChoice('q4', 6540);
  handWrite('.w1', 'train / validation / test 역할 구분', 7800, 1200);
  handWrite('.w2', '데이터 누수 여부를 먼저 체크', 9260, 1120);
  handWrite('.w3', '지표는 목적에 맞게 Precision · Recall · F1 선택', 10620, 1460);
  handWrite('.quick-write', '검증 데이터는 학습에 섞지 않는다.', 12320, 1260);
  const refresh = () => {
    if (scene?.querySelector('.quick-write.is-writing')) movePen('.quick-write', 0.72, 0.58, true);
    else if (scene?.querySelector('.w3.is-writing')) movePen('.w3', 0.72, 0.58, true);
    else if (scene?.querySelector('.w2.is-writing')) movePen('.w2', 0.72, 0.58, true);
    else if (scene?.querySelector('.w1.is-writing')) movePen('.w1', 0.72, 0.58, true);
  };
  window.addEventListener('resize', refresh);
  return () => {
    intervals.forEach(clearInterval);
    window.removeEventListener('resize', refresh);
  };
});



