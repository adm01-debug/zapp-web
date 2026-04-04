import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

/**
 * OAuth callback page for Gmail integration.
 * Opens in a popup during the OAuth flow. Extracts the authorization code
 * from the URL query params and sends it to the parent window via postMessage.
 */
export default function GmailOAuthCallback() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');
    const returnedState = params.get('state');

    if (error) {
      setStatus('error');
      setErrorMsg(error === 'access_denied' ? 'Acesso negado pelo usuário.' : `Erro: ${error}`);
      return;
    }

    if (!code) {
      setStatus('error');
      setErrorMsg('Código de autorização não encontrado na URL.');
      return;
    }

    // Validate CSRF state parameter
    const savedState = sessionStorage.getItem('gmail-oauth-state');
    if (savedState && returnedState && savedState !== returnedState) {
      setStatus('error');
      setErrorMsg('Falha na validação de segurança (state mismatch). Tente novamente.');
      return;
    }
    // Clean up stored state
    sessionStorage.removeItem('gmail-oauth-state');

    // Send the code to the parent window (the main app)
    if (window.opener) {
      window.opener.postMessage(
        { type: 'gmail-oauth-callback', code },
        window.location.origin
      );
      setStatus('success');
      // Close popup after a brief delay
      setTimeout(() => window.close(), 1500);
    } else {
      setStatus('error');
      setErrorMsg('Janela principal não encontrada. Feche esta janela e tente novamente.');
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-4 max-w-sm">
        {status === 'processing' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Processando autorização...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
            <p className="text-sm font-medium text-foreground">Gmail conectado com sucesso!</p>
            <p className="text-xs text-muted-foreground">Esta janela será fechada automaticamente.</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto" />
            <p className="text-sm font-medium text-foreground">Erro na autorização</p>
            <p className="text-xs text-muted-foreground">{errorMsg}</p>
            <button
              onClick={() => window.close()}
              className="text-xs text-primary underline hover:no-underline mt-2"
            >
              Fechar janela
            </button>
          </>
        )}
      </div>
    </div>
  );
}
