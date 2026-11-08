
/* === CHAPTER3 PATCH 010 overrides === */
(function(){
  const hiddenReferenceImages = new Set([
    '/assets/chapter3/story/illustrations/job_postings_cards.png',
    '/assets/chapter3/story/illustrations/cover_letters_pile.png',
    '/assets/chapter3/story/illustrations/certificate_books_stack.png'
  ]);

  window.STORY_CUSTOM_EFFECTS['dialogue-reference-image'] = ({ layer, item }) => c3Mount(layer, `
    <div class="c3-dialogue-reference-image">
      <figure class="c3-dialogue-reference-card ${item.hideText ? 'is-plain' : ''}">
        <img src="${c3Esc(item.image || '')}" alt="${c3Esc(item.alt || item.title || '장면 참고 이미지')}">
        ${item.hideText ? '' : `<figcaption><strong>${c3Esc(item.title || '참고 이미지')}</strong>${item.caption ? `<span>${c3Esc(item.caption)}</span>` : ''}</figcaption>`}
      </figure>
    </div>`, (root, later) => {
      later(() => root.querySelector('.c3-dialogue-reference-card')?.classList.add('is-ready'), 30);
    });

  window.STORY_CUSTOM_EFFECTS['monthly-schedule'] = ({ layer, item }) => {
    const year = Number(item.year || 2030);
    const month = Number(item.month || 9);
    const events = (item.events || []).slice().sort((a, b) => Number(a.day) - Number(b.day));
    const eventMap = new Map(events.map((event, index) => [Number(event.day), { ...event, i: index }]));
    const week = ['월', '화', '수', '목', '금', '토', '일'];
    const first = (new Date(year, month - 1, 1).getDay() + 6) % 7;
    const days = new Date(year, month, 0).getDate();
    const total = Math.max(35, Math.ceil((first + days) / 7) * 7);
    const cells = [];
    const mini = [];
    for (let i = 0; i < total; i += 1) {
      const day = i - first + 1;
      if (day < 1 || day > days) {
        cells.push('<div class="c3-cal-cell is-empty"></div>');
        mini.push('<span class="mini-day is-empty"></span>');
        continue;
      }
      const found = eventMap.get(day);
      const focusClass = day >= 16 ? 'focus-window' : '';
      cells.push(`<div class="c3-cal-cell ${found ? 'has-event' : ''} ${focusClass}" ${found ? `data-event-index="${found.i}"` : ''}><b class="date">${day}</b>${found ? `<span class="event-pill">${c3Esc(found.text)}</span>` : ''}</div>`);
      mini.push(`<span class="mini-day ${found ? 'has-event' : ''}" ${found ? `data-event-index="${found.i}"` : ''}>${day}</span>`);
    }
    const agenda = events.map((event, index) => `<div class="agenda-item" data-event-index="${index}"><b>${month}/${Number(event.day)}</b><span>${c3Esc(event.text)}</span></div>`).join('');
    return c3Mount(layer, `<div class="c3-monthly-calendar${item.persistentReplay ? ' is-persistent' : ''}">
      <div class="c3-cal-shell">
        <aside class="c3-cal-sidebar">
          <button class="create-btn">＋ 만들기</button>
          <section class="mini-box"><strong>${year}년 ${month}월</strong><div class="mini-week">${week.map(day => `<b>${day}</b>`).join('')}</div><div class="mini-grid">${mini.join('')}</div></section>
          <section class="cal-list"><small>내 캘린더</small><ul><li><i class="dot blue"></i>막학기 일정</li><li><i class="dot green"></i>수업 · 과제</li><li><i class="dot orange"></i>채용 · 리크루팅</li></ul></section>
          <section class="agenda"><small>이번 달 주요 일정</small><div class="agenda-list">${agenda}</div></section>
        </aside>
        <section class="c3-cal-main">
          <div class="cal-toolbar"><div class="toolbar-left"><span class="calendar-logo">31</span><b>Google Calendar</b><strong>${year}년 ${month}월</strong></div><div class="toolbar-right"><button>오늘</button><span>‹</span><span>›</span><em>월</em></div></div>
          <div class="week">${week.map(day => `<b>${day}</b>`).join('')}</div><div class="grid">${cells.join('')}</div>
        </section>
      </div>
    </div>`, (root, later) => {
      const calendar = root.querySelector('.c3-monthly-calendar');
      root.classList.remove('c3-has-browser-frame');
      if (item.persistentReplay) {
        calendar?.classList.add('calendar-persistent-ready', 'grid-zoom');
        return;
      }
      const cal = [...root.querySelectorAll('.c3-cal-cell.has-event')];
      const miniDays = [...root.querySelectorAll('.mini-day.has-event')];
      const agendaItems = [...root.querySelectorAll('.agenda-item')];
      const allTargets = [...cal, ...miniDays, ...agendaItems];
      const byIndex = (arr, idx) => arr.find(el => Number(el.dataset.eventIndex) === idx);
      const pulseGroup = (indexes, delay) => {
        later(() => {
          indexes.forEach(idx => {
            [byIndex(cal, idx), byIndex(miniDays, idx), byIndex(agendaItems, idx)].forEach(el => el?.classList.add('group-pulse'));
          });
          if (indexes.length >= 3) calendar?.classList.add('schedule-overload');
        }, delay);
        later(() => {
          indexes.forEach(idx => {
            [byIndex(cal, idx), byIndex(miniDays, idx), byIndex(agendaItems, idx)].forEach(el => el?.classList.remove('group-pulse'));
          });
          calendar?.classList.remove('schedule-overload');
        }, delay + 820);
      };
      /* PATCH 035: the moment the browser finishes opening, immediately zoom into the actual schedule area.
         Dialogue begins only after the zoom has settled, and the focused calendar remains behind the dialogue. */
      later(() => calendar?.classList.add('grid-zoom'), 1510);
      later(() => agendaItems.forEach(el => el.classList.add('group-pulse')), 1540);
      later(() => allTargets.forEach(el => el.classList.add('group-pulse')), 1760);
      later(() => agendaItems.forEach(el => el.classList.remove('group-pulse')), 2480);
      later(() => allTargets.forEach(el => el.classList.remove('group-pulse')), 2520);
    });
  };

  const updateStoryData = () => {
    const segments = window.STORY_DATA?.segments || {};
    Object.values(segments).forEach(segment => {
      if (!Array.isArray(segment)) return;
      segment.forEach(entry => {
        if (entry?.type === 'custom-effect' && entry.effect === 'dialogue-reference-image' && hiddenReferenceImages.has(entry.image)) {
          entry.hideText = true;
          entry.title = '';
          entry.caption = '';
        }
      });
    });
  };
  updateStoryData();
})();
