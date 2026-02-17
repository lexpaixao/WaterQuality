require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Client } = require("pg");
const bcrypt = require("bcrypt"); // caso queira usar hash futuramente

const app = express();
app.use(cors());
app.use(express.json());

// Configuração do PostgreSQL
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Função para criar tabelas se não existirem
async function criarTabelas() {
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome_usuario VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        senha VARCHAR(255) NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS historico (
        id SERIAL PRIMARY KEY,
        usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
        ph NUMERIC NOT NULL,
        temperatura NUMERIC NOT NULL,
        turbidez NUMERIC NOT NULL,
        cloro NUMERIC NOT NULL,
        od NUMERIC NOT NULL,
        condutividade NUMERIC NOT NULL,
        tds NUMERIC NOT NULL,
        status_geral VARCHAR(100) NOT NULL,
        indicadores_fora TEXT,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Tabelas criadas com sucesso!");
  } catch (err) {
    console.error("Erro ao criar tabelas:", err);
  }
}

// Rota de teste
app.get("/", (req, res) => {
  res.send("API funcionando!");
});

// Rota de login
app.post("/api/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    const result = await client.query(
      "SELECT * FROM usuarios WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ erro: "Usuário não encontrado" });
    }

    const usuario = result.rows[0];

    // Para testes rápidos sem hash:
    if (senha !== usuario.senha) {
      return res.status(401).json({ erro: "Senha incorreta" });
    }

    // Aqui você pode gerar token JWT real
    const token = "token-de-teste";

    res.json({ token, usuario: { id: usuario.id, email: usuario.email } });
  } catch (err) {
    console.error("Erro no login:", err);
    res.status(500).json({ erro: "Erro interno do servidor" });
  }
});

app.post("/api/cadastro", async (req, res) => {
  try {
    const { nome_usuario, email, senha } = req.body;

    if (!nome_usuario || !email || !senha) {
      return res.status(400).json({ erro: "Preencha todos os campos." });
    }

    const check = await client.query(
      "SELECT 1 FROM usuarios WHERE email = $1",
      [email]
    );

    if (check.rows.length) {
      return res.status(400).json({ erro: "Email já cadastrado." });
    }

    await client.query(
      "INSERT INTO usuarios (nome_usuario, email, senha) VALUES ($1, $2, $3)",
      [nome_usuario, email, senha]
    );

    res.status(201).json({ mensagem: "Usuário cadastrado com sucesso!" });

  } catch (err) {
    console.error("Erro no cadastro:", err);
    res.status(500).json({ erro: "Erro interno do servidor" });
  }
});

// Inicia o servidor e cria tabelas
async function startServer() {
  try {
    await client.connect();
    console.log("Conectado ao PostgreSQL no Render");

    await criarTabelas();

    app.listen(process.env.PORT || 3000, () => {
      console.log("Servidor rodando...");
    });
  } catch (err) {
    console.error("Erro ao conectar no PostgreSQL:", err);
  }
}

startServer();
