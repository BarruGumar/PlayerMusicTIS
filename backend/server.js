const express = require('express');
const fs = require('fs');
const paths = require('path');
const cors = require('cors');
const { spawn } = require('child_process');
const axios = require('axios');

const app = express();
const PORT = 3000;
const PYTHON_API_URL = 'http://localhost:5000';


app.use(cors());
app.use(express.json());
app.use(express.static('../frontend'));


// Servir arquivos de música
app.use('/music', express.static('../music'));

let pythonProcess = null;

// Função para iniciar o servidor Python se não estiver rodando
function initPythonServer() {
    if (!pythonProcess) {
        console.log('🐍 Iniciando servidor Python...');
        pythonProcess = spawn('python', ['tocar.py', '--api'], {
            stdio: ['inherit', 'pipe', 'pipe']
        });
        
        pythonProcess.stdout.on('data', (data) => {
            console.log(`Python: ${data}`);
        });
        
        pythonProcess.stderr.on('data', (data) => {
            console.error(`Python Error: ${data}`);
        });
        
        pythonProcess.on('close', (code) => {
            console.log(`Servidor Python encerrado com código ${code}`);
            pythonProcess = null;
        });
        
        // Aguarda alguns segundos para o Flask iniciar
        setTimeout(() => {
            console.log('✅ Servidor Python iniciado!');
        }, 3000);
    }
}

// Função helper para fazer requisições ao Python
async function callPythonAPI(endpoint, method = 'GET', data = null) {
    try {
        const config = {
            method,
            url: `${PYTHON_API_URL}${endpoint}`,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (data) {
            config.data = data;
        }
        
        const response = await axios(config);
        return { success: true, data: response.data };
    } catch (error) {
        console.error(`Erro na API Python (${endpoint}):`, error.message);
        return { 
            success: false, 
            error: error.response ? error.response.data : error.message 
        };
    }
}




// Listar músicas disponíveis
app.get('/api/songs', (req, res) => {
    const musicDir = paths.join(__dirname, '../','music');
    

    try {
        const files = fs.readdirSync(musicDir)
            .filter(file => file.endsWith('.mp3') || file.endsWith('.wav') || file.endsWith('.ogg'))
            .map((file, index) => ({
                id: index,
                name: file,
                path: paths.join(musicDir, file), // Caminho absoluto para o Python
                relativePath: `/music/${file}`,
                title: file.replace(/\.[^/.]+$/, '') // Remove extensão
            }));
        res.json(files);

        
    } catch (error) {
        console.error('Erro ao listar músicas:', error);
        res.status(500).json({ error: 'Erro ao listar músicas' });
    }
});

// Tocar música remotamente
app.post('/api/play', async (req, res) => {
    const { path } = req.body;
    console.log("Songpath", path);
    
    const result = await callPythonAPI('/api/tocar', 'POST', {
        ficheiro: path
    });
    
    if (result.success) {
        res.json({ 
            message: 'Música iniciada', 
            song: paths.basename(path),
            ...result.data 
        });
    } else {
        res.status(500).json({ 
            error: 'Erro ao reproduzir música',
            details: result.error 
        });
    }
});

// Pausar música
app.post('/api/pause', async (req, res) => {
    const result = await callPythonAPI('/api/pausar', 'POST');
    
    if (result.success) {
        res.json({ message: 'Música pausada', ...result.data });
    } else {
        res.status(500).json({ error: 'Erro ao pausar música' });
    }
});

// Retomar música
app.post('/api/resume', async (req, res) => {
    const result = await callPythonAPI('/api/retomar', 'POST');
    
    if (result.success) {
        res.json({ message: 'Música retomada', ...result.data });
    } else {
        res.status(500).json({ error: 'Erro ao retomar música' });
    }
});

// Parar música
app.post('/api/stop', async (req, res) => {
    const result = await callPythonAPI('/api/parar', 'POST');
    
    if (result.success) {
        res.json({ message: 'Música parada', ...result.data });
    } else {
        res.status(500).json({ error: 'Erro ao parar música' });
    }
});

// Controlar volume
app.post('/api/volume', async (req, res) => {
    const { volume } = req.body;
    
    const result = await callPythonAPI('/api/volume', 'POST', {
        volume: parseFloat(volume) / 100 // Converte de 0-100 para 0-1
    });
    
    if (result.success) {
        res.json({ message: 'Volume alterado', ...result.data });
    } else {
        res.status(500).json({ error: 'Erro ao alterar volume' });
    }
});

// Status da reprodução
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

// Rota para verificar se o servidor Python está rodando
app.get('/api/health', async (req, res) => {
    const result = await callPythonAPI('/api/status');
    res.json({ 
        python_server: result.success,
        node_server: true
    });
});

// Inicializar servidor Python quando o Node.js iniciar
initPythonServer();

// Encerrar processo Python quando o Node.js for encerrado
process.on('SIGINT', () => {
    console.log('\n🛑 Encerrando servidores...');
    if (pythonProcess) {
        pythonProcess.kill('SIGTERM');
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    if (pythonProcess) {
        pythonProcess.kill('SIGTERM');
    }
    process.exit(0);
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor Node.js rodando em http://localhost:${PORT}`);
    console.log(`🔗 Comunicando com Python API em ${PYTHON_API_URL}`);
});