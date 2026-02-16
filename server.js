require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});


// Cad
app.post("/api/cadastro", async (req, res) => {

  const { nome_usuario, email, senha } = req.body;

  if (!nome_usuario || !email || !senha)
    return res.status(400).json({ erro: "Dados obrigatórios" });

  const senhaHash = await bcrypt.hash(senha, 10);

  try {
    await pool.query(
      "INSERT INTO usuarios (nome_usuario,email,senha) VALUES ($1,$2,$3)",
      [nome_usuario, email, senhaHash]
    );

    res.json({ mensagem: "Usuário cadastrado com sucesso" });

  } catch {
    res.status(400).json({ erro: "Email já cadastrado" });
  }
});


//login
app.post("/api/login", async (req, res) => {

  const { email, senha } = req.body;

  const user = await pool.query(
    "SELECT * FROM usuarios WHERE email=$1",
    [email]
  );

  if (user.rows.length === 0)
    return res.status(400).json({ erro: "Usuário não encontrado" });

  const senhaValida = await bcrypt.compare(
    senha,
    user.rows[0].senha
  );

  if (!senhaValida)
    return res.status(400).json({ erro: "Senha incorreta" });

  const token = jwt.sign(
    { id: user.rows[0].id },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.json({ token });
});


// segurança
function verificarToken(req, res, next) {

  const token = req.headers.authorization?.split(" ")[1];

  if (!token)
    return res.status(401).json({ erro: "Token necessário" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuarioId = decoded.id;
    next();
  } catch {
    res.status(401).json({ erro: "Token inválido" });
  }
}


// avalia a qualidade da agua
app.post("/api/processar", verificarToken, async (req, res) => {

  const {
    ph,
    temperatura,
    turbidez,
    cloro,
    od,
    condutividade,
    tds
  } = req.body;

  const usuario_id = req.usuarioId;
  
  if (
    ph == null || temperatura == null || turbidez == null ||
    cloro == null || od == null ||
    condutividade == null || tds == null
  ) {
    return res.status(400).json({ erro: "Dados obrigatórios ausentes" });
  }

  const indicadoresFora = [];
  let statusGeral = "Dentro dos padrões de potabilidade";

  // teste de qualidade

  if (!(ph >= 6.5 && ph <= 8.5))
    indicadoresFora.push("pH fora dos padrões");

  if (!(temperatura >= 5 && temperatura <= 20))
    indicadoresFora.push("Temperatura fora dos padrões");

  if (!(turbidez > 1 && turbidez <= 5))
    indicadoresFora.push("Turbidez fora dos padrões");

  if (!(cloro >= 0.2 && cloro <= 2.0))
    indicadoresFora.push("Cloro fora dos padrões");

  if (!(od <= 5))
    indicadoresFora.push("Oxigênio dissolvido fora dos padrões");

  if (!(condutividade >= 50 && condutividade <= 500))
    indicadoresFora.push("Condutividade fora dos padrões");

  if (!(tds < 500))
    indicadoresFora.push("TDS fora dos padrões");

  if (indicadoresFora.length > 0) {
    statusGeral = "Fora dos padrões de potabilidade";
  }

  // salvando juntamente ao id que solicitou a verificação

  await pool.query(
    `INSERT INTO historico
    (usuario_id, ph, temperatura, turbidez, cloro, od, condutividade, tds, status_geral, indicadores_fora)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      usuario_id,
      ph,
      temperatura,
      turbidez,
      cloro,
      od,
      condutividade,
      tds,
      statusGeral,
      indicadoresFora.join(", ")
    ]
  );

  // resposta ao solicitante

  res.json({
    status: statusGeral,
    indicadores_fora: indicadoresFora
  });

});


// historico para o analisador
app.get("/api/historico", verificarToken, async (req, res) => {

  const historico = await pool.query(
    "SELECT * FROM historico WHERE usuario_id=$1 ORDER BY criado_em DESC",
    [req.usuarioId]
  );

  res.json(historico.rows);
});


// configuração de servidor
app.listen(process.env.PORT || 3000, () => {
  console.log("Servidor rodando...");
});
