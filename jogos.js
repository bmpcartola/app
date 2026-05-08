/* ============================================================
   JOGOS DA RODADA — JOSA.BET
   ============================================================ */

const PROXY_URL_JOGOS = 'https://proxy-f5nr.onrender.com';
const ESCUDOS_PATH = "./images/escudos_brasileirao";

const API_CARTOLA_JOGOS = {
  MERCADO_STATUS: `${PROXY_URL_JOGOS}/mercado`,
  PARTIDAS: `${PROXY_URL_JOGOS}/partidas`,
  PARTIDAS_RODADA: (rodada) => `${PROXY_URL_JOGOS}/partidas/${rodada}`,
  PONTUADOS: (rodada) => `${PROXY_URL_JOGOS}/atletas/pontuados/${rodada}`,
  AWS_ATLETAS_PONTUADOS: `${PROXY_URL_JOGOS}/aws/atletas-pontuados`
};

let jogosRenderizando = false;
let currentRodada = null;
let currentPartidas = [];
let currentClubes = {};
let currentPontuados = {};
let currentValuation = null;
let mercadoStatus = null;
let maxRodadaGlobal = 38;

// ========== UTILITÁRIOS ==========
function renderLoader() {
  const main = document.getElementById("main-content");
  if (main) main.innerHTML = `<div class="flex flex-col justify-center items-center h-[60vh]"><div class="loader"></div><p class="text-xs mt-2 font-jogos text-slate-400">Carregando...</p></div>`;
}
function renderError(msg) {
  const main = document.getElementById("main-content");
  if (main) main.innerHTML = `<div class="text-center py-10"><p class="text-red-500">${msg}</p><button onclick="window.renderJogos()" class="mt-4 px-4 py-2 bg-black text-white rounded-full">Tentar novamente</button></div>`;
}
function formatarData(iso) {
  if (!iso) return "A definir";
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" })}`;
}
function formatarPosicao(pos) { return pos ? `${pos}º` : ""; }
function formatarFechamento(f) { if(!f) return "--/-- --:--"; return `${String(f.dia).padStart(2,"0")}/${String(f.mes).padStart(2,"0")} ${String(f.hora).padStart(2,"0")}:${String(f.minuto).padStart(2,"0")}`; }
function statusMercado(s) {
  const m = {1:{l:"ABERTO",c:"text-emerald-500",t:"MERCADO FECHA"},2:{l:"FECHADO",c:"text-rose-500",t:"FECHADO EM"},3:{l:"ATUALIZANDO",c:"text-amber-500",t:"AGUARDE"},4:{l:"MANUTENÇÃO",c:"text-gray-500",t:"EM MANUTENÇÃO"},6:{l:"ENCERRADO",c:"text-gray-500",t:"FIM DE TEMPORADA"}};
  return m[s]||{l:"—",c:"text-gray-400",t:"—"};
}
function renderStatusMercado(mercado) {
  const s = statusMercado(mercado.status_mercado);
  return `
    <div class="bg-white rounded-2xl shadow-sm border mx-auto max-w-2xl mb-8 overflow-hidden">
        <div class="bg-orange-50 px-4 py-3 border-b border-orange-100">
            <p class="text-xl font-black text-center font-jogos text-slate-800 italic uppercase">Jogos da Rodada</p>
        </div>
        <div class="grid grid-cols-3 divide-x divide-slate-100 p-5">
            <div class="text-center">
                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Rodada Atual</p>
                <p class="text-2xl font-black font-mono text-slate-800">${mercado.rodada_atual??"-"}</p>
            </div>
            <div class="text-center">
                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Status</p>
                <p class="text-2xl font-black font-jogos ${s.c} leading-tight">${s.l}</p>
            </div>
            <div class="text-center">
                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">${s.t}</p>
                <p class="text-lg font-black font-mono text-slate-800">${formatarFechamento(mercado.fechamento)}</p>
            </div>
        </div>
    </div>`;
}
function renderAproveitamento(aprov) {
  if(!Array.isArray(aprov)) return "";
  const cores = {v:"bg-emerald-500",d:"bg-rose-500",e:"bg-gray-400"};
  return `<div class="flex justify-center gap-1 mt-2">${aprov.map(r=>`<span class="w-2 h-2 rounded-full ${cores[r]||"bg-gray-200"}"></span>`).join("")}</div>`;
}

// ========== REQUISIÇÕES ==========
async function buscarMaxRodada() {
  try {
    const res = await fetch(API_CARTOLA_JOGOS.MERCADO_STATUS);
    const data = await res.json();
    return data.rodada_atual || 38;
  } catch(e) {
    return 38;
  }
}
async function buscarPartidas(rodada) {
  const isCurrent = (rodada === undefined || rodada === mercadoStatus?.rodada_atual);
  let url;
  if (isCurrent) {
    url = API_CARTOLA_JOGOS.PARTIDAS;
  } else {
    url = API_CARTOLA_JOGOS.PARTIDAS_RODADA(rodada);
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return { partidas: data.partidas || [], clubes: data.clubes || {} };
}
async function buscarPontuados(rodada) {
  if (rodada === mercadoStatus?.rodada_atual) return {};
  const proxyUrl = API_CARTOLA_JOGOS.PONTUADOS(rodada);
  try {
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error(`Proxy falhou com status ${res.status}`);
    const data = await res.json();
    return data.atletas || {};
  } catch (err) {
      console.error(`Não foi possível carregar scouts da rodada ${rodada}`, err);
      return {};
  }
}
async function buscarValorizacao() {
  try {
    const rota = API_CARTOLA_JOGOS.AWS_ATLETAS_PONTUADOS;
    const res = await fetch(rota);
    if (!res.ok) throw new Error("AWS valorização falhou");
    return await res.json();
  } catch(e) {
    return null;
  }
}

// ========== MODAL DE SCOUTS DA PARTIDA ==========
function fecharModalScouts() {
  const modal = document.getElementById('modal-scouts');
  if (modal) modal.remove();
}
window.fecharModalScouts = fecharModalScouts;

async function abrirModalScouts(partida) {
  fecharModalScouts();
  const clubes = currentClubes;
  const pontuados = currentPontuados;
  const valuation = currentValuation;
  const atletas = Object.values(pontuados);
  const timeCasaId = partida.clube_casa_id;
  const timeForaId = partida.clube_visitante_id;
  const timeCasa = clubes[timeCasaId];
  const timeFora = clubes[timeForaId];

  if (Object.keys(pontuados).length === 0) {
    alert("Ainda não há estatísticas disponíveis para esta rodada.");
    return;
  }

  const siglaPosicao = { 1: "GOL", 2: "LAT", 3: "ZAG", 4: "MEI", 5: "ATA", 6: "TEC" };
  const scoutEmoji = { "G": "⚽", "A": "👟", "CA": "🟨", "CV": "🟥" };

  const valuationMap = {};
  if (valuation) {
    const source = valuation.atletas || valuation;
    Object.entries(source).forEach(([key, val]) => {
      if (val && typeof val === 'object') {
        const v = val.valorizacao !== undefined ? val.valorizacao : val.valorizacao_real;
        if (v !== undefined && v !== null) {
          valuationMap[String(key)] = parseFloat(v);
          if (val.idAtleta) valuationMap[String(val.idAtleta)] = parseFloat(v);
        }
      }
    });
  }

  const renderizarLista = (timeId) => {
    const atletasTime = atletas.filter(a => Number(a.clube_id) === Number(timeId) && a.entrou_em_campo === true);
    atletasTime.sort((a,b) => (a.posicao_id || 99) - (b.posicao_id || 99));
    const body = document.querySelector('#modal-scouts .modal-body');
    if (!body) return;
    if (atletasTime.length === 0) {
      body.innerHTML = `<div class="py-12 text-center text-slate-400 font-jogos text-xs uppercase tracking-widest">NENHUM ATLETA EM CAMPO</div>`;
      return;
    }
    body.innerHTML = atletasTime.map(atleta => {
      const sigla = siglaPosicao[atleta.posicao_id] || "???";
      const scoutsList = Object.entries(atleta.scout || {}).map(([k,v]) => `<span class="inline-block bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-bold">${v}${k.toUpperCase()}</span>`).join("");
      let emojis = [];
      if (atleta.scout?.G) emojis.push(scoutEmoji.G);
      if (atleta.scout?.A) emojis.push(scoutEmoji.A);
      if (atleta.scout?.CA) emojis.push(scoutEmoji.CA);
      if (atleta.scout?.CV) emojis.push(scoutEmoji.CV);
      const emojiSpan = emojis.length ? `<span class="flex gap-1 ml-2">${emojis.map(e => `<span>${e}</span>`).join("")}</span>` : "";
      const pontuacao = atleta.pontuacao.toFixed(1);
      const pontuacaoClass = atleta.pontuacao >= 0 ? "text-emerald-500" : "text-rose-500";

      let valHtml = "";
      const atletaIdStr = String(atleta.atleta_id);
      const valor = valuationMap[atletaIdStr];
      if (valor !== undefined && valor !== null && valor !== 0) {
        const valColor = valor >= 0 ? "text-emerald-500" : "text-rose-500";
        const sinal = valor > 0 ? "+" : "";
        valHtml = `<div class="text-[10px] font-black font-mono ${valColor} leading-tight">${sinal}${valor.toFixed(2)}</div>`;
      }

      return `
        <div class="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-slate-50 rounded-full border border-slate-100 overflow-hidden">
                <img src="${atleta.foto?.replace("FORMATO", "140x140") || ""}" class="w-full h-full object-contain" onerror="this.src='${ESCUDOS_PATH}/${timeId}.png'">
            </div>
            <div>
              <p class="text-[9px] font-black font-jogos text-slate-400 tracking-tighter leading-none">${sigla}</p>
              <p class="text-sm font-bold text-slate-800 leading-tight">${atleta.apelido}</p>
              ${valHtml}
            </div>
          </div>
          <div class="flex flex-col items-end gap-1.5">
            <div class="flex items-center">
              <span class="text-lg font-black font-mono ${pontuacaoClass}">${pontuacao}</span>
              ${emojiSpan}
            </div>
            <div class="flex flex-wrap gap-1 justify-end">${scoutsList || '<span class="text-[10px] text-slate-300">—</span>'}</div>
          </div>
        </div>
      `;
    }).join("");
  };

  const modalHtml = `
    <div id="modal-scouts" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onclick="if(event.target === this) fecharModalScouts()">
      <div class="relative w-full max-w-md mx-3 bg-slate-50 rounded-[32px] shadow-2xl overflow-y-auto max-h-[90vh]">
        <div class="sticky top-0 bg-white z-10 border-b border-slate-100 px-6 py-4 flex justify-between items-center">
          <h3 class="font-black text-xs font-jogos text-slate-400 uppercase tracking-[0.2em]">SCOUTS DA PARTIDA</h3>
          <button onclick="fecharModalScouts()" class="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="p-6">
          <div class="flex gap-2 mb-6">
            <button id="modal-tab-casa" class="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black font-jogos text-[10px] tracking-widest text-white bg-orange-500 shadow-lg shadow-orange-500/20 transition-all">
              <img src="${ESCUDOS_PATH}/${timeCasa?.id}.png" class="w-6 h-6 object-contain" onerror="this.src='${timeCasa?.escudos?.["30x30"] || ""}'"> ${timeCasa?.abreviacao || "CASA"}
            </button>
            <button id="modal-tab-fora" class="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black font-jogos text-[10px] tracking-widest text-slate-400 bg-white border border-slate-100 shadow-sm transition-all">
              <img src="${ESCUDOS_PATH}/${timeFora?.id}.png" class="w-6 h-6 object-contain" onerror="this.src='${timeFora?.escudos?.["30x30"] || ""}'"> ${timeFora?.abreviacao || "FORA"}
            </button>
          </div>
          <div class="modal-body space-y-3"></div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  renderizarLista(timeCasaId);

  document.getElementById('modal-tab-casa')?.addEventListener('click', () => {
    document.getElementById('modal-tab-casa').className = "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black font-jogos text-[10px] tracking-widest text-white bg-orange-500 shadow-lg shadow-orange-500/20 transition-all";
    document.getElementById('modal-tab-fora').className = "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black font-jogos text-[10px] tracking-widest text-slate-400 bg-white border border-slate-100 shadow-sm transition-all";
    renderizarLista(timeCasaId);
  });
  document.getElementById('modal-tab-fora')?.addEventListener('click', () => {
    document.getElementById('modal-tab-fora').className = "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black font-jogos text-[10px] tracking-widest text-white bg-orange-500 shadow-lg shadow-orange-500/20 transition-all";
    document.getElementById('modal-tab-casa').className = "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black font-jogos text-[10px] tracking-widest text-slate-400 bg-white border border-slate-100 shadow-sm transition-all";
    renderizarLista(timeForaId);
  });
}

// ========== RENDERIZAÇÃO DO SELETOR (SETAS) ==========
function renderSeletorRodada(rodadaAtual, maxRodada) {
  return `
    <div class="px-4 pt-4 pb-8 flex justify-center items-center gap-8">
      <button class="btn-rodada-prev w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-orange-500 hover:border-orange-200 transition-all disabled:opacity-30 disabled:pointer-events-none group" ${rodadaAtual <= 1 ? 'disabled' : ''}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="transition-transform group-hover:-translate-x-0.5"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <div class="text-center font-jogos italic uppercase">
        <p class="text-[10px] text-slate-400 tracking-[0.4em] mb-1">Escolher Rodada</p>
        <p class="text-2xl font-black text-slate-800 tracking-tighter">${rodadaAtual}ª RODADA</p>
      </div>
      <button class="btn-rodada-next w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-orange-500 hover:border-orange-200 transition-all disabled:opacity-30 disabled:pointer-events-none group" ${rodadaAtual >= maxRodada ? 'disabled' : ''}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="transition-transform group-hover:translate-x-0.5"><path d="M9 18l6-6 6-6"/></svg>
      </button>
    </div>
  `;
}

// ========== CARD COM STATUS CORRETO ==========
function renderCardPartida(p, rodadaCard, rodadaAtual) {
  const casa = currentClubes[p.clube_casa_id];
  const fora = currentClubes[p.clube_visitante_id];
  const placarC = p.placar_oficial_mandante ?? "-";
  const placarF = p.placar_oficial_visitante ?? "-";
  const jogoIniciado = p.placar_oficial_mandante !== null;

  let statusTexto = "AGUARDANDO";
  let statusCor = "text-slate-300";

  if (rodadaCard < rodadaAtual) {
    statusTexto = "ENCERRADA";
    statusCor = "text-rose-500";
  } 
  else if (p.periodo_tr === "PRIMEIRO_TEMPO" || p.periodo_tr === "SEGUNDO_TEMPO" || p.periodo_tr === "INTERVALO") {
    statusTexto = "EM ANDAMENTO";
    statusCor = "text-emerald-500";
  } 
  else if (p.status_transmissao_tr === "ENCERRADA" || p.status_transmissao_tr === "POS_JOGO") {
    statusTexto = "ENCERRADA";
    statusCor = "text-rose-500";
  }

  return `
  <div class="match-card-v2 bg-white rounded-[40px] border border-slate-100 p-6 md:p-8 shadow-sm hover:shadow-xl transition-all cursor-pointer mb-6 max-w-3xl mx-auto" data-partida-id="${p.partida_id}" data-rodada="${rodadaCard}">
    <p class="text-[9px] font-mono font-bold text-slate-400 text-center mb-6 uppercase tracking-widest">${formatarData(p.partida_data)} • ${p.local || "-"}</p>
    
    <div class="flex items-center justify-between gap-4 md:gap-8">
      <!-- Time Casa -->
      <div class="flex-1 flex flex-col items-center">
        <span class="font-jersey text-2xl text-slate-200 mb-2">${formatarPosicao(p.clube_casa_posicao)}</span>
        <div class="w-16 h-16 md:w-24 md:h-24 bg-slate-50 p-2 md:p-4 rounded-3xl border border-slate-100 shadow-inner">
            <img src="${ESCUDOS_PATH}/${p.clube_casa_id}.png" class="w-full h-full object-contain" onerror="this.src='${casa?.escudos?.["60x60"] || ""}'">
        </div>
        <span class="mt-3 font-jogos text-sm md:text-lg text-slate-800 tracking-tighter">${casa?.abreviacao || "?"}</span>
        ${renderAproveitamento(p.aproveitamento_mandante)}
      </div>

      <!-- Placar Central -->
      <div class="flex flex-col items-center">
        <div class="flex items-center gap-3 md:gap-6">
          <span class="text-4xl md:text-6xl font-jersey ${jogoIniciado ? "text-slate-800" : "text-slate-200"}">${placarC}</span>
          <span class="text-slate-200 font-jogos italic text-xl">VS</span>
          <span class="text-4xl md:text-6xl font-jersey ${jogoIniciado ? "text-slate-800" : "text-slate-200"}">${placarF}</span>
        </div>
        <div class="mt-4 px-4 py-1 rounded-full border border-slate-100 bg-slate-50/50">
            <p class="text-[10px] font-black font-jogos uppercase tracking-[0.2em] ${statusCor}">${statusTexto}</p>
        </div>
      </div>

      <!-- Time Fora -->
      <div class="flex-1 flex flex-col items-center">
        <span class="font-jersey text-2xl text-slate-200 mb-2">${formatarPosicao(p.clube_visitante_posicao)}</span>
        <div class="w-16 h-16 md:w-24 md:h-24 bg-slate-50 p-2 md:p-4 rounded-3xl border border-slate-100 shadow-inner">
            <img src="${ESCUDOS_PATH}/${p.clube_visitante_id}.png" class="w-full h-full object-contain" onerror="this.src='${fora?.escudos?.["60x60"] || ""}'">
        </div>
        <span class="mt-3 font-jogos text-sm md:text-lg text-slate-800 tracking-tighter">${fora?.abreviacao || "?"}</span>
        ${renderAproveitamento(p.aproveitamento_visitante)}
      </div>
    </div>

    <!-- Hidden Top 5 Drawer -->
    <div class="top5-container hidden mt-8 pt-8 border-t border-slate-50" data-partida-id="${p.partida_id}"></div>
    
    <!-- Action Button -->
    <div class="mt-8 flex justify-center">
        <button class="expand-top5-btn px-6 py-2 rounded-full bg-slate-50 border border-slate-100 text-[9px] font-black font-jogos text-slate-400 tracking-[0.2em] transition-all hover:bg-orange-50 hover:text-orange-500 hover:border-orange-200 uppercase">
            ▼ Top 5 Pontuadores
        </button>
    </div>
  </div>`;
}

function gerarTop5Html(partida) {
  if (Object.keys(currentPontuados).length === 0) {
    return `<div class="text-center py-6 text-slate-300 font-jogos text-[10px] uppercase tracking-widest">Os scouts estão chegando...</div>`;
  }
  const casaId = partida.clube_casa_id;
  const foraId = partida.clube_visitante_id;
  const casaNome = currentClubes[casaId]?.abreviacao || "CASA";
  const foraNome = currentClubes[foraId]?.abreviacao || "FORA";
  const atletas = Object.values(currentPontuados);
  
  const atletasCasa = atletas.filter(a => Number(a.clube_id) === Number(casaId) && a.entrou_em_campo).sort((a,b) => b.pontuacao - a.pontuacao).slice(0,5);
  const atletasFora = atletas.filter(a => Number(a.clube_id) === Number(foraId) && a.entrou_em_campo).sort((a,b) => b.pontuacao - a.pontuacao).slice(0,5);
  
  const renderLista = (lista) => {
    if (lista.length === 0) return `<div class="text-center py-4 text-slate-200 font-jogos text-[9px] uppercase">Vazio</div>`;
    return lista.map(a => `
      <div class="flex justify-between items-center py-2 border-b border-slate-50 group hover:bg-slate-50/50 rounded-lg px-2 transition-colors">
        <span class="text-[11px] font-bold text-slate-600 truncate mr-2">${a.apelido}</span>
        <span class="text-[11px] font-black font-mono ${a.pontuacao >= 0 ? 'text-emerald-500' : 'text-rose-500'}">${a.pontuacao.toFixed(1)}</span>
      </div>
    `).join("");
  };
  return `
    <div class="grid grid-cols-2 gap-8">
      <div>
        <p class="text-center font-black font-jogos text-[9px] text-slate-300 tracking-[0.3em] uppercase mb-4">${casaNome}</p>
        <div class="space-y-1">${renderLista(atletasCasa)}</div>
      </div>
      <div>
        <p class="text-center font-black font-jogos text-[9px] text-slate-300 tracking-[0.3em] uppercase mb-4">${foraNome}</p>
        <div class="space-y-1">${renderLista(atletasFora)}</div>
      </div>
    </div>
  `;
}

// ========== FUNÇÃO PARA CARREGAR UMA RODADA ESPECÍFICA (SETAS) ==========
async function carregarRodada(rodada) {
  if (jogosRenderizando) return;
  jogosRenderizando = true;
  renderLoader();
  try {
    const [statusData, { partidas: novasPartidas, clubes: novosClubes }] = await Promise.all([
        mercadoStatus ? Promise.resolve(mercadoStatus) : fetch(API_CARTOLA_JOGOS.MERCADO_STATUS).then(r => r.json()),
        buscarPartidas(rodada)
    ]);
    
    mercadoStatus = statusData;
    let novosPontuados = {};
    const rodadaAtualAPI = mercadoStatus.rodada_atual;
    if (rodada < rodadaAtualAPI) {
      novosPontuados = await buscarPontuados(rodada);
    }
    currentPartidas = novasPartidas;
    currentClubes = novosClubes;
    currentPontuados = novosPontuados;
    currentRodada = rodada;

    const main = document.getElementById("main-content");
    const seletorHtml = renderSeletorRodada(rodada, maxRodadaGlobal);
    const statusHtml = renderStatusMercado(mercadoStatus);
    const cardsHtml = currentPartidas.map(p => renderCardPartida(p, rodada, rodadaAtualAPI)).join("");
    main.innerHTML = `
        <div class="animate-in fade-in duration-700 pb-48">
            ${seletorHtml}
            ${statusHtml}
            <section class="max-w-4xl mx-auto px-4">${cardsHtml}</section>
        </div>`;
    
    setupGlobalDelegation();
    if (typeof lucide !== "undefined") lucide.createIcons();
  } catch (err) {
    console.error(err);
    renderError(`Erro ao carregar rodada ${rodada}: ${err.message}`);
  } finally {
    jogosRenderizando = false;
  }
}

// ========== DELEGAÇÃO DE EVENTOS GLOBAL ==========
function setupGlobalDelegation() {
  const main = document.getElementById("main-content");
  if (!main) return;

  if (window.bmpJogosClickHandler) {
    main.removeEventListener('click', window.bmpJogosClickHandler);
  }
  
  const clickHandler = (e) => {
    const prevBtn = e.target.closest('.btn-rodada-prev');
    if (prevBtn && !prevBtn.disabled) {
      e.stopPropagation();
      const novaRodada = currentRodada - 1;
      if (novaRodada >= 1) carregarRodada(novaRodada);
      return;
    }
    const nextBtn = e.target.closest('.btn-rodada-next');
    if (nextBtn && !nextBtn.disabled) {
      e.stopPropagation();
      const novaRodada = currentRodada + 1;
      if (novaRodada <= maxRodadaGlobal) carregarRodada(novaRodada);
      return;
    }
    const btn = e.target.closest('.expand-top5-btn');
    if (btn) {
      e.stopPropagation();
      const card = btn.closest('.match-card-v2');
      const container = card.querySelector('.top5-container');
      const isHidden = container.classList.contains('hidden');
      if (isHidden) {
        const partidaId = parseInt(card.dataset.partidaId);
        const partida = currentPartidas.find(p => p.partida_id === partidaId);
        if (partida) {
          container.innerHTML = gerarTop5Html(partida);
          container.classList.remove('hidden');
          btn.innerHTML = '▲ Esconder Top 5';
          btn.classList.add('bg-orange-500', 'text-white', 'border-orange-500');
          btn.classList.remove('bg-slate-50', 'text-slate-400', 'border-slate-100');
        }
      } else {
        container.classList.add('hidden');
        btn.innerHTML = '▼ Top 5 Pontuadores';
        btn.classList.remove('bg-orange-500', 'text-white', 'border-orange-500');
        btn.classList.add('bg-slate-50', 'text-slate-400', 'border-slate-100');
      }
      return;
    }
    const card = e.target.closest('.match-card-v2');
    if (card && !e.target.closest('.expand-top5-btn')) {
      const partidaId = parseInt(card.dataset.partidaId);
      const partida = currentPartidas.find(p => p.partida_id === partidaId);
      if (partida) abrirModalScouts(partida);
    }
  };
  main.addEventListener('click', clickHandler);
  window.bmpJogosClickHandler = clickHandler;
}

// ========== ENTRY POINT PARA BMP DASHBOARD ==========
window.renderJogos = async function() {
  if (jogosRenderizando) return;
  
  const main = document.getElementById("main-content");
  if (!main) return;

  renderLoader();

  try {
    const resMerc = await fetch(API_CARTOLA_JOGOS.MERCADO_STATUS);
    if (!resMerc.ok) throw new Error(`Status API: ${resMerc.status}`);
    mercadoStatus = await resMerc.json();
    const rodadaAtualAPI = mercadoStatus.rodada_atual;
    maxRodadaGlobal = rodadaAtualAPI || 38;

    // Se estivermos abrindo a página pela primeira vez nesta sessão
    if (currentRodada === null || currentRodada === undefined) {
        currentRodada = rodadaAtualAPI;
    }
    
    await carregarRodada(currentRodada);

  } catch(err) {
    console.error(err);
    renderError(err.message || "Falha ao carregar dados do mercado");
  }
};

console.log("✅ jogos.js carregado (v2 com scouts e animações)");
