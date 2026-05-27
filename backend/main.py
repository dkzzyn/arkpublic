from io import BytesIO, StringIO
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
ALLOWED_UPLOAD_EXTS = (".xlsx", ".xls", ".csv")
# Limite de upload (arquivo em memoria) — evita DoS por ficheiros enormes.
MAX_UPLOAD_BYTES = 80 * 1024 * 1024


def _read_tabular_file(filename: str, contents: bytes) -> pd.DataFrame:
    name = (filename or "").lower()
    if name.endswith((".xlsx", ".xls")):
        try:
            return pd.read_excel(BytesIO(contents), engine="openpyxl")
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Falha ao ler o Excel: {exc}") from exc

    if name.endswith(".csv"):
        last_error: Exception | None = None
        for encoding in CSV_ENCODINGS:
            try:
                return pd.read_csv(StringIO(contents.decode(encoding)), sep=None, engine="python")
            except Exception as exc:
                last_error = exc
        raise HTTPException(
            status_code=400,
            detail="Falha ao ler CSV. Tente salvar em UTF-8, ANSI ou Latin-1.",
        ) from last_error

    exts = ", ".join(ALLOWED_UPLOAD_EXTS)
    raise HTTPException(status_code=400, detail=f"Envie um arquivo {exts}.")


def _load_dataframe() -> pd.DataFrame:
    df = DATAFRAME_STORE["df"]
    if df is None or df.empty:
        raise HTTPException(
            status_code=400,
            detail="Nenhum arquivo processado. Envie um arquivo em /upload primeiro.",
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
    filename = file.filename or ""
    if not filename.lower().endswith(ALLOWED_UPLOAD_EXTS):
        exts = ", ".join(ALLOWED_UPLOAD_EXTS)
        raise HTTPException(status_code=400, detail=f"Envie um arquivo {exts}.")

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Arquivo muito grande. Limite: {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
        )

    df = _read_tabular_file(filename, contents)

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


# =============================================================================
# MODULO FATURAMENTO
# Base: planilha data.xlsx (FILA_ORDEM, LOCAL, DATA_EMISSAO_NF, R$PROJETO, ...).
# Lida com a contagem de NF GERADA (17) vs AGUARDANDO FATURAMENTO (16) e
# segmenta por LOCAL (NOVO 01 / SEMI NOVO 04 / SUSTENTACAO 08).
# =============================================================================

FATURAMENTO_STORE: dict[str, pd.DataFrame | None] = {"df": None}
FATURAMENTO_REQUIRED_COLUMNS = {"FILA_ORDEM", "LOCAL", "DATA_EMISSAO_NF", "R$PROJETO"}

# Map de filtro (frontend → categorias internas).
_FAT_LOCAL_FILTER = {
    "implantacao": ("NOVO", "SEMI_NOVO"),
    "implantação": ("NOVO", "SEMI_NOVO"),
    "sustentacao": ("SUSTENTACAO",),
    "sustentação": ("SUSTENTACAO",),
}
_FAT_LOCAL_ALVO = ("NOVO", "SEMI_NOVO", "SUSTENTACAO")
_FAT_LOCAL_LABELS = {
    "IMPLANTACAO": "Implantação",
    "SUSTENTACAO": "Sustentação",
}


def _fat_scope_by_local(df: pd.DataFrame, filt: str) -> pd.DataFrame:
    if filt in _FAT_LOCAL_FILTER:
        cats = _FAT_LOCAL_FILTER[filt]
        return df[df["LOCAL_CAT"].isin(cats)].copy()
    return df[df["LOCAL_CAT"].isin(_FAT_LOCAL_ALVO)].copy()


def _fat_categorize_local(series: pd.Series) -> pd.Series:
    upper = series.fillna("").astype(str).str.upper()
    out = pd.Series("OUTROS", index=series.index, dtype="object")
    out.loc[upper.str.contains("SEMI", na=False) & upper.str.contains("NOVO", na=False)] = "SEMI_NOVO"
    out.loc[upper.str.contains(r"\bNOVO\b", na=False, regex=True) & ~upper.str.contains("SEMI", na=False)] = "NOVO"
    out.loc[upper.str.contains("SUSTENTA", na=False)] = "SUSTENTACAO"
    return out


def _fat_categorize_fila(series: pd.Series) -> pd.Series:
    upper = series.fillna("").astype(str).str.upper()
    out = pd.Series("OUTROS", index=series.index, dtype="object")
    out.loc[upper.str.contains("NF GERADA", na=False)] = "NF_GERADA"
    out.loc[upper.str.contains("AGUARDANDO FATURAMENTO", na=False)] = "AGUARDANDO"
    return out


def _fat_read_dataframe(filename: str, contents: bytes) -> pd.DataFrame:
    return _read_tabular_file(filename, contents)


def _load_faturamento_df() -> pd.DataFrame:
    df = FATURAMENTO_STORE["df"]
    if df is None or df.empty:
        raise HTTPException(
            status_code=400,
            detail="Nenhum arquivo de faturamento processado. Envie um arquivo em /faturamento/upload.",
        )
    return df


def _fat_format_records(rows: pd.DataFrame) -> list[dict[str, Any]]:
    records = rows.to_dict(orient="records")
    for row in records:
        if "VALOR_TOTAL" in row:
            row["VALOR_TOTAL"] = float(round(row.get("VALOR_TOTAL", 0.0), 2))
        if "QTD_GERADAS" in row:
            row["QTD_GERADAS"] = int(row.get("QTD_GERADAS", 0))
        if "QTD_AGUARDANDO" in row:
            row["QTD_AGUARDANDO"] = int(row.get("QTD_AGUARDANDO", 0))
    return records


@app.post("/faturamento/upload")
async def upload_faturamento(file: UploadFile = File(...)):
    filename = file.filename or ""
    if not filename.lower().endswith(ALLOWED_UPLOAD_EXTS):
        exts = ", ".join(ALLOWED_UPLOAD_EXTS)
        raise HTTPException(status_code=400, detail=f"Envie um arquivo {exts}.")

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Arquivo muito grande. Limite: {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
        )

    df = _fat_read_dataframe(filename, contents)

    missing = FATURAMENTO_REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Colunas obrigatorias ausentes: {', '.join(sorted(missing))}",
        )

    df["FILA_CAT"] = _fat_categorize_fila(df["FILA_ORDEM"])
    df["LOCAL_CAT"] = _fat_categorize_local(df["LOCAL"])
    df["DATA_EMISSAO_NF"] = pd.to_datetime(df["DATA_EMISSAO_NF"], errors="coerce")
    df["VALOR"] = pd.to_numeric(df["R$PROJETO"], errors="coerce").fillna(0.0)
    df["ANO"] = df["DATA_EMISSAO_NF"].dt.year.astype("Int64")
    df["MES"] = df["DATA_EMISSAO_NF"].dt.month.astype("Int64")
    df["DIA"] = df["DATA_EMISSAO_NF"].dt.day.astype("Int64")

    FATURAMENTO_STORE["df"] = df

    return {
        "status": "processed",
        "rows": int(len(df)),
        "fila": {k: int(v) for k, v in df["FILA_CAT"].value_counts(dropna=False).to_dict().items()},
        "locais": {k: int(v) for k, v in df["LOCAL_CAT"].value_counts(dropna=False).to_dict().items()},
    }


@app.get("/faturamento")
async def get_faturamento(local: str | None = Query(default=None)):
    df = _load_faturamento_df()

    filt = (local or "todos").strip().lower()
    scoped = _fat_scope_by_local(df, filt)

    geradas = scoped[scoped["FILA_CAT"] == "NF_GERADA"]
    aguardando = scoped[scoped["FILA_CAT"] == "AGUARDANDO"]

    if "NF" in scoped.columns:
        qtd_geradas = int(geradas["NF"].dropna().nunique())
    else:
        qtd_geradas = int(len(geradas))
    qtd_aguardando = int(len(aguardando))
    valor_total = float(scoped["VALOR"].sum())
    valor_geradas = float(geradas["VALOR"].sum())
    valor_aguardando = float(aguardando["VALOR"].sum())

    # Serie mensal (apenas para NF GERADA, que tem data de emissao).
    dated = geradas.dropna(subset=["ANO", "MES"]).copy()
    if "NF" in dated.columns:
        mensal_agg = (
            dated.groupby(["ANO", "MES"], dropna=False)
            .agg(VALOR_TOTAL=("VALOR", "sum"), QTD_GERADAS=("NF", "nunique"))
            .reset_index()
        )
    else:
        mensal_agg = (
            dated.groupby(["ANO", "MES"], dropna=False)
            .agg(VALOR_TOTAL=("VALOR", "sum"), QTD_GERADAS=("VALOR", "count"))
            .reset_index()
        )
    mensal_agg["ANO"] = mensal_agg["ANO"].astype("Int64")
    mensal_agg["MES"] = mensal_agg["MES"].astype("Int64")
    mensal_agg = mensal_agg.sort_values(["ANO", "MES"]).reset_index(drop=True)
    mensal_agg["MES_ANO"] = (
        mensal_agg["ANO"].astype(str)
        + "-"
        + mensal_agg["MES"].astype(int).astype(str).str.zfill(2)
    )
    mensal_agg["ANO"] = mensal_agg["ANO"].astype(int)
    mensal_agg["MES"] = mensal_agg["MES"].astype(int)

    # Anual.
    anual_agg = mensal_agg.groupby("ANO", dropna=False).agg(
        VALOR_TOTAL=("VALOR_TOTAL", "sum"),
        QTD_GERADAS=("QTD_GERADAS", "sum"),
    ).reset_index()

    # Serie diaria (NF GERADA com DATA_EMISSAO_NF valida).
    diary = geradas.dropna(subset=["DATA_EMISSAO_NF"]).copy()
    if not diary.empty:
        diary["ANO"] = diary["DATA_EMISSAO_NF"].dt.year.astype(int)
        diary["MES"] = diary["DATA_EMISSAO_NF"].dt.month.astype(int)
        diary["DIA"] = diary["DATA_EMISSAO_NF"].dt.day.astype(int)
        diary["DATA"] = diary["DATA_EMISSAO_NF"].dt.strftime("%Y-%m-%d")
        if "NF" in diary.columns:
            diario_agg = (
                diary.groupby(["DATA", "ANO", "MES", "DIA"], dropna=False)
                .agg(VALOR_TOTAL=("VALOR", "sum"), QTD_GERADAS=("NF", "nunique"))
                .reset_index()
            )
        else:
            diario_agg = (
                diary.groupby(["DATA", "ANO", "MES", "DIA"], dropna=False)
                .agg(VALOR_TOTAL=("VALOR", "sum"), QTD_GERADAS=("VALOR", "count"))
                .reset_index()
            )
        diario_agg = diario_agg.sort_values("DATA").reset_index(drop=True)
        diario_agg["MES_ANO"] = (
            diario_agg["ANO"].astype(str)
            + "-"
            + diario_agg["MES"].astype(int).astype(str).str.zfill(2)
        )
        diario_records = _fat_format_records(diario_agg)
    else:
        diario_records = []

    # Por LOCAL (Implantação = Novo + Semi novo; Sustentação).
    target_df = df[df["LOCAL_CAT"].isin(_FAT_LOCAL_ALVO)]
    por_local_groups = (
        ("IMPLANTACAO", ("NOVO", "SEMI_NOVO")),
        ("SUSTENTACAO", ("SUSTENTACAO",)),
    )
    por_local_records: list[dict[str, Any]] = []
    for cat, cats in por_local_groups:
        sub = target_df[target_df["LOCAL_CAT"].isin(cats)]
        sub_ger = sub[sub["FILA_CAT"] == "NF_GERADA"]
        sub_agu = sub[sub["FILA_CAT"] == "AGUARDANDO"]
        if "NF" in sub.columns:
            qtd_g = int(sub_ger["NF"].dropna().nunique())
        else:
            qtd_g = int(len(sub_ger))
        por_local_records.append(
            {
                "LOCAL": cat,
                "LOCAL_LABEL": _FAT_LOCAL_LABELS[cat],
                "VALOR_TOTAL": float(round(sub["VALOR"].sum(), 2)),
                "QTD_GERADAS": qtd_g,
                "QTD_AGUARDANDO": int(len(sub_agu)),
            }
        )

    return {
        "filtro_local": filt if filt in _FAT_LOCAL_FILTER else "todos",
        "totais": {
            "VALOR_TOTAL": float(round(valor_total, 2)),
            "VALOR_GERADAS": float(round(valor_geradas, 2)),
            "VALOR_AGUARDANDO": float(round(valor_aguardando, 2)),
            "QTD_GERADAS": qtd_geradas,
            "QTD_AGUARDANDO": qtd_aguardando,
            "QTD_TOTAL": qtd_geradas + qtd_aguardando,
        },
        "mensal": _fat_format_records(mensal_agg),
        "anual": _fat_format_records(anual_agg),
        "diario": diario_records,
        "por_local": por_local_records,
        "filtros": {"locais": ["todos", "implantacao", "sustentacao"]},
    }
