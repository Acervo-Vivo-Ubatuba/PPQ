import http from 'node:http';

async function testEndpoint(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function runTests() {
  console.log("--- INICIANDO TESTES AUTOMATIZADOS DO ACERVO VIVO ---");

  // 1. Test /api/config
  const cfg = await testEndpoint('http://localhost:3000/api/config');
  console.log('1. GET /api/config status:', cfg.status);
  const cfgJson = JSON.parse(cfg.data);
  console.log('   attributionText:', cfgJson.attributionText);
  if (cfg.status !== 200 || cfgJson.attributionText !== '#acervovivoubatuba') {
    throw new Error('Falha no teste de config');
  }

  // 2. Test /api/images
  const imgs = await testEndpoint('http://localhost:3000/api/images');
  console.log('2. GET /api/images status:', imgs.status);
  const imgsJson = JSON.parse(imgs.data);
  console.log('   Total images loaded:', imgsJson.images.length);
  if (imgs.status !== 200 || imgsJson.images.length !== 31) {
    throw new Error(`Esperava 31 imagens, obteve ${imgsJson.images.length}`);
  }

  // 3. Test /api/verify-token
  const invalidTok = await testEndpoint('http://localhost:3000/api/verify-token?token=wrong');
  const invalidJson = JSON.parse(invalidTok.data);
  console.log('3. Token inválido valid == false:', invalidJson.valid === false);

  const validTok = await testEndpoint('http://localhost:3000/api/verify-token?token=oficina2026');
  const validJson = JSON.parse(validTok.data);
  console.log('4. Token válido valid == true:', validJson.valid === true);
  if (!validJson.valid) throw new Error('Falha na validação de token válido');

  // 5. Test POST /api/annotations without token -> should fail with 401
  const postFail = await testEndpoint('http://localhost:3000/api/annotations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageId: '20260914_162942', balloons: [] })
  });
  console.log('5. POST sem token status 401:', postFail.status === 401);
  if (postFail.status !== 401) throw new Error('Deveria retornar 401');

  // 6. Test POST /api/annotations with valid token -> should succeed 200
  const sampleBalloon = {
    imageId: '20260914_162942',
    author: 'Mariana (Oficina)',
    balloons: [
      {
        id: 'b1',
        type: 'speech',
        text: 'A paz que queremos se constrói juntos!',
        x: 45,
        y: 35,
        tailDirection: 'bottom-left'
      }
    ]
  };

  const postSuccess = await testEndpoint('http://localhost:3000/api/annotations?token=oficina2026', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-workshop-token': 'oficina2026'
    },
    body: JSON.stringify(sampleBalloon)
  });
  console.log('6. POST com token status 200:', postSuccess.status === 200);
  const postSuccessJson = JSON.parse(postSuccess.data);
  console.log('   Saved annotation author:', postSuccessJson.annotation.author);

  // 7. Verify GET /api/annotations returns the newly saved dialogue
  const getAnn = await testEndpoint('http://localhost:3000/api/annotations?imageId=20260914_162942');
  const getAnnJson = JSON.parse(getAnn.data);
  console.log('7. GET annotations for image count:', getAnnJson.annotations.length);
  if (getAnnJson.annotations.length === 0) throw new Error('Não encontrou a anotação salva');

  // 8. Test / and /participante HTML endpoints
  const home = await testEndpoint('http://localhost:3000/');
  console.log('8. GET / status:', home.status, '(contains "Acervo Vivo":', home.data.includes('Acervo Vivo'), ')');

  const part = await testEndpoint('http://localhost:3000/participante');
  console.log('9. GET /participante status:', part.status, '(contains "Estúdio":', part.data.includes('Estúdio'), ')');

  // 10. Test /api/registros.md and /registros.md
  const mdRes = await testEndpoint('http://localhost:3000/api/registros.md');
  console.log('10. GET /api/registros.md status:', mdRes.status);
  console.log('    contains "Tabela de Textos Inseridos":', mdRes.data.includes('Tabela de Textos Inseridos'));
  console.log('    contains "Mariana (Oficina)":', mdRes.data.includes('Mariana (Oficina)'));
  if (mdRes.status !== 200 || !mdRes.data.includes('Tabela de Textos Inseridos')) {
    throw new Error('Falha ao servir registro em markdown');
  }

  const rootMdRes = await testEndpoint('http://localhost:3000/registros.md');
  console.log('11. GET /registros.md status:', rootMdRes.status);
  if (rootMdRes.status !== 200) {
    throw new Error('Falha na rota /registros.md');
  }

  console.log("\n>>> TODOS OS 11 TESTES AUTOMATIZADOS PASSARAM COM SUCESSO! <<<\n");
}

runTests().catch(err => {
  console.error("ERRO NO TESTE:", err);
  process.exit(1);
});
