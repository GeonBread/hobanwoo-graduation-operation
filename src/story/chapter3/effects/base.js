window.STORY_CUSTOM_EFFECTS['time-skip'] = ({ layer, item }) => c3Mount(layer, `
  <div class="ch3-title-card">
    <small>${c3Esc(item.label || '1년 6개월 후')}</small>
    <strong>${c3Esc(item.sublabel || '4학년 2학기')}</strong>
    <span>${c3Esc(item.caption || '대학생활의 마지막 학기')}</span>
  </div>`);


function c3SplitTimeCardLabel(raw) {
  const text = String(raw || '').trim();
  if (!text) return { dayLabel: '', dateTime: '' };
  const prefixes = ['다음 날','이튿날','이틀 뒤','같은 날','그 다음 날','며칠 뒤','몇 달 후','2주 뒤','나흘 뒤','두 달 뒤','날짜 변경','새 학기','종강','10월의 마지막 날'];
  for (const prefix of prefixes) {
    if (text.startsWith(prefix + ' ')) return { dayLabel: prefix, dateTime: text.slice(prefix.length).trim() };
    if (text === prefix) return { dayLabel: prefix, dateTime: '' };
  }
  if (text.includes('새벽')) return { dayLabel: '늦은 밤', dateTime: text };
  return { dayLabel: '', dateTime: text };
}

function c3ParseCalendarDate(raw, fallbackYear = 2030) {
  const text = String(raw || '');
  const match = text.match(/(?:(\d{4})년\s*)?(\d{1,2})월\s*(\d{1,2})일\s*([월화수목금토일])요일?/);
  if (!match) return { year: fallbackYear, month: 1, day: 1, weekday: '', timeLabel: text };
  const timeLabel = text.includes('·') ? text.split('·').slice(1).join('·').trim() : '';
  return { year: Number(match[1] || fallbackYear), month: Number(match[2]), day: Number(match[3]), weekday: match[4] + '요일', timeLabel };
}

function c3CalendarMarkup(year, month, selectedDay) {
  const first = new Date(year, month - 1, 1).getDay();
  const days = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i += 1) cells.push('<span class="c2-calendar-day is-empty"></span>');
  for (let day = 1; day <= days; day += 1) {
    const dow = new Date(year, month - 1, day).getDay();
    const cls = ['c2-calendar-day'];
    if (dow === 0) cls.push('is-sunday');
    if (dow === 6) cls.push('is-saturday');
    if (day === selectedDay) cls.push('is-selected');
    cells.push(`<span class="${cls.join(' ')}">${day}</span>`);
  }
  return cells.join('');
}

function c3ParseClockMinutes(raw) {
  const text = String(raw || '');
  const match = text.match(/(오전|오후)\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/);
  if (!match) return null;
  let hour = Number(match[2]) % 12;
  if (match[1] === '오후') hour += 12;
  return hour * 60 + Number(match[3] || 0);
}

function c3ClockNumberMarkup() {
  return [12,1,2,3,4,5,6,7,8,9,10,11]
    .map((number, index) => {
      const angle = index * Math.PI / 6;
      const left = 50 + Math.sin(angle) * 39;
      const top = 50 - Math.cos(angle) * 39;
      return `<span class="c2-transition-clock-number" style="left:${left.toFixed(2)}%;top:${top.toFixed(2)}%">${number}</span>`;
    }).join('');
}

function c3GetSceneInfo(sceneKey){ return window.STORY_CONFIG?.scenes?.[sceneKey] || null; }
function c3CanonicalAssetPath(file) {
  if (!file) return '';
  let raw = String(file).replace(/\\/g, '/');
  if (/^(?:data:|blob:|https?:)/.test(raw)) return raw;
  raw = raw.replace(/^\/chapter3_story\/assets\//, '');
  raw = raw.replace(/^\/chapter2_story\/assets\//, '');
  raw = raw.replace(/^assets\//, '');
  if (raw.startsWith('/assets/')) return raw;
  if (raw.startsWith('/')) return raw;
  if (/^chapter3\/(?:backgrounds|characters|illustrations|monsters|portraits)\//.test(raw)) {
    return `/assets/chapter3/story/${raw.slice('chapter3/'.length)}`;
  }
  if (/^chapter2\/(?:backgrounds|illustrations)\//.test(raw)) {
    return `/assets/chapter2/story/${raw.slice('chapter2/'.length)}`;
  }
  if (/^chapter2\/(?:characters|portraits)\//.test(raw)) {
    return `/assets/chapter3/story/${raw.slice('chapter2/'.length)}`;
  }
  if (raw.startsWith('characters/hobanwoo/')) {
    return `/assets/common/characters/hobanwoo/${raw.slice('characters/hobanwoo/'.length)}`;
  }
  if (raw.startsWith('story/common/ui/')) {
    return `/assets/common/story/ui/${raw.slice('story/common/ui/'.length)}`;
  }
  return `/assets/chapter3/story/legacy/${raw}`;
}
function c3GetSceneBackground(sceneKey){
  const bg=String(c3GetSceneInfo(sceneKey)?.background || '');
  if(!bg) return '';
  return c3CanonicalAssetPath(bg);
}

window.STORY_CUSTOM_EFFECTS['time-card'] = ({ layer, item }) => {
  const rawLabel = String(item.dayLabel || item.time || '').trim();
  const split = c3SplitTimeCardLabel(rawLabel);
  const dayLabel = String(item.dayLabel || split.dayLabel || '').trim();
  const dateTime = String(item.dateTime || split.dateTime || rawLabel).trim();
  const place = item.place || '';
  const sceneTitle = item.sceneTitle || (c3GetSceneInfo(item.scene)?.title ?? '');
  const sceneBackground = c3GetSceneBackground(item.scene);
  const hidePlaceCard = Boolean(item.hidePlaceCard);
  const placeMarkup = hidePlaceCard ? '' : `
    <div class="c2-transition-place-card">
      ${sceneBackground ? `<div class="c2-transition-place-image" style="background-image:url('${c3Esc(sceneBackground)}')"></div>` : '<div class="c2-transition-place-image is-empty"></div>'}
      <div class="c2-transition-place-shade"></div>
      <div class="c2-transition-place-text"><small>LOCATION</small><strong>${c3Esc(place || sceneTitle || '')}</strong>${sceneTitle && sceneTitle !== place ? `<span>${c3Esc(sceneTitle)}</span>` : ''}</div>
    </div>`;

  const mode = item.transitionMode || (/같은 날|그날 저녁|늦은 밤|새벽/.test(dayLabel) ? 'time' : 'date');
  const host = document.createElement('div');
  host.className = 'c3-ch2-time-viewport-host';
  document.body.appendChild(host);
  const mount = (html,setup) => { const cleanup=c3Mount(host,html,setup); return ()=>{cleanup?.();host.remove();}; };

  if (mode === 'time') {
    const toMinutesRaw = c3ParseClockMinutes(item.toTime || dateTime || item.time);
    const fromMinutesRaw = c3ParseClockMinutes(item.fromTime);
    const toMinutes = toMinutesRaw ?? 0;
    const fromMinutes = fromMinutesRaw ?? Math.max(0, toMinutes - 60);
    const delta = Math.max(1, toMinutes >= fromMinutes ? toMinutes - fromMinutes : toMinutes + 1440 - fromMinutes);
    const startHourAngle = (fromMinutes % 720) * .5;
    const startMinuteAngle = (fromMinutes % 60) * 6;
    const endHourAngle = startHourAngle + delta * .5;
    const targetMinuteAngle = (toMinutes % 60) * 6;
    const minuteRemainder = (targetMinuteAngle - startMinuteAngle + 360) % 360;
    const visualTurns = delta <= 180 ? Math.floor(delta / 60) : Math.min(2, Math.max(1, Math.round(delta / 360)));
    const endMinuteAngle = startMinuteAngle + minuteRemainder + visualTurns * 360;
    return mount(`<div class="c2-clock-transition-root"><div class="c2-clock-transition-black"></div><div class="c2-clock-transition-stage"><div class="c2-transition-clock">${c3ClockNumberMarkup()}<div class="c2-transition-hand c2-transition-hour"></div><div class="c2-transition-hand c2-transition-minute"></div><div class="c2-transition-center"></div></div><div class="c2-clock-time-range"><span>${c3Esc(item.fromTime || '')}</span><i></i><span>${c3Esc(item.toTime || dateTime)}</span></div></div>${placeMarkup}</div>`,(root,later)=>{
      const scene=root.querySelector('.c2-clock-transition-root');
      const hour=scene?.querySelector('.c2-transition-hour'), minute=scene?.querySelector('.c2-transition-minute');
      later(()=>scene?.classList.add('show-clock'),180);
      hour?.animate([{transform:`rotate(${startHourAngle}deg)`},{transform:`rotate(${endHourAngle}deg)`}],{duration:3000,delay:450,easing:'cubic-bezier(.35,.05,.2,1)',fill:'forwards'});
      minute?.animate([{transform:`rotate(${startMinuteAngle}deg)`},{transform:`rotate(${endMinuteAngle}deg)`}],{duration:3000,delay:450,easing:'cubic-bezier(.35,.05,.2,1)',fill:'forwards'});
      later(()=>scene?.classList.add('hide-clock'),3650);
      if(!hidePlaceCard){later(()=>scene?.classList.add('show-place'),3800);later(()=>scene?.classList.add('show-place-name'),4300);}
    });
  }

  const dateInfo = c3ParseCalendarDate(dateTime, Number(item.calendarYear || 2030));
  return mount(`<div class="c2-date-transition-root"><div class="c2-date-transition-black"></div><div class="c2-calendar-stage"><section class="c2-calendar-sheet"><header class="c2-calendar-header"><strong>${dateInfo.year}년 ${dateInfo.month}월</strong><span>PROJECT SCHEDULE</span></header><div class="c2-calendar-weekdays"><span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span></div><div class="c2-calendar-grid">${c3CalendarMarkup(dateInfo.year,dateInfo.month,dateInfo.day)}</div></section><aside class="c2-calendar-focus"><small>${c3Esc(dayLabel || 'DATE CHANGE')}</small><b>${dateInfo.day}</b><strong>${c3Esc(`${dateInfo.month}월 ${dateInfo.day}일 ${dateInfo.weekday}`)}</strong><em>${c3Esc(dateInfo.timeLabel || '')}</em></aside></div>${placeMarkup}</div>`,(root,later)=>{
    const scene=root.querySelector('.c2-date-transition-root');
    // No long dead-black hold: the Chapter 2 calendar starts almost immediately.
    later(()=>scene?.classList.add('show-calendar'),80);
    later(()=>scene?.classList.add('pulse-date'),390);
    later(()=>scene?.classList.add('show-calendar-time'),720);
    later(()=>scene?.classList.add('hide-calendar'),1780);
    if(!hidePlaceCard){later(()=>scene?.classList.add('show-place'),1840);later(()=>scene?.classList.add('show-place-name'),2040);}
  });
};


function c3PortalCalendarMarkup(){
  return c3CalendarMarkup(2030, 11, 18);
}

function c3PortalSideMarkup(){
  return `
    <aside class="ch3-portal-side">
      <div class="ch3-portal-side-title">학사행정</div>
      <button class="ch3-side-row"><span>학적</span><b>＋</b></button>
      <button class="ch3-side-row nav-graduation"><span>졸업</span><b>＋</b></button>
      <div class="ch3-side-sub graduation-sub">
        <button>졸업예정자관리 <b>⌄</b></button>
        <button>졸업인정(대학) <b>⌄</b></button>
        <button class="nav-guide">졸업자가진단안내 <b>⌄</b></button>
        <button class="nav-self">• &nbsp;[대학]졸업자가진단</button>
      </div>
      <button class="ch3-side-row"><span>교직</span><b>＋</b></button>
      <button class="ch3-side-row"><span>수업</span><b>＋</b></button>
      <button class="ch3-side-row"><span>장학</span><b>＋</b></button>
      <button class="ch3-side-row"><span>수강</span><b>＋</b></button>
      <button class="ch3-side-row"><span>수업강의평가</span><b>＋</b></button>
      <button class="ch3-side-row"><span>학생지원</span><b>＋</b></button>
      <button class="ch3-side-row"><span>성적</span><b>＋</b></button>
    </aside>`;
}

function c3PortalHeaderMarkup(){
  return `
    <header class="ch3-portal-header">
      <div class="ch3-portal-brand"><strong>KNU</strong><span>경북대학교 차세대 통합정보시스템</span></div>
      <div class="ch3-portal-account"><b>대학생 / 2027XXXXXX</b><span>한국어</span><i>▤</i><i>▦</i><i>⛶</i><i>− 100% ＋</i><span>로그아웃</span><span>비밀번호 변경</span></div>
      <nav><b>학사행정</b><b>일반행정</b><b>공통</b></nav>
    </header>
    <div class="ch3-portal-toolbar">
      <button>개인화 메뉴⌄</button><div class="ch3-portal-tab is-current">메인</div><div class="ch3-portal-tab diagnosis-tab" hidden>[대학]졸업자가진단 ×</div><div class="ch3-portal-toolbar-spacer"></div><b>‹</b><b>›</b><b>▦</b><b>×</b>
    </div>`;
}

function c3PortalHomeMarkup(){
  return `
    <section class="ch3-portal-home">
      <div class="ch3-home-profile">
        <div><strong>호반우</strong><span>2027XXXXXX</span></div>
        <p><b>공과대학 기계공학부</b><span>기계공학전공</span></p>
        <small>4학년 · 재학 · 2030년도 2학기</small>
      </div>
      <div class="ch3-home-status"><div><span>처리중</span><b>0</b><small>건</small></div><div><span>완료</span><b>0</b><small>건</small></div><em>2030년도 2학기</em></div>
      <div class="ch3-home-notices"><div class="head"><b>학사공지</b><span>업무공지</span></div>
        <p><span>2030학년도 2학기 졸업예정자 졸업요건 확인 안내</span><time>2030-11-18</time></p>
        <p><span>2030학년도 2학기 졸업자격인정 관련 안내</span><time>2030-11-14</time></p>
        <p><span>2030학년도 2학기 수강변경 및 폐강과목 안내</span><time>2030-11-04</time></p>
        <p><span>2030학년도 2학기 졸업예정자 최종 점검 안내</span><time>2030-10-28</time></p>
      </div>
      <div class="ch3-home-calendar"><header><strong>일정</strong><span>2030년 11월</span></header><div class="week"><b>일</b><b>월</b><b>화</b><b>수</b><b>목</b><b>금</b><b>토</b></div><div class="days">${c3PortalCalendarMarkup()}</div></div>
    </section>`;
}

function c3PortalStudentInfoMarkup(){
  return `
    <div class="ch3-portal-student-info">
      <b>학번</b><span>2027XXXXXX</span><b>성명</b><span>호반우</span><b>캠퍼스구분</b><span>산격동 캠퍼스</span>
      <b>학적세부상태</b><span>재학</span><b>과정구분</b><span>학사과정</span><b>학년/분반</b><span>4 /</span>
      <b>입학구분</b><span>신입학</span><b>입학년도</b><span>2027</span><b>재학기간</b><span>4년</span>
      <b>교육과정년도</b><span>2027</span><b>학과</b><span class="wide">공과대학 기계공학부 기계공학전공</span>
    </div>`;
}

function c3PortalDiagnosisMarkup(){
  return `
    <section class="ch3-portal-page diagnosis-page">
      <div class="ch3-portal-breadcrumb">⌂ &nbsp;학사행정 &gt; 졸업 &gt; 졸업자가진단안내 &gt; <b>[대학]졸업자가진단</b></div>
      <div class="ch3-page-heading"><h2>[대학]졸업자가진단</h2><button class="diagnosis-run">졸업자가진단수행</button></div>
      <div class="ch3-portal-search"><b>* 학번</b><span>2027XXXXXX</span><i>호반우</i></div>
      <div class="ch3-portal-guide">※ 본 졸업학점안내 내역은 교과과정 적용년도 및 졸업요건 등에 따라 달라질 수 있으며 <em>최종 졸업관련 사항은 반드시 소속학과에서 확인</em>하시기 바랍니다.<br>※ 현재 학기 정상 이수 기준으로 졸업요건 충족 여부를 확인합니다.</div>
      <h3>학생기본정보</h3>${c3PortalStudentInfoMarkup()}
      <div class="ch3-result-tabs is-disabled"><button>교과구분별 취득학점 이수정보</button><button>필수과목 이수정보</button><button>졸업자격인정정보</button><button>이수과목내역</button><button>수강신청조회</button></div>
      <div class="ch3-empty-result"><strong>졸업자가진단을 수행하면 결과가 표시됩니다.</strong><span>우측 상단의 ‘졸업자가진단수행’ 버튼을 클릭하십시오.</span></div>
    </section>`;
}

function c3PortalOverviewMarkup(){
  const rows=[
    ['총취득학점','130','136','Y','total'],
    ['교양취득학점','30','33','Y','general'],
    ['SDG 교양','3','3','Y','sdg'],
    ['전공취득학점','63','85','Y','major'],
    ['전공영역 이수학점','15','18','Y','majorArea'],
    ['전공필수과목 이수','5과목','5과목','Y','gpa']
  ];
  return `<div class="ch3-result-table-wrap"><h4>교과구분별취득학점 정보 <span>${rows.length}건</span></h4><table class="ch3-result-table"><thead><tr><th>No</th><th>전공구분</th><th>졸업사정이수구분</th><th>기준정보</th><th>이수정보</th><th>충족여부</th><th>판정</th></tr></thead><tbody>${rows.map((r,i)=>`<tr data-pass-row="${r[4]}"><td>${i+1}</td><td>주전공</td><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td class="pass-y" data-pass="${r[4]}">${r[3]}</td><td><b class="pass-label">통과</b></td></tr>`).join('')}</tbody></table></div>`;
}

function c3PortalQualificationMarkup(){
  const rows=[
    ['실용영어영역','실용영어 1·2 이수 완료','4학점 충족'],
    ['지도교수 상담영역','지도교수 상담 8회 이상 완료','졸업자격 충족'],
    ['소프트웨어영역','C/C++프로그래밍기초 이수','3학점 충족']
  ];
  return `<div class="ch3-result-table-wrap"><h4>졸업자격인정정보 <span>3건</span></h4><table class="ch3-result-table"><thead><tr><th>No</th><th>졸업자격인정기준구분</th><th>처리내용</th><th>상세</th><th>충족여부</th><th>판정</th></tr></thead><tbody>${rows.map((r,i)=>`<tr data-pass-row="qualification${i}"><td>${i+1}</td><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td class="pass-y" data-pass="qualification${i}">Y</td><td><b class="pass-label">통과</b></td></tr>`).join('')}</tbody></table></div>`;
}

function c3PortalRequiredMarkup(){
  // Official required-major subjects for KNU Mechanical Engineering freshman admission from 2026 onward.
  const completed=[
    ['전공필수','동역학',3,'A0'],
    ['전공필수','열역학',3,'A+'],
    ['전공필수','고체역학',3,'A0'],
    ['전공필수','유체역학',3,'B+'],
    ['전공필수','기계공학실험',1,'A+']
  ];
  return `<div class="ch3-result-table-wrap ch3-required-completion-2026"><h4>필수과목 이수정보 <span>이수 ${completed.length}건 · 미이수 0건</span></h4><table class="ch3-result-table"><thead><tr><th>No</th><th>이수구분</th><th>과정구분</th><th>교과목명</th><th>학점</th><th>성적</th></tr></thead><tbody>${completed.map((r,i)=>`<tr><td>${i+1}</td><td>주전공</td><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</tbody></table><div class="ch3-required-pass" data-pass-row="required"><span>전공필수 5과목 이수 완료 · 전공영역 18학점 이수</span><b class="pass-y" data-pass="required">Y</b><strong>통과</strong></div></div>`;
}

function c3PortalResultMarkup(tab='overview'){
  const content=tab==='qualification'?c3PortalQualificationMarkup():tab==='required'?c3PortalRequiredMarkup():c3PortalOverviewMarkup();
  return `
    <section class="ch3-portal-page result-page">
      <div class="ch3-portal-breadcrumb">⌂ &nbsp;학사행정 &gt; 졸업 &gt; 졸업자가진단안내 &gt; <b>[대학]졸업자가진단</b></div>
      <div class="ch3-page-heading"><h2>[대학]졸업자가진단 결과</h2><span class="ch3-result-date">기준일 2030-11-18 · 2030년도 2학기</span></div>
      <h3>학생기본정보</h3>${c3PortalStudentInfoMarkup()}
      <div class="ch3-result-tabs"><button class="tab-overview ${tab==='overview'?'active':''}">교과구분별 취득학점 이수정보</button><button class="tab-required ${tab==='required'?'active':''}">필수과목 이수정보</button><button class="tab-qualification ${tab==='qualification'?'active':''}">졸업자격인정정보</button><button>이수과목내역</button><button>수강신청조회</button></div>
      ${content}
      <div class="ch3-portal-pass-summary"><small>GRADUATION SELF-DIAGNOSIS</small><strong>전체 졸업요건 충족</strong><b>6 / 6 &nbsp;·&nbsp; 통과</b></div>
    </section>`;
}

function c3PortalChromeMarkup(mainMarkup, withCursor=true){
  return `<div class="ch3-portal-browser">${c3PortalHeaderMarkup()}<div class="ch3-portal-layout">${c3PortalSideMarkup()}<main class="ch3-portal-main">${mainMarkup}</main></div><div class="ch3-portal-modal-layer" hidden></div><div class="ch3-portal-click-ring" aria-hidden="true"></div>${withCursor?`<div class="ch3-portal-cursor" aria-hidden="true"><svg viewBox="0 0 32 42" role="presentation"><path d="M3 2 L27 25 L17 27 L23 39 L17 41 L11 29 L4 36 Z" fill="#fff" stroke="#111" stroke-width="2.5" stroke-linejoin="round"/></svg></div>`:''}<div class="ch3-portal-pass-toast" hidden><span>✓</span><strong>충족 · 통과</strong><small></small></div></div>`;
}

window.STORY_CUSTOM_EFFECTS['graduation-portal-sequence'] = ({ layer }) => c3Mount(layer, `
  <div class="ch3-portal-sequence">${c3PortalChromeMarkup(c3PortalHomeMarkup(), true)}</div>`, (root, later) => {
    const browser=root.querySelector('.ch3-portal-browser');
    const main=root.querySelector('.ch3-portal-main');
    const cursor=root.querySelector('.ch3-portal-cursor');
    const ring=root.querySelector('.ch3-portal-click-ring');
    const modalLayer=root.querySelector('.ch3-portal-modal-layer');
    const passToast=root.querySelector('.ch3-portal-pass-toast');
    const tabChip=root.querySelector('.diagnosis-tab');
    let currentTarget='';

    const moveTo=(selector, xRatio=.58, yRatio=.54, immediate=false)=>{
      const target=root.querySelector(selector);
      if(!target||!browser||!cursor)return;
      currentTarget=selector;
      const br=browser.getBoundingClientRect(),tr=target.getBoundingClientRect();
      /* PATCH 028: responsive web-fit은 상위 root에 scale()을 적용하므로, 화면 좌표를
         브라우저의 논리 좌표로 되돌린 뒤 커서 left/top에 넣어야 버튼과 정확히 겹칩니다. */
      const scaleX=browser.clientWidth ? br.width/browser.clientWidth : 1;
      const scaleY=browser.clientHeight ? br.height/browser.clientHeight : scaleX;
      const x=(tr.left-br.left+tr.width*xRatio)/Math.max(.001,scaleX||1);
      const y=(tr.top-br.top+tr.height*yRatio)/Math.max(.001,scaleY||1);
      if(immediate)cursor.classList.add('no-transition');
      cursor.style.left=`${x}px`;
      cursor.style.top=`${y}px`;
      if(immediate){void cursor.offsetWidth;requestAnimationFrame(()=>cursor.classList.remove('no-transition'))}
    };
    const click=()=>{
      cursor.classList.remove('is-clicking');ring.classList.remove('is-active');void cursor.offsetWidth;
      cursor.classList.add('is-clicking');ring.style.left=cursor.style.left;ring.style.top=cursor.style.top;ring.classList.add('is-active');
      later(()=>cursor.classList.remove('is-clicking'),220);later(()=>ring.classList.remove('is-active'),500);
    };
    const renderMain=(markup)=>{main.classList.add('is-switching');later(()=>{main.innerHTML=markup;main.classList.remove('is-switching')},130)};
    const showModal=(kind)=>{
      modalLayer.hidden=false;
      if(kind==='criteria')modalLayer.innerHTML=`<div class="ch3-modal-dim"></div><section class="ch3-portal-modal"><header>기준입력확인 <button>×</button></header><h3>기준입력정보 <small>1건</small></h3><table><thead><tr><th>No</th><th>학과명</th><th>입학연도</th><th>인정기준</th><th>졸업기준</th><th>전공구분</th></tr></thead><tbody><tr><td>1</td><td>공과대학 기계공학부 기계공학전공</td><td>2027</td><td>O</td><td>O</td><td>주전공</td></tr></tbody></table><div class="ch3-modal-actions"><button class="criteria-run">실행</button><button>닫기</button></div></section>`;
      else modalLayer.innerHTML=`<div class="ch3-modal-dim"></div><section class="ch3-portal-confirm-ui"><header>확인</header><p>2030년도 2학기 기준으로 졸업자가진단을 진행하시겠습니까?</p><div><button class="confirm-yes">예</button><button>아니요</button></div></section>`;
    };
    const hideModal=()=>{modalLayer.hidden=true;modalLayer.innerHTML=''};
    const highlightPass=(key,label)=>{
      root.querySelectorAll('[data-pass-row]').forEach(el=>el.classList.remove('is-pass-focus'));
      const row=root.querySelector(`[data-pass-row="${key}"]`);if(row)row.classList.add('is-pass-focus');
      passToast.hidden=false;passToast.querySelector('small').textContent=label||'';passToast.classList.remove('show');void passToast.offsetWidth;passToast.classList.add('show');
    };
    const showFinalSummary=()=>{const summary=root.querySelector('.ch3-portal-pass-summary');if(summary)summary.classList.add('show');passToast.hidden=true};
    const onResize=()=>{if(currentTarget)moveTo(currentTarget,.58,.54,true)};
    window.addEventListener('resize',onResize);

    moveTo('.ch3-home-profile',.62,.46,true);
    later(()=>moveTo('.nav-graduation'),450);
    later(()=>{click();root.querySelector('.ch3-portal-side').classList.add('graduation-open')},1200);
    later(()=>moveTo('.nav-guide'),1850);
    later(()=>{click();root.querySelector('.ch3-portal-side').classList.add('guide-open')},2550);
    later(()=>moveTo('.nav-self'),3200);
    later(()=>{click();tabChip.hidden=false;renderMain(c3PortalDiagnosisMarkup())},3950);
    later(()=>moveTo('.diagnosis-run',.55,.55),4850);
    later(()=>{click();showModal('criteria')},5550);
    later(()=>moveTo('.criteria-run',.5,.52),6400);
    later(()=>{click();showModal('confirm')},7150);
    later(()=>moveTo('.confirm-yes',.5,.52),8000);
    later(()=>{click();hideModal();renderMain(c3PortalResultMarkup('overview'))},8700);
    later(()=>moveTo('[data-pass="total"]',.5,.52),9550);
    later(()=>{highlightPass('total','총취득학점 136 / 기준 130');},10150);
    later(()=>moveTo('[data-pass="major"]',.5,.52),10850);
    later(()=>{highlightPass('major','전공취득학점 85 / 기준 63');},11450);
    later(()=>moveTo('.tab-qualification',.55,.55),12150);
    later(()=>{click();renderMain(c3PortalResultMarkup('qualification'))},12850);
    later(()=>moveTo('[data-pass="qualification0"]',.5,.52),13650);
    later(()=>highlightPass('qualification0','졸업자격인정 충족'),14250);
    later(()=>moveTo('.tab-required',.55,.55),14950);
    later(()=>{click();renderMain(c3PortalResultMarkup('required'))},15650);
    later(()=>moveTo('[data-pass="required"]',.5,.52),16450);
    later(()=>highlightPass('required','전공필수 5과목 이수 완료 · 전공영역 18학점 이수'),17050);
    later(()=>showFinalSummary(),17850);
    later(()=>cursor.classList.add('is-idle'),18800);

    return ()=>window.removeEventListener('resize',onResize);
  });

window.STORY_CUSTOM_EFFECTS['diagnosis-normal'] = ({ layer }) => c3Mount(layer, diagnosisMarkup(false));
window.STORY_CUSTOM_EFFECTS['diagnosis-glitch'] = ({ layer }) => c3Mount(layer, `
  <div class="ch3-portal-glitch ch3-portal-live-glitch">${c3PortalChromeMarkup(c3PortalResultMarkup('overview'), false)}</div>`, (root, later) => {
    const browser = root.querySelector('.ch3-portal-browser');
    const pulseScreen = (bad = false) => {
      if (!browser) return;
      browser.classList.remove('status-screen-pulse','status-screen-error');
      void browser.offsetWidth;
      browser.classList.add(bad ? 'status-screen-error' : 'status-screen-pulse');
      later(() => browser.classList.remove('status-screen-pulse','status-screen-error'), 330);
    };
    const setStatus = (key, value) => {
      const row = root.querySelector(`[data-pass-row="${key}"]`);
      const cell = root.querySelector(`[data-pass="${key}"]`);
      if (!row || !cell) return;
      const label = row.querySelector('.pass-label');
      const isBad = value === 'N';
      cell.textContent = value;
      cell.classList.remove('status-y-live','status-n-live');
      row.classList.remove('status-row-y','status-row-n');
      if (label) label.classList.remove('status-label-y','status-label-n');
      root.classList.remove('status-focus-n');
      if (isBad) {
        const rootRect = root.getBoundingClientRect();
        const cellRect = cell.getBoundingClientRect();
        root.style.setProperty('--status-focus-x', `${cellRect.left - rootRect.left + cellRect.width / 2}px`);
        root.style.setProperty('--status-focus-y', `${cellRect.top - rootRect.top + cellRect.height / 2}px`);
      }
      void row.offsetWidth;
      cell.classList.add(isBad ? 'status-n-live' : 'status-y-live');
      row.classList.add(isBad ? 'status-row-n' : 'status-row-y');
      if (label) {
        label.textContent = isBad ? '미충족' : '통과';
        label.classList.add(isBad ? 'status-label-n' : 'status-label-y');
      }
      if (isBad) {
        root.classList.add('status-focus-n');
        later(() => root.classList.remove('status-focus-n'), 560);
      }
      pulseScreen(isBad);
    };

    // 실제 표 안의 값이 Y/N 사이를 오가도록 연출한다.
    // 별도의 알림창을 띄우지 않고, 사용자가 보고 있던 셀 자체가 변한다.
    later(() => setStatus('total', 'N'), 500);
    later(() => setStatus('total', 'Y'), 1120);
    later(() => setStatus('total', 'N'), 1740);
    later(() => setStatus('total', 'Y'), 2320);
    later(() => setStatus('major', 'N'), 2870);
    later(() => setStatus('major', 'Y'), 3420);
    later(() => setStatus('gpa', 'N'), 3860);
    later(() => setStatus('gpa', 'Y'), 4270);
    later(() => setStatus('total', 'N'), 4620);
  });

window.STORY_CUSTOM_EFFECTS['corruption-birth'] = ({ layer }) => {
  const monsters = [
    ['졸업학점 감시 드론','학점 부족 불안'],['전공필수 누락 장치','필수과목 누락 공포'],['이수기록 삭제 터미널','기록 소실 불안'],
    ['졸업유예 그림자','끝을 미루는 마음'],['캡스톤 오류 로봇','마지막 과제 오류'],['결과값 불일치 드론','결과 검증 압박'],
    ['취업 준비 유령','미래에 대한 불안'],['불합격 통보 파편','실패에 대한 공포'],['자격증 압박 드론','준비 부족 강박']
  ];
  return c3Mount(layer, `<div class="ch3-corruption"><div class="ch3-corruption-grid">${monsters.map(m=>`<div class="ch3-monster-chip"><b>${m[0]}</b><small>${m[1]}</small></div>`).join('')}</div></div>`);
};



window.STORY_CUSTOM_EFFECTS['submission-complete'] = ({ layer, item }) => c3Mount(layer, `
  <div class="ch3-submit">
    <div class="ch3-submit-window">
      <h3>캡스톤디자인 최종 결과물 제출</h3>
      <div class="ch3-submit-row"><b>최종 결과보고서</b><span>chapter3_capstone_final.pdf</span></div>
      <div class="ch3-submit-row"><b>결과 데이터</b><span>검토 완료</span></div>
      <div class="ch3-submit-row"><b>제출 상태</b><span>제출 대기</span></div>
      <div class="ch3-submit-button">${c3Esc(item.button || '최종 제출')}</div>
    </div>
  </div>`, (root,later)=> later(()=>root.querySelector('.ch3-submit')?.classList.add('is-done'), 950));

window.STORY_CUSTOM_EFFECTS['core-arrival'] = ({ layer }) => c3Mount(layer, `
  <div class="ch3-core-arrival">
    <div class="ch3-core-orbit">
      <i class="ch3-core-star s1"></i><i class="ch3-core-star s2"></i><i class="ch3-core-star s3"></i><i class="ch3-core-star s4"></i>
      <i class="ch3-core-star s5 locked"></i><i class="ch3-core-star s6 locked"></i>
    </div>
    <strong>첨성대 코어 · 졸업 영역</strong>
    <span>별 연결 상태 4 / 6</span>
  </div>`);

window.STORY_CUSTOM_EFFECTS['boss-emergence'] = ({ layer }) => c3Mount(layer, `
  <div class="ch3-boss-emerge ch3-boss-emerge-grand">
    <div class="boss-core-bg"></div>
    <div class="boss-darkness"></div>
    <div class="boss-rift-core"><i></i><i></i><i></i></div>
    <div class="boss-aura aura-a"></div><div class="boss-aura aura-b"></div>
    <div class="boss-summon-ring ring-a"></div><div class="boss-summon-ring ring-b"></div>
    <div class="boss-vertical-beam"></div>
    <div class="boss-energy-arcs">${Array.from({length:12},(_,i)=>`<i style="--i:${i};--r:${20+(i*17)%34}deg;--d:${(i%6)*.09}s"></i>`).join('')}</div>
    <div class="boss-particles">${Array.from({length:42},(_,i)=>`<i style="--i:${i};--x:${6+(i*37)%88}%;--y:${8+(i*53)%84}%;--d:${(i%9)*.08}s"></i>`).join('')}</div>
    <img class="boss-phase1-image" src="/assets/chapter3/story/characters/digrion_phase1.png" alt="미졸업의 군주 디그리온">
    <div class="boss-impact-flash"></div>
    <div class="boss-emergence-title">
      <div class="boss-title-kicker">FINAL BOSS</div>
      <div class="boss-title-rank">미졸업의 군주</div>
      <div class="boss-title-name">디그리온</div>
    </div>
  </div>`, (root, later) => {
    const scene = root.querySelector('.ch3-boss-emerge-grand');
    // 첫 약 3초는 디그리온 본체를 숨긴 채 균열/링/광선/입자로 존재감만 보여줌.
    later(() => scene?.classList.add('boss-charge'), 220);
    later(() => scene?.classList.add('boss-intensify'), 1250);
    later(() => scene?.classList.add('boss-preburst'), 2420);
    later(() => scene?.classList.add('boss-impact'), 3020);
    // 충격 직후부터 본체가 서서히 드러남.
    later(() => scene?.classList.add('boss-reveal'), 3180);
    later(() => scene?.classList.add('boss-title-in'), 4680);
    later(() => scene?.classList.add('boss-hold'), 5550);
  });

window.STORY_CUSTOM_EFFECTS['boss-phase'] = ({ layer, item, api }) => {
  api.setMode('game');
  const coreClass = item?.scene === 'graduation_core' ? ' is-digrion-core' : '';
  return c3Mount(layer, `<div class="ch3-phase-card${coreClass}"><small>${c3Esc(item.phase || 'FINAL BATTLE')}</small><strong>${c3Esc(item.title)}</strong><p>${c3Esc(item.subtitle || '')}</p><div class="keywords">${(item.keywords||[]).map(k=>`<span>${c3Esc(k)}</span>`).join('')}</div></div>`);
};

window.STORY_CUSTOM_EFFECTS['star-awaken'] = ({ layer, item, api }) => {
  api.setMode('story');
  return c3Mount(layer, `<div class="ch3-star-awaken"><div class="ch3-star-icon"></div><strong>${c3Esc(item.title || '긍지의 별')}</strong><p>${c3Esc(item.subtitle || '지나온 자신을 인정하는 힘')}</p><p>별 연결 상태 ${c3Esc(item.count || '5 / 6')}</p></div>`);
};

window.STORY_CUSTOM_EFFECTS['six-stars'] = ({ layer }) => {
  const names = ['출석','과제','시험','팀플','긍지','졸업'];
  return c3Mount(layer, `<div class="ch3-six-stars"><strong>여섯 별 최종 연결</strong><div class="ch3-star-row">${names.map(n=>`<div class="ch3-star-badge"><i></i><b>${n}의 별</b></div>`).join('')}</div><p>첨성대 코어 연결률 100% · 별 연결 상태 6 / 6</p></div>`);
};

window.STORY_CUSTOM_EFFECTS['final-blast'] = ({ layer }) => c3Mount(layer, `<div class="ch3-final-blast"><div class="beam"></div><strong>KNU GRADUATION OPERATION</strong></div>`);

window.STORY_CUSTOM_EFFECTS['core-restore'] = ({ layer, api }) => {
  api.setMode('story');
  return c3Mount(layer, `<div class="ch3-core-restore"><div class="rings"></div><strong>첨성대 코어 복구 완료</strong><p>잔존 오염 반응 없음 · 여섯 별 연결 정상</p></div>`);
};

window.STORY_CUSTOM_EFFECTS['graduation-moment'] = ({ layer }) => c3Mount(layer, `<div class="ch3-graduation"><div class="cap">🎓</div><strong>경북대학교 졸업식</strong><p>몇 달 후 · 대학생활의 마지막 날</p></div>`);



window.STORY_CUSTOM_EFFECTS['phone-notice'] = ({ layer, item }) => c3Mount(layer, `
  <div class="ch3-phone-notice-wrap">
    <div class="ch3-phone-notice">
      <small>알림</small>
      <strong>${c3Esc(item.title || '졸업예정자 졸업요건 확인 안내')}</strong>
      <p>${c3Esc(item.body || '')}</p>
    </div>
  </div>`);

window.STORY_CUSTOM_EFFECTS['task-list'] = ({ layer, item }) => c3Mount(layer, `
  <div class="ch3-list-screen"><small>LAST SEMESTER</small><strong>대학생활의 마지막 할 일</strong>
    <div class="ch3-list-box">${(item.tasks||[]).map((task,i)=>`<div><b>${String(i+1).padStart(2,'0')}</b><span>${c3Esc(task)}</span></div>`).join('')}</div>
  </div>`);

window.STORY_CUSTOM_EFFECTS['diagnosis-course-mismatch'] = ({ layer }) => c3Mount(layer, `
  <div class="ch3-mismatch">
    <div class="ch3-mismatch-card ok"><small>이수과목내역</small><strong>전공필수 A</strong><b>이수 · 3학점</b></div>
    <div class="ch3-mismatch-arrow">≠</div>
    <div class="ch3-mismatch-card bad"><small>필수과목 이수정보</small><strong>전공필수 A</strong><b>미이수</b></div>
    <p>존재하는데 존재하지 않는 과목</p>
  </div>`,(root,later)=>{ c3BrowserOpening(root,later,{title:'KNU 차세대 통합정보시스템 · 졸업자가진단',url:'https://knuin.knu.example/graduation/diagnosis',skipIntro:true}); });

window.STORY_CUSTOM_EFFECTS['records-check'] = ({ layer }) => c3Mount(layer, `
  <div class="ch3-records-check"><strong>실제 이수 기록 대조</strong>
    <div><span>이수과목내역</span><b>정상</b></div><div><span>교육과정 기준</span><b>정상</b></div><div><span>취득학점</span><b>정상</b></div><div><span>학과 확인</span><b>큰 문제 없음</b></div>
    <p>자가진단 화면과 실제 기록을 분리하여 확인합니다.</p>
  </div>`);

window.STORY_CUSTOM_EFFECTS['student-card-reactivation'] = ({ layer, item }) => {
  const host=document.createElement('div');
  host.className='c3-card-reactivation-viewport-host';
  document.body.appendChild(host);
  const cleanup=c3Mount(host,`<div class="ch3-card-activation-scene"><div class="ch3-card-activation-beam"></div><div class="ch3-card-activation-aura"></div><div class="ch3-card-activation-ring r1"></div><div class="ch3-card-activation-ring r2"></div><img class="ch3-card-activation-image" src="/assets/chapter3/story/characters/student_card_main.png" alt="빛나는 학생증"><div class="ch3-card-activation-spark s1"></div><div class="ch3-card-activation-spark s2"></div><div class="ch3-card-activation-spark s3"></div><div class="ch3-card-activation-spark s4"></div></div>`,(root,later)=>{
    const scene=root.querySelector('.ch3-card-activation-scene');
    later(()=>scene?.classList.add('is-detected'),180);
  });
  return()=>{cleanup?.();host.remove()};
};

window.STORY_CUSTOM_EFFECTS['star-status'] = ({ layer, item }) => {
  const count = String(item.count || '4 / 6');
  const locked = item.locked || [];
  return c3Mount(layer, `<div class="ch3-star-status"><strong>별 연결 상태</strong><b>${c3Esc(count)}</b>
    <div class="ch3-star-status-row">${[0,1,2,3,4,5].map((_,i)=>`<i class="${i<Number(count.split('/')[0])?'on':'off'}"></i>`).join('')}</div>
    ${locked.length ? `<p>${locked.map(x=>`<span>${c3Esc(x)}</span>`).join('')}</p>` : ''}${item.caption?`<em>${c3Esc(item.caption)}</em>`:''}</div>`);
};

window.STORY_CUSTOM_EFFECTS['pressure-words'] = ({ layer, item }) => c3Mount(layer, `
  <div class="ch3-pressure-words">${(item.words||[]).map((w,i)=>`<span style="left:${8+i*11}%;top:${12+(i%5)*14}%;animation-delay:${(-i*.22).toFixed(2)}s">${c3Esc(w)}</span>`).join('')}<strong>오염 농도 임계치 초과</strong></div>`);

window.STORY_CUSTOM_EFFECTS['battle-summary'] = ({ layer, item, api }) => {
  api.setMode('story');
  return c3Mount(layer, `<div class="ch3-battle-summary"><small>SYSTEM RECOVERY</small><strong>일반 오염 파편 정화</strong>${(item.messages||[]).map((m,i)=>`<div style="animation-delay:${(i*.35).toFixed(2)}s">${c3Esc(m)}</div>`).join('')}</div>`);
};



window.STORY_CUSTOM_EFFECTS['work-checklist'] = ({ layer, item }) => c3Mount(layer, `
  <div class="ch3-work-check"><strong>마지막 과제</strong>${(item.tasks||[]).map((t,i)=>`<div style="animation-delay:${(i*.32).toFixed(2)}s"><i>✓</i><span>${c3Esc(t)}</span></div>`).join('')}</div>`);

window.STORY_CUSTOM_EFFECTS['future-signs'] = ({ layer, item }) => c3Mount(layer, `
  <div class="ch3-future-signs">${(item.words||[]).map((w,i)=>`<span style="left:${8+i*11}%;top:${14+(i%4)*17}%;animation-delay:${(-i*.2).toFixed(2)}s">${c3Esc(w)}</span>`).join('')}<strong>졸업 이후</strong></div>`);



window.STORY_CUSTOM_EFFECTS['flashback-summary'] = ({ layer }) => c3Mount(layer, `
  <div class="ch3-flashback"><strong>지금까지의 호반우</strong>
    <div><b>CHAPTER 1</b><span>아무것도 모르는 것이 두려웠던 신입생</span></div>
    <div><b>CHAPTER 2</b><span>모든 것을 혼자 해결하려 했던 팀프로젝트</span></div>
    <div><b>CHAPTER 3</b><span>학교 밖의 미래를 두려워하는 졸업예정자</span></div>
  </div>`);

window.STORY_CUSTOM_EFFECTS['star-reaction'] = ({ layer, item }) => c3Mount(layer, `
  <div class="ch3-star-reaction"><strong>별 반응</strong><div>${(item.stars||[]).map(s=>`<span><i></i>${c3Esc(s)}</span>`).join('')}</div></div>`);

window.STORY_CUSTOM_EFFECTS['teamwork-flashback'] = ({ layer }) => c3Mount(layer, `
  <div class="ch3-c2-flashback"><small>CHAPTER 2 MEMORY</small><strong>혼자 하던 일을 함께 끝냈던 기억</strong><div>역할 재분배</div><div>완료된 PPT</div><div>완료된 보고서</div><p>민재·소연·준호는 현재 전투에 개입하지 않습니다.</p></div>`);

window.STORY_CUSTOM_EFFECTS['stars-dim'] = ({ layer, item }) => c3Mount(layer, `
  <div class="ch3-stars-dim"><strong>${c3Esc(item.from || '4 / 6')}</strong><span>→</span><b>${c3Esc(item.to || '0 / 6')}</b><div>${[1,2,3,4].map(i=>`<i style="animation-delay:${(i*.25).toFixed(2)}s"></i>`).join('')}</div></div>`);

window.STORY_CUSTOM_EFFECTS['star-relight-one'] = ({ layer, item }) => c3Mount(layer, `
  <div class="ch3-relight"><div class="ch3-relight-star"></div><strong>${c3Esc(item.star || '')}</strong><span>${c3Esc(item.text || '')}</span></div>`);

window.STORY_CUSTOM_EFFECTS['system-title'] = ({ layer, item }) => c3Mount(layer, `
  <div class="ch3-system-title"><small>SYSTEM</small><strong>${c3Esc(item.title || 'KNU GRADUATION OPERATION')}</strong></div>`);

window.STORY_CUSTOM_EFFECTS['digrion-purify'] = ({ layer, item }) => c3Mount(layer, `
  <div class="ch3-digrion-purify"><img src="/assets/chapter3/story/characters/digrion_phase2_final.png" alt="디그리온 최종 각성 형태">${(item.words||[]).map((w,i)=>`<span style="left:${12+i*15}%;top:${16+(i%4)*16}%;animation-delay:${(i*.25).toFixed(2)}s">${c3Esc(w)}</span>`).join('')}</div>`);

window.STORY_CUSTOM_EFFECTS['digrion-fade'] = ({ layer }) => c3Mount(layer, `
  <div class="ch3-digrion-fade"><img src="/assets/chapter3/story/characters/digrion_phase2_final.png" alt="디그리온 최종 각성 형태"><strong>정화</strong></div>`);

window.STORY_CUSTOM_EFFECTS['friends-cameo'] = ({ layer, item }) => c3Mount(layer, `
  <div class="ch3-friends-cameo"><strong>졸업식의 익숙한 얼굴들</strong><div>${(item.names||[]).map((n,i)=>`<span style="--i:${i}">${c3Esc(n)}</span>`).join('')}</div><p>멀리서 서로 손을 흔든 뒤 각자의 사람들에게 돌아갑니다.</p></div>`);



/* ===== CHAPTER 3 REVISED STORY EFFECTS (2030-09 ~ 2031-03) ===== */
window.STORY_CUSTOM_EFFECTS['semester-opening-title'] = ({ layer, item }) => c3Mount(layer, `
  <div class="ch3-semester-opening"><small>${c3Esc(item.date || '2030. 09. 02.')}</small><strong>${c3Esc(item.title || '4학년 2학기')}</strong><span>LAST SEMESTER</span></div>`);

window.STORY_CUSTOM_EFFECTS['story-intertitle'] = ({ layer, item }) => c3Mount(layer, `
  <div class="ch3-story-intertitle"><span></span><strong>${c3Esc(item.text || '')}</strong><i></i></div>`);

window.STORY_CUSTOM_EFFECTS['last-semester-visual'] = ({ layer, item }) => {
  const kind=String(item.kind||'multi');
  if (kind === 'cover-letter') {
    return c3Mount(layer, `<div class="ch3-cover-mini">
      <section class="mini-apply"><header><b>OO전자 신입 채용</b><span>자기소개서</span></header><small>Q1 · 지원동기 및 향후 목표</small><div class="mini-editor"><i></i><i></i><i></i><i></i></div><footer><em>0 / 700자</em><button>임시저장</button></footer></section>
      <section class="mini-chat"><header><b>ChatGPT</b><span>초안 정리</span></header><div class="mini-bubble user">자소서 문항과 내 경험을 바탕으로 초안을 작성해줘.</div><div class="mini-bubble ai"><i></i><i></i><i></i></div></section>
      <div class="mini-link">⇄</div>
    </div>`);
  }
  return c3Mount(layer, `<div class="ch3-last-semester-card kind-${c3Esc(kind)}">
    <div class="ch3-last-semester-bg"></div>
    <img src="${kind==='recruiting'?'/assets/common/characters/hobanwoo/hobanwoo_pose_relaxed_neutral_eyes_open_softly_curved_brows_straight_mouth_arms_down.png':'/assets/common/characters/hobanwoo/hobanwoo_pose_thoughtful_furrowed_brows_frown_one_hand_on_chin_other_on_hip.png'}" alt="호반우">
    <section><small>LAST SEMESTER</small><strong>${c3Esc(item.title||'막학기')}</strong><div>${(item.lines||[]).map(x=>`<span>${c3Esc(x)}</span>`).join('')}</div></section>
  </div>`);
};

window.STORY_CUSTOM_EFFECTS['schedule-board'] = ({ layer, item }) => c3Mount(layer, `
  <div class="ch3-schedule-board"><small>SEPTEMBER SCHEDULE</small><strong>이번 주 일정</strong><div>${(item.items||[]).map((x,i)=>`<p><b>${String(i+1).padStart(2,'0')}</b><span>${c3Esc(x)}</span></p>`).join('')}</div></div>`);

window.STORY_CUSTOM_EFFECTS['semester-months-montage'] = ({ layer }) => c3Mount(layer, `
  <div class="ch3-months-montage">
    <div class="ch3-month-beat"><time>09.23.</time><b>캠퍼스 리크루팅</b><span>기업 설명 자료 확인</span></div>
    <div class="ch3-month-beat"><time>09.27.</time><b>자기소개서 작성</b><span>687 / 700자 · 지원서 제출 완료</span></div>
    <div class="ch3-month-beat"><time>10.05.</time><b>자격증 공부</b><span>ADsP · 기사 기출문제</span></div>
    <div class="ch3-month-beat"><time>10.12.</time><b>강의 및 과제</b><span>과제 제출 완료 · 다음 과제 D-4</span></div>
    <div class="ch3-month-beat is-fail"><time>10.18.</time><b>서류전형 결과 안내</b><span>불합격</span></div>
  </div>`);

window.STORY_CUSTOM_EFFECTS['eclass-status-glitch'] = ({ layer, item }) => c3Mount(layer, `
  <div class="ch3-site-card ch3-eclass-card ${item.refresh?'is-refresh':''}"><header><b>e-Class</b><span>출석 현황</span></header><main><small>${item.refresh?'새로고침 완료':'강의 출석 기록'}</small><strong class="from">${c3Esc(item.from||'출석')}</strong><i>→</i><strong class="to ${String(item.to||'').includes('결석')?'is-bad':'is-good'}">${c3Esc(item.to||'결석')}</strong></main></div>`);

window.STORY_CUSTOM_EFFECTS['application-status-glitch'] = ({ layer, item }) => c3Mount(layer, `
  <div class="ch3-site-card ch3-application-card ${item.noise?'has-noise':''}"><header><b>기업 채용 페이지</b><span>지원 현황</span></header><main><small>${item.refresh?'새로고침':'지원 내역'}</small><strong class="from">${c3Esc(item.from||'지원서 제출 완료')}</strong><i>→</i><strong class="to ${String(item.to||'').includes('없음')?'is-bad':'is-good'}">${c3Esc(item.to||'지원 내역 없음')}</strong></main></div>`);

window.STORY_CUSTOM_EFFECTS['student-id-auth'] = ({ layer, item }) => c3Mount(layer, `
  <div class="ch3-id-auth ${item.ok?'is-ok':'is-bad'} ${item.noise?'has-noise':''}"><img src="/assets/chapter3/story/characters/student_card_main.png" alt="학생증"><section><small>학생증 인증</small><strong>인증 중...</strong><b>${c3Esc(item.status||'등록되지 않은 사용자입니다.')}</b></section></div>`);

window.STORY_CUSTOM_EFFECTS['purple-noise'] = ({ layer, item }) => {
  const pts=[[19,27,.05],[27,63,.22],[36,42,.31],[47,76,.13],[58,33,.39],[67,58,.08],[76,24,.28],[83,71,.45],[43,21,.17],[71,82,.35],[25,79,.41],[88,46,.12],[53,55,.26],[61,18,.48],[33,52,.36],[79,37,.2],[49,69,.43],[16,48,.3],[69,43,.14],[39,31,.47],[56,84,.24],[86,59,.38]];
  const specks=pts.map(([x,y,d],i)=>`<i style="left:${x}%;top:${y}%;animation-delay:${d}s;--s:${0.7+(i%4)*.16}"></i>`).join('');
  return c3Mount(layer, `
  <div class="ch3-purple-noise ${c3Esc(item.strength||'medium')}">
    <div class="purple-bloom"></div>
    <div class="purple-haze h1"></div><div class="purple-haze h2"></div><div class="purple-haze h3"></div>
    <div class="purple-wisp w1"></div><div class="purple-wisp w2"></div>
    <div class="noise-slice s1"></div><div class="noise-slice s2"></div><div class="noise-slice s3"></div>
    <div class="purple-specks">${specks}</div>
  </div>`);
};

window.STORY_CUSTOM_EFFECTS['corruption-trace'] = ({ layer, item }) => {
  const pts=[[44,29,.05],[53,34,.24],[39,40,.42],[61,47,.17],[48,54,.31],[64,59,.5],[36,62,.12],[56,68,.37],[43,73,.22],[66,39,.44],[34,49,.28],[59,26,.35],[51,45,.09],[40,57,.47],[62,72,.19],[46,33,.4]];
  const specks=pts.map(([x,y,d],i)=>`<i style="left:${x}%;top:${y}%;animation-delay:${d}s;--s:${0.7+(i%3)*.2}"></i>`).join('');
  return c3Mount(layer, `
  <div class="ch3-corruption-trace stage-${Number(item.stage||1)}">
    <div class="trace-haze"></div><div class="trace-aura"></div>
    <div class="trace-specks">${specks}</div>
    <div class="building-swipe"><i></i><i></i><i></i></div>
    <div class="residual-glow"></div><div class="residual-ring"></div>
  </div>`);
};



window.STORY_CUSTOM_EFFECTS['battle-running'] = ({ layer, item, api }) => {
  if(new URLSearchParams(location.search).has('hostSelector'))return c3Mount(layer,'<div style="position:absolute;inset:0;background:#070611"></div>');
  api.setMode('game');
  const coreClass = item?.scene === 'graduation_core' ? ' is-digrion-core' : '';
  return c3Mount(layer, `<div class="ch3-battle-running${coreClass}"><small>CHAPTER 3</small><strong>${c3Esc(item.title||'전투 진행')}</strong><span>${c3Esc(item.subtitle||'')}</span></div>`);
};

window.STORY_CUSTOM_EFFECTS['purification-100'] = ({ layer, api }) => {
  api.setMode('story');
  return c3Mount(layer, `<div class="ch3-purification-100"><small>PURIFICATION</small><div class="meter"><i></i></div><strong><span>97%</span><span>98%</span><span>99%</span><b>100%</b></strong><em>캠퍼스 오염 제거 완료</em></div>`);
};

window.STORY_CUSTOM_EFFECTS['assignment-submit-timeline'] = ({layer,item}) => c3Mount(layer,`<div class="c3-last-submit">
  <header><small>LAST ASSIGNMENT</small><strong>최종 과제</strong></header>
  <div class="timeline">${(item.times||[]).map((t,i)=>`<span style="--i:${i}">${c3Esc(t)}</span>`).join('')}</div>
  <section><div class="selected">완성된 파일 <b>final_report.pdf</b></div><button class="upload-button">파일 업로드</button><div class="upload"><i></i><b>0%</b></div><button class="submit">제출하기</button><div class="done">✓ 제출 완료</div></section>
  <div class="c3-site-cursor" aria-hidden="true"><svg viewBox="0 0 32 42"><path d="M3 2 L27 25 L17 27 L23 39 L17 41 L11 29 L4 36 Z" fill="#fff" stroke="#111" stroke-width="2.5" stroke-linejoin="round"/></svg></div>
  <div class="c3-site-click-ring" aria-hidden="true"></div>
</div>`,(root,later)=>{
    c3BrowserOpening(root,later,{title:'KNU e-Learning · 최종 과제',url:'https://lms.knu.example/assignment/final'});
  const b=root.querySelector('.upload b'),bar=root.querySelector('.upload i');
  const mouse=c3InteractiveMouse(root);
  mouse.moveTo('.selected',.45,.5,true);
  later(()=>mouse.moveTo('.upload-button',.5,.5),2600);
  later(()=>{mouse.click('.upload-button');root.classList.add('uploading');},3300);
  later(()=>{bar.style.width='35%';b.textContent='35%'},4050);
  later(()=>{bar.style.width='68%';b.textContent='68%'},4850);
  later(()=>{bar.style.width='100%';b.textContent='100%'},5650);
  later(()=>mouse.moveTo('.submit',.5,.5),6400);
  later(()=>{mouse.click('.submit');root.classList.add('submitted');},7100);
  return ()=>mouse.cleanup();
});

window.STORY_CUSTOM_EFFECTS['core-barrier-break'] = ({ layer }) => c3Mount(layer, `
  <div class="ch3-core-barrier"><div class="barrier"></div><div class="crack c1"></div><div class="crack c2"></div><div class="crack c3"></div><strong>졸업 코어 장벽 붕괴</strong></div>`);

function c3CombatGate(layer,api,kind,seconds){
  api.setMode('game');
  return c3Mount(layer,`<div class="c3-final-gate c3-${kind}-gate" aria-label="전투 진입 연출"><canvas aria-hidden="true"></canvas><div class="c3-final-gate-vignette"></div></div>`,root=>{
    const gate=root.firstElementChild,canvas=gate.querySelector('canvas'),c=canvas.getContext('2d');if(!c)return;
    document.body.classList.add('c3-final-gate-active');
    const boss=kind==='boss',map=new Image();map.src=boss?'/assets/chapter3/combat/boss/backgrounds/chapter3_boss_map.png':'/assets/chapter3/combat/backgrounds/chapter3_wave_map.png';
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
    const started=performance.now(),cueTimes=[.01,.2,.4,.6,.82];let raf=0,cue=0,disposed=false;
    const frame=now=>{
      if(disposed)return;const t=clamp((now-started)/(seconds*1000)),r=gate.getBoundingClientRect(),w=Math.max(1,r.width),h=Math.max(1,r.height),dpr=Math.min(devicePixelRatio||1,1.5),unit=Math.min(w,h)/960;
      gate.dataset.progress=t.toFixed(3);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
      c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle='#070611';c.fillRect(0,0,w,h);
      while(cue<cueTimes.length&&t>=cueTimes[cue]){if(boss)parent.postMessage({channel:'sky-strike-chapter3-story',type:'boss-transition-cue',detail:{code:String(cue)}},location.origin);cue++;}
      c.save();c.translate(w/2,h/2);c.scale(unit,unit);const vw=w/unit,vh=h/unit,age=t*seconds,charge=ease((t-.12)/.3),rupture=ease((t-.42)/.22),exit=ease((t-.85)/.14);
      const glow=c.createRadialGradient(0,0,5,0,0,Math.max(vw,vh)*.7);glow.addColorStop(0,boss?'#793ac577':'#267d9a88');glow.addColorStop(.45,'#23163e66');glow.addColorStop(1,'#07061100');c.fillStyle=glow;c.fillRect(-vw/2,-vh/2,vw,vh);
      // A deep corridor of apertures advances across the entire viewport.
      for(let i=13;i>=0;i--){const z=((i/14+t*(boss?1.8:2.5))%1),size=40+z*z*Math.max(vw,vh)*.9,spin=reduced?0:Math.sin(t*3+i*.15)*.12;
        c.save();c.rotate(spin);c.globalAlpha=(.08+z*.38)*(1-exit);c.strokeStyle=i%3?'#b98ae8':'#efd3a0';c.lineWidth=1+z*3;c.beginPath();
        for(let j=0;j<8;j++){const a=j*Math.PI/4+Math.PI/8,x=Math.cos(a)*size,y=Math.sin(a)*size*.7;j?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.stroke();c.restore();}
      // Stars collapse inward, then burst outward as the seal fractures.
      for(let i=0;i<(boss?180:110);i++){const a=i*2.399963,base=80+i%17*43,rr=t<.47?base*(1-.78*charge):35+(t-.47)*(1000+i%13*115),x=Math.cos(a)*rr,y=Math.sin(a)*rr*.7;
        c.save();c.globalAlpha=(.2+i%5*.08)*(1-exit);c.strokeStyle=i%5?'#ad80d4':'#ffe3a8';c.lineWidth=1+i%2;c.beginPath();c.moveTo(x,y);const tail=reduced?3:12+charge*50;c.lineTo(x+Math.cos(a)*tail,y+Math.sin(a)*tail*.7);c.stroke();c.restore();}
      for(let ring=0;ring<(boss?7:4);ring++){c.save();c.rotate((reduced?0:age*.13)*(ring%2?-1:1)+ring*.31);c.globalAlpha=(.25+.35*charge)*(1-exit);c.strokeStyle=ring%2?'#c698ef':'#f2d09a';c.lineWidth=ring?1.5:4;c.setLineDash([20+ring*5,13,3,13]);c.beginPath();c.ellipse(0,0,(135+ring*38)*(1-.6*charge+rupture*3),(135+ring*38)*(1-.6*charge+rupture*3)*.6,0,0,Math.PI*2);c.stroke();c.restore();}
      // Six cracks reach the borders; their moving plates reveal the core light.
      if(t>.34&&t<.83){const crack=ease((t-.34)/.16),spread=ease((t-.49)/.26);c.save();c.globalAlpha=(1-ease((t-.7)/.13))*.8;c.strokeStyle='#ebc6ff';c.shadowColor='#ba71f1';c.shadowBlur=18;c.lineWidth=2;
        for(let k=0;k<6;k++){const a=k*Math.PI/3;c.beginPath();c.moveTo(0,0);for(let j=1;j<=10;j++){const r=j*120*crack,aa=a+Math.sin(j*4.3+k)*.045;c.lineTo(Math.cos(aa)*r,Math.sin(aa)*r);}c.stroke();}
        const beam=c.createLinearGradient(-80-180*spread,0,80+180*spread,0);beam.addColorStop(0,'#a65de000');beam.addColorStop(.46,'#d9b9f3bb');beam.addColorStop(.5,'#fff1d7');beam.addColorStop(.54,'#d9b9f3bb');beam.addColorStop(1,'#a65de000');c.fillStyle=beam;c.fillRect(-80-180*spread,-vh/2,160+360*spread,vh);c.restore();}
      if(t>.48){for(let i=0;i<4;i++){const q=(t-.48)*5-i*.2;if(q<0||q>2)continue;c.save();c.globalAlpha=(1-ease(q/2))*.6*(1-exit);c.strokeStyle=i%2?'#b980ed':'#ffe8bb';c.lineWidth=i?3:9;c.beginPath();c.ellipse(0,0,q*900,q*600,0,0,Math.PI*2);c.stroke();c.restore();}}
      // The physical battle rectangle appears at its normal scale, never as a squeezed sprite.
      if(t>.79&&map.complete&&map.naturalWidth){const reveal=ease((t-.79)/.13);c.save();c.globalAlpha=reveal*(1-ease((t-.965)/.035));c.beginPath();c.rect(-461,-480,922,960);c.clip();const scale=922/map.naturalWidth;c.drawImage(map,-461,-480,922,map.naturalHeight*scale);c.fillStyle=`rgba(7,6,17,${.55*(1-reveal)})`;c.fillRect(-461,-480,922,960);c.restore();}
      const cover=1-ease(t/.08)+ease((t-.965)/.035);if(cover>0){c.fillStyle=`rgba(7,6,17,${clamp(cover)})`;c.fillRect(-vw/2,-vh/2,vw,vh);}c.restore();
      if(t<1)raf=requestAnimationFrame(frame);
    };
    raf=requestAnimationFrame(frame);return()=>{disposed=true;cancelAnimationFrame(raf);document.body.classList.remove('c3-final-gate-active');};
  });
}
window.STORY_CUSTOM_EFFECTS['boss-battle-transition']=({layer,api})=>c3CombatGate(layer,api,'boss',18);

window.STORY_CUSTOM_EFFECTS['boss-transition'] = ({ layer, item, api }) => {
  api.setMode('story');
  return c3Mount(layer, `<div class="ch3-boss-transition"><div class="energy"></div><img src="/assets/chapter3/story/characters/digrion_phase2_final.png" alt="디그리온 최종 각성 형태"><small>PHASE ${c3Esc(item.phase||'2')} TRANSITION</small><strong>${c3Esc(item.title||'형태 변화')}</strong><span>${c3Esc(item.subtitle||'')}</span></div>`);
};

window.STORY_CUSTOM_EFFECTS['ui-collapse'] = ({ layer, api }) => {
  api.setMode('story');
  return c3Mount(layer, `<div class="ch3-ui-collapse"><div class="panel p1">졸업학점</div><div class="panel p2">전공필수</div><div class="panel p3">시간표</div><div class="panel p4">과제</div><strong>남는 것은 미래뿐이다.</strong></div>`);
};





window.STORY_CUSTOM_EFFECTS['semester-end-title'] = ({ layer, item }) => c3Mount(layer, `
  <div class="ch3-semester-end"><small>${c3Esc(item.date||'2030. 12. 20.')}</small><strong>${c3Esc(item.title||'4학년 2학기 종료')}</strong><span>LAST SEMESTER COMPLETE</span></div>`);



window.STORY_CUSTOM_EFFECTS['degree-ceremony-opening'] = ({ layer }) => c3Mount(layer, `
  <div class="ch3-degree-ceremony"><small>KYUNGPOOK NATIONAL UNIVERSITY</small><strong>2030학년도 전기 학위수여식</strong><span>졸업생 여러분의 새로운 출발을 축하합니다.</span></div>`);

window.STORY_CUSTOM_EFFECTS['graduate-name-list'] = ({ layer, item }) => c3Mount(layer, `
  <div class="ch3-graduate-list"><small>졸업생 명단</small><div class="names"><span>김○○</span><span>박○○</span><b>${c3Esc(item.name||'호반우')}</b><span>이○○</span><span>최○○</span></div></div>`);

window.STORY_CUSTOM_EFFECTS['diploma-screen'] = ({ layer, item }) => c3Mount(layer, `
  <div class="ch3-diploma ch3-diploma-image087"><img src="/assets/chapter3/story/illustrations/hobanwoo_degree_certificate.png" alt="호반우의 경북대학교 학위증서"></div>`);

/* Final ending handoff: the React host now owns whiteout, logo, rolling credits, and completion timing. */
window.STORY_CUSTOM_EFFECTS['chapter-ending'] = ({ layer }) => c3Mount(layer, `
  <div class="ch3-final-ending-handoff" aria-hidden="true"></div>`);



window.STORY_CUSTOM_EFFECTS['graduation-portal-static'] = ({ layer }) => {
  const result=c3PortalResultMarkup('overview').replaceAll('2030-11-18','2030-11-21');
  return c3Mount(layer, `<div class="ch3-portal-sequence ch3-portal-static">${c3PortalChromeMarkup(result, false)}<div class="ch3-static-note">※ 현재 학기 정상 이수 기준</div></div>`);
};
window.STORY_CUSTOM_EFFECTS['four-stars-memory'] = ({ layer, api }) => {
  api.setMode('story');
  return c3Mount(layer, `<div class="ch3-four-stars-memory"><small>MEMORY</small><strong>지금까지의 네 개의 별</strong><div><span><i></i>출석의 별</span><span><i></i>과제의 별</span><span><i></i>시험의 별</span><span><i></i>팀플의 별</span></div><p>이전 챕터의 기억이 짧게 스쳐 지나갑니다.</p></div>`);
};

/* ===== CHAPTER 3 STORY REVISION 2026-09-05 / SCENES 1-46 ===== */

/* Generic full-screen browser opening for every site-like sequence. */
function c3BrowserOpening(root,later,{title='웹 페이지',url='https://example.com',skipIntro=false}={}){
  root.classList.add('c3-has-browser-frame');
  const markup = (mini=false) => `
    <div class="${mini?'c3-chrome-mini':'c3-browser-topbar'}">
      <div class="chrome-tab-row">
        <div class="chrome-tab active"><b>${c3Esc(title)}</b><em>×</em></div>
        <button class="chrome-new-tab" type="button">＋</button>
        <div class="chrome-row-spacer"></div>
        <div class="chrome-window-controls"><button type="button">—</button><button type="button">□</button><button type="button">×</button></div>
      </div>
      <div class="chrome-toolbar-row">
        <div class="chrome-nav"><button type="button">←</button><button type="button">→</button><button type="button">↻</button></div>
        <div class="chrome-address"><strong>${c3Esc(url)}</strong></div>
        <div class="chrome-actions"><button type="button">☆</button><span class="chrome-profile">●</span><button type="button">⋮</button></div>
      </div>
    </div>`;
  const chrome=document.createElement('div');
  chrome.innerHTML=markup(false);
  const top=chrome.firstElementChild;
  root.appendChild(top);
  if(skipIntro){root.classList.add('c3-browser-ready');return;}
  root.classList.add('c3-browser-intro-running');
  const intro=document.createElement('div');
  intro.className='c3-browser-launch';
  intro.innerHTML=`<div class="desktop"></div><div class="window">${markup(true)}<div class="chrome-page-loading"><span></span><b>페이지를 여는 중...</b></div></div>`;
  root.appendChild(intro);
  later(()=>root.classList.add('c3-browser-window-show'),120);
  later(()=>root.classList.add('c3-browser-window-max'),620);
  later(()=>root.classList.add('c3-browser-loading'),1020);
  later(()=>root.classList.add('c3-browser-ready'),1500);
  later(()=>{root.classList.remove('c3-browser-intro-running');intro.classList.add('fade-out')},1690);
  later(()=>intro.remove(),2020);
}





window.STORY_CUSTOM_EFFECTS['recruiting-montage'] = ({layer,item}) => c3Mount(layer,`<div class="c3-recruiting-montage"><time>${c3Esc(item.date||'09.23.')}</time><section><small>KNU CAMPUS RECRUITING</small><strong>${c3Esc(item.title||'캠퍼스 리크루팅')}</strong><div class="booths"><i>기업 상담</i><i>직무 설명</i><i>채용 안내</i></div></section><img src="/assets/common/characters/hobanwoo/hobanwoo_pose_relaxed_neutral_eyes_open_softly_curved_brows_straight_mouth_arms_down.png" alt="호반우"></div>`);


/* Responsive DOM-anchored mouse for site interaction scenes.
   The pointer is positioned from the live target element's bounding box,
   so it stays aligned even when the game/browser viewport changes size. */
function c3InteractiveMouse(root, cursorSelector='.c3-site-cursor', ringSelector='.c3-site-click-ring'){
  const cursor=root.querySelector(cursorSelector);
  const ring=root.querySelector(ringSelector);
  let current=null;
  const getParentRect=(el)=>{
    const parent=el?.offsetParent;
    return parent?.getBoundingClientRect?.() || root.getBoundingClientRect();
  };
  const pointFor=(el,target,xRatio=.5,yRatio=.5)=>{
    const parent=el?.offsetParent;
    const pr=getParentRect(el),tr=target.getBoundingClientRect();
    const scaleX=parent?.clientWidth ? (pr.width / parent.clientWidth) : 1;
    const scaleY=parent?.clientHeight ? (pr.height / parent.clientHeight) : scaleX;
    return {
      x:(tr.left-pr.left+tr.width*xRatio)/Math.max(.001,scaleX||1),
      y:(tr.top-pr.top+tr.height*yRatio)/Math.max(.001,scaleY||1)
    };
  };
  const moveTo=(selector,xRatio=.5,yRatio=.5,immediate=false)=>{
    const target=root.querySelector(selector);
    if(!target||!cursor)return;
    current={selector,xRatio,yRatio};
    const p=pointFor(cursor,target,xRatio,yRatio);
    if(immediate)cursor.classList.add('no-transition');
    cursor.style.left=`${p.x}px`;
    cursor.style.top=`${p.y}px`;
    if(immediate){void cursor.offsetWidth;requestAnimationFrame(()=>cursor.classList.remove('no-transition'));}
  };
  const click=(selector)=>{
    if(selector){
      const old=current,same=old&&old.selector===selector;
      if(!same)moveTo(selector,.5,.5,true);
      current={selector,xRatio:same?old.xRatio:.5,yRatio:same?old.yRatio:.5};
    }
    if(!cursor)return;
    const target=current?root.querySelector(current.selector):null;
    if(target&&current){
      const p=pointFor(cursor,target,current.xRatio,current.yRatio);
      cursor.style.left=`${p.x}px`;cursor.style.top=`${p.y}px`;
      if(ring){
        const rp=pointFor(ring,target,current.xRatio,current.yRatio);
        ring.style.left=`${rp.x}px`;ring.style.top=`${rp.y}px`;
      }
    }
    cursor.classList.remove('is-clicking');if(ring)ring.classList.remove('is-active');void cursor.offsetWidth;
    cursor.classList.add('is-clicking');if(ring)ring.classList.add('is-active');
    if(target){target.classList.remove('c3-mouse-target-click');void target.offsetWidth;target.classList.add('c3-mouse-target-click');setTimeout(()=>target.classList.remove('c3-mouse-target-click'),360);}
    setTimeout(()=>cursor.classList.remove('is-clicking'),220);if(ring)setTimeout(()=>ring.classList.remove('is-active'),520);
  };
  const refresh=()=>{if(current)moveTo(current.selector,current.xRatio,current.yRatio,true)};
  window.addEventListener('resize',refresh);window.addEventListener('scroll',refresh,true);
  return {moveTo,click,refresh,cleanup:()=>{window.removeEventListener('resize',refresh);window.removeEventListener('scroll',refresh,true);}};
}


window.STORY_CUSTOM_EFFECTS['job-posting-browse'] = ({layer,item}) => c3Mount(layer,`<div class="c3-job-posting-browser">
  <div class="c3-job-posting-date">${c3Esc(item.date||'09.24.')}</div>
  <header><div class="brand"><small>OO ELECTRONICS CAREERS</small><b>채용공고</b></div><div class="top-actions"><span>회사소개</span><span>직무소개</span><span class="active">채용공고</span><span>마이페이지</span></div></header>
  <section class="c3-job-hero"><div><small>2030 FALL RECRUITING</small><strong>2030 하반기 신입사원 채용</strong><p>제품개발 · 연구개발 · 생산기술 · 품질 · SW 직무에서 신입 인재를 모집합니다.</p></div><div class="stats"><b class="result-count">전체 공고 18건</b><span>서류마감 09.29 17:00</span></div></section>
  <section class="c3-job-toolbar">
    <label class="search-box"><span>⌕</span><input class="job-keyword-input" value="" readonly placeholder="직무 또는 키워드 검색"><button class="job-search-button">검색</button></label>
    <div class="chips"><button class="chip chip-new">신입</button><button class="chip chip-rnd">연구개발</button><button class="chip chip-mech">기구/기계</button><button class="chip">생산기술</button><button class="chip">품질</button><button class="chip">SW</button></div>
  </section>
  <section class="c3-job-board">
    <aside class="filters"><div class="group"><strong>모집구분</strong><button class="filter-btn filter-fresh">신입</button><button class="filter-btn">인턴</button><button class="filter-btn">경력</button></div><div class="group"><strong>직무</strong><button class="filter-btn filter-rnd">연구개발</button><button class="filter-btn">생산기술</button><button class="filter-btn">품질</button><button class="filter-btn">IT/SW</button></div><div class="group"><strong>전형절차</strong><ul><li>서류접수</li><li>직무적합성 검토</li><li>면접전형</li><li>최종합격</li></ul></div></aside>
    <main class="posting-list"></main>
    <section class="posting-detail" aria-hidden="true">
      <div class="detail-head"><small>OO ELECTRONICS · 연구개발</small><h3>제품 기구설계 R&D</h3><p>제품 구조 설계, 기구 부품 검증, CAE 기반 구조·열 해석 및 양산 이슈 개선 업무를 수행합니다.</p></div>
      <div class="detail-meta"><i>근무지 · 구미</i><i>지원자격 · 학사/석사</i><i>모집형태 · 신입</i></div>
      <div class="detail-tabs"><button class="tab-btn active tab-summary">직무소개</button><button class="tab-btn tab-qual">지원자격</button><button class="tab-btn tab-pref">우대사항</button><button class="tab-btn tab-process">전형절차</button></div>
      <div class="detail-panels"><div class="panel panel-summary active"><ul><li>제품 구조 및 기구 부품 설계</li><li>시제품 조립성·내구성 검증</li><li>열/구조 해석을 통한 설계 개선</li></ul></div><div class="panel panel-qual"><ul><li>기계공학, 메카트로닉스 등 관련 전공</li><li>기구 설계 및 도면 해석 기초 역량</li><li>실험 결과 분석 및 문서화 역량</li></ul></div><div class="panel panel-pref"><ul><li>CAD/CAE 프로젝트 경험</li><li>3D CAD 또는 구조·열 해석 프로젝트 경험</li><li>캡스톤디자인 및 시제품 제작 경험</li></ul></div><div class="panel panel-process"><ol><li>서류전형</li><li>직무적합성 검토</li><li>1차 직무면접</li><li>최종면접</li></ol></div></div>
      <div class="detail-actions"><button class="scrap">☆ 관심공고</button><button class="apply">지원하기</button></div><div class="apply-toast">지원서 작성 화면으로 이동</div>
    </section>
  </section>
  <div class="c3-job-browse-cursor c3-site-cursor" aria-hidden="true"><svg viewBox="0 0 32 42"><path d="M3 2 L27 25 L17 27 L23 39 L17 41 L11 29 L4 36 Z" fill="#fff" stroke="#111" stroke-width="2.5" stroke-linejoin="round"/></svg></div><div class="c3-site-click-ring" aria-hidden="true"></div><div class="browse-caption"></div>
</div>`,(root,later)=>{
  c3BrowserOpening(root,later,{title:'OO Electronics Careers · 채용공고',url:'https://careers.oo-electronics.example/jobs'});
  const scene=root.querySelector('.c3-job-posting-browser'),input=scene?.querySelector('.job-keyword-input'),list=scene?.querySelector('.posting-list'),count=scene?.querySelector('.result-count'),caption=scene?.querySelector('.browse-caption'),detail=scene?.querySelector('.posting-detail');
  const mouse=c3InteractiveMouse(root,'.c3-job-browse-cursor','.c3-site-click-ring'),intervals=[];
  const cards={
    all:[['경력','모바일 플랫폼 SW 개발','#경력 #SW #수원','플랫폼개발실'],['신입','제품 기구설계 R&D','#신입 #연구개발 #구미','제품개발센터'],['인턴','기구 신뢰성 평가','#인턴 #품질 #구미','신뢰성평가팀'],['신입','반도체 공정기술','#신입 #생산기술 #평택','공정기술팀'],['경력','CAE 구조해석 R&D','#경력 #연구개발 #수원','선행기술연구소'],['신입','제품 품질보증','#신입 #품질 #경산','품질보증팀']],
    searched:[['신입','제품 기구설계 R&D','#신입 #연구개발 #구미','제품개발센터'],['인턴','기구 신뢰성 평가','#인턴 #품질 #구미','신뢰성평가팀'],['경력','CAE 구조해석 R&D','#경력 #연구개발 #수원','선행기술연구소'],['신입','모듈 기구설계','#신입 #연구개발 #구미','모듈개발팀']],
    fresh:[['신입','제품 기구설계 R&D','#신입 #연구개발 #구미','제품개발센터'],['신입','모듈 기구설계','#신입 #연구개발 #구미','모듈개발팀'],['신입','제품 품질보증','#신입 #품질 #경산','품질보증팀']],
    rnd:[['신입','제품 기구설계 R&D','#신입 #연구개발 #구미','제품개발센터'],['신입','모듈 기구설계','#신입 #연구개발 #구미','모듈개발팀']]
  };
  const render=(stage)=>{if(!list)return;const arr=cards[stage]||cards.all;list.classList.add('is-refreshing');setTimeout(()=>{list.innerHTML=arr.map((c,i)=>`<button class="posting-card ${i===0?'card-target':''}"><small>${c[0]}</small><b>${c[1]}</b><span>${c[2]}</span><em>${c[3]}</em></button>`).join('');list.classList.remove('is-refreshing');mouse.refresh();},180);if(count)count.textContent=`검색 결과 ${arr.length}건`;scene?.setAttribute('data-result-stage',stage)};
  const setCaption=(t)=>{if(caption){caption.textContent=t||'';caption.classList.toggle('show',!!t)}};
  const typeInto=(el,text,duration)=>{let i=0;const step=Math.max(25,Math.floor(duration/Math.max(1,text.length)));const id=setInterval(()=>{i=Math.min(text.length,i+1);el.value=text.slice(0,i);if(i>=text.length)clearInterval(id)},step);intervals.push(id)};
  const switchTab=(tab)=>{scene?.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));scene?.querySelectorAll('.panel').forEach(x=>x.classList.remove('active'));scene?.querySelector('.tab-'+tab)?.classList.add('active');scene?.querySelector('.panel-'+tab)?.classList.add('active')};
  render('all');mouse.moveTo('.search-box',.55,.55,true);
  later(()=>{mouse.moveTo('.search-box',.5,.55);setCaption('직무 키워드 검색');},2200);
  later(()=>{mouse.click('.search-box');scene?.classList.add('focus-search');typeInto(input,'기구설계',1550);},2900);
  later(()=>{mouse.moveTo('.job-search-button',.5,.5);setCaption('검색 실행');},4850);
  later(()=>{mouse.click('.job-search-button');render('searched');scene?.classList.add('searched');},5550);
  later(()=>{mouse.moveTo('.chip-new',.5,.5);setCaption('신입 공고 필터');},6400);
  later(()=>{mouse.click('.chip-new');scene?.classList.add('filtered-new');render('fresh');scene?.querySelector('.filter-fresh')?.classList.add('active');},7100);
  later(()=>{mouse.moveTo('.chip-rnd',.5,.5);setCaption('연구개발 직무 필터');},7900);
  later(()=>{mouse.click('.chip-rnd');scene?.classList.add('filtered-rnd');render('rnd');scene?.querySelector('.filter-rnd')?.classList.add('active');},8600);
  later(()=>{mouse.moveTo('.card-target',.52,.45);setCaption('제품 기구설계 공고 확인');},9500);
  later(()=>{mouse.click('.card-target');scene?.classList.add('detail-open');detail?.setAttribute('aria-hidden','false');},10200);
  later(()=>{mouse.moveTo('.tab-qual');setCaption('지원자격 확인');},11100);later(()=>{mouse.click('.tab-qual');switchTab('qual')},11700);
  later(()=>{mouse.moveTo('.tab-pref');setCaption('우대사항 확인');},12300);later(()=>{mouse.click('.tab-pref');switchTab('pref')},12900);
  later(()=>{mouse.moveTo('.tab-process');setCaption('전형절차 확인');},13500);later(()=>{mouse.click('.tab-process');switchTab('process')},14100);
  later(()=>{mouse.moveTo('.apply');setCaption('지원하기');},14800);later(()=>{mouse.click('.apply');scene?.classList.add('applying');setCaption('지원서 작성 화면으로 이동')},15450);
  return ()=>{intervals.forEach(clearInterval);mouse.cleanup()};
});

window.STORY_CUSTOM_EFFECTS['job-application-submit'] = ({layer,item}) => {
  const question=`지원 직무를 수행하기 위해 준비한 경험과 본인의 강점을 구체적으로 작성하고, 입사 후 어떤 방식으로 기여하고 싶은지 서술해 주세요. (700자 이내)`;
  const prompt=`자기소개서 문항:\n"${question}"\n\n이 문항 답변 초안을 700자 이내로 작성해줘.\n\n지원 직무는 제품 기구설계 R&D야. 기계공학 전공이고, 실험 데이터를 분석하면서 오차 원인을 찾고 여러 조건을 비교해 성능을 개선한 프로젝트 경험이 있어. 팀 프로젝트에서 일정이 밀렸을 때 역할을 다시 정리하고 마감까지 결과물을 완성한 경험도 있어.\n\n조건:\n1. 실제 행동과 문제 해결 과정이 드러나게 작성해줘.\n2. 열정, 도전, 성장 같은 추상적인 단어를 반복하지 말아줘.\n3. 프로젝트 경험 → 문제 해결 방식 → 직무 연결 → 입사 후 목표 순으로 자연스럽게 써줘.\n4. 너무 완벽한 문장보다는 내가 직접 수정할 수 있는 초안 느낌으로 작성해줘.`;
  const aiDraft=`프로젝트에서 측정 데이터가 예상과 다르게 나타나는 문제를 다루면서 원인을 데이터로 좁혀 가는 과정을 경험했습니다. 여러 조건과 분석 방법을 비교하고 결과가 예상과 다를 때마다 실험 조건을 다시 확인해 성능을 개선했습니다. 팀 프로젝트에서는 일정이 지연되자 남은 업무를 다시 나누고 진행 상황을 정리해 마감까지 결과물을 완성했습니다. 이러한 경험을 바탕으로 제품 기구설계 업무에서도 설계 결과를 단순히 확인하는 데 그치지 않고 실험과 데이터를 통해 원인을 검증하며 개선안을 찾고 싶습니다. 입사 후에는 구조 설계와 검증 과정을 빠르게 익히고 실제 제품의 신뢰성을 높이는 엔지니어로 기여하겠습니다.`;
  const editTarget=`이러한 경험을 바탕으로 제품 기구설계 업무에서도 설계 결과를 단순히 확인하는 데 그치지 않고 실험과 데이터를 통해 원인을 검증하며 개선안을 찾고 싶습니다.`;
  const replacement=`제품 기구설계 업무에서도 결과를 그냥 확인하고 넘기기보다 시험 결과와 데이터를 함께 보면서 원인을 찾고, 필요한 설계 수정까지 직접 이어가겠습니다.`;
  return c3Mount(layer, `<div class="c3-cover-workflow">
    <div class="c3-cover-date">${c3Esc(item.date||'09.27.')}</div>
    <section class="c3-cover-apply">
      <div class="c3-cover-entry"><div><small>OO ELECTRONICS CAREERS</small><strong>2030 하반기 신입사원 채용</strong><span>제품 기구설계 R&D · 지원서 작성</span></div><button class="open-application">지원서 작성 / 수정</button></div>
      <header><div><small>OO ELECTRONICS CAREERS</small><b>2030 하반기 신입사원 채용</b></div><span>자기소개서 작성</span></header>
      <nav><i>모집 직무</i><i>개인정보</i><i>학력</i><i>경험</i><i class="active">자기소개서</i></nav>
      <main><div class="c3-cover-question-list"><button class="active"><b>Q1</b><span>직무 준비 경험과 입사 후 기여</span><em>700자</em></button><button><b>Q2</b><span>문제 해결 및 협업 경험</span><em>700자</em></button><button><b>Q3</b><span>직무 핵심역량과 준비 과정</span><em>700자</em></button></div><div class="c3-cover-editor-wrap"><small class="c3-cover-question-text">Q1. ${c3Esc(question)}</small><div class="c3-cover-editor" aria-label="자기소개서 입력 영역"></div><div class="c3-cover-editor-status"><span class="edit-state">문항 확인 중</span><em><b class="char-count">0</b> / 700자</em></div><div class="c3-cover-actions"><button>임시저장</button><button class="submit">지원서 제출</button></div></div></main>
    </section>
    <section class="c3-cover-chat">
      <aside class="gpt-sidebar"><div class="gpt-brand"><b>ChatGPT</b><span>⌕　▣</span></div><button class="new-chat">✎　새 채팅</button><div class="gpt-history"><small>최근</small><button>열전달 과제 질문</button><button class="active">제품 기구설계 자소서 초안</button><button>ADsP 기출문제 오답 정리</button><button>재료역학 과제 정리</button><button>기계공학 면접 예상 질문</button><button>동역학 문제풀이</button><button>캡스톤 최종보고서 초안</button></div><div class="gpt-profile"><b>EET Lab.</b><small>Business</small></div></aside>
      <div class="gpt-main"><header class="gpt-header"><div><span class="folder">▣</span><b>호반우</b></div><div><button>더 보기⌄</button><button>⇧ 공유하기</button><button>•••</button></div></header><div class="gpt-empty"><h2>무엇을 도와드릴까요?</h2></div><div class="c3-chat-scroll"><div class="c3-chat-user-msg"></div><div class="c3-chat-thinking"><span></span><span></span><span></span><em>답변을 작성하는 중...</em></div><div class="c3-chat-ai-msg"><strong>ChatGPT</strong><p></p><button class="copy-answer">복사</button></div></div><div class="c3-chat-input"><div class="typed-prompt"></div><div class="gpt-input-tools"><button>＋</button><button>도구</button></div><button class="send">↑</button></div><small class="gpt-disclaimer">ChatGPT는 실수를 할 수 있습니다. 중요한 정보는 확인해 주세요.</small><div class="c3-copy-toast">답변이 복사되었습니다.</div></div>
    </section>
    <div class="c3-cover-cursor c3-site-cursor" aria-hidden="true"><svg viewBox="0 0 32 42"><path d="M3 2 L27 25 L17 27 L23 39 L17 41 L11 29 L4 36 Z" fill="#fff" stroke="#111" stroke-width="2.5" stroke-linejoin="round"/></svg></div><div class="c3-site-click-ring" aria-hidden="true"></div><div class="c3-cover-action-label"></div><div class="c3-cover-edit-badge">선택 문장 직접 수정 중</div><div class="c3-cover-confirm"><strong>지원서를 제출하시겠습니까?</strong><div><button>취소</button><button class="ok">확인</button></div></div><div class="c3-cover-done"><b>✓</b><strong>지원서가 정상적으로 제출되었습니다.</strong><span>접수번호 2030-09-27-0421</span></div>
  </div>`,(root,later)=>{
    c3BrowserOpening(root,later,{title:'OO Electronics Careers · 자기소개서',url:'https://careers.oo-electronics.example/apply'});
    const scene=root.querySelector('.c3-cover-workflow'),intervals=[],typed=root.querySelector('.typed-prompt'),userMsg=root.querySelector('.c3-chat-user-msg'),thinking=root.querySelector('.c3-chat-thinking'),aiBox=root.querySelector('.c3-chat-ai-msg'),aiP=root.querySelector('.c3-chat-ai-msg p'),editor=root.querySelector('.c3-cover-editor'),count=root.querySelector('.char-count'),state=root.querySelector('.edit-state'),label=root.querySelector('.c3-cover-action-label');
    const mouse=c3InteractiveMouse(root,'.c3-cover-cursor','.c3-site-click-ring');
    const setLabel=t=>{if(label){label.textContent=t||'';label.classList.toggle('show',!!t)}};
    const typeInto=(el,text,duration,onDone)=>{const started=performance.now();let finished=false;const id=setInterval(()=>{const p=Math.min(1,Math.max(0,(performance.now()-started)/Math.max(1,duration)));const i=Math.min(text.length,Math.max(1,Math.floor(text.length*p)));el.textContent=text.slice(0,i);if(p>=1&&!finished){finished=true;clearInterval(id);onDone?.()}},16);intervals.push(id)};
    const revealChunks=(el,text,onDone)=>{const words=text.split(/\s+/),sizes=[7,6,9,5,8,10,6,7],id=setInterval(()=>{const size=sizes[(el.dataset.chunkIndex|0)%sizes.length];const from=Number(el.dataset.wordIndex||0),to=Math.min(words.length,from+size);el.textContent+=(from?' ':'')+words.slice(from,to).join(' ');el.dataset.wordIndex=String(to);el.dataset.chunkIndex=String(Number(el.dataset.chunkIndex||0)+1);if(to>=words.length){clearInterval(id);onDone?.()}},115);intervals.push(id)};
    const renderEditor=(highlight=false)=>{const idx=aiDraft.indexOf(editTarget);if(highlight&&idx>=0)editor.innerHTML=c3Esc(aiDraft.slice(0,idx))+`<mark class="edit-target">${c3Esc(editTarget)}</mark>`+c3Esc(aiDraft.slice(idx+editTarget.length));else editor.textContent=aiDraft;count.textContent=String(aiDraft.length)};
    scene?.classList.add('boot');mouse.moveTo('.open-application',.5,.5,true);
    later(()=>{mouse.moveTo('.open-application');setLabel('지원서 작성 메뉴')},2200);later(()=>{mouse.click('.open-application');scene?.classList.add('entered');setLabel('지원서 작성 화면 진입')},2950);
    later(()=>{mouse.moveTo('.c3-cover-question-list button.active');setLabel('자소서 문항 선택')},3550);later(()=>{mouse.click('.c3-cover-question-list button.active');scene?.classList.add('question-selected');state.textContent='문항 선택'},4200);
    later(()=>{mouse.moveTo('.c3-cover-question-text',.45,.55);setLabel('문항 복사')},4800);later(()=>{mouse.click('.c3-cover-question-text');scene?.classList.add('question-copied');state.textContent='문항 복사'},5400);
    later(()=>{mouse.moveTo('.c3-chat-input',.5,.45);setLabel('ChatGPT 입력창')},6150);later(()=>{
      mouse.click('.c3-chat-input');
      scene?.classList.add('typing-prompt');
      state.textContent='프롬프트 작성';
      typeInto(typed,prompt,4200,()=>{
        /* PATCH 028: 마지막 글자가 입력되는 순간 이미 버튼에 도착한 커서를 즉시 클릭합니다. */
        setLabel('프롬프트 전송');
        mouse.click('.c3-chat-input .send');
        userMsg.textContent=prompt;
        scene?.classList.add('prompt-sent','thinking');
        state.textContent='AI 초안 생성';
        thinking.classList.add('show');
        later(()=>{thinking.classList.remove('show');aiBox.classList.add('show');revealChunks(aiP,aiDraft,()=>scene?.classList.add('answer-ready'))},1200);
      });
    },6800);
    /* PATCH 028: 프롬프트 입력 종료 약 1초 전부터 전송 버튼으로 자연스럽게 이동하여 '완료 후 멈춤/순간이동'을 없앱니다. */
    later(()=>{if(scene?.classList.contains('typing-prompt')&&!scene.classList.contains('prompt-sent')){mouse.moveTo('.c3-chat-input .send');setLabel('프롬프트 전송')}},10000);
    later(()=>{mouse.moveTo('.copy-answer');setLabel('답변 복사')},15780);later(()=>{mouse.click('.copy-answer');scene?.classList.add('copied')},16380);
    later(()=>{mouse.moveTo('.c3-cover-editor',.5,.45);setLabel('초안 붙여넣기')},17180);later(()=>{mouse.click('.c3-cover-editor');renderEditor(false);state.textContent='초안 붙여넣기'},17780);
    later(()=>{renderEditor(true);state.textContent='수정할 문장 선택';mouse.moveTo('.c3-cover-editor .edit-target',.5,.5);setLabel('마음에 안 드는 문장 선택')},18780);later(()=>{mouse.click('.c3-cover-editor .edit-target');scene?.classList.add('select-edit')},19430);
    later(()=>{const target=editor.querySelector('.edit-target');if(!target)return;scene?.classList.add('manual-edit');state.textContent='선택 문장 직접 수정 중';target.textContent='';target.classList.add('is-typing');typeInto(target,replacement,2200,()=>{target.classList.remove('is-typing');target.classList.add('is-done');count.textContent=String(editor.textContent.length);state.textContent='수정 완료'})},20180);
    later(()=>{mouse.moveTo('.c3-cover-actions .submit');setLabel('지원서 제출')},22930);later(()=>{mouse.click('.c3-cover-actions .submit');scene?.classList.add('confirm')},23580);later(()=>mouse.moveTo('.c3-cover-confirm .ok'),24280);later(()=>{mouse.click('.c3-cover-confirm .ok');scene?.classList.add('done');setLabel('제출 완료')},24930);
    return ()=>{intervals.forEach(clearInterval);mouse.cleanup()};
  });
};



window.STORY_CUSTOM_EFFECTS['eclass-assignment-submit'] = ({layer,item}) => c3Mount(layer,`<div class="c3-eclass-submit">
  <header><b>KNU e-Learning</b><span>${c3Esc(item.date||'10.12.')}</span></header>
  <aside><i class="menu-home active">강의 홈</i><i>강의자료</i><i class="menu-assignment">과제</i><i>성적</i></aside>
  <main>
    <section class="c3-eclass-home"><h3>전공 강의</h3><p>강의 공지와 학습 현황을 확인할 수 있습니다.</p><div class="course-card"><b>센서공학 응용</b><span>이번 주 학습 항목 3개</span></div></section>
    <section class="c3-eclass-list"><h3>과제</h3><button class="assignment-row"><span>전공 과제</span><small>마감 2030.10.12 23:59</small><b>제출하기 ›</b></button></section>
    <section class="c3-eclass-detail"><h3>전공 과제</h3><p>제출 기한 <b>2030.10.12 23:59</b></p><button class="attach-file">파일 첨부</button><div class="file"><span>final_assignment.pdf</span><b>첨부 완료</b></div><button class="submit-assignment">제출하기</button></section>
    <div class="confirm">과제를 제출하시겠습니까? <button class="confirm-ok">확인</button></div>
    <div class="complete">✓ 제출 완료</div>
  </main>
  <div class="c3-site-cursor" aria-hidden="true"><svg viewBox="0 0 32 42"><path d="M3 2 L27 25 L17 27 L23 39 L17 41 L11 29 L4 36 Z" fill="#fff" stroke="#111" stroke-width="2.5" stroke-linejoin="round"/></svg></div>
  <div class="c3-site-click-ring" aria-hidden="true"></div>
</div>`,(root,later)=>{
    c3BrowserOpening(root,later,{title:'KNU e-Learning · 과제',url:'https://lms.knu.example/course'});
  const scene=root.querySelector('.c3-eclass-submit');
  const mouse=c3InteractiveMouse(root);
  const aside=root.querySelector('aside');
  mouse.moveTo('.menu-home',.5,.5,true);
  later(()=>mouse.moveTo('.menu-assignment',.5,.5),2400);
  later(()=>{mouse.click('.menu-assignment');scene?.classList.add('assignment-open');aside.querySelectorAll('i').forEach(x=>x.classList.remove('active'));aside.querySelector('.menu-assignment').classList.add('active');},3150);
  later(()=>mouse.moveTo('.assignment-row',.55,.5),3850);
  later(()=>{mouse.click('.assignment-row');scene?.classList.add('detail-open');},4550);
  later(()=>mouse.moveTo('.attach-file',.5,.5),5250);
  later(()=>{mouse.click('.attach-file');scene?.classList.add('attach');},5950);
  later(()=>mouse.moveTo('.submit-assignment',.5,.5),6650);
  later(()=>{mouse.click('.submit-assignment');scene?.classList.add('show-confirm');},7350);
  later(()=>mouse.moveTo('.confirm-ok',.5,.5),8050);
  later(()=>{mouse.click('.confirm-ok');scene?.classList.add('complete');},8750);
  return ()=>mouse.cleanup();
});

window.STORY_CUSTOM_EFFECTS['recruitment-result'] = ({layer,item}) => c3Mount(layer,`<div class="c3-recruit-result">
  <header><b>채용 MY PAGE</b><span>${c3Esc(item.date||'10.18.')}</span></header>
  <main><small>지원 현황</small><div class="row"><span>신입 · 연구개발</span><button class="result-check">전형 결과 확인</button></div><div class="loading">전형 결과를 확인하는 중...</div><section><small>서류전형 결과 안내</small><strong>${c3Esc(item.result||'불합격')}</strong></section></main>
  <div class="c3-site-cursor" aria-hidden="true"><svg viewBox="0 0 32 42"><path d="M3 2 L27 25 L17 27 L23 39 L17 41 L11 29 L4 36 Z" fill="#fff" stroke="#111" stroke-width="2.5" stroke-linejoin="round"/></svg></div>
  <div class="c3-site-click-ring" aria-hidden="true"></div>
</div>`,(root,later)=>{
  c3BrowserOpening(root,later,{title:'채용 MY PAGE · 전형 결과',url:'https://careers.oo-electronics.example/mypage',skipIntro:true});
  const scene=root.querySelector('.c3-recruit-result');
  const mouse=c3InteractiveMouse(root);
  mouse.moveTo('.row',.25,.5,true);
  later(()=>mouse.moveTo('.result-check',.5,.5),120);
  later(()=>{mouse.click('.result-check');scene?.classList.add('checking');},560);
  later(()=>scene?.classList.add('show-result'),1450);
  return ()=>mouse.cleanup();
});

window.STORY_CUSTOM_EFFECTS['eclass-assignment-glitch'] = ({layer,item}) => c3Mount(layer,`<div class="c3-eclass-glitch ${item.refresh?'restored':'corrupted'}">
  <header><div><small>KNU LMS</small><b>경북대학교 학습관리시스템</b></div><span>과제</span></header>
  <main><div class="crumb">강의실 &gt; 과제 &gt; 전공 과제</div><h3>전공 과제</h3><div class="assignment-status"><span>제출 상태</span><strong class="status-value">${c3Esc(item.from||'제출 완료')}</strong><small class="status-note">최종 제출 2030.10.12 22:41</small></div><div class="mini-noise"><i></i><i></i><i></i></div></main>
</div>`,(root,later)=>{
  c3BrowserOpening(root,later,{title:'경북대학교 학습관리시스템 · 과제',url:'https://lms.knu.ac.kr/course/assignment',skipIntro:!!item.refresh});
  const scene=root.querySelector('.c3-eclass-glitch'),value=scene?.querySelector('.status-value');
  if(!scene||!value)return;
  if(item.refresh){later(()=>{value.textContent=item.to||'제출 완료';scene.classList.add('status-restored')},800);return;}
  later(()=>scene.classList.add('tiny-interference'),1250);
  later(()=>{value.textContent=item.to||'미제출';scene.classList.add('status-corrupt')},1650);
  later(()=>scene.classList.remove('tiny-interference'),2450);
});

window.STORY_CUSTOM_EFFECTS['recruitment-application-glitch'] = ({layer,item}) => {
  const apps=[
    ['OO전자','제품 기구설계 R&D','신입 · 연구개발','2030-0927-0421'],
    ['OO모빌리티','차체·샤시 설계','신입 · 차량개발','2030-1002-0318'],
    ['OO중공업','생산기술 / 설비개선','신입 · 생산기술','2030-1007-0874'],
    ['OO에너지솔루션','열관리 시스템 설계','신입 · 기계개발','2030-1011-0236'],
    ['OO로보틱스','로봇 기구설계','신입 · R&D','2030-1016-0612'],
    ['OO반도체','장비 기구설계 엔지니어','신입 · 설비기술','2030-1101-0195']
  ];
  return c3Mount(layer,`<div class="c3-recruit-glitch ${item.refresh?'restored':'corrupted'}">
    <header><div><small>CAREER PORTAL</small><b>나의 지원서</b></div><nav><span>채용공고</span><span>지원 가이드</span><span class="active">나의 지원서</span></nav></header>
    <main><div class="application-heading"><h3>지원 내역</h3><b>총 6건</b></div><div class="application-list">${apps.map((a,i)=>`<div class="application-row row-${i+1}"><div class="company"><strong>${c3Esc(a[0])}</strong><small>${c3Esc(a[2])}</small></div><div class="role"><b>${c3Esc(a[1])}</b><span>접수번호 ${c3Esc(a[3])}</span></div><strong class="status-value">${c3Esc(item.from||'지원서 제출 완료')}</strong></div>`).join('')}</div><div class="local-corruption"><i></i><i></i><i></i><i></i><i></i><i></i><span></span></div></main>
  </div>`,(root,later)=>{
    c3BrowserOpening(root,later,{title:'채용 MY PAGE · 나의 지원서',url:'https://careers.example.com/mypage/applications',skipIntro:!!item.refresh});
    const scene=root.querySelector('.c3-recruit-glitch'),values=[...scene.querySelectorAll('.status-value')];
    if(item.refresh){values.forEach((v,i)=>later(()=>{v.textContent=item.to||'지원서 제출 완료';v.closest('.application-row')?.classList.add('restored-row')},500+i*110));later(()=>scene.classList.add('status-restored'),900);return;}
    later(()=>scene.classList.add('glitch-start'),950);later(()=>scene.classList.add('purple-seep'),1250);
    values.forEach((v,i)=>later(()=>{v.textContent=item.to||'지원 내역 없음';v.closest('.application-row')?.classList.add('missing-row')},1550+i*125));
    later(()=>scene.classList.add('status-missing'),2050);later(()=>scene.classList.remove('glitch-start'),3150);
  });
};



window.STORY_CUSTOM_EFFECTS['unfinished-work'] = ({layer}) => c3Mount(layer,`<div class="c3-hologram-unfinished"><div class="projector"></div><section><small>미완료 항목</small><strong>최종 과제</strong><b>미제출</b></section></div>`);















window.STORY_CUSTOM_EFFECTS['graduation-portal-static-zoom'] = ({layer}) => {
  const result=c3PortalResultMarkup('overview').replaceAll('2030-11-18','2030-11-21');
  return c3Mount(layer,`<div class="ch3-portal-sequence ch3-portal-static c3-static-zoom">${c3PortalChromeMarkup(result,false)}<div class="c3-y-focus-label">Y · Y · Y · Y</div><div class="ch3-static-note">※ 현재 학기 정상 이수 기준</div></div>`,(root,later)=>{
    const scene=root.querySelector('.c3-static-zoom');
    later(()=>scene?.classList.add('zoom-y'),650);
    later(()=>scene?.classList.add('stable'),2500);
  });
};


