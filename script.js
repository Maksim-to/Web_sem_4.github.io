// === Работа с localStorage ===
const STORAGE_KEY = 'greenCarouselData';

function loadData() {
  const data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
    users: [],
    plants: [],
    offers: [],
    history: []
  };
  return data;
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let CURRENT_USER_ID = null;

// ========== Авторизация ==========
function getUsers() {
  const data = loadData();
  return Promise.resolve(data.users);
}

function showMainApp(userId) {
  CURRENT_USER_ID = userId;
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('main-app').classList.remove('hidden');
  document.getElementById('current-user-label').textContent = `Пользователь #${userId}`;
  loadMyPlants();
  loadExchangeOffers();
  loadExchangeHistory();
}

function showLoginScreen() {
  document.getElementById('main-app').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
  populateUserSelect();
}

function populateUserSelect() {
  getUsers().then(users => {
    const select = document.getElementById('login-user');
    select.innerHTML = '';
    users.forEach(u => {
      const option = document.createElement('option');
      option.value = u.id;
      option.textContent = `Пользователь ${u.id}`;
      select.appendChild(option);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  populateUserSelect();

  // Вход
  document.getElementById('login-form').addEventListener('submit', e => {
    e.preventDefault();
    const id = parseInt(document.getElementById('login-user').value);
    const pass = document.getElementById('login-pass').value.trim();
    const data = loadData();
    const user = data.users.find(u => u.id === id && u.password === pass);
    if (user) {
      showMainApp(id);
    } else {
      alert('Неверный ID или пароль');
    }
  });

  // Регистрация
  document.getElementById('register-user').addEventListener('click', () => {
    const pass = prompt('Введите 4-значный пароль:');
    if (!/^\d{4}$/.test(pass)) {
      alert('Пароль должен состоять из 4 цифр.');
      return;
    }
    const data = loadData();
    const newId = data.users.length ? Math.max(...data.users.map(u => u.id)) + 1 : 1;
    data.users.push({ id: newId, password: pass });
    saveData(data);
    alert(`Пользователь #${newId} зарегистрирован`);
    populateUserSelect();
  });

  // Выход
  document.getElementById('logout').addEventListener('click', () => {
    showLoginScreen();
  });

  // Переключение вкладок
  document.querySelectorAll('.tab').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.target).classList.add('active');
    };
  });

  // Формы
  const addPlantForm = document.getElementById('add-plant-form');
  const applyFiltersBtn = document.getElementById('apply-filters');
  if (addPlantForm) addPlantForm.addEventListener('submit', handleAddPlant);
  if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', applyFilters);
});

// ========== Растения ==========
function getPlants() {
  const data = loadData();
  return Promise.resolve(data.plants);
}

function addPlant(data) {
  const store = loadData();
  store.plants.push(data);
  saveData(store);
  return Promise.resolve(data);
}

function loadMyPlants() {
  getPlants().then(plants => {
    const myPlants = plants.filter(p => p.owner_id === CURRENT_USER_ID);
    renderPlants(myPlants);
  });
}

function renderPlants(plants) {
  const container = document.getElementById('my-plants');
  container.innerHTML = plants.map(plant => `
    <div class="plant-card">
      <h3>${plant.name}</h3>
      <p><strong>Тип:</strong> ${plant.type}</p>
      <p>${plant.description || 'Нет описания'}</p>
      <button onclick="createOffer(${plant.id})">Предложить обмен</button>
    </div>
  `).join('');
}

function handleAddPlant(e) {
  e.preventDefault();
  const name = document.getElementById('plant-name').value.trim();
  const type = document.getElementById('plant-type-add').value;
  const description = document.getElementById('plant-description').value.trim();
  if (!name || !type) {
    alert('Заполните все обязательные поля');
    return;
  }

  const data = loadData();
  const newId = data.plants.length ? Math.max(...data.plants.map(p => p.id)) + 1 : 1;
  data.plants.push({
    id: newId,
    name,
    type,
    description,
    owner_id: CURRENT_USER_ID
  });
  saveData(data);

  document.getElementById('plant-name').value = '';
  document.getElementById('plant-type-add').value = '';
  document.getElementById('plant-description').value = '';
  loadMyPlants();
}

// ========== Фильтрация растений ==========
function applyFilters() {
  const selectedType = document.getElementById('plant-type').value;
  getPlants().then(plants => {
    let filteredPlants = plants;
    if (selectedType) {
      filteredPlants = plants.filter(p => p.type === selectedType);
    }
    const myFilteredPlants = filteredPlants.filter(p => p.owner_id === CURRENT_USER_ID);
    renderPlants(myFilteredPlants);
  });
}

// ========== Обмен ==========
function getOffers() {
  const data = loadData();
  return Promise.resolve(data.offers);
}

function createOffer(offered_plant_id) {
  getPlants().then(plants => {
    const others = plants.filter(p => p.owner_id !== CURRENT_USER_ID);
    if (others.length === 0) {
      alert('Нет доступных растений для обмена');
      return;
    }
    const names = others.map(p => p.name).join(', ');
    const requestedName = prompt(`Введите название растения, которое хотите получить (доступные: ${names}):`);
    const requested = others.find(p => p.name.toLowerCase() === requestedName?.toLowerCase());
    if (!requested) {
      alert('Растение не найдено');
      return;
    }

    const data = loadData();
    const newId = data.offers.length ? Math.max(...data.offers.map(o => o.id)) + 1 : 1;
    data.offers.push({
      id: newId,
      offered_plant_id,
      requested_plant_id: requested.id,
      status: 'pending'
    });
    saveData(data);
    loadExchangeOffers();
  });
}

function acceptOffer(id) {
  const data = loadData();
  const offerIndex = data.offers.findIndex(o => o.id === id);
  if (offerIndex === -1) return;

  data.offers[offerIndex].status = 'accepted';
  const plant1 = data.plants.find(p => p.id === data.offers[offerIndex].offered_plant_id);
  const plant2 = data.plants.find(p => p.id === data.offers[offerIndex].requested_plant_id);
  if (plant1 && plant2) {
    const tempOwnerId = plant1.owner_id;
    plant1.owner_id = plant2.owner_id;
    plant2.owner_id = tempOwnerId;
  }

  data.history.push({
    offered_name: plant1?.name || 'Неизвестное растение',
    requested_name: plant2?.name || 'Неизвестное растение',
    completed_at: new Date().toISOString()
  });

  saveData(data);
  loadExchangeOffers();
  loadMyPlants();
  loadExchangeHistory();
}

function rejectOffer(id) {
  const data = loadData();
  const offer = data.offers.find(o => o.id === id);
  if (offer) {
    offer.status = 'rejected';
    saveData(data);
    loadExchangeOffers();
  }
}

function loadExchangeOffers() {
  getPlants().then(plants => {
    getOffers().then(offers => {
      const enriched = offers.map(o => {
        const offered = plants.find(p => p.id === o.offered_plant_id);
        const requested = plants.find(p => p.id === o.requested_plant_id);
        return {
          ...o,
          offered_name: offered?.name || 'Неизвестное растение',
          requested_name: requested?.name || 'Неизвестное растение',
          is_my_offer: offered?.owner_id === CURRENT_USER_ID,
          requested_owner_id: requested?.owner_id,
        };
      });
      renderOffers(enriched);
    });
  });
}

function renderOffers(offers) {
  const container = document.getElementById('exchange-offers');
  container.innerHTML = offers.map(o => `
    <div class="offer-card">
      <p><strong>${o.is_my_offer ? 'Моё растение' : 'Предложенное растение'}:</strong> ${o.offered_name}</p>
      <p><strong>${o.is_my_offer ? 'Запрашиваю' : 'Предлагают взамен'}:</strong> ${o.requested_name}</p>
      <p>Статус: ${getStatusText(o.status)}</p>
      ${o.status === 'pending' && !o.is_my_offer && o.requested_owner_id === CURRENT_USER_ID ?
        `<button onclick="acceptOffer(${o.id})">Принять</button>
         <button onclick="rejectOffer(${o.id})">Отклонить</button>` : ''}
    </div>
  `).join('');
}

function getStatusText(status) {
  const statuses = {
    pending: 'Ожидает ответа',
    accepted: 'Принят',
    rejected: 'Отклонён'
  };
  return statuses[status] || status;
}

// ========== История ==========
function getHistory() {
  const data = loadData();
  return Promise.resolve(data.history);
}

function loadExchangeHistory() {
  getHistory().then(renderHistory);
}

function renderHistory(history) {
  const container = document.getElementById('exchange-history');
  container.innerHTML = history.map(item => `
    <div class="history-item">
      <p>Обмен: ${item.offered_name} → ${item.requested_name}</p>
      <small>${new Date(item.completed_at).toLocaleString()}</small>
    </div>
  `).join('');
}