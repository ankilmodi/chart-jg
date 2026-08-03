"""
Stock universe module: Large Cap, Mid Cap, Small Cap, and F&O Stocks.
"""
from typing import List, Dict, Optional
from app.scanner.schemas import StockInfo
from symbols import (
    LARGE_CAP_SYMBOLS, MID_CAP_SYMBOLS, SMALL_CAP_SYMBOLS,
    NIFTY_FUTURES_SYMBOLS, COMPANY_NAMES
)

# Set of symbols eligible for F&O derivative contracts
FO_SET = set(s.replace(".NS", "") for s in NIFTY_FUTURES_SYMBOLS)


def _sector_for_symbol(sym: str) -> str:
    sym_upper = sym.upper()
    if any(k in sym_upper for k in ["BANK", "FIN", "CHOLA", "BAJAJFIN", "MUTHOOT", "SHRIRAM", "SBICARD", "ICICIPRU", "HDFCLIFE", "HDFCAMC"]):
        return "Banking & Finance"
    if any(k in sym_upper for k in ["TCS", "INFY", "TECHM", "WIPRO", "HCL", "PERSISTENT", "COFORGE", "MPHASIS", "LTTS", "TATAELXSI", "OFSS", "BSOFT", "KPIT", "TANLA"]):
        return "IT & Tech"
    if any(k in sym_upper for k in ["PHARMA", "SUN", "CIPLA", "REDDY", "DIVIS", "LUPIN", "AURO", "ALKEM", "BIOCON", "GLENMARK", "TORRENT", "APOLLO", "MAXHEALTH", "FORTIS", "LAURUS", "NATCO"]):
        return "Pharma & Healthcare"
    if any(k in sym_upper for k in ["MARUTI", "M&M", "TATAMOTORS", "HERO", "EICHER", "BAJAJ-AUTO", "TVS", "ASHOK", "BALKRIS", "MRF", "BOSCH", "BHARATFORG", "SONA"]):
        return "Auto & Ancillaries"
    if any(k in sym_upper for k in ["RELIANCE", "ONGC", "NTPC", "POWERGRID", "BPCL", "IOC", "GAIL", "ADANIPWR", "TATAPWR", "NHPC", "IREDA", "SJVN", "RECLTD", "PFC", "SUZLON"]):
        return "Energy & Power"
    if any(k in sym_upper for k in ["HINDUNILVR", "ITC", "NESTLE", "BRITANNIA", "TATACONSUM", "COLPAL", "DABUR", "MARICO", "GODREJCP", "VBL", "PATANJALI"]):
        return "FMCG"
    if any(k in sym_upper for k in ["STEEL", "TATASTEEL", "JSWSTEEL", "HINDALCO", "COAL", "VEDL", "NMDC", "NATIONALUM", "SAIL", "JINDAL"]):
        return "Metals & Mining"
    if any(k in sym_upper for k in ["DLF", "LODHA", "GODREJPROP", "OBEROI", "PRESTIGE", "SOBHA", "PHOENIX"]):
        return "Realty & Infrastructure"
    if any(k in sym_upper for k in ["ULTRACEM", "AMBUJA", "ACC", "DALBHARAT", "RAMCO", "JKCEMENT"]):
        return "Cement & Construction"
    if any(k in sym_upper for k in ["SIEMENS", "ABB", "HAL", "BEL", "BDL", "CGPOWER", "HAVELLS", "DIXON", "POLYCAB", "MAZDOCK", "BHEL"]):
        return "Capital Goods & Defence"
    return "Diversified"


def get_full_universe() -> List[StockInfo]:
    seen = set()
    result: List[StockInfo] = []

    # 1. Large Cap
    for ticker in LARGE_CAP_SYMBOLS:
        sym = ticker.replace(".NS", "")
        if sym not in seen:
            seen.add(sym)
            result.append(StockInfo(
                symbol=sym,
                name=COMPANY_NAMES.get(ticker, sym),
                sector=_sector_for_symbol(sym),
                index="NIFTY_LARGE",
                ticker=ticker,
                industry=_sector_for_symbol(sym),
                cap_category="Large Cap",
                fo_eligible=(sym in FO_SET or True),
            ))

    # 2. Mid Cap
    for ticker in MID_CAP_SYMBOLS:
        sym = ticker.replace(".NS", "")
        if sym not in seen:
            seen.add(sym)
            result.append(StockInfo(
                symbol=sym,
                name=COMPANY_NAMES.get(ticker, sym),
                sector=_sector_for_symbol(sym),
                index="NIFTY_MIDCAP",
                ticker=ticker,
                industry=_sector_for_symbol(sym),
                cap_category="Mid Cap",
                fo_eligible=(sym in FO_SET),
            ))

    # 3. Small Cap
    for ticker in SMALL_CAP_SYMBOLS:
        sym = ticker.replace(".NS", "")
        if sym not in seen:
            seen.add(sym)
            result.append(StockInfo(
                symbol=sym,
                name=COMPANY_NAMES.get(ticker, sym),
                sector=_sector_for_symbol(sym),
                index="NIFTY_SMALLCAP",
                ticker=ticker,
                industry=_sector_for_symbol(sym),
                cap_category="Small Cap",
                fo_eligible=(sym in FO_SET),
            ))

    # 4. Any remaining in COMPANY_NAMES
    for ticker, name in COMPANY_NAMES.items():
        sym = ticker.replace(".NS", "")
        if sym not in seen:
            seen.add(sym)
            result.append(StockInfo(
                symbol=sym,
                name=name,
                sector=_sector_for_symbol(sym),
                index="NSE_ALL",
                ticker=ticker,
                industry=_sector_for_symbol(sym),
                cap_category="Mid Cap",
                fo_eligible=(sym in FO_SET),
            ))

    return result


def get_by_cap_category(category: str) -> List[StockInfo]:
    cat = category.strip().upper()
    universe = get_full_universe()
    if cat == "LARGE" or cat == "LARGE CAP":
        return [s for s in universe if s.cap_category == "Large Cap"]
    elif cat == "MID" or cat == "MID CAP":
        return [s for s in universe if s.cap_category == "Mid Cap"]
    elif cat == "SMALL" or cat == "SMALL CAP":
        return [s for s in universe if s.cap_category == "Small Cap"]
    elif cat == "FO" or cat == "F&O":
        return [s for s in universe if s.fo_eligible]
    return universe


def get_by_index(index_name: str = "ALL") -> List[StockInfo]:
    idx = index_name.strip().upper()
    universe = get_full_universe()
    if idx == "ALL" or not idx:
        return universe
    return [s for s in universe if s.index.upper() == idx or idx in s.index.upper()]


TICKER_MAP: Dict[str, StockInfo] = {s.ticker: s for s in get_full_universe()}
SYMBOL_MAP: Dict[str, StockInfo] = {s.symbol: s for s in get_full_universe()}
