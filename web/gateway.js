export async function gatewayRequest(base, action, body, session, params={}) {
  if (!base) throw new Error('O endereço do servidor de login não foi configurado.');
  const url = new URL(base, globalThis.location?.href || 'http://localhost/');
  url.searchParams.set('action', action);
  for(const [key,value] of Object.entries(params)) url.searchParams.set(key,String(value));
  let response;
  try {
    response = await fetch(url, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { ...(body === undefined ? {} : {'Content-Type':'application/json'}), ...(session ? {Authorization:`Bearer ${session}`} : {}) },
      ...(body === undefined ? {} : {body:JSON.stringify(body)}),
      signal: AbortSignal.timeout(45000)
    });
  } catch (error) {
    throw new Error(error.name === 'TimeoutError' ? 'O servidor demorou para responder. Tente novamente em alguns segundos.' : 'Não foi possível acessar o servidor de login. Verifique sua conexão e tente novamente.');
  }
  let data;
  try { data = await response.json(); } catch {
    throw new Error('O servidor de login retornou uma resposta inválida. Tente novamente mais tarde.');
  }
  if (!response.ok) {
    const error = new Error(data?.error || 'Falha na conexão com o servidor de login.');
    error.status = response.status;
    throw error;
  }
  return data;
}
