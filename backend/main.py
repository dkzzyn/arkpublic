from io import StringIO
from typing import Any

import pandas as pd
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Controle Expedição API")

# Permite chamadas do frontend em dev (localhost) e no Electron empacotado (origem "null" com file://).
_ORIGIN_RE = r"^https?://(127\.0\.0\.1|localhost)(:\d+)?$|^null$"
app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_origin_regex=_ORIGIN_RE,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Apos o upload, `df` e sempre **1 linha por NF** (ver `_build_nf_resumo`):
# - `NF` ja normalizado (`_normalize_nf_series`)
# - `VALOR_TOTAL` = soma das linhas de item da NF
# - `QTD_ITENS` = `_resolve_nf_items` (evita duplicar volumes na mesma NF)
# Agregacoes mensais/anuais/diarias usam `nunique`/`sum` em cima desse grao.
DATAFRAME_STORE: dict[str, pd.DataFrame | None] = {"df": None}

REQUIRED_COLUMNS = {
    "DATA",
    "NF",
    "ROMANEIO",
    "Z04_PEDIDO",
    "GRUPO ECONÔMICO",
    "RAZÃO SOCIAL",
    "DESC_FAMILIA",
    "DESC_GRUPO",
    "DESC_LOCAL",
    "R$Expedição",
    "#QuantidadeExpedida",
}
CSV_ENCODINGS = ("utf-8-sig", "utf-8", "cp1252", "latin-1")
# Limite de upload (CSV em memoria) — evita DoS por ficheiros enormes.
MAX_UPLOAD_BYTES = 80 * 1024 * 1024


def _load_dataframe() -> pd.DataFrame:
    df = DATAFRAME_STORE["df"]
    if df is None or df.empty:
        raise HTTPException(
            status_code=400,
            detail="Nenhum CSV processado. Envie um arquivo em /upload primeiro.",
        )
    return df


def _normalize_razao_social_column(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    rs = out["RAZÃO SOCIAL"].fillna("").astype(str).str.strip()
    rs = rs.replace("", "(Sem razão social)")
    out["RAZÃO SOCIAL"] = rs
    return out


def _normalize_nf_series(series: pd.Series) -> pd.Series:
    raw = series.fillna("").astype(str).str.strip()
    raw = raw.str.replace(r"\.0+$", "", regex=True)

    digits_only = raw.str.fullmatch(r"\d+")
    normalized = raw.copy()
    normalized.loc[digits_only] = normalized.loc[digits_only].str.lstrip("0")
    normalized = normalized.replace("", "0")

    return normalized


def _format_records(df: pd.DataFrame) -> list[dict[str, Any]]:
    records = df.to_dict(orient="records")
    for row in records:
        row["VALOR_TOTAL"] = float(round(row.get("VALOR_TOTAL", 0.0), 2))
        row["QTD_ITENS"] = float(round(row.get("QTD_ITENS", 0.0), 2))
        row["QTD_NF"] = int(row.get("QTD_NF", 0))
    return records


def _resolve_nf_items(series: pd.Series) -> float:
    vals = pd.to_numeric(series, errors="coerce").fillna(0)
    if vals.empty:
        return 0.0
    max_val = float(vals.max())
    # Regra de negocio:
    # - se existe um total consolidado (>1) na NF, usa esse maior volume
    # - se so existem linhas unitarias (1), soma para obter o total de volumes
    if max_val > 1:
        return max_val
    return float(vals.sum())


def _aggregate_monthly(df: pd.DataFrame, group_extra: list[str] | None = None) -> pd.DataFrame:
    group_cols = ["ANO", "MES"]
    if group_extra:
        group_cols.extend(group_extra)
    result = (
        df.groupby(group_cols, dropna=False)
        .agg(
            QTD_NF=("NF", "nunique"),
            VALOR_TOTAL=("VALOR_TOTAL", "sum"),
            QTD_ITENS=("QTD_ITENS", "sum"),
        )
        .reset_index()
        .sort_values(["ANO", "MES"] + (group_extra or []))
    )
    result["MES_ANO"] = result["ANO"].astype(str) + "-" + result["MES"].astype(int).astype(str).str.zfill(2)
    return result


def _aggregate_annual(df: pd.DataFrame, group_extra: list[str] | None = None) -> pd.DataFrame:
    group_cols = ["ANO"]
    if group_extra:
        group_cols.extend(group_extra)
    return (
        df.groupby(group_cols, dropna=False)
        .agg(
            QTD_NF=("NF", "nunique"),
            VALOR_TOTAL=("VALOR_TOTAL", "sum"),
            QTD_ITENS=("QTD_ITENS", "sum"),
        )
        .reset_index()
        .sort_values(["ANO"] + (group_extra or []))
    )


def _aggregate_daily(df: pd.DataFrame) -> pd.DataFrame:
    result = (
        df.groupby(["ANO", "MES", "DIA"], dropna=False)
        .agg(
            QTD_NF=("NF", "nunique"),
            VALOR_TOTAL=("VALOR_TOTAL", "sum"),
            QTD_ITENS=("QTD_ITENS", "sum"),
        )
        .reset_index()
        .sort_values(["ANO", "MES", "DIA"])
    )
    result["MES_ANO"] = result["ANO"].astype(str) + "-" + result["MES"].astype(int).astype(str).str.zfill(2)
    result["DIA_LABEL"] = result["DIA"].astype(int).astype(str).str.zfill(2)
    return result


def _build_nf_resumo(df: pd.DataFrame) -> pd.DataFrame:
    """Colapsa linhas de item em uma linha por NF; metricas seguem esse grao em todo o API."""
    # Camada oficial de analise: 1 linha por NF.
    nf_resumo = (
        df.groupby("NF", dropna=False)
        .agg(
            DATA=("DATA", "first"),
            VALOR_TOTAL=("VALOR_TOTAL", "sum"),
            QTD_ITENS=("QTD_ITENS", _resolve_nf_items),
            DESC_LOCAL=("DESC_LOCAL", "first"),
            DESC_FAMILIA=("DESC_FAMILIA", "first"),
            DESC_GRUPO=("DESC_GRUPO", "first"),
            **{"RAZÃO SOCIAL": ("RAZÃO SOCIAL", "first")},
        )
        .reset_index()
    )
    nf_resumo["ANO"] = pd.to_datetime(nf_resumo["DATA"], errors="coerce").dt.year.astype("Int64")
    nf_resumo["MES"] = pd.to_datetime(nf_resumo["DATA"], errors="coerce").dt.month.astype("Int64")
    nf_resumo["DIA"] = pd.to_datetime(nf_resumo["DATA"], errors="coerce").dt.day.astype("Int64")
    nf_resumo = nf_resumo.dropna(subset=["ANO", "MES", "DIA"]).copy()
    nf_resumo["ANO"] = nf_resumo["ANO"].astype(int)
    nf_resumo["MES"] = nf_resumo["MES"].astype(int)
    nf_resumo["DIA"] = nf_resumo["DIA"].astype(int)
    return nf_resumo


@app.get("/health")
async def healthcheck():
    return {"status": "ok"}


@app.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Envie um arquivo CSV.")

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Arquivo muito grande. Limite: {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
        )

    df = None
    last_error: Exception | None = None
    for encoding in CSV_ENCODINGS:
        try:
            decoded = contents.decode(encoding)
            df = pd.read_csv(StringIO(decoded), sep=None, engine="python")
            break
        except Exception as exc:  # try next encoding
            last_error = exc

    if df is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Falha ao ler o CSV. Tente salvar o arquivo em UTF-8, ANSI ou Latin-1 "
                "e verifique se o separador esta correto."
            ),
        ) from last_error

    missing_columns = REQUIRED_COLUMNS - set(df.columns)
    if missing_columns:
        missing = ", ".join(sorted(missing_columns))
        raise HTTPException(
            status_code=400,
            detail=f"Colunas obrigatorias ausentes: {missing}",
        )

    df["DATA"] = pd.to_datetime(df["DATA"], format="%d/%m/%Y", errors="coerce")
    df = df.dropna(subset=["DATA"])

    if df.empty:
        raise HTTPException(
            status_code=400,
            detail="Nenhuma linha valida com DATA encontrada.",
        )

    df["QTD_ITENS"] = pd.to_numeric(df["#QuantidadeExpedida"], errors="coerce").fillna(0)
    df["NF"] = _normalize_nf_series(df["NF"])
    valor_normalizado = (
        df["R$Expedição"]
        .astype(str)
        .str.replace("R$", "", regex=False)
        .str.replace(".", "", regex=False)
        .str.replace(",", ".", regex=False)
        .str.strip()
    )
    df["VALOR_TOTAL"] = pd.to_numeric(valor_normalizado, errors="coerce").fillna(0)

    nf_resumo = _build_nf_resumo(df)
    nf_resumo = _normalize_razao_social_column(nf_resumo)

    desc_local_upper = nf_resumo["DESC_LOCAL"].astype(str).str.upper()
    nf_resumo["TIPO_PRINCIPAL"] = None
    nf_resumo.loc[desc_local_upper.str.contains("SUSTENTAÇÃO|SUSTENTACAO", na=False), "TIPO_PRINCIPAL"] = (
        "SUSTENTACAO"
    )
    nf_resumo.loc[
        desc_local_upper.str.contains("NOVO|SEMI NOVO|SEMINOVO", na=False),
        "TIPO_PRINCIPAL",
    ] = "IMPLANTACAO"

    nf_resumo["SUBTIPO"] = None
    nf_resumo.loc[desc_local_upper.str.contains("SEMI NOVO|SEMINOVO", na=False), "SUBTIPO"] = "SEMI NOVO"
    nf_resumo.loc[
        desc_local_upper.str.contains(r"\bNOVO\b", na=False)
        & ~desc_local_upper.str.contains("SEMI NOVO|SEMINOVO", na=False),
        "SUBTIPO",
    ] = "NOVO"

    familia_upper = nf_resumo["DESC_FAMILIA"].astype(str).str.upper().str.strip()
    nf_resumo["FLAG_IMPRESSORAS"] = None
    nf_resumo.loc[
        familia_upper.isin({"IMPRESSORA", "PEÇAS DE REPOSIÇÃO", "PECAS DE REPOSICAO"}),
        "FLAG_IMPRESSORAS",
    ] = "IMPRESSORAS"

    DATAFRAME_STORE["df"] = nf_resumo

    return {
        "status": "processed",
        "rows_base_item": int(len(df)),
        "rows_nf_resumo": int(len(nf_resumo)),
        "columns": sorted(nf_resumo.columns.tolist()),
    }


@app.get("/implantacao")
async def get_implantacao(subtipo: str | None = Query(default=None)):
    df = _load_dataframe()
    impl = df[df["TIPO_PRINCIPAL"] == "IMPLANTACAO"].copy()
    if subtipo:
        impl = impl[impl["SUBTIPO"] == subtipo.upper()]

    mensal = _aggregate_monthly(impl, ["SUBTIPO"])
    anual = _aggregate_annual(impl, ["SUBTIPO"])
    diario = _aggregate_daily(impl)
    subtipo_options = sorted([x for x in impl["SUBTIPO"].dropna().unique().tolist() if x])
    return {
        "mensal": _format_records(mensal),
        "anual": _format_records(anual),
        "diario": _format_records(diario),
        "filtros": {"subtipo": subtipo_options},
    }


@app.get("/sustentacao")
async def get_sustentacao():
    df = _load_dataframe()
    sust = df[df["TIPO_PRINCIPAL"] == "SUSTENTACAO"].copy()
    mensal = _aggregate_monthly(sust)
    anual = _aggregate_annual(sust)
    diario = _aggregate_daily(sust)
    return {
        "mensal": _format_records(mensal),
        "anual": _format_records(anual),
        "diario": _format_records(diario),
    }


def _scope_by_tipo(df: pd.DataFrame, tipo: str) -> pd.DataFrame:
    t = tipo.lower().strip()
    if t == "implantacao":
        return df[df["TIPO_PRINCIPAL"] == "IMPLANTACAO"].copy()
    if t == "sustentacao":
        return df[df["TIPO_PRINCIPAL"] == "SUSTENTACAO"].copy()
    if t == "impressoras":
        return df[df["FLAG_IMPRESSORAS"] == "IMPRESSORAS"].copy()
    raise HTTPException(
        status_code=400,
        detail="Parametro tipo invalido. Use: implantacao, sustentacao ou impressoras.",
    )


@app.get("/clientes")
async def get_clientes(tipo: str | None = Query(default=None)):
    df = _load_dataframe()
    scoped = _scope_by_tipo(df, tipo) if tipo else df.copy()
    if scoped.empty:
        return {
            "ranking": [],
            "totais_escopo": {"VALOR_TOTAL": 0.0, "QTD_NF": 0, "QTD_ITENS": 0.0},
            "top_cliente_share_pct": None,
        }

    scoped = _normalize_razao_social_column(scoped)

    grouped = (
        scoped.groupby("RAZÃO SOCIAL", dropna=False)
        .agg(
            VALOR_TOTAL=("VALOR_TOTAL", "sum"),
            QTD_NF=("NF", "nunique"),
            QTD_ITENS=("QTD_ITENS", "sum"),
        )
        .reset_index()
    )
    grouped = grouped.sort_values("VALOR_TOTAL", ascending=False)
    total_valor = float(grouped["VALOR_TOTAL"].sum())
    total_nf = int(scoped["NF"].nunique())
    total_itens = float(scoped["QTD_ITENS"].sum())

    top = grouped.head(10)
    records: list[dict[str, Any]] = []
    for _, row in top.iterrows():
        records.append(
            {
                "RAZÃO SOCIAL": str(row["RAZÃO SOCIAL"]),
                "VALOR_TOTAL": float(round(row["VALOR_TOTAL"], 2)),
                "QTD_NF": int(row["QTD_NF"]),
                "QTD_ITENS": float(round(row["QTD_ITENS"], 2)),
            }
        )

    top_share: float | None = None
    if records and total_valor > 0:
        top_share = round(records[0]["VALOR_TOTAL"] / total_valor * 100, 1)

    return {
        "ranking": records,
        "totais_escopo": {
            "VALOR_TOTAL": float(round(total_valor, 2)),
            "QTD_NF": total_nf,
            "QTD_ITENS": float(round(total_itens, 2)),
        },
        "top_cliente_share_pct": top_share,
    }


@app.get("/clientes/detalhe")
async def get_cliente_detalhe(
    razao_social: str = Query(..., min_length=1),
    tipo: str | None = Query(default=None),
):
    df = _load_dataframe()
    scoped = _scope_by_tipo(df, tipo) if tipo else df.copy()
    scoped = _normalize_razao_social_column(scoped)
    client_df = scoped[scoped["RAZÃO SOCIAL"] == razao_social]
    if client_df.empty:
        raise HTTPException(
            status_code=404,
            detail="Cliente nao encontrado no escopo selecionado.",
        )

    totais = {
        "VALOR_TOTAL": float(round(client_df["VALOR_TOTAL"].sum(), 2)),
        "QTD_NF": int(client_df["NF"].nunique()),
        "QTD_ITENS": float(round(client_df["QTD_ITENS"].sum(), 2)),
    }
    escopo_valor = float(scoped["VALOR_TOTAL"].sum())
    participacao = (
        round(totais["VALOR_TOTAL"] / escopo_valor * 100, 1) if escopo_valor > 0 else None
    )

    mensal = _aggregate_monthly(client_df)
    diario = _aggregate_daily(client_df)
    return {
        "RAZÃO SOCIAL": razao_social,
        "totais": totais,
        "participacao_valor_pct": participacao,
        "mensal": _format_records(mensal),
        "diario": _format_records(diario),
    }


@app.get("/impressoras")
async def get_impressoras(desc_grupo: str | None = Query(default=None)):
    df = _load_dataframe()
    impr = df[df["FLAG_IMPRESSORAS"] == "IMPRESSORAS"].copy()
    if desc_grupo:
        impr = impr[impr["DESC_GRUPO"].astype(str).str.upper() == desc_grupo.upper()]

    mensal = _aggregate_monthly(impr, ["DESC_GRUPO"])
    anual = _aggregate_annual(impr, ["DESC_GRUPO"])
    diario = _aggregate_daily(impr)
    grupo_options = sorted([x for x in impr["DESC_GRUPO"].dropna().unique().tolist() if x])
    return {
        "mensal": _format_records(mensal),
        "anual": _format_records(anual),
        "diario": _format_records(diario),
        "filtros": {"desc_grupo": grupo_options},
    }
