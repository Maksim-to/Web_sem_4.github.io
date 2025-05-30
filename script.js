// ========== Работа с localStorage ==========
function getFromStorage(key) {
  return JSON.parse(localStorage.getItem(key)) || [];
}

function saveToStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

let CURRENT_USER_ID = null;

// Инициализация начальных данных (если не существует)
function initLocalStorage() {
  if (!localStorage.getItem('users')) {
    localStorage.setItem('users', JSON.stringify([
      { id: 1, password: '1234' },
    ]));
  }
  if (!localStorage.getItem('plants')) localStorage.setItem('plants', '[]');
  if (!localStorage.getItem('offers')) localStorage.setItem('offers', '[]');
  if (!localStorage.getItem('history')) localStorage.setItem('history', '[]');
}
initLocalStorage();

// ========== Авторизация ==========
async function getUsers() {
  return getFromStorage('users');
}

async function showMainApp(userId) {
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
  const users = getFromStorage('users');
  const select = document.getElementById('login-user');
  select.innerHTML = '';
  users.forEach(u => {
    const option = document.createElement('option');
    option.value = u.id;
    option.textContent = `Пользователь ${u.id}`;
    select.appendChild(option);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  populateUserSelect();

  // Вход
  document.getElementById('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const id = parseInt(document.getElementById('login-user').value);
    const pass = document.getElementById('login-pass').value.trim();
    const users = getFromStorage('users');
    const user = users.find(u => u.id === id && u.password === pass);

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

    const users = getFromStorage('users');
    const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
    users.push({ id: newId, password: pass });
    saveToStorage('users', users);
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
async function getPlants() {
  return getFromStorage('plants');
}

async function addPlant(data) {
  const plants = getFromStorage('plants');
  const newPlant = { ...data, id: plants.length > 0 ? Math.max(...plants.map(p => p.id)) + 1 : 1 };
  plants.push(newPlant);
  saveToStorage('plants', plants);
  return newPlant;
}

async function loadMyPlants() {
  const plants = await getPlants();
  const myPlants = plants.filter(p => p.owner_id === CURRENT_USER_ID);
  renderPlants(myPlants);
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

async function handleAddPlant(e) {
  e.preventDefault();
  const name = document.getElementById('plant-name').value.trim();
  const type = document.getElementById('plant-type-add').value;
  const description = document.getElementById('plant-description').value.trim();
  if (!name || !type) {
    alert('Заполните все обязательные поля');
    return;
  }

  try {
    const plantData = {
      name,
      type,
      description,
      owner_id: CURRENT_USER_ID
    };
    await addPlant(plantData);
    document.getElementById('plant-name').value = '';
    document.getElementById('plant-type-add').value = '';
    document.getElementById('plant-description').value = '';
    await loadMyPlants(); // Обновляем список растений после добавления
  } catch (err) {
    console.error('Ошибка при добавлении растения:', err);
    alert('Не удалось добавить растение');
  }
}

// ========== Фильтр по типу ==========
async function applyFilters() {
  const selectedType = document.getElementById('plant-type').value;
  const plants = await getPlants();
  const filtered = plants.filter(p => p.owner_id === CURRENT_USER_ID && (selectedType === '' || p.type === selectedType));
  renderPlants(filtered);
}

// ========== Обмен ==========
async function getOffers() {
  return getFromStorage('offers');
}

async function createOffer(offered_plant_id) {
  const plants = await getPlants();
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

  const offers = getFromStorage('offers');
  const newOffer = {
    id: offers.length > 0 ? Math.max(...offers.map(o => o.id)) + 1 : 1,
    offered_plant_id,
    requested_plant_id: requested.id,
    status: 'pending'
  };
  offers.push(newOffer);
  saveToStorage('offers', offers);
  loadExchangeOffers();
}

async function acceptOffer(id) {
  const offers = getFromStorage('offers');
  const offerIndex = offers.findIndex(o => o.id === id);
  if (offerIndex === -1) return;

  offers[offerIndex].status = 'accepted';
  saveToStorage('offers', offers);

  const plants = getFromStorage('plants');
  const offered = plants.find(p => p.id === offers[offerIndex].offered_plant_id);
  const requested = plants.find(p => p.id === offers[offerIndex].requested_plant_id);

  if (offered && requested) {
    // Меняем владельцев
    const tempOwnerId = offered.owner_id;
    offered.owner_id = requested.owner_id;
    requested.owner_id = tempOwnerId;

    // Сохраняем изменённые растения
    saveToStorage('plants', plants);

    // Запись в историю
    const history = getFromStorage('history');
    history.push({
      offered_name: offered.name,
      requested_name: requested.name,
      completed_at: new Date().toISOString()
    });
    saveToStorage('history', history);
  }

  loadExchangeOffers();
  loadMyPlants();
  loadExchangeHistory();
}

async function rejectOffer(id) {
  const offers = getFromStorage('offers');
  const offerIndex = offers.findIndex(o => o.id === id);
  if (offerIndex === -1) return;

  offers[offerIndex].status = 'rejected';
  saveToStorage('offers', offers);
  loadExchangeOffers();
}

async function loadExchangeOffers() {
  const offers = await getOffers();
  const plants = await getPlants();
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
async function getHistory() {
  return getFromStorage('history');
}

async function loadExchangeHistory() {
  const history = await getHistory();
  renderHistory(history);
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