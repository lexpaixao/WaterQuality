require("dotenv").config();
const { Client } = require("pg");

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function createTables() {
  try {
    await client.connect();
    console.log("Conectado ao PostgreSQL no Render");

    // Tabela de usuários
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome_usuario VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        senha VARCHAR(255) NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tabela de histórico de análises
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
  } finally {
    await client.end();
    console.log("Conexão encerrada");
  }
}

createTables();
