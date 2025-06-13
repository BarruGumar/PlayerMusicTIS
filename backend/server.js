const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const app = express();

app.use(bodyParser.json());

app.post('/play', (req, res) => {
  const file = req.body.file;
  const fullPath = `/caminho/para/musicas/${file}`;

  exec(`cvlc "${fullPath}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Erro: ${error.message}`);
      return res.status(500).send('Erro ao tocar msica');
    }
    res.send('Msica a tocar');
  });
});

app.listen(3000, () => {
  console.log('Servidor a correr na porta 3000');
});
