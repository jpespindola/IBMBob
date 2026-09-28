#!/usr/bin/env python3
"""
seed.py — Cria o database DioClass no Appwrite com:
  - Collections: professores, alunos, aulas, artigos, avaliacao
  - Atributos tipados e relacionamentos entre elas
  - Dados ficticios em cada collection

Uso: python seed.py
"""

import time
import os

from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.id import ID
from appwrite.permission import Permission
from appwrite.role import Role
from appwrite.exception import AppwriteException

ENDPOINT = os.environ.get("APPWRITE_ENDPOINT", "https://nyc.cloud.appwrite.io/v1")
PROJECT  = os.environ.get("APPWRITE_PROJECT",  "6ab9d0f3001efdac0518")
API_KEY  = os.environ.get("APPWRITE_API_KEY",  "standard_3a17607597e60c73ab9e02fc8749e99876e97b136f5c8c493be0c056a56879085c2276b737eaa4c61066dd46620abb540538625df262c369f932be7778dd5ddd62c1d47b69f9bfabc9c9242578b394339187b9cfae52f8994e08eb26dd7959fb939d06358546782bee4297dfc2f67b068c7e59b5c4d71b69d3b5553e5a37cb8c")

client = (
    Client()
    .set_endpoint(ENDPOINT)
    .set_project(PROJECT)
    .set_key(API_KEY)
)
db = Databases(client)

DB_ID = "DioClass"
COLS  = ["professores", "alunos", "aulas", "artigos", "avaliacao"]
PERMS = [Permission.read(Role.any()), Permission.write(Role.any())]

def log(msg):
    print(f"[seed] {msg}")

def safe(fn, label=""):
    try:
        return fn()
    except AppwriteException as e:
        if e.code == 409:
            log(f"  ja existe, pulando: {label}")
        elif e.code == 403 and "maximum number" in str(e).lower():
            log(f"  limite do plano, assumindo existente: {label}")
        else:
            raise

def wait(s=0.4):
    time.sleep(s)

# ── Database ──────────────────────────────────────────────────────────────────
def create_database():
    log("Verificando database DioClass...")
    safe(lambda: db.create(DB_ID, "DioClass", True), "DioClass")
    log("OK")

# ── Collections ───────────────────────────────────────────────────────────────
def create_collections():
    log("Criando collections...")
    for col in COLS:
        safe(lambda c=col: db.create_collection(DB_ID, c, c, PERMS), col)
        wait()
    log("OK")

# ── Atributos ─────────────────────────────────────────────────────────────────
def create_attributes():
    log("Criando atributos (aguarde ~20s)...")

    attrs = [
        # professores
        lambda: db.create_string_attribute (DB_ID, "professores", "nome",          100,  True),
        lambda: db.create_email_attribute   (DB_ID, "professores", "email",               True),
        lambda: db.create_string_attribute  (DB_ID, "professores", "especialidade", 100,  True),
        lambda: db.create_string_attribute  (DB_ID, "professores", "titulacao",     50,   False, None),
        lambda: db.create_string_attribute  (DB_ID, "professores", "telefone",      20,   False),
        lambda: db.create_boolean_attribute (DB_ID, "professores", "ativo",               True),
        # alunos
        lambda: db.create_string_attribute  (DB_ID, "alunos", "nome",         100,  True),
        lambda: db.create_email_attribute   (DB_ID, "alunos", "email",              True),
        lambda: db.create_string_attribute  (DB_ID, "alunos", "matricula",    20,   True),
        lambda: db.create_datetime_attribute(DB_ID, "alunos", "dataNascimento",     False),
        lambda: db.create_string_attribute  (DB_ID, "alunos", "curso",        80,   True),
        lambda: db.create_enum_attribute    (DB_ID, "alunos", "status", ["ativo","inativo","trancado"], True),
        # aulas
        lambda: db.create_string_attribute  (DB_ID, "aulas", "titulo",       150,  True),
        lambda: db.create_string_attribute  (DB_ID, "aulas", "descricao",    500,  False),
        lambda: db.create_datetime_attribute(DB_ID, "aulas", "dataHora",           True),
        lambda: db.create_integer_attribute (DB_ID, "aulas", "duracaoMin",         True,  15, 480),
        lambda: db.create_enum_attribute    (DB_ID, "aulas", "modalidade", ["presencial","online","hibrido"], True),
        lambda: db.create_string_attribute  (DB_ID, "aulas", "linkGravacao", 300,  False),
        # artigos
        lambda: db.create_string_attribute  (DB_ID, "artigos", "titulo",     200,  True),
        lambda: db.create_string_attribute  (DB_ID, "artigos", "resumo",     500,  False),
        lambda: db.create_string_attribute  (DB_ID, "artigos", "conteudo",   5000, True),
        lambda: db.create_datetime_attribute(DB_ID, "artigos", "dataPublicacao",   True),
        lambda: db.create_string_attribute  (DB_ID, "artigos", "tags",       200,  False),
        lambda: db.create_boolean_attribute (DB_ID, "artigos", "publicado",        True),
        # avaliacao
        lambda: db.create_float_attribute   (DB_ID, "avaliacao", "nota",           True,  0,  10),
        lambda: db.create_string_attribute  (DB_ID, "avaliacao", "comentario", 500, False),
        lambda: db.create_datetime_attribute(DB_ID, "avaliacao", "dataAvaliacao",  True),
        lambda: db.create_enum_attribute    (DB_ID, "avaliacao", "tipo", ["prova","trabalho","participacao","projeto"], True),
    ]

    for fn in attrs:
        safe(fn)
        wait(0.5)

    log("Atributos criados. Aguardando indexacao (8s)...")
    time.sleep(8)

# ── Relacionamentos ───────────────────────────────────────────────────────────
def create_relationships():
    log("Criando relacionamentos...")

    rels = [
        lambda: db.create_relationship_attribute(DB_ID, "aulas",     "professores", "manyToOne", True, "professor", "aulas",     "setNull"),
        lambda: db.create_relationship_attribute(DB_ID, "artigos",   "professores", "manyToOne", True, "autor",     "artigos",   "setNull"),
        lambda: db.create_relationship_attribute(DB_ID, "avaliacao", "alunos",      "manyToOne", True, "aluno",     "avaliacoes","cascade"),
        lambda: db.create_relationship_attribute(DB_ID, "avaliacao", "aulas",       "manyToOne", True, "aula",      "avaliacoes","cascade"),
    ]

    for fn in rels:
        safe(fn)
        wait(0.5)

    log("Relacionamentos criados. Aguardando (8s)...")
    time.sleep(8)

# ── Dados ficticios ───────────────────────────────────────────────────────────
def seed_data():
    log("Inserindo dados ficticios...")

    # Professores
    professores = [
        ("prof_ana",     {"nome":"Ana Paula Ferreira",   "email":"ana.ferreira@dioclass.edu.br",  "especialidade":"Inteligencia Artificial",       "titulacao":"Doutora",     "telefone":"(11) 91234-5001","ativo":True }),
        ("prof_carlos",  {"nome":"Carlos Eduardo Lima",  "email":"carlos.lima@dioclass.edu.br",   "especialidade":"Desenvolvimento Web Full Stack", "titulacao":"Mestre",      "telefone":"(21) 91234-5002","ativo":True }),
        ("prof_beatriz", {"nome":"Beatriz Santos Rocha", "email":"beatriz.rocha@dioclass.edu.br", "especialidade":"Ciencia de Dados",              "titulacao":"Doutora",     "telefone":"(31) 91234-5003","ativo":True }),
        ("prof_diego",   {"nome":"Diego Alves Moreira",  "email":"diego.moreira@dioclass.edu.br", "especialidade":"DevOps e Cloud Computing",       "titulacao":"Especialista","telefone":"(41) 91234-5004","ativo":True }),
        ("prof_elena",   {"nome":"Elena Costa Barbosa",  "email":"elena.barbosa@dioclass.edu.br", "especialidade":"UX/UI Design",                  "titulacao":"Mestre",      "telefone":"(51) 91234-5005","ativo":False}),
    ]
    for doc_id, data in professores:
        safe(lambda i=doc_id, d=data: db.create_document(DB_ID, "professores", i, d, PERMS), f"professor {doc_id}")
        wait(0.3)

    # Alunos
    alunos = [
        ("aluno_001", {"nome":"Joao Victor Mendes",     "email":"joao.mendes@email.com",     "matricula":"2024001","dataNascimento":"2000-03-15T00:00:00.000+00:00","curso":"Engenharia de Software",   "status":"ativo"}),
        ("aluno_002", {"nome":"Larissa Fernanda Silva", "email":"larissa.silva@email.com",   "matricula":"2024002","dataNascimento":"2001-07-22T00:00:00.000+00:00","curso":"Ciencia da Computacao",    "status":"ativo"}),
        ("aluno_003", {"nome":"Rafael Souza Oliveira",  "email":"rafael.oliveira@email.com", "matricula":"2024003","dataNascimento":"1999-11-08T00:00:00.000+00:00","curso":"Sistemas de Informacao",   "status":"ativo"}),
        ("aluno_004", {"nome":"Camila Torres Pereira",  "email":"camila.pereira@email.com",  "matricula":"2023040","dataNascimento":"2002-01-30T00:00:00.000+00:00","curso":"Analise e Desenvolvimento", "status":"inativo"}),
        ("aluno_005", {"nome":"Bruno Henrique Nunes",   "email":"bruno.nunes@email.com",     "matricula":"2023055","dataNascimento":"2001-05-19T00:00:00.000+00:00","curso":"Engenharia de Software",   "status":"ativo"}),
        ("aluno_006", {"nome":"Mariana Luz Carvalho",   "email":"mariana.carvalho@email.com","matricula":"2022099","dataNascimento":"2000-09-04T00:00:00.000+00:00","curso":"Ciencia da Computacao",    "status":"trancado"}),
    ]
    for doc_id, data in alunos:
        safe(lambda i=doc_id, d=data: db.create_document(DB_ID, "alunos", i, d, PERMS), f"aluno {doc_id}")
        wait(0.3)

    # Aulas
    aulas = [
        ("aula_001", {"titulo":"Introducao ao Machine Learning",     "descricao":"Conceitos fundamentais de ML e primeiros modelos.",      "dataHora":"2025-02-10T09:00:00.000+00:00","duracaoMin":90,  "modalidade":"online",    "linkGravacao":"https://dioclass.edu.br/rec/ml-intro",   "professor":"prof_ana"}),
        ("aula_002", {"titulo":"JavaScript Moderno com ES2024",      "descricao":"Novas funcionalidades e boas praticas do JavaScript.",   "dataHora":"2025-02-12T14:00:00.000+00:00","duracaoMin":120, "modalidade":"online",    "linkGravacao":"https://dioclass.edu.br/rec/js-es2024",  "professor":"prof_carlos"}),
        ("aula_003", {"titulo":"Pipeline de Dados com Python",       "descricao":"Construcao de pipelines usando Pandas e Apache Airflow.","dataHora":"2025-02-14T10:00:00.000+00:00","duracaoMin":180, "modalidade":"hibrido",   "linkGravacao":"https://dioclass.edu.br/rec/pipeline-py", "professor":"prof_beatriz"}),
        ("aula_004", {"titulo":"Docker e Kubernetes na Pratica",     "descricao":"Containerizacao e orquestracao de aplicacoes.",          "dataHora":"2025-02-18T08:00:00.000+00:00","duracaoMin":150, "modalidade":"online",    "linkGravacao":"https://dioclass.edu.br/rec/docker-k8s",  "professor":"prof_diego"}),
        ("aula_005", {"titulo":"Design System e Acessibilidade Web", "descricao":"Criacao de sistemas de design acessiveis e escalaveis.", "dataHora":"2025-02-20T13:00:00.000+00:00","duracaoMin":90,  "modalidade":"presencial", "linkGravacao":None,                                     "professor":"prof_elena"}),
    ]
    for doc_id, data in aulas:
        safe(lambda i=doc_id, d=data: db.create_document(DB_ID, "aulas", i, d, PERMS), f"aula {doc_id}")
        wait(0.3)

    # Artigos
    artigos = [
        ("artigo_001", {"titulo":"O Futuro da IA Generativa na Educacao",              "resumo":"Como modelos de linguagem estao transformando o ensino.",                  "conteudo":"A inteligencia artificial generativa representa uma virada de chave na educacao. Ferramentas como tutores virtuais adaptativos permitem que cada aluno avance no seu proprio ritmo, recebendo feedback imediato e personalizado.", "dataPublicacao":"2025-01-15T12:00:00.000+00:00","tags":"IA, educacao, LLM, inovacao",            "publicado":True,  "autor":"prof_ana"}),
        ("artigo_002", {"titulo":"React 19: O que Mudou e Como Migrar",                "resumo":"Guia pratico das novidades do React 19 e estrategias de migracao.",         "conteudo":"O React 19 trouxe o compilador React Compiler, eliminando a necessidade de useMemo e useCallback na maioria dos casos. Neste artigo exploramos cada mudanca e apresentamos um guia passo a passo para migrar projetos existentes.", "dataPublicacao":"2025-01-28T09:30:00.000+00:00","tags":"React, JavaScript, frontend, migracao",   "publicado":True,  "autor":"prof_carlos"}),
        ("artigo_003", {"titulo":"Boas Praticas em Ciencia de Dados: Do Notebook ao Prod","resumo":"Como levar modelos de machine learning do experimento para producao.",   "conteudo":"Um dos maiores desafios em ciencia de dados e a lacuna entre o notebook experimental e um sistema produtivo confiavel. Este artigo apresenta padroes como MLflow, DVC e estrategias de versionamento de modelos.",              "dataPublicacao":"2025-02-05T11:00:00.000+00:00","tags":"ciencia de dados, MLOps, producao, Python","publicado":True,  "autor":"prof_beatriz"}),
        ("artigo_004", {"titulo":"GitOps com ArgoCD: Entrega Continua para Kubernetes", "resumo":"Implementando GitOps em clusters Kubernetes com ArgoCD.",                  "conteudo":"GitOps representa uma evolucao natural do DevOps ao usar repositorios Git como fonte unica de verdade para o estado da infraestrutura. O ArgoCD monitora repositorios e sincroniza automaticamente o cluster.",                 "dataPublicacao":"2025-02-10T14:00:00.000+00:00","tags":"DevOps, Kubernetes, ArgoCD, GitOps",      "publicado":False, "autor":"prof_diego"}),
    ]
    for doc_id, data in artigos:
        safe(lambda i=doc_id, d=data: db.create_document(DB_ID, "artigos", i, d, PERMS), f"artigo {doc_id}")
        wait(0.3)

    # Avaliacoes
    avaliacoes = [
        {"nota":9.5, "comentario":"Excelente compreensao dos conceitos.",         "dataAvaliacao":"2025-02-11T18:00:00.000+00:00","tipo":"prova",        "aluno":"aluno_001","aula":"aula_001"},
        {"nota":8.0, "comentario":"Bom trabalho, pode melhorar na parte pratica.","dataAvaliacao":"2025-02-11T18:30:00.000+00:00","tipo":"trabalho",     "aluno":"aluno_002","aula":"aula_001"},
        {"nota":7.5, "comentario":"Apresentou dificuldades com async/await.",     "dataAvaliacao":"2025-02-13T16:00:00.000+00:00","tipo":"participacao", "aluno":"aluno_001","aula":"aula_002"},
        {"nota":10,  "comentario":"Projeto impecavel, superou as expectativas.",  "dataAvaliacao":"2025-02-13T16:30:00.000+00:00","tipo":"projeto",      "aluno":"aluno_003","aula":"aula_002"},
        {"nota":6.0, "comentario":"Precisa revisar conceitos de ETL.",            "dataAvaliacao":"2025-02-15T17:00:00.000+00:00","tipo":"prova",        "aluno":"aluno_005","aula":"aula_003"},
        {"nota":8.5, "comentario":"Otimo dominio de Pandas e visualizacoes.",     "dataAvaliacao":"2025-02-15T17:30:00.000+00:00","tipo":"trabalho",     "aluno":"aluno_002","aula":"aula_003"},
        {"nota":9.0, "comentario":"Containers bem configurados e documentados.",  "dataAvaliacao":"2025-02-19T15:00:00.000+00:00","tipo":"projeto",      "aluno":"aluno_003","aula":"aula_004"},
        {"nota":5.5, "comentario":"Dificuldades com orquestracao Kubernetes.",    "dataAvaliacao":"2025-02-19T15:30:00.000+00:00","tipo":"prova",        "aluno":"aluno_005","aula":"aula_004"},
    ]
    for data in avaliacoes:
        safe(lambda d=data: db.create_document(DB_ID, "avaliacao", ID.unique(), d, PERMS))
        wait(0.3)

    log("Dados ficticios inseridos com sucesso!")

# ── Main ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    try:
        create_database()
        create_collections()
        create_attributes()
        create_relationships()
        seed_data()
        print(f"\nDioClass configurado com sucesso!")
        print(f"Acesse: https://appwrite.io/projects/{PROJECT}/databases")
    except Exception as e:
        print(f"\nERRO durante o setup: {e}")
        raise
