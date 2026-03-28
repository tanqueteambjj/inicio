import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { MercadoPagoConfig, Payment } from 'mercadopago';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Configurações de segurança e recebimento de JSON
app.use(cors());
app.use(express.json());

// Servir os arquivos estáticos da pasta 'public' (onde está o painel_aluno.html)
app.use(express.static(path.join(__dirname, 'public')));

// 1. Configuração do Mercado Pago com o seu Access Token
const client = new MercadoPagoConfig({ 
  accessToken: 'APP_USR-5825120061754229-022016-ecb35610bbb69399336717aaf09d0539-89303803',
});

// 2. Rota que o painel_aluno.html vai chamar para gerar o PIX
app.post('https://backend-pix-7owo.onrender.com', async (req, res) => {
  try {
    const { transaction_amount, description, payer_email, payer_first_name, payer_last_name, payer_identification } = req.body;

    const payment = new Payment(client);
    
    const requestOptions = {
      idempotencyKey: Math.random().toString(36).substring(7), // Chave única para evitar pagamentos duplicados
    };

    // Criação do pagamento PIX no Mercado Pago
    const result = await payment.create({
      body: {
        transaction_amount: Number(transaction_amount),
        description: description || 'Mensalidade Tanque Team',
        payment_method_id: 'pix',
        payer: {
          email: payer_email || 'aluno@email.com',
          first_name: payer_first_name || 'Aluno',
          last_name: payer_last_name || 'Tanque Team',
          identification: {
            type: 'CPF',
            number: payer_identification || '12345678909' // CPF do pagador (obrigatório para o MP)
          }
        }
      },
      requestOptions
    });

    // 3. Retorna os dados do PIX para o painel_aluno.html exibir na tela
    res.json({
      id: result.id,
      qr_code: result.point_of_interaction?.transaction_data?.qr_code, // Código PIX Copia e Cola
      qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64, // Imagem do QR Code
      ticket_url: result.point_of_interaction?.transaction_data?.ticket_url, // Link do comprovante
    });
  } catch (error) {
    console.error('Erro ao criar pagamento PIX:', error);
    res.status(500).json({ error: 'Falha ao criar pagamento PIX', details: error.message });
  }
});

// 4. Rota principal que carrega o seu painel_aluno.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'painel_aluno.html'));
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando com sucesso!`);
  console.log(`Acesse no navegador: http://localhost:${PORT}`);
});
