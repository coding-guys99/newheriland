// js/trips.js — 我的體驗頁
document.addEventListener('DOMContentLoaded', ()=>{
  const listBox  = document.getElementById('tripsList');
  const emptyBox = document.getElementById('tripsEmpty');
  const btnBack  = document.getElementById('btnTripsBack');
  const btnExplore = document.getElementById('btnExploreTrips');

  function renderTrips(){
    const trips = JSON.parse(localStorage.getItem('hl.my.trips') || '[]');
    listBox.innerHTML = '';
    if (trips.length === 0){
      emptyBox.hidden = false;
      return;
    }
    emptyBox.hidden = true;

    trips.forEach(t=>{
      const card = document.createElement('div');
      card.className = 'trip-card';
      card.innerHTML = `
        <img src="${t.img || 'img/placeholder-trip.jpg'}" alt="">
        <div class="trip-info">
          <h3>${t.name || '未命名體驗'}</h3>
          <p>${t.desc || '無描述'}</p>
        </div>
      `;
      listBox.appendChild(card);
    });
  }

  btnBack?.addEventListener('click', ()=> showPage('profile'));
  btnExplore?.addEventListener('click', ()=> showPage('home'));

  // 初始化
  renderTrips();

  // 讓外部可呼叫刷新
  window.refreshTrips = renderTrips;
});