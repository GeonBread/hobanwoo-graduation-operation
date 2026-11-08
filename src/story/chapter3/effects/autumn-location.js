
(() => {
  window.STORY_CUSTOM_EFFECTS['autumn-campus-location-transition'] = ({ layer, item }) => c3Mount(layer, `
    <div class="c3-autumn-location099" aria-label="${c3Esc(item.title || '가을의 경북대학교')}">
      <img class="autumn-bg099" src="/assets/chapter3/story/backgrounds/campus_autumn_3weeks_v97.png" alt="가을의 경북대학교 캠퍼스">
      <div class="autumn-shade099"></div>
      <div class="autumn-copy099">
        <small>KYUNGPOOK NATIONAL UNIVERSITY</small>
        <strong>${c3Esc(item.title || '가을의 경북대학교')}</strong>
        <span>${c3Esc(item.subtitle || '종강까지 3주 전')}</span>
      </div>
    </div>`);
})();
