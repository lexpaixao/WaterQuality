require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Client } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

// Configuração do PostgreSQL
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function startServer() {
  try {
    await client.connect();
    console.log("Conectado ao PostgreSQL no Render");

    // Rotas de exemplo
    app.get("/", (req, res) => {
      res.send("API funcionando!");
    });

    app.listen(process.env.PORT || 3000, () => {
      console.log("Servidor rodando...");
    });
  } catch (err) {
    console.error("Erro ao conectar no PostgreSQL:", err);
  }
}

startServer();
