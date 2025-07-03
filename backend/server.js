const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { spawn } = require('child_process');
const axios = require('axios');

const app = express();
const PORT = 3000;
const PYTHON_API_URL = 'http://localhost:5000';

app.use(cors());
app.use(express.json());
app.use(express.static('../frontend'));
app.use('/music', express.static('../music'));
app.use('/image', express.static(path.join(__dirname, '../image')));


let pythonProcess = null;
let restarting = false;

// Iniciar o servidor Python
function initPythonServer() {
    if (!pythonProcess && !restarting) {
        restarting = true;
        console.log('🐍 Iniciando servidor Python...');
        pythonProcess = spawn('python', ['tocar.py', '--api'], {
            stdio: ['inherit', 'pipe', 'pipe']
        });

        pythonProcess.stdout.on('data', (data) => {
            console.log(`Python: ${data.toString()}`);
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`Python Error: ${data.toString()}`);
        });

        pythonProcess.on('close', (code) => {
            console.log(`⚠️ Servidor Python foi encerrado com código ${code}`);
            pythonProcess = null;
            restarting = false;

            // Reinicia o servidor automaticamente se falhar
            setTimeout(initPythonServer, 2000);
        });

        setTimeout(() => {
            console.log('✅ Servidor Python iniciado');
            restarting = false;
        }, 3000);
    }
}

// Chamar API Python
async function callPythonAPI(endpoint, method = 'GET', data = null) {
    try {
        const response = await axios({
            method,
            url: `${PYTHON_API_URL}${endpoint}`,
            headers: { 'Content-Type': 'application/json' },
            data
        });
        return { success: true, data: response.data };
    } catch (error) {
        console.error(`❌ Erro ao chamar ${endpoint}:`, error.message);
        return {
            success: false,
            error: error.response ? error.response.data : error.message
        };
    }
}

// Rota: Listar músicas
app.get('/api/songs', (req, res) => {
    const musicDir = path.join(__dirname, '../music');

    try {
        const files = fs.readdirSync(musicDir)
            .filter(file => /\.(mp3|wav|ogg)$/i.test(file))
            .map((file, index) => {
    const title = path.basename(file, path.extname(file));
    const imageExtensions = ['.jpg', '.png', '.jpeg', '.webp'];
    const imageDir = path.join(__dirname, '../image');

    let imagePath = null;
    for (const ext of imageExtensions) {
        const candidate = path.join(imageDir, title + ext);
        if (fs.existsSync(candidate)) {
            imagePath = `/image/${title + ext}`;
            break;
        }
    }

    return {
        id: index,
        name: file,
        path: path.join(musicDir, file),
        relativePath: `/music/${file}`,
        title,
        image: imagePath
    };
});

        res.json(files);
    } catch (error) {
        console.error('Erro ao listar músicas:', error);
        res.status(500).json({ error: 'Erro ao listar músicas' });
    }
});

// Rota: Tocar música
app.post('/api/play', async (req, res) => {
    const { path: filePath } = req.body;

    if (!filePath || typeof filePath !== 'string') {
        return res.status(400).json({ error: 'Caminho da música inválido' });
    }

    const result = await callPythonAPI('/api/tocar', 'POST', { ficheiro: filePath });

    if (result.success) {
        res.json({
            message: 'Música iniciada',
            song: path.basename(filePath),
            ...result.data
        });
    } else {
        res.status(500).json({
            error: 'Erro ao reproduzir música',
            details: result.error
        });
    }
});

// Rota: Pausar
app.post('/api/pause', async (req, res) => {
    const result = await callPythonAPI('/api/pausar', 'POST');
    result.success ? res.json({ message: 'Música pausada', ...result.data }) :
        res.status(500).json({ error: 'Erro ao pausar música' });
});

// Rota: Retomar
app.post('/api/resume', async (req, res) => {
    const result = await callPythonAPI('/api/retomar', 'POST');
    result.success ? res.json({ message: 'Música retomada', ...result.data }) :
        res.status(500).json({ error: 'Erro ao retomar música' });
});

// Rota: Parar
app.post('/api/stop', async (req, res) => {
    const result = await callPythonAPI('/api/parar', 'POST');
    result.success ? res.json({ message: 'Música parada', ...result.data }) :
        res.status(500).json({ error: 'Erro ao parar música' });
});

// Rota: Alterar volume
app.post('/api/volume', async (req, res) => {
    const { volume } = req.body;
    const parsed = parseFloat(volume);

    if (isNaN(parsed) || parsed < 0 || parsed > 100) {
        return res.status(400).json({ error: 'Volume inválido (deve ser entre 0 e 100)' });
    }

    const result = await callPythonAPI('/api/volume', 'POST', {
        volume: parsed / 100
    });

    result.success ? res.json({ message: 'Volume alterado', ...result.data }) :
        res.status(500).json({ error: 'Erro ao alterar volume' });
});

// Rota: Status
app.get('/api/status', async (req, res) => {
    const result = await callPythonAPI('/api/status');

    if (result.success) {
        res.json(result.data);
    } else {
        res.json({
            tocando: false,
            pausado: false,
            ficheiro_atual: null,
            volume: 70,
            mixer_ocupado: false,
            error: 'Não foi possível conectar ao servidor Python'
        });
    }
});

// Rota: Health check
app.get('/api/health', async (req, res) => {
    const result = await callPythonAPI('/api/status');
    res.json({
        python_server: result.success,
        node_server: true
    });
});

// Inicializa servidor Python
initPythonServer();

// Encerra o processo Python ao sair do Node
function gracefulShutdown() {
    console.log('\n🛑 Encerrando servidores...');
    if (pythonProcess) pythonProcess.kill('SIGTERM');
    process.exit(0);
}
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

app.listen(PORT, () => {
    console.log(`🚀 Servidor Node.js rodando em http://localhost:${PORT}`);
    console.log(`🔗 Comunicando com Python API em ${PYTHON_API_URL}`);
});
