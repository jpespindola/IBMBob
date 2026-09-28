#!/usr/bin/env node
/**
 * seed.js — Cria o database DioClass no Appwrite com:
 *   - Collections: professores, alunos, aulas, artigos, avaliacao
 *   - Atributos tipados em cada collection
 *   - Relacionamentos entre elas
 *   - Dados fictícios em cada collection
 *
 * Uso: node seed.js
 * Env: APPWRITE_ENDPOINT, APPWRITE_PROJECT, APPWRITE_API_KEY
 */

import { Client, Databases, ID, Permission, Role } from "node-appwrite";

const ENDPOINT   = process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
const PROJECT    = process.env.APPWRITE_PROJECT  || "6ab9d0f3001efdac0518";
const API_KEY    = process.env.APPWRITE_API_KEY  || "standard_3a17607597e60c73ab9e02fc8749e99876e97b136f5c8c493be0c056a56879085c2276b737eaa4c61066dd46620abb540538625df262c369f932be7778dd5ddd62c1d47b69f9bfabc9c9242578b394339187b9cfae52f8994e08eb26dd7959fb939d06358546782bee4297dfc2f67b068c7e59b5c4d71b69d3b5553e5a37cb8c";

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT).setKey(API_KEY);
const db     = new Databases(client);

const log = (msg) => console.log(`[seed] ${msg}`);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// IDs fixos para facilitar referências
const DB_ID   = "DioClass";
const COL = {
  professores: "professores",
  alunos:      "alunos",
  aulas:       "aulas",
  artigos:     "artigos",
  avaliacao:   "avaliacao",
};

// ── Permissões abertas (servidor) ─────────────────────────────────────────────
const PERMS = [Permission.read(Role.any()), Permission.write(Role.any())];

async function createDatabase() {
  try {
    log("Criando database DioClass...");
    await db.create(DB_ID, "DioClass", true);
    log("Database criado.");
  } catch (e) {
    if (e?.code === 409) { log("Database já existe, continuando..."); }
    else throw e;
  }
}

async function createCollections() {
  const cols = Object.values(COL);
  for (const col of cols) {
    try {
      log(`Criando collection '${col}'...`);
      await db.createCollection(DB_ID, col, col, PERMS);
      log(`Collection '${col}' criada.`);
    } catch (e) {
      if (e?.code === 409) { log(`Collection '${col}' já existe.`); }
      else throw e;
    }
  }
}

async function createAttributes() {
  log("Criando atributos...");

  // professores
  const prof = [
    () => db.createStringAttribute(DB_ID, COL.professores, "nome",         100, true),
    () => db.createEmailAttribute (DB_ID, COL.professores, "email",             true),
    () => db.createStringAttribute(DB_ID, COL.professores, "especialidade", 100, true),
    () => db.createStringAttribute(DB_ID, COL.professores, "titulacao",     50,  false, "Graduado"),
    () => db.createStringAttribute(DB_ID, COL.professores, "telefone",      20,  false),
    () => db.createBooleanAttribute(DB_ID, COL.professores, "ativo",            true,  true),
  ];

  // alunos
  const alun = [
    () => db.createStringAttribute(DB_ID, COL.alunos, "nome",         100, true),
    () => db.createEmailAttribute (DB_ID, COL.alunos, "email",             true),
    () => db.createStringAttribute(DB_ID, COL.alunos, "matricula",    20,  true),
    () => db.createDatetimeAttribute(DB_ID, COL.alunos, "dataNascimento", false),
    () => db.createStringAttribute(DB_ID, COL.alunos, "curso",        80,  true),
    () => db.createEnumAttribute  (DB_ID, COL.alunos, "status", ["ativo","inativo","trancado"], true, "ativo"),
  ];

  // aulas
  const aul = [
    () => db.createStringAttribute(DB_ID, COL.aulas, "titulo",    150, true),
    () => db.createStringAttribute(DB_ID, COL.aulas, "descricao", 500, false),
    () => db.createDatetimeAttribute(DB_ID, COL.aulas, "dataHora",    true),
    () => db.createIntegerAttribute(DB_ID, COL.aulas, "duracaoMin",   true, 15, 480),
    () => db.createEnumAttribute  (DB_ID, COL.aulas, "modalidade", ["presencial","online","hibrido"], true, "online"),
    () => db.createStringAttribute(DB_ID, COL.aulas, "linkGravacao", 300, false),
  ];

  // artigos
  const art = [
    () => db.createStringAttribute(DB_ID, COL.artigos, "titulo",    200, true),
    () => db.createStringAttribute(DB_ID, COL.artigos, "resumo",    500, false),
    () => db.createStringAttribute(DB_ID, COL.artigos, "conteudo", 5000, true),
    () => db.createDatetimeAttribute(DB_ID, COL.artigos, "dataPublicacao", true),
    () => db.createStringAttribute(DB_ID, COL.artigos, "tags",      200, false),
    () => db.createBooleanAttribute(DB_ID, COL.artigos, "publicado",    true, false),
  ];

  // avaliacao
  const aval = [
    () => db.createFloatAttribute  (DB_ID, COL.avaliacao, "nota",        true, 0, 10),
    () => db.createStringAttribute (DB_ID, COL.avaliacao, "comentario",  500, false),
    () => db.createDatetimeAttribute(DB_ID, COL.avaliacao, "dataAvaliacao", true),
    () => db.createEnumAttribute   (DB_ID, COL.avaliacao, "tipo", ["prova","trabalho","participacao","projeto"], true, "prova"),
  ];

  const allGroups = [...prof, ...alun, ...aul, ...art, ...aval];
  for (const fn of allGroups) {
    try { await fn(); }
    catch (e) { if (e?.code !== 409) throw e; }
    await sleep(300); // Appwrite precisa de um pequeno delay entre atributos
  }
  log("Atributos criados. Aguardando indexação (5s)...");
  await sleep(5000);
}

async function createRelationships() {
  log("Criando relacionamentos...");

  const rels = [
    // aulas → professores (muitas aulas por professor)
    () => db.createRelationshipAttribute(DB_ID, COL.aulas, COL.professores, "manyToOne", true, "professor", "aulas", "setNull"),
    // artigos → professores (muitos artigos por professor)
    () => db.createRelationshipAttribute(DB_ID, COL.artigos, COL.professores, "manyToOne", true, "autor", "artigos", "setNull"),
    // avaliacao → alunos (muitas avaliações por aluno)
    () => db.createRelationshipAttribute(DB_ID, COL.avaliacao, COL.alunos, "manyToOne", true, "aluno", "avaliacoes", "cascade"),
    // avaliacao → aulas (muitas avaliações por aula)
    () => db.createRelationshipAttribute(DB_ID, COL.avaliacao, COL.aulas, "manyToOne", true, "aula", "avaliacoes", "cascade"),
  ];

  for (const fn of rels) {
    try { await fn(); }
    catch (e) { if (e?.code !== 409) throw e; }
    await sleep(300);
  }
  log("Relacionamentos criados. Aguardando (5s)...");
  await sleep(5000);
}

async function seedData() {
  log("Inserindo dados fictícios...");

  // ── Professores ──────────────────────────────────────────────────────────────
  const profIds = ["prof_ana","prof_carlos","prof_beatriz","prof_diego","prof_elena"];
  const profData = [
    { nome: "Ana Paula Ferreira",    email: "ana.ferreira@dioclass.edu.br",    especialidade: "Inteligência Artificial",       titulacao: "Doutora",    telefone: "(11) 91234-5001", ativo: true  },
    { nome: "Carlos Eduardo Lima",   email: "carlos.lima@dioclass.edu.br",     especialidade: "Desenvolvimento Web Full Stack", titulacao: "Mestre",     telefone: "(21) 91234-5002", ativo: true  },
    { nome: "Beatriz Santos Rocha",  email: "beatriz.rocha@dioclass.edu.br",   especialidade: "Ciência de Dados",              titulacao: "Doutora",    telefone: "(31) 91234-5003", ativo: true  },
    { nome: "Diego Alves Moreira",   email: "diego.moreira@dioclass.edu.br",   especialidade: "DevOps e Cloud Computing",      titulacao: "Especialista",telefone: "(41) 91234-5004", ativo: true  },
    { nome: "Elena Costa Barbosa",   email: "elena.barbosa@dioclass.edu.br",   especialidade: "UX/UI Design",                  titulacao: "Mestre",     telefone: "(51) 91234-5005", ativo: false },
  ];
  for (let i = 0; i < profIds.length; i++) {
    try {
      await db.createDocument(DB_ID, COL.professores, profIds[i], profData[i], PERMS);
      log(`Professor criado: ${profData[i].nome}`);
    } catch (e) { if (e?.code !== 409) throw e; log(`Professor já existe: ${profData[i].nome}`); }
  }

  // ── Alunos ───────────────────────────────────────────────────────────────────
  const aluIds = ["aluno_001","aluno_002","aluno_003","aluno_004","aluno_005","aluno_006"];
  const aluData = [
    { nome: "João Victor Mendes",     email: "joao.mendes@email.com",     matricula: "2024001", dataNascimento: "2000-03-15T00:00:00.000+00:00", curso: "Engenharia de Software",   status: "ativo"    },
    { nome: "Larissa Fernanda Silva", email: "larissa.silva@email.com",   matricula: "2024002", dataNascimento: "2001-07-22T00:00:00.000+00:00", curso: "Ciência da Computação",    status: "ativo"    },
    { nome: "Rafael Souza Oliveira", email: "rafael.oliveira@email.com", matricula: "2024003", dataNascimento: "1999-11-08T00:00:00.000+00:00", curso: "Sistemas de Informação",   status: "ativo"    },
    { nome: "Camila Torres Pereira", email: "camila.pereira@email.com",  matricula: "2023040", dataNascimento: "2002-01-30T00:00:00.000+00:00", curso: "Análise e Desenvolvimento", status: "inativo"  },
    { nome: "Bruno Henrique Nunes",  email: "bruno.nunes@email.com",     matricula: "2023055", dataNascimento: "2001-05-19T00:00:00.000+00:00", curso: "Engenharia de Software",   status: "ativo"    },
    { nome: "Mariana Luz Carvalho",  email: "mariana.carvalho@email.com",matricula: "2022099", dataNascimento: "2000-09-04T00:00:00.000+00:00", curso: "Ciência da Computação",    status: "trancado" },
  ];
  for (let i = 0; i < aluIds.length; i++) {
    try {
      await db.createDocument(DB_ID, COL.alunos, aluIds[i], aluData[i], PERMS);
      log(`Aluno criado: ${aluData[i].nome}`);
    } catch (e) { if (e?.code !== 409) throw e; log(`Aluno já existe: ${aluData[i].nome}`); }
  }

  // ── Aulas ────────────────────────────────────────────────────────────────────
  const aulIds = ["aula_001","aula_002","aula_003","aula_004","aula_005"];
  const aulData = [
    { titulo: "Introdução ao Machine Learning",         descricao: "Conceitos fundamentais de ML e primeiros modelos.",      dataHora: "2025-02-10T09:00:00.000+00:00", duracaoMin: 90,  modalidade: "online",      linkGravacao: "https://dioclass.edu.br/rec/ml-intro",   professor: "prof_ana"     },
    { titulo: "JavaScript Moderno com ES2024",          descricao: "Novas funcionalidades e boas práticas do JavaScript.",   dataHora: "2025-02-12T14:00:00.000+00:00", duracaoMin: 120, modalidade: "online",      linkGravacao: "https://dioclass.edu.br/rec/js-es2024",  professor: "prof_carlos"  },
    { titulo: "Pipeline de Dados com Python",           descricao: "Construção de pipelines usando Pandas e Apache Airflow.",dataHora: "2025-02-14T10:00:00.000+00:00", duracaoMin: 180, modalidade: "hibrido",     linkGravacao: "https://dioclass.edu.br/rec/pipeline-py", professor: "prof_beatriz" },
    { titulo: "Docker e Kubernetes na Prática",         descricao: "Containerização e orquestração de aplicações.",          dataHora: "2025-02-18T08:00:00.000+00:00", duracaoMin: 150, modalidade: "online",      linkGravacao: "https://dioclass.edu.br/rec/docker-k8s",  professor: "prof_diego"   },
    { titulo: "Design System e Acessibilidade Web",     descricao: "Criação de sistemas de design acessíveis e escaláveis.", dataHora: "2025-02-20T13:00:00.000+00:00", duracaoMin: 90,  modalidade: "presencial",  linkGravacao: null,                                      professor: "prof_elena"   },
  ];
  for (let i = 0; i < aulIds.length; i++) {
    try {
      await db.createDocument(DB_ID, COL.aulas, aulIds[i], aulData[i], PERMS);
      log(`Aula criada: ${aulData[i].titulo}`);
    } catch (e) { if (e?.code !== 409) throw e; log(`Aula já existe: ${aulData[i].titulo}`); }
  }

  // ── Artigos ──────────────────────────────────────────────────────────────────
  const artIds = ["artigo_001","artigo_002","artigo_003","artigo_004"];
  const artData = [
    {
      titulo: "O Futuro da IA Generativa na Educação",
      resumo: "Como modelos de linguagem estão transformando o ensino.",
      conteudo: "A inteligência artificial generativa representa uma virada de chave na educação. Ferramentas como tutores virtuais adaptativos permitem que cada aluno avance no seu próprio ritmo, recebendo feedback imediato e personalizado...",
      dataPublicacao: "2025-01-15T12:00:00.000+00:00",
      tags: "IA, educação, LLM, inovação",
      publicado: true,
      autor: "prof_ana",
    },
    {
      titulo: "React 19: O que Mudou e Como Migrar",
      resumo: "Guia prático das novidades do React 19 e estratégias de migração.",
      conteudo: "O React 19 trouxe o compilador React Compiler, eliminando a necessidade de useMemo e useCallback na maioria dos casos. Neste artigo exploramos cada mudança e apresentamos um guia passo a passo para migrar projetos existentes...",
      dataPublicacao: "2025-01-28T09:30:00.000+00:00",
      tags: "React, JavaScript, frontend, migração",
      publicado: true,
      autor: "prof_carlos",
    },
    {
      titulo: "Boas Práticas em Ciência de Dados: Do Notebook ao Prod",
      resumo: "Como levar modelos de machine learning do experimento para produção.",
      conteudo: "Um dos maiores desafios em ciência de dados é a lacuna entre o notebook experimental e um sistema produtivo confiável. Este artigo apresenta padrões como MLflow, DVC e estratégias de versionamento de modelos...",
      dataPublicacao: "2025-02-05T11:00:00.000+00:00",
      tags: "ciência de dados, MLOps, produção, Python",
      publicado: true,
      autor: "prof_beatriz",
    },
    {
      titulo: "GitOps com ArgoCD: Entrega Contínua para Kubernetes",
      resumo: "Implementando GitOps em clusters Kubernetes com ArgoCD.",
      conteudo: "GitOps representa uma evolução natural do DevOps ao usar repositórios Git como fonte única de verdade para o estado da infraestrutura. O ArgoCD monitora repositórios e sincroniza automaticamente o cluster...",
      dataPublicacao: "2025-02-10T14:00:00.000+00:00",
      tags: "DevOps, Kubernetes, ArgoCD, GitOps",
      publicado: false,
      autor: "prof_diego",
    },
  ];
  for (let i = 0; i < artIds.length; i++) {
    try {
      await db.createDocument(DB_ID, COL.artigos, artIds[i], artData[i], PERMS);
      log(`Artigo criado: ${artData[i].titulo}`);
    } catch (e) { if (e?.code !== 409) throw e; log(`Artigo já existe: ${artData[i].titulo}`); }
  }

  // ── Avaliações ───────────────────────────────────────────────────────────────
  const avalData = [
    { nota: 9.5, comentario: "Excelente compreensão dos conceitos.",        dataAvaliacao: "2025-02-11T18:00:00.000+00:00", tipo: "prova",         aluno: "aluno_001", aula: "aula_001" },
    { nota: 8.0, comentario: "Bom trabalho, pode melhorar na parte prática.",dataAvaliacao: "2025-02-11T18:30:00.000+00:00", tipo: "trabalho",      aluno: "aluno_002", aula: "aula_001" },
    { nota: 7.5, comentario: "Apresentou dificuldades com async/await.",    dataAvaliacao: "2025-02-13T16:00:00.000+00:00", tipo: "participacao",  aluno: "aluno_001", aula: "aula_002" },
    { nota: 10,  comentario: "Projeto impecável, superou as expectativas.",  dataAvaliacao: "2025-02-13T16:30:00.000+00:00", tipo: "projeto",       aluno: "aluno_003", aula: "aula_002" },
    { nota: 6.0, comentario: "Precisa revisar conceitos de ETL.",           dataAvaliacao: "2025-02-15T17:00:00.000+00:00", tipo: "prova",         aluno: "aluno_005", aula: "aula_003" },
    { nota: 8.5, comentario: "Ótimo domínio de Pandas e visualizações.",    dataAvaliacao: "2025-02-15T17:30:00.000+00:00", tipo: "trabalho",      aluno: "aluno_002", aula: "aula_003" },
    { nota: 9.0, comentario: "Containers bem configurados e documentados.", dataAvaliacao: "2025-02-19T15:00:00.000+00:00", tipo: "projeto",       aluno: "aluno_003", aula: "aula_004" },
    { nota: 5.5, comentario: "Dificuldades com orquestração Kubernetes.",   dataAvaliacao: "2025-02-19T15:30:00.000+00:00", tipo: "prova",         aluno: "aluno_005", aula: "aula_004" },
  ];
  for (let i = 0; i < avalData.length; i++) {
    try {
      await db.createDocument(DB_ID, COL.avaliacao, ID.unique(), avalData[i], PERMS);
      log(`Avaliação criada: aluno ${avalData[i].aluno} — nota ${avalData[i].nota}`);
    } catch (e) { if (e?.code !== 409) throw e; }
  }

  log("✅ Dados fictícios inseridos com sucesso!");
}

// ── Main ───────────────────────────────────────────────────────────────────────
(async () => {
  try {
    await createDatabase();
    await createCollections();
    await createAttributes();
    await createRelationships();
    await seedData();
    console.log("\n🎉 DioClass configurado com sucesso no Appwrite!");
    console.log(`   Acesse: https://appwrite.io/projects/${PROJECT}/databases`);
  } catch (e) {
    console.error("\n❌ Erro durante o setup:", e?.message || e);
    process.exit(1);
  }
})();
