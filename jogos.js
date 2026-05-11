/* ============================================================
   JOGOS DA RODADA — COM FONTE JERSEY E SCOUTS EM TEMPO REAL
   ============================================================ */

const JOGOS_PROXY_URL = 'https://proxy-f5nr.onrender.com';
const ESCUDOS_PATH = "./images/escudos_brasileirao";

let jogosRenderizando = false;
let currentRodada = null;
let currentPartidas = [];
let currentClubes = {};
let currentPontuados = {};
let mercadoStatus = null;
let maxRodadaGlobal = 38;

// ========== FUNÇÕES AUXILIARES ==========

function carregarJogosLoader() {
  const main = document.getElementById("main-content");
  if (main) main.innerHTML = `<div class="flex flex-col justify-center items-center h-screen"><div class="loader"></div><p class="text-xs mt-2 text-slate-400 font-jogos">Carregando jogos...</p></div>`;
}

function carregarJogosError(msg) {
  const main = document.getElementById("main-content");
  if (main) main.innerHTML = `<div class="text-center py-10"><p class="text-red-500 font-jersey">${msg}</p><button onclick="window.carregarJogos()" class="mt-4 px-4 py-2 bg-orange-500 text-white rounded-full text-xs font-jogos">Tentar novamente</button></div>`;
}

function formatarData(iso) {
  if (!iso) return "A definir";
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" })}`;
}

function formatarPosicao(pos) { return pos ? `${pos}º` : ""; }

function formatarFechamento(f) { 
  if(!f) return "--/-- --:--"; 
  return `${String(f.dia).padStart(2,"0")}/${String(f.mes).padStart(2,"0")} ${String(f.hora).padStart(2,"0")}:${String(f.minuto).padStart(2,"0")}`;
}

function statusMercado(s) {
  const m = {1:{l:"ABERTO",c:"text-emerald-500",t:"MERCADO FECHA"},2:{l:"FECHADO",c:"text-rose-500",t:"FECHADO EM"},3:{l:"ATUALIZANDO",c:"text-amber-500",t:"AGUARDE"},4:{l:"MANUTENÇÃO",c:"text-gray-500",t:"EM MANUTENÇÃO"},6:{l:"ENCERRADO",c:"text-gray-500",t:"FIM DE TEMPORADA"}};
  return m[s]||{l:"—",c:"text-gray-400",t:"—"};
}

// ========== CARD DE STATUS COM FONTE JERSEY ==========
function renderStatusMercado(mercado) {
  const s = statusMercado(mercado.status_mercado);
  return `<div class="bg-white rounded-2xl shadow-sm border mx-4 mb-4">
    <div class="grid grid-cols-3 divide-x p-5">
      <div class="text-center">
        <p class="text-[10px] text-gray-400 font-jogos">Rodada Atual</p>
        <p class="text-2xl font-black font-jersey">${mercado.rodada_atual ?? "-"}</p>
      </div>
      <div class="text-center">
        <p class="text-[10px] text-gray-400 font-jogos">Status</p>
        <p class="text-2xl font-black font-jersey ${s.c}">${s.l}</p>
      </div>
      <div class="text-center">
        <p class="text-[10px] text-gray-400 font-jogos">${s.t}</p>
        <p class="text-lg font-black font-jersey">${formatarFechamento(mercado.fechamento)}</p>
      </div>
    </div>
  </div>`;
}

function renderAproveitamento(aprov) {
  if(!Array.isArray(aprov)) return "";
  const cores = {v:"bg-emerald-200",d:"bg-rose-200",e:"bg-gray-200"};
  return `<div class="flex justify-center gap-1 mt-2">${aprov.map(r=>`<span class="w-2 h-2 rounded-full ${cores[r]||"bg-gray-100"}"></span>`).join("")}</div>`;
}

async function buscarPartidas(rodada) {
  const url = `${JOGOS_PROXY_URL}/partidas/${rodada}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return { partidas: data.partidas || [], clubes: data.clubes || {} };
}

// ========== BUSCA PONTUADOS (rodada atual via API direta, anteriores via proxy) ==========
async function buscarPontuadosRodadaAtual() {
  try {
    const url = 'https://pb89hpsof3.execute-api.us-east-1.amazonaws.com/prod/atletas-pontuados';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const pontuadosObj = {};
    for (const id in data) {
      const atleta = data[id];
      pontuadosObj[atleta.idAtleta] = {
        id: atleta.idAtleta,
        apelido: atleta.apelido,
        nome: atleta.apelido,
        clube_id: atleta.clube_id,
        posicao_id: atleta.posicao_id,
        pontuacao: atleta.pontuacao,
        valorizacao: atleta.valorizacao,
        scout: atleta.scout || {},
        foto: atleta.foto,
        entrou_em_campo: true
      };
    }
    return pontuadosObj;
  } catch (err) {
    console.error('Erro ao buscar pontuados da rodada atual:', err);
    return {};
  }
}

async function buscarPontuadosRodadaAnterior(rodada) {
  try {
    const url = `${JOGOS_PROXY_URL}/atletas/pontuados/${rodada}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Proxy falhou: ${res.status}`);
    let data = await res.json();
    if (Array.isArray(data)) {
      const obj = {};
      data.forEach(a => { obj[a.id] = a; });
      return obj;
    }
    if (data.atletas) return data.atletas;
    return data;
  } catch (err) {
    console.error(`Erro ao carregar scouts da rodada ${rodada}`, err);
    return {};
  }
}

async function buscarPontuados(rodada, rodadaAtualAPI) {
  if (rodada === rodadaAtualAPI) {
    return await buscarPontuadosRodadaAtual();
  } else {
    return await buscarPontuadosRodadaAnterior(rodada);
  }
}

// ========== MODAL DE SCOUTS COM VALORIZAÇÃO E FONTE JERSEY ==========

function fecharModalScouts() {
  const modal = document.getElementById('modal-scouts');
  if (modal) modal.remove();
}
window.fecharModalScouts = fecharModalScouts;

async function abrirModalScouts(partida) {
  fecharModalScouts();
  const clubes = currentClubes;
  const pontuados = currentPontuados;
  const timeCasaId = partida.clube_casa_id;
  const timeForaId = partida.clube_visitante_id;
  const timeCasa = clubes[timeCasaId];
  const timeFora = clubes[timeForaId];

  if (Object.keys(pontuados).length === 0) {
    alert("Ainda não há estatísticas disponíveis para esta rodada.");
    return;
  }

  const siglaPosicao = { 1: "GOL", 2: "LAT", 3: "ZAG", 4: "MEI", 5: "ATA", 6: "TEC" };
  
  const scoutEmoji = {
    "G": "⚽",
    "A": "👟",
    "CA": "🟨",
    "CV": "🟥",
    "GC": "<img src='images/bv.png' class='inline-block w-5 h-5' alt='GC' onerror='this.style.display=\"none\"; this.insertAdjacentHTML(\"afterend\", \"<span style=\\\"color:#e11d1d; font-size:1rem;\\\">⚽</span>\");'>"
  };

  const atletas = Object.values(pontuados);
  
  const renderizarLista = (timeId) => {
    const atletasTime = atletas.filter(a => Number(a.clube_id) === Number(timeId) && (a.entrou_em_campo !== false));
    atletasTime.sort((a,b) => (a.posicao_id || 99) - (b.posicao_id || 99));
    const body = document.querySelector('#modal-scouts .modal-body');
    if (!body) return;
    if (atletasTime.length === 0) {
      body.innerHTML = `<div class="text-center py-8 text-gray-400 text-xs font-jogos">NENHUM ATLETA EM CAMPO</div>`;
      return;
    }
    
    body.innerHTML = atletasTime.map(atleta => {
      const sigla = siglaPosicao[atleta.posicao_id] || "???";
      const scoutData = atleta.scout || {};
      const scoutsList = Object.entries(scoutData)
        .map(([k, v]) => `<span class="inline-block bg-gray-100 rounded-full px-2 py-0.5 text-[10px] font-mono mr-1">${v} ${k.toUpperCase()}</span>`)
        .join("");
      
      let emojis = [];
      if (scoutData.G) emojis.push(scoutEmoji.G);
      if (scoutData.A) emojis.push(scoutEmoji.A);
      if (scoutData.CA) emojis.push(scoutEmoji.CA);
      if (scoutData.CV) emojis.push(scoutEmoji.CV);
      if (scoutData.GC) emojis.push(scoutEmoji.GC);
      
      const pontuacao = (atleta.pontuacao || 0).toFixed(1);
      const pontuacaoClass = atleta.pontuacao >= 0 ? "text-emerald-600" : "text-rose-600";
      const fotoUrl = atleta.foto ? atleta.foto.replace("FORMATO", "140x140") : "";
      
      let valorizacaoHtml = '';
      if (atleta.valorizacao !== undefined && atleta.valorizacao !== null && atleta.valorizacao !== 0) {
        const valor = atleta.valorizacao;
        const sinal = valor > 0 ? '+' : '';
        const cor = valor > 0 ? 'text-emerald-600' : (valor < 0 ? 'text-rose-600' : 'text-gray-400');
        valorizacaoHtml = `<span class="ml-2 text-[10px] font-mono ${cor}">${sinal}${valor.toFixed(2)}</span>`;
      }
      
      return `
        <div class="flex items-center justify-between p-2 border-b border-gray-50">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
              <img src="${fotoUrl}" class="w-full h-full object-cover" onerror="this.style.display='none'">
            </div>
            <div>
              <div class="text-[10px] font-mono text-gray-400">${sigla}</div>
              <div class="text-sm font-bold font-jersey text-gray-800 flex items-center">
                ${atleta.apelido || atleta.nome || "?"}
                ${valorizacaoHtml}
              </div>
            </div>
          </div>
          <div class="text-right">
            <div class="font-black font-jersey ${pontuacaoClass} flex items-center justify-end gap-1">
              ${emojis.length ? `<span class="text-lg">${emojis.join(" ")}</span>` : ""}
              <span>${pontuacao}</span>
            </div>
            <div class="text-[10px] mt-1">${scoutsList || "—"}</div>
          </div>
        </div>
      `;
    }).join("");
  };

  const modalHtml = `
    <div id="modal-scouts" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onclick="if(event.target === this) fecharModalScouts()">
      <div class="relative w-full max-w-md mx-3 bg-white rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
        <div class="sticky top-0 bg-white z-10 border-b border-gray-100 px-4 py-3 flex justify-between items-center">
          <h3 class="font-black text-lg font-jersey text-gray-800">SCOUTS DA PARTIDA</h3>
          <button onclick="fecharModalScouts()" class="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="bg-gradient-to-r from-orange-50 to-white px-4 pb-3">
          <div class="flex gap-2">
            <button id="modal-tab-casa" class="flex-1 flex items-center justify-center gap-2 py-2 rounded-full font-bold text-white bg-[#ff6321]">
              <img src="${ESCUDOS_PATH}/${timeCasa?.id}.png" class="w-5 h-5" onerror="this.src=''"> ${timeCasa?.abreviacao || "CASA"}
            </button>
            <button id="modal-tab-fora" class="flex-1 flex items-center justify-center gap-2 py-2 rounded-full font-bold text-black bg-gray-200">
              <img src="${ESCUDOS_PATH}/${timeFora?.id}.png" class="w-5 h-5" onerror="this.src=''"> ${timeFora?.abreviacao || "FORA"}
            </button>
          </div>
        </div>
        <div class="modal-body p-4 space-y-2"></div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  renderizarLista(timeCasaId);

  document.getElementById('modal-tab-casa')?.addEventListener('click', () => {
    document.getElementById('modal-tab-casa').className = "flex-1 flex items-center justify-center gap-2 py-2 rounded-full font-bold text-white bg-[#ff6321]";
    document.getElementById('modal-tab-fora').className = "flex-1 flex items-center justify-center gap-2 py-2 rounded-full font-bold text-black bg-gray-200";
    renderizarLista(timeCasaId);
  });
  document.getElementById('modal-tab-fora')?.addEventListener('click', () => {
    document.getElementById('modal-tab-fora').className = "flex-1 flex items-center justify-center gap-2 py-2 rounded-full font-bold text-white bg-[#ff6321]";
    document.getElementById('modal-tab-casa').className = "flex-1 flex items-center justify-center gap-2 py-2 rounded-full font-bold text-black bg-gray-200";
    renderizarLista(timeForaId);
  });
}

// ========== SELETOR DE RODADA COM FONTE JERSEY ==========
function renderSeletorRodada(rodadaAtual, maxRodada) {
  return `
    <div class="px-4 pt-4 pb-2 flex justify-center items-center gap-6">
      <button class="btn-rodada-prev w-10 h-10 rounded-full bg-white shadow-sm border flex items-center justify-center text-gray-600 hover:text-black transition disabled:opacity-30" ${rodadaAtual <= 1 ? 'disabled' : ''}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <div class="text-base font-black font-jersey text-gray-800">Rodada ${rodadaAtual}</div>
      <button class="btn-rodada-next w-10 h-10 rounded-full bg-white shadow-sm border flex items-center justify-center text-gray-600 hover:text-black transition disabled:opacity-30" ${rodadaAtual >= maxRodada ? 'disabled' : ''}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
  `;
}

// ========== CARD DE PARTIDA COM FONTE JERSEY NOS PLACARES ==========
function renderCardPartida(p, rodadaCard, rodadaAtual) {
  const casa = currentClubes[p.clube_casa_id];
  const fora = currentClubes[p.clube_visitante_id];
  const placarC = p.placar_oficial_mandante ?? "-";
  const placarF = p.placar_oficial_visitante ?? "-";
  const jogoIniciado = p.placar_oficial_mandante !== null;

  let statusTexto = "AGUARDANDO";
  let statusCor = "text-gray-400";

  if (rodadaCard < rodadaAtual) {
    statusTexto = "ENCERRADA";
    statusCor = "text-red-500";
  } 
  else if (p.periodo_tr === "PRIMEIRO_TEMPO" || p.periodo_tr === "SEGUNDO_TEMPO" || p.periodo_tr === "INTERVALO") {
    statusTexto = "EM ANDAMENTO";
    statusCor = "text-green-600";
  } 
  else if (p.status_transmissao_tr === "ENCERRADA" || p.status_transmissao_tr === "POS_JOGO") {
    statusTexto = "ENCERRADA";
    statusCor = "text-red-500";
  }

  return `<div class="match-card-v2 bg-white rounded-2xl shadow-sm border p-4 mb-4 cursor-pointer" data-partida-id="${p.partida_id}" data-rodada="${rodadaCard}">
    <p class="text-[10px] text-gray-400 text-center mb-2 font-jogos">${formatarData(p.partida_data)} • ${p.local || "-"}</p>
    <div class="flex items-start justify-between gap-2">
      <div class="flex-1 text-center">
        <span class="text-[11px] text-gray-400 font-jogos">${formatarPosicao(p.clube_casa_posicao)}</span>
        <img src="${ESCUDOS_PATH}/${p.clube_casa_id}.png" class="w-12 h-12 mx-auto" onerror="this.src=''">
        <span class="text-sm font-black font-jersey block">${casa?.abreviacao || "?"}</span>
        ${renderAproveitamento(p.aproveitamento_mandante)}
      </div>
      <div class="text-center">
        <div class="text-2xl font-black font-jersey">
          <span class="${jogoIniciado ? "text-black" : "text-gray-300"}">${placarC}</span>
          <span class="text-gray-300"> × </span>
          <span class="${jogoIniciado ? "text-black" : "text-gray-300"}">${placarF}</span>
        </div>
        <div class="text-[9px] font-bold uppercase tracking-wider mt-1 ${statusCor} font-jersey">${statusTexto}</div>
      </div>
      <div class="flex-1 text-center">
        <span class="text-[11px] text-gray-400 font-jogos">${formatarPosicao(p.clube_visitante_posicao)}</span>
        <img src="${ESCUDOS_PATH}/${p.clube_visitante_id}.png" class="w-12 h-12 mx-auto" onerror="this.src=''">
        <span class="text-sm font-black font-jersey block">${fora?.abreviacao || "?"}</span>
        ${renderAproveitamento(p.aproveitamento_visitante)}
      </div>
    </div>
    <div class="top5-container hidden mt-4 pt-4 border-t border-gray-100" data-partida-id="${p.partida_id}"></div>
    <button class="expand-top5-btn w-full mt-2 text-[10px] font-bold uppercase text-gray-500 hover:text-gray-800 transition font-jogos">▼ MOSTRAR TOP 5</button>
  </div>`;
}

function gerarTop5Html(partida) {
  if (Object.keys(currentPontuados).length === 0) {
    return `<div class="text-center py-2 text-gray-400 text-[10px] font-jogos">Dados estatísticos indisponíveis para esta rodada.</div>`;
  }
  const casaId = partida.clube_casa_id;
  const foraId = partida.clube_visitante_id;
  const casaNome = currentClubes[casaId]?.abreviacao || "CASA";
  const foraNome = currentClubes[foraId]?.abreviacao || "FORA";
  const atletas = Object.values(currentPontuados);
  const atletasCasa = atletas.filter(a => a.clube_id === casaId && (a.entrou_em_campo !== false)).sort((a,b) => (b.pontuacao || 0) - (a.pontuacao || 0)).slice(0,5);
  const atletasFora = atletas.filter(a => a.clube_id === foraId && (a.entrou_em_campo !== false)).sort((a,b) => (b.pontuacao || 0) - (a.pontuacao || 0)).slice(0,5);
  const renderLista = (lista) => {
    if (lista.length === 0) return `<div class="text-center py-2 text-gray-400 text-[10px] font-jogos">Nenhum atleta em campo</div>`;
    return lista.map(a => `
      <div class="flex justify-between items-center py-1 border-b border-gray-50">
        <span class="text-[11px] font-bold font-jersey truncate">${a.apelido}</span>
        <span class="text-[11px] font-black font-jersey ${(a.pontuacao || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}">${(a.pontuacao || 0).toFixed(1)}</span>
      </div>
    `).join("");
  };
  return `
    <div class="grid grid-cols-2 gap-4">
      <div><p class="text-center font-black text-[10px] uppercase mb-2 font-jersey">${casaNome}</p>${renderLista(atletasCasa)}</div>
      <div><p class="text-center font-black text-[10px] uppercase mb-2 font-jersey">${foraNome}</p>${renderLista(atletasFora)}</div>
    </div>
  `;
}

async function carregarRodada(rodada) {
  if (jogosRenderizando) return;
  jogosRenderizando = true;
  carregarJogosLoader();
  try {
    const { partidas: novasPartidas, clubes: novosClubes } = await buscarPartidas(rodada);
    let novosPontuados = {};
    const rodadaAtualAPI = mercadoStatus.rodada_atual;
    novosPontuados = await buscarPontuados(rodada, rodadaAtualAPI);
    
    currentPartidas = novasPartidas;
    currentClubes = novosClubes;
    currentPontuados = novosPontuados;
    currentRodada = rodada;

    const main = document.getElementById("main-content");
    const seletorHtml = renderSeletorRodada(rodada, maxRodadaGlobal);
    const statusHtml = renderStatusMercado(mercadoStatus);
    const cardsHtml = currentPartidas.map(p => renderCardPartida(p, rodada, rodadaAtualAPI)).join("");
    main.innerHTML = `${statusHtml}${seletorHtml}<section class="px-4">${cardsHtml}</section>`;
  } catch (err) {
    console.error(err);
    carregarJogosError(`Erro ao carregar rodada ${rodada}: ${err.message}`);
    setTimeout(() => window.carregarJogos(), 2000);
  } finally {
    jogosRenderizando = false;
  }
}

function setupGlobalDelegation() {
  const main = document.getElementById("main-content");
  if (!main) return;

  main.removeEventListener('click', window.globalClickHandler);
  
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
          btn.innerHTML = '▲ ESCONDER TOP 5';
        }
      } else {
        container.classList.add('hidden');
        btn.innerHTML = '▼ MOSTRAR TOP 5';
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
  window.globalClickHandler = clickHandler;
}

// ========== FUNÇÃO PRINCIPAL ==========
window.carregarJogos = async function() {
  if (jogosRenderizando) return;
  jogosRenderizando = true;
  carregarJogosLoader();

  try {
    const resMerc = await fetch(`${JOGOS_PROXY_URL}/mercado/status`);
    if (!resMerc.ok) throw new Error(`Status API: ${resMerc.status}`);
    mercadoStatus = await resMerc.json();
    const rodadaAtualAPI = mercadoStatus.rodada_atual;
    maxRodadaGlobal = rodadaAtualAPI || 38;

    let rodadaSelecionada = rodadaAtualAPI;
    
    const { partidas, clubes } = await buscarPartidas(rodadaSelecionada);
    
    let pontuados = await buscarPontuados(rodadaSelecionada, rodadaAtualAPI);

    currentPartidas = partidas;
    currentClubes = clubes;
    currentPontuados = pontuados;
    currentRodada = rodadaSelecionada;

    const main = document.getElementById("main-content");
    const seletorHtml = renderSeletorRodada(rodadaSelecionada, maxRodadaGlobal);
    const statusHtml = renderStatusMercado(mercadoStatus);
    const cardsHtml = partidas.map(p => renderCardPartida(p, rodadaSelecionada, rodadaAtualAPI)).join("");
    main.innerHTML = `${statusHtml}${seletorHtml}<section class="px-4">${cardsHtml}</section>`;

    setupGlobalDelegation();
  } catch(err) {
    console.error(err);
    carregarJogosError(err.message || "Falha ao carregar dados");
  } finally {
    jogosRenderizando = false;
  }
};

console.log("✅ jogos.js carregado – com fonte Jersey, scouts em tempo real e valorização");
