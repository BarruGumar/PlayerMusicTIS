const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const app = express();

app.use(bodyParser.json());

app.post('/play', (req, res) => {


  const file = req.body.file;
  const fullPath = `../music/${file}`;

  consle.log(`A tocar música: ${file}`);

  exec(`python tocar.py "${fullPath}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Erro: ${error.message}`);
      return res.status(500).send('Erro ao tocar música');
    }
    res.send('Música a tocar');
  });
});

app.listen(3000, () => {
  console.log('Servidor a correr na porta 3000');
});
