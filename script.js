const firebaseConfig = {
    apiKey: "AIzaSyBExRrPLJEI-oWgOEcZ2WLn04EGLduGJSc",
    authDomain: "mycloudlybank.firebaseapp.com",
    databaseURL: "https://mycloudlybank-default-rtdb.firebaseio.com",
    projectId: "mycloudlybank",
    storageBucket: "mycloudlybank.firebasestorage.app",
    messagingSenderId: "482067969296",
    appId: "1:482067969296:web:0bcb8305693cac9dfc2195"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
let currentLogin = null;
const admins = ['maxS', 'maxA', 'maxg'];
const days = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];

function isMainPage() {
    return window.location.pathname.toLowerCase().endsWith('main.html');
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').catch(console.error);
        });
    }
}

registerServiceWorker();

function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;
    const icon = toggle.querySelector('i');
    const label = toggle.querySelector('span');
    if (theme === 'dark') {
        icon.className = 'fas fa-moon';
        label.textContent = 'Тёмный';
    } else {
        icon.className = 'fas fa-sun';
        label.textContent = 'Светлый';
    }
    localStorage.setItem('gcoin-theme', theme);
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(currentTheme);
}

const savedTheme = localStorage.getItem('gcoin-theme') || 'light';
applyTheme(savedTheme);

document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('theme-toggle');
    if (toggle) toggle.addEventListener('click', toggleTheme);
});

window.onload = function() {
    const toggle = document.getElementById('theme-toggle');
    if (toggle) toggle.addEventListener('click', toggleTheme);

    const sl = localStorage.getItem('gcoin_login'), sp = localStorage.getItem('gcoin_pass');
    if (isMainPage()) {
        if (!sl || !sp) {
            window.location.href = 'index.html';
            return;
        }
        renderUI(sl);
        return;
    }

    if (sl && sp) {
        const loginInput = document.getElementById('login-input');
        const passInput = document.getElementById('pass-input');
        if (loginInput) loginInput.value = sl;
        if (passInput) passInput.value = sp;
        auth(true);
    }
};

function togglePasswordVisibility() {
    const passInput = document.getElementById('pass-input');
    const toggle = document.querySelector('.password-toggle i');
    if (!passInput || !toggle) return;
    const isHidden = passInput.type === 'password';
    passInput.type = isHidden ? 'text' : 'password';
    toggle.className = isHidden ? 'fas fa-eye-slash' : 'fas fa-eye';
}

function auth(isAuto = false) {
    const loginInput = document.getElementById('login-input');
    const passInput = document.getElementById('pass-input');
    if (!loginInput || !passInput) return;

    const login = loginInput.value.trim();
    const pass = passInput.value;
    if (!login || !pass) return;

    db.ref('users/' + login).once('value', (snap) => {
        if (snap.exists() && snap.val().password === pass) {
            localStorage.setItem('gcoin_login', login);
            localStorage.setItem('gcoin_pass', pass);
            if (isMainPage()) {
                renderUI(login);
            } else {
                window.location.href = 'main.html';
            }
        } else if (!snap.exists()) {
            db.ref('users/' + login).set({ password: pass, balance: 0 }).then(() => {
                if (isMainPage()) {
                    renderUI(login);
                } else {
                    window.location.href = 'main.html';
                }
            });
        } else if (!isAuto) alert("Ошибка доступа");
    });
}

function logout() {
    localStorage.removeItem('gcoin_login');
    localStorage.removeItem('gcoin_pass');
    window.location.href = 'index.html';
}

function renderUI(login) {
    currentLogin = login;
    const loginScreen = document.getElementById('login-screen');
    const mainScreen = document.getElementById('main-screen');
    if (loginScreen) loginScreen.classList.remove('active');
    if (mainScreen) mainScreen.classList.add('active');

    const userName = document.getElementById('user-name');
    if (userName) userName.innerText = login;

    const leftCol = document.getElementById('left-column');
    const rightCol = document.getElementById('right-column');
    if (!leftCol || !rightCol) return;
    leftCol.innerHTML = ''; rightCol.innerHTML = '';

    const isAdmin = admins.includes(login);

    if (isAdmin) {
        const fabBtn = document.getElementById('fab-btn');
        if (fabBtn) fabBtn.style.display = 'none';
        const userProfiles = [
            { key: 'svyat', label: 'Свят' },
            { key: 'misha', label: 'Миша' }
        ];
        userProfiles.forEach(user => {
            const section = document.createElement('div');
            section.className = 'panel-section';
            section.innerHTML = `
                <div class="panel-title" style="justify-content:space-between">
                    <span><i class="fas fa-user-gear"></i> ${user.label}</span>
                    <span id="bal-${user.key}" style="color:var(--primary)">0 Б</span>
                </div>
                <div class="input-group"><i class="fas fa-comment"></i><input type="text" id="msg-${user.key}" placeholder="Сообщение"></div>
                <div class="input-group"><i class="fas fa-coins"></i><input type="number" id="amt-${user.key}" placeholder="Сумма"></div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                    <button style="background:var(--success)" onclick="adminAction('${user.key}', 'plus')">Пополнить</button>
                    <button style="background:var(--accent)" onclick="adminAction('${user.key}', 'minus')">Вычесть</button>
                </div>
                <button style="background:var(--primary); margin-top:5px" onclick="openAdminModal('${user.key}')">История</button>
            `;
            leftCol.appendChild(section);
            db.ref(`users/${user.key}/balance`).on('value', s => {
                document.getElementById(`bal-${user.key}`).innerText = (s.val() || 0) + ' Б';
            });
        });

        rightCol.innerHTML = `
            <div class="panel-section" style="margin-bottom: 20px;">
                <div class="panel-title"><i class="fas fa-envelope-open-text"></i> Запросы</div>
                <div id="admin-requests-container" style="max-height: 200px; overflow-y: auto;"></div>
            </div>

            <div class="panel-section">
                <div class="panel-title"><i class="fas fa-tags"></i> Прайс-лист</div>
                <div class="price-list-intro">Создавайте позиции и показывайте их всем пользователям.</div>
                <div class="input-group"><i class="fas fa-coins"></i><input type="number" id="price-points-input" placeholder="Сколько баллов"></div>
                <div class="input-group"><i class="fas fa-ruble-sign"></i><input type="number" id="price-rubles-input" placeholder="Сколько рублей"></div>
                <button onclick="createPriceItem()">Добавить позицию</button>
                <div id="price-list-container" class="price-list-container"></div>
            </div>
        `;
        initAdminRequests();
    } else {
        const fabBtn = document.getElementById('fab-btn');
        if (fabBtn) fabBtn.style.display = 'flex';
        leftCol.innerHTML = `<div class="balance-card"><div style="font-size:11px; opacity:0.8;">МОЙ СЧЕТ</div><div class="balance-amount" id="balance-val">0 Б</div></div>
            <div class="history-box" id="history-box">
                <div class="history-panel-header">
                    <div class="history-panel-title">Операции</div>
                    <div class="history-panel-chip"><i class="fas fa-clock"></i> Последние</div>
                </div>
            </div>`;

        rightCol.innerHTML = `
            <div class="panel-section">
                <div class="panel-title"><i class="fas fa-tags"></i> Прайс-лист</div>
                <div class="price-list-intro">Ниже — текущие значения обмена баллов на рубли.</div>
                <div id="price-list-container" class="price-list-container"></div>
            </div>
        `;
        db.ref(`users/${login}/balance`).on('value', s => document.getElementById('balance-val').innerText = (s.val() || 0) + ' Б');
        initUserHistory(login);
    }

    loadPriceList();
}

function toggleDrawer() {
    const dr = document.getElementById('side-drawer');
    const ov = document.getElementById('drawer-overlay');
    dr.classList.toggle('open');
    ov.style.display = dr.classList.contains('open') ? 'block' : 'none';
}

function sendRequestToServer() {
    const txt = document.getElementById('request-text').value.trim();
    if (!txt) return alert("Напиши сообщение!");
    db.ref('requests').push({
        from: currentLogin,
        text: txt,
        timestamp: Date.now()
    });
    alert("Запрос отправлен!");
    document.getElementById('request-text').value = '';
    toggleDrawer();
}

function adminAction(user, type) {
    const amt = parseInt(document.getElementById(`amt-${user}`).value);
    const msg = document.getElementById(`msg-${user}`).value.trim();
    if (!amt || !msg) return alert("Заполни данные!");
    const change = type === 'plus' ? amt : -amt;
    db.ref(`users/${user}/balance`).transaction(c => (c || 0) + change);
    db.ref('history').push({
        from: type === 'plus' ? 'Центробанк' : user,
        to: type === 'plus' ? user : 'Списание',
        amount: amt,
        reason: msg,
        type: type === 'plus' ? 'plus' : 'minus',
        timestamp: Date.now()
    });
    document.getElementById(`amt-${user}`).value = ''; document.getElementById(`msg-${user}`).value = '';
}

function openAdminModal(user) {
    window.location.href = `history-${user}.html`;
}

function loadHistoryPage(user) {
    const listEl = document.getElementById('history-list');
    if (!listEl) return;

    db.ref('history').on('value', snap => {
        const list = [];
        snap.forEach(c => {
            const value = c.val();
            if (value.from === user || value.to === user) {
                list.push(value);
            }
        });

        list.reverse();
        listEl.innerHTML = '';

        if (!list.length) {
            listEl.innerHTML = '<div class="history-empty">Пока нет операций</div>';
            return;
        }

        list.forEach(entry => {
            const isPlus = entry.to === user;
            const dt = new Date(entry.timestamp);
            const item = document.createElement('div');
            item.className = 'history-card';
            item.innerHTML = `
                <div class="history-card-top">
                    <span class="history-date">${dt.toLocaleDateString()} • ${days[dt.getDay()]}</span>
                    <span class="history-badge ${isPlus ? 'history-badge-plus' : 'history-badge-minus'}">${isPlus ? 'Пополнение' : 'Списание'}</span>
                </div>
                <div class="history-reason">${entry.reason || 'Операция'}</div>
                <div class="history-amount ${isPlus ? 'positive' : 'negative'}">${isPlus ? '+' : '-'}${entry.amount} Б</div>
            `;
            listEl.appendChild(item);
        });
    });
}

function initAdminRequests() {
    db.ref('requests').on('value', snap => {
        const container = document.getElementById('admin-requests-container');
        container.innerHTML = '';
        Object.entries(snap.val() || {}).reverse().forEach(([id, r]) => {
            container.innerHTML += `<div class="admin-req-item">
                <div style="font-size:10px; color:var(--primary)">ОТ: ${r.from}</div>
                <div style="font-size:13px">${r.text}</div>
                <button class="btn-del-small" onclick="db.ref('requests/${id}').remove()">Удал</button></div>`;
        });
    });
}

function sendMoney() {
    const target = document.getElementById('target-user').value.trim(), amt = parseInt(document.getElementById('amount-input').value);
    if (!target || !amt || amt <= 0) return;
    db.ref(`users/${target}`).once('value', s => {
        if (!s.exists()) return alert("Нет такого юзера");
        db.ref(`users/${currentLogin}/balance`).once('value', ms => {
            if (ms.val() < amt) return alert("Мало баллов");
            db.ref(`users/${currentLogin}/balance`).set(ms.val() - amt);
            db.ref(`users/${target}/balance`).transaction(b => (b || 0) + amt);
            db.ref('history').push({ from: currentLogin, to: target, amount: amt, timestamp: Date.now(), reason: 'Перевод' });
            alert("Переведено!");
        });
    });
}

function initUserHistory(login) {
    db.ref('history').on('value', snap => {
        const box = document.getElementById('history-box');
        if (!box) return;
        const list = [];
        snap.forEach(c => { if(c.val().from === login || c.val().to === login) list.push(c.val()); });
        const recent = list.reverse().slice(0, 8);

        box.innerHTML = `
            <div class="history-panel-header">
                <div class="history-panel-title">Операции</div>
                <div class="history-panel-chip"><i class="fas fa-clock"></i> Последние</div>
            </div>
        `;

        if (!recent.length) {
            box.innerHTML += '<div class="history-empty">Пока нет операций</div>';
            return;
        }

        recent.forEach(d => {
            const isOut = d.from === login;
            const isPositive = d.type === 'plus' || !isOut;
            const label = d.type === 'minus' ? 'Вычитание' : d.type === 'plus' ? 'Пополнение' : (isOut ? 'Списание' : 'Пополнение');
            const title = d.reason || (isPositive ? 'Пополнение' : 'Вычитание');
            const meta = label;
            const item = document.createElement('div');
            item.className = 'trans-item';
            item.innerHTML = `
                <div class="trans-item-main">
                    <div class="trans-item-title">${title}</div>
                    <div class="trans-item-meta">${meta}</div>
                </div>
                <div class="trans-item-amount ${isPositive ? 'positive' : 'negative'}">${isPositive ? '+' : '-'}${d.amount} Б</div>
            `;
            box.appendChild(item);
        });
    });
}

function createPriceItem() {
    const points = parseInt(document.getElementById('price-points-input').value);
    const rubles = parseInt(document.getElementById('price-rubles-input').value);

    if (!points || !rubles || points <= 0 || rubles <= 0) {
        return alert("Заполни оба поля корректно!");
    }

    db.ref('pricelist').push({
        points: points,
        rubles: rubles,
        createdBy: currentLogin,
        createdAt: Date.now()
    }).then(() => {
        document.getElementById('price-points-input').value = '';
        document.getElementById('price-rubles-input').value = '';
    });
}

function removePriceItem(id) {
    if (!confirm("Удалить эту строку прайс-листа?")) return;
    db.ref(`pricelist/${id}`).remove();
}

function loadPriceList() {
    const container = document.getElementById('price-list-container');
    if (!container) return;

    db.ref('pricelist').on('value', snap => {
        container.innerHTML = '';
        const items = [];

        snap.forEach(child => {
            items.push({ id: child.key, ...child.val() });
        });

        items.sort((a, b) => a.points - b.points);

        if (!items.length) {
            container.innerHTML = '<div class="price-list-empty">Пока нет позиций в прайс-листе</div>';
            return;
        }

        items.forEach(item => {
            const row = document.createElement('div');
            row.className = 'price-list-item';
            row.innerHTML = `
                <div class="price-list-main">
                    <div class="price-list-points">${item.points} Баллов</div>
                    <div class="price-list-rubles">${item.rubles} ₽</div>
                </div>
                ${admins.includes(currentLogin) ? `<button class="price-list-remove" onclick="removePriceItem('${item.id}')"><i class="fas fa-times"></i></button>` : ''}
            `;
            container.appendChild(row);
        });
    });
}