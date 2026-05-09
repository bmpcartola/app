/* ============================================================
   JOGOS DA RODADA — JOSA.BET (VERSÃO ATUALIZADA)
   ============================================================ */

const ESCUDOS_PATH = "./images/escudos_brasileirao";

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
  if (main) main.innerHTML = `<div class="flex flex-col justify-center items-center h-[60vh]"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div><p class="text-xs mt-4 text-gray-500 font-bold uppercase tracking-widest">Carregando...</p></div>`;
}
function renderError(msg) {
  const main = document.getElementById("main-content");
  if (main) main.innerHTML = `<div class="text-center py-20 px-8"><div class="bg-red-50 text-red-600 p-6 rounded-3xl border border-red-100"><p class="font-black">${msg}</p><button onclick="window.renderJogos()" class="mt-4 px-6 py-2 bg-red-600 text-white rounded-full font-bold shadow-lg">Tentar novamente</button></div></div>`;
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
  return `<div class="bg-white rounded-[32px] shadow-sm border border-slate-100 mx-4 mb-6 overflow-hidden"><div class="bg-slate-50/50 px-6 py-4 border-b border-slate-100"><p class="text-xl font-black text-center text-slate-800 uppercase tracking-tight">Jogos da Rodada</p></div><div class="grid grid-cols-3 divide-x divide-slate-100 p-6"><div class="text-center px-2"><p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rodada</p><p class="text-2xl font-black text-slate-800">${mercado.rodada_atual??"-"}</p></div><div class="text-center px-2"><p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mercado</p><p class="text-2xl font-black ${s.c}">${s.l}</p></div><div class="text-center px-2"><p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fechamento</p><p class="text-sm font-black text-slate-800 leading-tight pt-1">${formatarFechamento(mercado.fechamento)}</p></div></div></div>`;
}
function renderAproveitamento(aprov) {
  if(!Array.isArray(aprov)) return "";
  const cores = {v:"bg-emerald-500",d:"bg-rose-500",e:"bg-slate-300"};
  return `<div class="flex justify-center gap-1 mt-2">${aprov.map(r=>`<span class="w-1.5 h-1.5 rounded-full ${cores[r]||"bg-slate-100"}"></span>`).join("")}</div>`;
}

// ========== REQUISIÇÕES ==========
async function buscarPartidas(rodada) {
  const isCurrent = (rodada === undefined || rodada === mercadoStatus?.rodada_atual);
  let url;
  if (isCurrent) {
    url = API_CARTOLA.PARTIDAS;
  } else {
    url = API_CARTOLA.PARTIDAS_RODADA(rodada);
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return { partidas: data.partidas || [], clubes: data.clubes || {} };
}
async function buscarPontuados(rodada) {
  if (rodada === mercadoStatus?.rodada_atual) return {};
  const proxyUrl = API_CARTOLA.PONTUADOS(rodada);
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
    const res = await fetch(API_CARTOLA.AWS_ATLETAS_PONTUADOS);
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
      body.innerHTML = `<div class="py-12 text-center text-slate-400 font-black uppercase text-xs">Nenhum dado pontuado encontrado</div>`;
      return;
    }
    body.innerHTML = atletasTime.map(atleta => {
      const sigla = siglaPosicao[atleta.posicao_id] || "???";
      const scoutsList = Object.entries(atleta.scout || {}).map(([k,v]) => `<span class="bg-slate-50 px-2 py-0.5 rounded text-[9px] font-black border border-slate-100">${v} ${k.toUpperCase()}</span>`).join("");
      let emojis = [];
      if (atleta.scout?.G) emojis.push(scoutEmoji.G);
      if (atleta.scout?.A) emojis.push(scoutEmoji.A);
      if (atleta.scout?.CA) emojis.push(scoutEmoji.CA);
      if (atleta.scout?.CV) emojis.push(scoutEmoji.CV);
      const emojiSpan = emojis.length ? `<span class="flex gap-1 ml-2 text-xs">${emojis.join("")}</span>` : "";
      const pontuacao = atleta.pontuacao.toFixed(1);
      const pontuacaoClass = atleta.pontuacao >= 0 ? "text-emerald-600" : "text-rose-600";

      let valHtml = "";
      const atletaIdStr = String(atleta.atleta_id);
      const valor = valuationMap[atletaIdStr];
      if (valor !== undefined && valor !== null && valor !== 0) {
        const valColor = valor >= 0 ? "text-emerald-500" : "text-rose-500";
        valHtml = `<div class="text-[10px] font-bold ${valColor}">${valor > 0 ? '+' : ''}${valor.toFixed(2)}</div>`;
      }

      return `
        <div class="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-50 shadow-sm">
          <div class="flex items-center gap-3">
            <img src="${atleta.foto?.replace("FORMATO", "140x140") || ""}" class="w-10 h-10 rounded-full border border-slate-100 bg-slate-50" onerror="this.src='./images/default.png'">
            <div>
              <div class="flex items-center gap-1.5">
                <span class="text-[9px] font-black text-white bg-slate-400 px-1 rounded">${sigla}</span>
                <span class="text-sm font-black text-slate-800">${atleta.apelido}</span>
              </div>
              ${valHtml}
            </div>
          </div>
          <div class="flex flex-col items-end gap-1.5">
            <div class="flex items-center">
              <span class="text-base font-black ${pontuacaoClass}">${pontuacao}</span>
              ${emojiSpan}
            </div>
            <div class="flex flex-wrap justify-end gap-1">${scoutsList || '<span class="text-[9px] text-slate-300">—</span>'}</div>
          </div>
        </div>
      `;
    }).join("");
  };

  const modalHtml = `
    <div id="modal-scouts" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm" onclick="if(event.target === this) fecharModalScouts()">
      <div class="relative w-full max-w-md mx-3 bg-slate-50 rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div class="bg-white px-6 py-5 flex justify-between items-center border-b border-slate-100">
          <h3 class="font-black text-lg text-slate-800 uppercase tracking-tight">Estatísticas</h3>
          <button onclick="fecharModalScouts()" class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>
        <div class="bg-white px-6 pb-4">
          <div class="flex bg-slate-100 p-1 rounded-2xl">
            <button id="modal-tab-casa" class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-[12px] uppercase transition-all text-white bg-orange-600 shadow-lg shadow-orange-600/20">
              <img src="${ESCUDOS_PATH}/${timeCasa?.id}.png" class="w-5 h-5" onerror="this.src='${timeCasa?.escudos?.["30x30"] || ""}'"> ${timeCasa?.abreviacao}
            </button>
            <button id="modal-tab-fora" class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-[12px] uppercase transition-all text-slate-400">
              <img src="${ESCUDOS_PATH}/${timeFora?.id}.png" class="w-5 h-5" onerror="this.src='${timeFora?.escudos?.["30x30"] || ""}'"> ${timeFora?.abreviacao}
            </button>
          </div>
        </div>
        <div class="modal-body flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50"></div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if(typeof lucide !== "undefined") lucide.createIcons();
  renderizarLista(timeCasaId);

  document.getElementById('modal-tab-casa')?.addEventListener('click', () => {
    document.getElementById('modal-tab-casa').className = "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-[12px] uppercase transition-all text-white bg-orange-600 shadow-lg shadow-orange-600/20";
    document.getElementById('modal-tab-fora').className = "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-[12px] uppercase transition-all text-slate-400";
    renderizarLista(timeCasaId);
  });
  document.getElementById('modal-tab-fora')?.addEventListener('click', () => {
    document.getElementById('modal-tab-fora').className = "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-[12px] uppercase transition-all text-white bg-orange-600 shadow-lg shadow-orange-600/20";
    document.getElementById('modal-tab-casa').className = "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-[12px] uppercase transition-all text-slate-400";
    renderizarLista(timeForaId);
  });
}

// ========== RENDERIZAÇÃO DO SELETOR (SETAS) ==========
function renderSeletorRodada(rodadaAtual, maxRodada) {
  return `
    <div class="px-6 pt-2 pb-6 flex justify-center items-center gap-8">
      <button class="btn-rodada-prev w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-orange-600 hover:border-orange-200 transition-all active:scale-90 disabled:opacity-30 disabled:pointer-events-none" ${rodadaAtual <= 1 ? 'disabled' : ''}>
         <i data-lucide="chevron-left" class="w-6 h-6"></i>
      </button>
      <div class="flex flex-col items-center">
        <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Visualizando</span>
        <div class="text-xl font-black text-slate-800 uppercase tracking-tight">Rodada ${rodadaAtual}</div>
      </div>
      <button class="btn-rodada-next w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-orange-600 hover:border-orange-200 transition-all active:scale-90 disabled:opacity-30 disabled:pointer-events-none" ${rodadaAtual >= maxRodada ? 'disabled' : ''}>
         <i data-lucide="chevron-right" class="w-6 h-6"></i>
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
  let statusCor = "text-slate-400";

  if (rodadaCard < rodadaAtual) {
    statusTexto = "ENCERRADA";
    statusCor = "text-rose-500";
  } 
  else if (p.periodo_tr === "PRIMEIRO_TEMPO" || p.periodo_tr === "SEGUNDO_TEMPO" || p.periodo_tr === "INTERVALO") {
    statusTexto = "AO VIVO";
    statusCor = "text-emerald-500 animate-pulse";
  } 
  else if (p.status_transmissao_tr === "ENCERRADA" || p.status_transmissao_tr === "POS_JOGO") {
    statusTexto = "ENCERRADA";
    statusCor = "text-rose-500";
  }

  return `
    <div class="bg-white rounded-[40px] shadow-sm border border-slate-100 p-6 mb-6 cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all group match-card-v2" data-partida-id="${p.partida_id}" data-rodada="${rodadaCard}">
        <div class="flex flex-col items-center mb-6">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-1 rounded-full border border-slate-100 mb-1">${formatarData(p.partida_data)}</p>
            <p class="text-[11px] font-bold text-slate-400 uppercase">${p.local || "-"}</p>
        </div>
        
        <div class="flex items-center justify-between gap-2">
            <!-- CASA -->
            <div class="flex-1 flex flex-col items-center">
                <div class="relative mb-3">
                    <span class="absolute -top-2 -left-2 w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-[11px] font-black text-slate-500 border border-white shadow-sm">${formatarPosicao(p.clube_casa_posicao)}</span>
                    <img src="${ESCUDOS_PATH}/${p.clube_casa_id}.png" class="w-20 h-20 drop-shadow-xl group-hover:scale-110 transition-transform" onerror="this.src='${casa?.escudos?.["60x60"] || ""}'">
                </div>
                <span class="text-base font-black text-slate-800 uppercase tracking-tighter">${casa?.abreviacao || "?"}</span>
                ${renderAproveitamento(p.aproveitamento_mandante)}
            </div>

            <!-- PLACAR -->
            <div class="flex flex-col items-center">
                <div class="flex items-center gap-4">
                    <span class="text-4xl font-black ${jogoIniciado ? "text-slate-800" : "text-slate-200"}">${placarC}</span>
                    <span class="text-xl font-black text-slate-200">×</span>
                    <span class="text-4xl font-black ${jogoIniciado ? "text-slate-800" : "text-slate-200"}">${placarF}</span>
                </div>
                <div class="mt-4 px-4 py-1.5 rounded-full bg-slate-50 border border-slate-100">
                    <span class="text-[10px] font-black uppercase tracking-widest ${statusCor}">${statusTexto}</span>
                </div>
            </div>

            <!-- FORA -->
            <div class="flex-1 flex flex-col items-center">
                <div class="relative mb-3">
                    <span class="absolute -top-2 -right-2 w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-[11px] font-black text-slate-500 border border-white shadow-sm">${formatarPosicao(p.clube_visitante_posicao)}</span>
                    <img src="${ESCUDOS_PATH}/${p.clube_visitante_id}.png" class="w-20 h-20 drop-shadow-xl group-hover:scale-110 transition-transform" onerror="this.src='${fora?.escudos?.["60x60"] || ""}'">
                </div>
                <span class="text-base font-black text-slate-800 uppercase tracking-tighter">${fora?.abreviacao || "?"}</span>
                ${renderAproveitamento(p.aproveitamento_visitante)}
            </div>
        </div>

        <div class="top5-container hidden mt-8 pt-8 border-t border-slate-50" data-partida-id="${p.partida_id}"></div>
        <button class="expand-top5-btn w-full mt-6 flex flex-col items-center group/btn">
            <span class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover/btn:text-orange-600 transition-colors">Ver Top 5 Atletas</span>
            <div class="w-8 h-1 bg-slate-100 rounded-full mt-2 group-hover/btn:bg-orange-200 transition-colors"></div>
        </button>
    </div>
  `;
}

function gerarTop5Html(partida) {
  if (Object.keys(currentPontuados).length === 0) {
    return `<div class="text-center py-4 bg-slate-50 rounded-3xl text-slate-400 font-black uppercase text-[10px] tracking-widest">Estatísticas pendentes para esta rodada</div>`;
  }
  const casaId = partida.clube_casa_id;
  const foraId = partida.clube_visitante_id;
  const atletas = Object.values(currentPontuados);
  const atletasCasa = atletas.filter(a => a.clube_id === casaId && a.entrou_em_campo).sort((a,b) => b.pontuacao - a.pontuacao).slice(0,5);
  const atletasFora = atletas.filter(a => a.clube_id === foraId && a.entrou_em_campo).sort((a,b) => b.pontuacao - a.pontuacao).slice(0,5);

  const renderLista = (lista) => {
    if (lista.length === 0) return `<div class="text-center py-4 text-slate-300 font-bold italic text-[10px]">Nenhum atleta</div>`;
    return lista.map(a => `
      <div class="flex justify-between items-center py-2 px-3 hover:bg-slate-50 rounded-xl transition-colors">
        <span class="text-[11px] font-black text-slate-700 truncate mr-2">${a.apelido}</span>
        <span class="text-[12px] font-black ${a.pontuacao >= 0 ? 'text-emerald-500' : 'text-rose-500'}">${a.pontuacao.toFixed(1)}</span>
      </div>
    `).join("");
  };
  return `
    <div class="grid grid-cols-2 gap-8 px-2">
      <div><p class="text-center font-black text-[10px] uppercase text-slate-400 tracking-[0.2em] mb-4">Mandante</p>${renderLista(atletasCasa)}</div>
      <div><p class="text-center font-black text-[10px] uppercase text-slate-400 tracking-[0.2em] mb-4">Visitante</p>${renderLista(atletasFora)}</div>
    </div>
  `;
}

// ========== FUNÇÃO PARA CARREGAR UMA RODADA ESPECÍFICA (SETAS) ==========
async function carregarRodada(rodada) {
  if (jogosRenderizando) return;
  jogosRenderizando = true;
  renderLoader();
  try {
    const { partidas: novasPartidas, clubes: novosClubes } = await buscarPartidas(rodada);
    const rodadaAtualAPI = mercadoStatus.rodada_atual;
    
    // Carrega pontuados se a rodada não for a futura
    let novosPontuados = {};
    if (rodada <= rodadaAtualAPI) {
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
        <div class="max-w-4xl mx-auto pb-48 pt-4">
            ${seletorHtml}
            ${statusHtml}
            <div class="px-4">${cardsHtml}</div>
        </div>
    `;
    if(typeof lucide !== "undefined") lucide.createIcons();
    setupGlobalDelegation();
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

  if (window.globalClickHandler) {
    main.removeEventListener('click', window.globalClickHandler);
  }
  
  const clickHandler = (e) => {
    // Botão anterior
    const prevBtn = e.target.closest('.btn-rodada-prev');
    if (prevBtn && !prevBtn.disabled) {
      const novaRodada = currentRodada - 1;
      if (novaRodada >= 1) carregarRodada(novaRodada);
      return;
    }
    // Botão próximo
    const nextBtn = e.target.closest('.btn-rodada-next');
    if (nextBtn && !nextBtn.disabled) {
      const novaRodada = currentRodada + 1;
      if (novaRodada <= maxRodadaGlobal) carregarRodada(novaRodada);
      return;
    }
    // Botão de expandir TOP 5
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
          btn.querySelector('span').innerText = 'Esconder Detalhes';
        }
      } else {
        container.classList.add('hidden');
        btn.querySelector('span').innerText = 'Ver Top 5 Atletas';
      }
      return;
    }
    // Clique no card (para scouts da partida)
    const card = e.target.closest('.match-card-v2');
    if (card && !e.target.closest('.expand-top5-btn')) {
      const partidaId = parseInt(card.dataset.partidaId);
      const partida = currentPartidas.find(p => p.partida_id === partidaId);
      if (partida) abrirModalScouts(partida);
    }
  };
  main.addEventListener('click', clickHandler);
  window.globalClickHandler = clickHandler;
}

// ========== CARREGAR JOGOS INICIAL (ENTRY POINT) ==========
window.renderJogos = async function() {
  if (jogosRenderizando) return;
  jogosRenderizando = true;
  renderLoader();

  try {
    const resMerc = await fetch(API_CARTOLA.MERCADO_STATUS);
    if (!resMerc.ok) throw new Error(`Status API: ${resMerc.status}`);
    mercadoStatus = await resMerc.json();
    const rodadaAtualAPI = mercadoStatus.rodada_atual;
    maxRodadaGlobal = rodadaAtualAPI || 38;

    let rodadaSelecionada = rodadaAtualAPI;
    
    // Carrega dados iniciais
    const results = await Promise.all([
        buscarPartidas(rodadaSelecionada),
        buscarPontuados(rodadaSelecionada),
        buscarValorizacao()
    ]);
    
    currentPartidas = results[0].partidas;
    currentClubes = results[0].clubes;
    currentPontuados = results[1] || {};
    currentValuation = results[2];
    currentRodada = rodadaSelecionada;

    const main = document.getElementById("main-content");
    const seletorHtml = renderSeletorRodada(rodadaSelecionada, maxRodadaGlobal);
    const statusHtml = renderStatusMercado(mercadoStatus);
    const cardsHtml = currentPartidas.map(p => renderCardPartida(p, rodadaSelecionada, rodadaAtualAPI)).join("");
    
    main.innerHTML = `
        <div class="max-w-4xl mx-auto pb-48 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            ${seletorHtml}
            ${statusHtml}
            <div class="px-4">${cardsHtml}</div>
        </div>
    `;

    if(typeof lucide !== "undefined") lucide.createIcons();
    setupGlobalDelegation();
  } catch(err) {
    console.error(err);
    renderError(err.message || "Falha ao carregar dados");
  } finally {
    jogosRenderizando = false;
  }
};
