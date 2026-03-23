#!/usr/bin/env python3
"""
Lalamove UAPI Token Manager
============================
Gerencia tokens de sessão UAPI com renovação automática.

Fluxo de renovação:
  1. Tenta refresh_token (rápido, ~0.5s, sem WAF)
  2. Se falhar → re-login via Playwright (lento, ~45s, bypass WAF)
  3. Salva novos tokens em lalamove_session.json

Uso:
  python3 lalamove_token_manager.py           → retorna token válido (stdout)
  python3 lalamove_token_manager.py --check   → verifica status
  python3 lalamove_token_manager.py --refresh → força renovação
  python3 lalamove_token_manager.py --server  → inicia servidor HTTP na porta 8765
"""

import subprocess, json, time, random, os, sys, argparse, logging
from datetime import datetime

# ──────────────────────────────────────────────────────────────
# CONFIGURAÇÃO
# ──────────────────────────────────────────────────────────────
SESSION_FILE  = os.environ.get("LALAMOVE_SESSION_FILE", "/tmp/lalamove_session.json")
PLAYWRIGHT_SCRIPT = "/tmp/lalamove_login_v6.js"
LOG_FILE      = os.environ.get("LALAMOVE_LOG_FILE", "/tmp/lalamove_token_manager.log")

# Limites de tempo
TOKEN_VALID_SECS    = 72000  # 20h (renova com 4h de margem) (margem 1h antes de expirar)
REFRESH_TIMEOUT     = 15     # segundos
PLAYWRIGHT_TIMEOUT  = 90     # segundos

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(sys.stderr)
    ]
)
log = logging.getLogger("token_manager")


# ──────────────────────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────────────────────
def _su():
    return f"{int(time.time()*1000)}ehll{int(random.random()*1e10)}"


def uapi_call(method, args=None, token=""):
    """Chama UAPI via curl (workaround proxy)."""
    ts  = int(time.time())
    su  = _su()
    url = (f"https://br-uapi.lalamove.com/index.php"
           f"?_m={method}&hcountry=20000&_su={su}&_t={ts}"
           f"&device_id=token-mgr-001&version=5.37.0&revision=53700&os=web&device_type=web")

    cmd = [
        "curl", "-s", "-m", str(REFRESH_TIMEOUT), "--compressed", "-X", "POST",
        "-H", "User-Agent: Mozilla/5.0 AppleWebKit/537.36 Chrome/120 Safari/537.36",
        "-H", "Content-Type: application/x-www-form-urlencoded; charset=utf-8",
        "-H", "Origin: https://web.lalamove.com",
        "-H", "Referer: https://web.lalamove.com/",
        "-H", "X-LLM-LOCATION: BR",
        "--data-urlencode", f"token={token}",
        "--data-urlencode", "is_ep=1",
        "--data-urlencode", "hcountry=20000",
        "--data-urlencode", "hlang=pt_BR",
        "--data-urlencode", "city_id=21001",
        "--data-urlencode", f"args={json.dumps(args or {})}",
        url
    ]
    r = subprocess.run(cmd, capture_output=True, timeout=REFRESH_TIMEOUT+5)
    return json.loads(r.stdout.decode(errors="replace"))


def load_session():
    """
    Lê tokens salvos em disco.
    Suporta dois formatos:
      - Formato Playwright: {token, raw: {refresh_token, user_fid, ...}}
      - Formato manager:    {token, refresh_token, user_fid, ...}
    """
    if not os.path.exists(SESSION_FILE):
        return {}
    with open(SESSION_FILE) as f:
        data = json.load(f)

    # Normalizar: extrair campos do sub-objeto 'raw' se existir
    raw = data.get("raw", {})
    if raw:
        data.setdefault("token",         raw.get("token", data.get("token", "")))
        data.setdefault("refresh_token", raw.get("refresh_token", ""))
        data.setdefault("user_fid",      raw.get("user_fid", ""))
        data.setdefault("is_ep",         raw.get("is_ep", 1))
        data.setdefault("expires_in",    raw.get("client_expires_in", 86400))

    return data


def save_session(data: dict):
    """Salva tokens em disco com timestamp."""
    data["saved_at"] = int(time.time())
    data["saved_at_human"] = datetime.now().isoformat()
    with open(SESSION_FILE, "w") as f:
        json.dump(data, f, indent=2)
    log.info(f"Session salva em {SESSION_FILE}")


# ──────────────────────────────────────────────────────────────
# VALIDAÇÃO
# ──────────────────────────────────────────────────────────────
def is_token_valid(token: str) -> bool:
    """Verifica se token ainda funciona chamando get_user_info."""
    if not token:
        return False
    try:
        r = uapi_call("get_user_info", {}, token)
        return r.get("ret") == 0
    except Exception as e:
        log.warning(f"Erro ao validar token: {e}")
        return False


def is_session_fresh(session: dict) -> bool:
    """Verifica se o token não expirou pelo timestamp de save."""
    saved_at = session.get("saved_at", 0)
    age = time.time() - saved_at
    return age < TOKEN_VALID_SECS


# ──────────────────────────────────────────────────────────────
# RENOVAÇÃO — PATH 1: refresh_token endpoint
# ──────────────────────────────────────────────────────────────
def try_refresh(session: dict) -> dict | None:
    """
    Tenta renovar usando o refresh_token endpoint.
    Retorna nova sessão ou None se falhou.
    """
    refresh_token = session.get("refresh_token", "")
    if not refresh_token:
        log.warning("Sem refresh_token salvo")
        return None

    log.info("Tentando refresh_token endpoint...")
    try:
        r = uapi_call(
            "refresh_token",
            {"refresh_token": refresh_token},
            token=session.get("token", "")
        )
        if r.get("ret") == 0:
            data = r.get("data", {})
            new_session = {
                "token":         data.get("token", ""),
                "refresh_token": data.get("refresh_token", refresh_token),
                "expires_in":    data.get("expires_in", 86400),
                "user_fid":      session.get("user_fid", ""),
                "city_id":       21001,
                "is_ep":         1,
                "method":        "refresh_token"
            }
            log.info(f"✅ refresh_token funcionou! Token: {new_session['token'][:16]}...")
            return new_session
        else:
            log.warning(f"refresh_token falhou: ret={r.get('ret')} msg={r.get('msg')}")
            return None
    except Exception as e:
        log.error(f"Erro no refresh_token: {e}")
        return None


# ──────────────────────────────────────────────────────────────
# RENOVAÇÃO — PATH 2: Playwright re-login
# ──────────────────────────────────────────────────────────────
def try_playwright_login() -> dict | None:
    """
    Re-faz login via Playwright (contorna WAF Argus).
    Retorna nova sessão ou None se falhou.
    """
    if not os.path.exists(PLAYWRIGHT_SCRIPT):
        log.error(f"Script Playwright não encontrado: {PLAYWRIGHT_SCRIPT}")
        return None

    log.info("Iniciando Playwright login (pode levar ~45s)...")
    try:
        r = subprocess.run(
            ["node", PLAYWRIGHT_SCRIPT],
            capture_output=True,
            timeout=PLAYWRIGHT_TIMEOUT
        )
        output = r.stdout.decode(errors="replace")
        stderr = r.stderr.decode(errors="replace")

        if r.returncode != 0:
            log.error(f"Playwright falhou (exit {r.returncode}): {stderr[:500]}")
            return None

        # Script salva em /tmp/lalamove_session.json — tentar ler
        if os.path.exists(SESSION_FILE):
            with open(SESSION_FILE) as f:
                new_session = json.load(f)
            if new_session.get("token"):
                new_session["method"] = "playwright_login"
                log.info(f"✅ Playwright login OK! Token: {new_session['token'][:16]}...")
                return new_session

        # Tentar extrair token do stdout do script
        for line in output.splitlines():
            if "token" in line.lower() and ":" in line:
                log.debug(f"Playwright output: {line}")

        log.error("Playwright rodou mas não salvou token")
        return None
    except subprocess.TimeoutExpired:
        log.error(f"Playwright timeout ({PLAYWRIGHT_TIMEOUT}s)")
        return None
    except Exception as e:
        log.error(f"Erro no Playwright login: {e}")
        return None


# ──────────────────────────────────────────────────────────────
# FUNÇÃO PRINCIPAL
# ──────────────────────────────────────────────────────────────
def get_valid_token(force_refresh: bool = False) -> str:
    """
    Retorna um token válido, renovando se necessário.
    
    Prioridade:
      1. Token em cache ainda válido (verificação por timestamp)
      2. refresh_token endpoint (rápido)
      3. Playwright re-login (lento, fallback final)
    """
    session = load_session()
    token   = session.get("token", "")

    # ── Verificação rápida por timestamp (evita chamada de API)
    if not force_refresh and token and is_session_fresh(session):
        log.info("Token em cache válido (por timestamp)")
        return token

    # ── Verificação real via API (se token existe mas timestamp passou)
    if not force_refresh and token:
        log.info("Verificando token via API...")
        if is_token_valid(token):
            # Token ainda funciona, mas está "velho" — refresh proativo
            log.info("Token válido mas vencido (>20h) — renovando proativamente via refresh_token")
            new_session = try_refresh(session)
            if new_session:
                save_session(new_session)
                return new_session["token"]
            # refresh falhou mas token ainda funciona — usar por enquanto
            session["saved_at"] = int(time.time())
            save_session(session)
            log.info("Token ainda válido via API (refresh proativo falhou, mantendo token atual)")
            return token

    log.info("Token expirado ou inválido — iniciando renovação...")

    # ── Path 1: refresh_token (preferido, sem WAF)
    new_session = try_refresh(session)

    # ── Path 2: Playwright (fallback)
    if not new_session:
        log.warning("refresh_token falhou → tentando Playwright re-login")
        new_session = try_playwright_login()

    if not new_session:
        log.error("❌ Todos os métodos de renovação falharam!")
        raise RuntimeError("Não foi possível obter um token válido")

    save_session(new_session)
    return new_session["token"]


# ──────────────────────────────────────────────────────────────
# SERVIDOR HTTP (para n8n / integrações)
# ──────────────────────────────────────────────────────────────
def start_server(port: int = 8765):
    """
    Servidor HTTP simples para n8n chamar via HTTP Request node.
    
    Endpoints:
      GET /token          → {"token": "...", "status": "ok"}
      GET /token?refresh=1 → força renovação
      GET /status         → info da sessão atual
    """
    from http.server import HTTPServer, BaseHTTPRequestHandler
    from urllib.parse import urlparse, parse_qs
    import threading

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)

            if parsed.path == "/token":
                force = "1" in params.get("refresh", [])
                try:
                    token = get_valid_token(force_refresh=force)
                    session = load_session()
                    body = json.dumps({
                        "status":  "ok",
                        "token":   token,
                        "user_fid": session.get("user_fid", ""),
                        "saved_at": session.get("saved_at_human", ""),
                        "method":  session.get("method", "cache"),
                    }).encode()
                    self.send_response(200)
                except Exception as e:
                    body = json.dumps({"status": "error", "message": str(e)}).encode()
                    self.send_response(500)

                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", len(body))
                self.end_headers()
                self.wfile.write(body)

            elif parsed.path == "/status":
                session = load_session()
                age = int(time.time()) - session.get("saved_at", 0)
                body = json.dumps({
                    "token_age_seconds":  age,
                    "token_age_human":    f"{age // 3600}h {(age % 3600) // 60}m",
                    "is_fresh":          is_session_fresh(session),
                    "user_fid":          session.get("user_fid", ""),
                    "saved_at":          session.get("saved_at_human", ""),
                    "method":            session.get("method", ""),
                    "has_refresh_token": bool(session.get("refresh_token")),
                }).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", len(body))
                self.end_headers()
                self.wfile.write(body)

            else:
                body = b'{"error": "Not Found"}'
                self.send_response(404)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(body)

        def log_message(self, format, *args):
            log.info(f"HTTP {args[0]} {args[1]}")

    log.info(f"🚀 Token server iniciado em http://0.0.0.0:{port}")
    log.info(f"   GET http://localhost:{port}/token      → obter token")
    log.info(f"   GET http://localhost:{port}/token?refresh=1 → forçar renovação")
    log.info(f"   GET http://localhost:{port}/status     → status da sessão")
    HTTPServer(("0.0.0.0", port), Handler).serve_forever()


# ──────────────────────────────────────────────────────────────
# CLI
# ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Lalamove UAPI Token Manager")
    parser.add_argument("--check",   action="store_true", help="Verifica status do token atual")
    parser.add_argument("--refresh", action="store_true", help="Força renovação do token")
    parser.add_argument("--server",  action="store_true", help="Inicia servidor HTTP")
    parser.add_argument("--port",    type=int, default=8765, help="Porta do servidor (default: 8765)")
    args = parser.parse_args()

    if args.server:
        start_server(args.port)
    elif args.check:
        session = load_session()
        age     = int(time.time()) - session.get("saved_at", 0)
        fresh   = is_session_fresh(session)
        print(json.dumps({
            "token":         session.get("token", "")[:16] + "..." if session.get("token") else "",
            "age_seconds":   age,
            "age_human":     f"{age // 3600}h {(age % 3600) // 60}m",
            "is_fresh":      fresh,
            "user_fid":      session.get("user_fid", ""),
            "has_refresh":   bool(session.get("refresh_token")),
        }, indent=2))
    else:
        # Modo padrão: retorna token válido no stdout
        try:
            token = get_valid_token(force_refresh=args.refresh)
            print(token)
        except RuntimeError as e:
            print(f"ERRO: {e}", file=sys.stderr)
            sys.exit(1)
