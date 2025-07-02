

const API_URL = 'http://localhost:3000/api';

let musicLibrary = [];
let selectedSong = null;
let isPlaying = false;

async function apiRequest(endpoint, method = 'GET', data = null) {
    try {
        const options = {
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (data) options.body = JSON.stringify(data);

        const response = await fetch(`${API_URL}${endpoint}`, options);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Erro na requisição');
        return result;
    } catch (error) {
        console.error('Erro:', error);
        showMessage(error.message, 'error');
        return null;
    }
}

const loadLibrary = async () => {
    try {
        showMessage('A carregar biblioteca...', 'loading');
    const result = await apiRequest('/songs',);
    console.log('Biblioteca carregada:', result);

        musicLibrary = result;
        displayMusicList();
        showMessage(`${musicLibrary.length} música(s) encontrada(s)`, 'success');
        return musicLibrary;
    }
    catch (error) {
        console.error('Erro ao carregar biblioteca:', error);
        showMessage('Erro ao carregar biblioteca', 'error');
    }
    
}

function displayMusicList() {
    console.log('peguei');
    const list = document.getElementById('musicList');

    if (musicLibrary.length === 0) {
        list.innerHTML = `<div style="text-align:center; opacity:0.7;">Nenhuma música encontrada.</div>`;
        return;
    }

    list.innerHTML = musicLibrary.map((key) => `
        <div class="music-item" onclick="selectSong(${key.id})" id="song-${key.id}">
            ${key.image ? `<img src="${key.image}" alt="${key.title}" class="music-thumbnail" />` : ''}
            <div>
                <strong>${key.title}</strong>
            </div>
            <div class="file-info">${key.path.split('.').pop().toUpperCase()}</div>
        </div>
    `).join('');}

/*function displayMusicList () {
    console.log('peguei');
    const list = document.getElementById('musicList');
    if (musicLibrary.length === 0) {
        list.innerHTML = `<div style="text-align:center; opacity:0.7;">Nenhuma música encontrada.</div>`;
        return;
    }
    list.innerHTML = musicLibrary.map((key) => `
        <div class="music-item" onclick="selectSong(${key.id})" id="song-${key.id}">
            <div><strong>${key.title}</strong><div class="file-info">${key.path}</div></div>
            <div class="file-info">${key.path.split('.').pop().toUpperCase()}</div>
        </div>
    `) 
}
*/
function selectSong(index) {
    document.querySelectorAll('.music-item').forEach(item => item.classList.remove('selected'));
    document.getElementById(`song-${index}`).classList.add('selected');
    selectedSong = musicLibrary[index];
    console.log('Music', musicLibrary);
     console.log('index',index)
        console.log('Música selecionada:', selectedSong);
    showMessage(`Selecionado: ${selectedSong.title}`, 'success');
    document.getElementById('playBtn').disabled = false;
}

const playSelected = async () => {
      console.log('Música selecionada:', selectedSong.path);
    if (!selectedSong) return showMessage('Selecione uma música!', 'error');
    const btn = document.getElementById('playBtn');
    btn.disabled = true;
    btn.innerText = '⏳ A tocar...';

    const body = ({path: selectedSong.path} )
    console.log('Body:', body);

    const result = await apiRequest('/play', 'POST', body);
    if (result?.response.success) {
        isPlaying = true;
        btn.innerText = '▶️ A Tocar';
        document.querySelectorAll('.music-item').forEach(i => i.classList.remove('playing'));
        document.getElementById(`song-${musicLibrary.indexOf(selectedSong)}`).classList.add('playing');
        showMessage(`🎵 ${result.message}`, 'success');
        checkStatusPeriodically();
    } else {
        btn.innerText = '▶️ Tocar';
        showMessage('Erro ao tocar 2', 'error');
    }
    btn.disabled = false;
}

async function stopMusic() {
    const result = await apiRequest('/stop', 'POST');
    if (result?.success) {
        isPlaying = false;
        document.getElementById('playBtn').innerText = '▶️ Tocar';
        document.querySelectorAll('.music-item').forEach(i => i.classList.remove('playing'));
        showMessage('⏹️ Música parada', 'success');
    }
}

function showMessage(msg, type = 'info') {
    const status = document.getElementById('status');
    const classes = { error: 'error', success: 'success', loading: 'loading' };
    status.innerHTML = `<div class="${classes[type] || ''}">${msg}<br><small>⏰ ${new Date().toLocaleTimeString()}</small></div>`;
}

function checkStatusPeriodically() {
    if (!isPlaying) return;
    setTimeout(async () => {
        const result = await apiRequest('/status');
        if (result.success && !result.status.is_playing) {
            isPlaying = false;
            document.getElementById('playBtn').innerText = '▶️ Tocar';
            document.querySelectorAll('.music-item').forEach(i => i.classList.remove('playing'));
            showMessage('🎵 Música terminou', 'success');
        } else {
            checkStatusPeriodically();
        }
    }, 2000);
}

// 🎚️ Controle de volume
document.getElementById('volumeRange').addEventListener('input',  async () => {
    const volume = parseInt(this.value, 10);
    const result = await apiRequest('/volume', 'POST', { volume });
    if (result?.success) {
        showMessage(`🔊 Volume: ${volume}%`, 'success');
    } else {
        showMessage('Erro ao ajustar volume', 'error');
    }
});

// ⌨️ Atalhos de teclado
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        if (selectedSong) playSelected();
    } else if (e.code === 'KeyS') {
        stopMusic();
    } else if (e.code === 'KeyR') {
        loadLibrary();
    }
});

// 🚀 Inicialização
window.onload = () => {
    loadLibrary();
    showMessage('Pronto! Selecione uma música para começar.', 'success');
    document.getElementById('playBtn').disabled = true;
    document.getElementById('volumeRange').value = 100;
};
