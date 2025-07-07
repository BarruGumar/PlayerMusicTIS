const API_URL = 'http://172.16.221.201:3000/api';

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
        const result = await apiRequest('/songs');
        console.log('🔍 RESPOSTA COMPLETA DA API:', result);
        
        // Vamos verificar cada música individualmente
        if (result && Array.isArray(result)) {
            result.forEach((song, index) => {
                console.log(`\n📀 MÚSICA ${index + 1}:`);
                console.log(`   📝 Título: ${song.title}`);
                console.log(`   🎵 Arquivo: ${song.name}`);
                console.log(`   🖼️  Campo image: "${song.image}"`);
                console.log(`   ✅ Tem imagem?: ${song.image ? 'SIM' : 'NÃO'}`);
                console.log(`   📂 Tipo: ${typeof song.image}`);
            });
        }

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
    console.log('Carregando lista de músicas...');
    const list = document.getElementById('musicList');

    if (musicLibrary.length === 0) {
        list.innerHTML = `<div style="text-align:center; opacity:0.7;">Nenhuma música encontrada.</div>`;
        return;
    }

    console.log('Músicas na biblioteca:', musicLibrary);
    
    list.innerHTML = musicLibrary.map((song) => {
        console.log(`🎵 Música: ${song.title}`);
        console.log(`🖼️  Campo image: ${song.image}`);
        
        // Corrige o caminho da imagem
        let imagePath = '/image/default.jpg';
        if (song.image) {
            imagePath = `/image${song.image}`;
        }
        
        console.log(`🔗 URL final: ${imagePath}`);
        
        return `
            <div class="music-item" onclick="selectSong(${song.id})" id="song-${song.id}">
                <img src="${imagePath}" 
                     alt="${song.title}" 
                     class="music-thumbnail" 
                     onerror="this.src='/image/default.jpg'; console.log('❌ Erro ao carregar: ${imagePath}');" 
                     onload="console.log('✅ Imagem carregada: ${imagePath}');" />
                <div>
                    <strong>${song.title}</strong>
                </div>
                <div class="file-info">${song.path.split('.').pop().toUpperCase()}</div>
            </div>
        `;
    }).join('');
}

// FUNÇÃO CORRIGIDA - Agora busca a música pelo ID
function selectSong(songId) {
    document.querySelectorAll('.music-item').forEach(item => item.classList.remove('selected'));
    document.getElementById(`song-${songId}`).classList.add('selected');
    
    // Busca a música pelo ID ao invés de usar o ID como índice
    selectedSong = musicLibrary.find(song => song.id === songId);
    
    console.log('Music Library:', musicLibrary);
    console.log('Song ID:', songId);
    console.log('Música selecionada:', selectedSong);
    
    if (selectedSong) {
        showMessage(`Selecionado: ${selectedSong.title}`, 'success');
        document.getElementById('playBtn').disabled = false;
    } else {
        showMessage('Erro ao selecionar música', 'error');
    }
}

const playSelected = async () => {
    console.log('Música selecionada:', selectedSong.path);
    if (!selectedSong) return showMessage('Selecione uma música!', 'error');
    const btn = document.getElementById('playBtn');
    btn.disabled = true;
    btn.innerText = '⏳ A tocar...';

    const body = { path: selectedSong.path };
    console.log('Body:', body);

    const result = await apiRequest('/play', 'POST', body);
    if (result && result.message) {
        isPlaying = true;
        btn.innerText = '▶️ A Tocar';
        document.querySelectorAll('.music-item').forEach(i => i.classList.remove('playing'));
        document.getElementById(`song-${selectedSong.id}`).classList.add('playing');
        showMessage(`🎵 ${result.message}`, 'success');
        checkStatusPeriodically();
    } else {
        btn.innerText = '▶️ Tocar';
        showMessage('Erro ao tocar', 'error');
    }
    btn.disabled = false;
}

async function stopMusic() {
    const result = await apiRequest('/stop', 'POST');
    if (result && result.message) {
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
        if (result && result.tocando === false) {
            isPlaying = false;
            document.getElementById('playBtn').innerText = '▶️ Tocar';
            document.querySelectorAll('.music-item').forEach(i => i.classList.remove('playing'));
            showMessage('🎵 Música terminou', 'success');
        } else {
            checkStatusPeriodically();
        }
    }, 2000);
}

// 🎚️ Controle de volume - CORRIGIDO
document.getElementById('volumeRange').addEventListener('input', async function() {
    const volume = parseInt(this.value, 10);
    console.log('Alterando volume para:', volume);
    
    const result = await apiRequest('/volume', 'POST', { volume });
    console.log('Resultado da alteração de volume:', result);
    
    if (result && result.message) {
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