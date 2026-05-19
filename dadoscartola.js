/* ============================================================
   DADOS CARTOLA — MOTOR ANALÍTICO
   ============================================================ */

window.analiseState = {
    rodadaAtual: 1,
    partidas: [],
    scoutSelecionado: 'GOL',
    posicaoSelecionada: 'GERAL',
    ultimasRodadas: 5,
    modoAnalise: 'GERAL'
};

/* ============================================================
   CONFIG
   ============================================================ */

const ANALISE_PROXY = 'https://proxy-f5nr.onrender.com';

const CLUBES = {
    262: 'FLA',
    263: 'BOT',
    264: 'COR',
    265: 'BAH',
    266: 'FLU',
    267: 'VAS',
    275: 'PAL',
    276: 'SAO',
    277: 'SAN',
    282: 'CAM',
    284: 'GRE',
    285: 'INT',
    290: 'GOI',
    293: 'CAP',
    294: 'CFC',
    327: 'RBB',
    356: 'JUV',
    373: 'CRI',
    1371: 'VIT'
};

const SCOUTS_MAP = {
    GOL: ['G'],
    ASSISTENCIA: ['A'],
    FINALIZACAO: ['FF', 'FD', 'FT'],
    DESARMES: ['DS'],
    SG: ['SG'],
    DEFESAS: ['DE'],
    FALTAS: ['FC'],
    PONTUACAO: ['pontuacao']
};

/* ============================================================
   RENDER PRINCIPAL
   ============================================================ */

window.renderAnaliseCartola = async function () {

    const main = document.getElementById('main-content');

    if (!main) return;

    main.innerHTML = `

        <div class="max-w-[1800px] mx-auto space-y-6">

            <!-- HEADER -->
            <div class="bg-white rounded-[40px] border border-slate-100 shadow-sm p-5 md:p-8">

                <div class="flex items-center gap-5 mb-8">

                    <div class="w-20 h-20 rounded-[28px] bg-orange-50 flex items-center justify-center text-orange-500 border border-orange-100 shrink-0">

                        <svg xmlns="http://www.w3.org/2000/svg"
                             width="42"
                             height="42"
                             viewBox="0 0 24 24"
                             fill="none"
                             stroke="currentColor"
                             stroke-width="2.4"
                             stroke-linecap="round"
                             stroke-linejoin="round">

                            <path d="M3 3v18h18"/>
                            <path d="M7 14l3-3 3 2 4-5"/>
                            <circle cx="7" cy="14" r="1" fill="currentColor"/>
                            <circle cx="10" cy="11" r="1" fill="currentColor"/>
                            <circle cx="13" cy="13" r="1" fill="currentColor"/>
                            <circle cx="17" cy="8" r="1" fill="currentColor"/>

                        </svg>

                    </div>

                    <div class="min-w-0">

                        <h1 class="font-jersey text-4xl md:text-5xl text-slate-800 leading-none">
                            ANÁLISE
                        </h1>

                        <p class="font-jogos text-[10px] md:text-xs tracking-[0.35em] text-slate-400 uppercase mt-2">
                            SCOUTS CEDIDOS
                        </p>

                    </div>

                </div>

                <!-- CONTROLES -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

                    <!-- SCOUT -->
                    <div>

                        <label class="block text-[10px] font-jogos tracking-[0.25em] text-slate-400 uppercase mb-2">
                            Scout
                        </label>

                        <select id="select-scout"
                                onchange="window.handleScoutChange(this.value)"
                                class="w-full h-14 rounded-2xl border border-slate-200 bg-slate-50 px-5 font-black text-slate-700 outline-none focus:border-orange-400">

                            <option value="GOL">GOL</option>
                            <option value="ASSISTENCIA">ASSISTÊNCIA</option>
                            <option value="FINALIZACAO">FINALIZAÇÃO</option>
                            <option value="DESARMES">DESARMES</option>
                            <option value="SG">SG</option>
                            <option value="DEFESAS">DEFESAS</option>
                            <option value="FALTAS">FALTAS</option>
                            <option value="PONTUACAO">PONTUAÇÃO</option>

                        </select>

                    </div>

                    <!-- POSIÇÃO -->
                    <div>

                        <label class="block text-[10px] font-jogos tracking-[0.25em] text-slate-400 uppercase mb-2">
                            Posição
                        </label>

                        <select id="select-posicao"
                                onchange="window.handlePosicaoChange(this.value)"
                                class="w-full h-14 rounded-2xl border border-slate-200 bg-slate-50 px-5 font-black text-slate-700 outline-none focus:border-orange-400">

                            <option value="GERAL">GERAL</option>
                            <option value="GOL">GOL</option>
                            <option value="ZAG">ZAG</option>
                            <option value="LAT">LAT</option>
                            <option value="MEI">MEI</option>
                            <option value="ATA">ATA</option>

                        </select>

                    </div>

                    <!-- RODADAS -->
                    <div class="space-y-4">

                        <div class="flex items-center justify-between">

                            <label class="text-[10px] font-jogos tracking-[0.25em] text-slate-400 uppercase">
                                Últimas Rodadas
                            </label>

                            <span id="range-value"
                                  class="text-sm font-black text-orange-600">
                                5
                            </span>

                        </div>

                        <input type="range"
                               id="range-rodadas"
                               min="1"
                               max="5"
                               value="5"
                               onchange="window.handleRangeChange(this.value)"
                               class="w-full accent-orange-500 cursor-pointer">

                        <div class="flex gap-3 pt-2">

                            <button onclick="window.handleModoAnalise('GERAL')"
                                    id="btn-geral"
                                    class="flex-1 h-11 rounded-2xl bg-orange-500 text-white font-black text-sm transition-all">
                                GERAL
                            </button>

                            <button onclick="window.handleModoAnalise('MANDO')"
                                    id="btn-mando"
                                    class="flex-1 h-11 rounded-2xl bg-slate-100 text-slate-400 font-black text-sm transition-all">
                                MANDO
                            </button>

                        </div>

                    </div>

                </div>

            </div>

            <!-- TABELA -->
            <div id="analise-tabela"></div>

        </div>

    `;

    await carregarAnaliseCedidos();

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
};

/* ============================================================
   CARREGAR DADOS
   ============================================================ */

async function carregarAnaliseCedidos() {

    try {

        const statusRes = await fetch(`${ANALISE_PROXY}/mercado/status`);
        const statusData = await statusRes.json();

        analiseState.rodadaAtual = statusData.rodada_atual;

        const rodadaAnalise = analiseState.rodadaAtual - 1;

        analiseState.ultimasRodadas = Math.min(5, rodadaAnalise);

        const range = document.getElementById('range-rodadas');
        const rangeValue = document.getElementById('range-value');

        if (range) {
            range.max = rodadaAnalise;
            range.value = analiseState.ultimasRodadas;
        }

        if (rangeValue) {
            rangeValue.innerText = analiseState.ultimasRodadas;
        }

        const partidasRes = await fetch(`${ANALISE_PROXY}/partidas/${analiseState.rodadaAtual}`);
        const partidasData = await partidasRes.json();

        analiseState.partidas = partidasData.partidas || [];

        renderTabelaCedidos();

    } catch (err) {

        console.error(err);

    }
}

/* ============================================================
   EVENTOS
   ============================================================ */

window.handleScoutChange = function(valor) {

    analiseState.scoutSelecionado = valor;

    renderTabelaCedidos();
};

window.handlePosicaoChange = function(valor) {

    analiseState.posicaoSelecionada = valor;

    renderTabelaCedidos();
};

window.handleRangeChange = function(valor) {

    analiseState.ultimasRodadas = parseInt(valor);

    const rangeValue = document.getElementById('range-value');

    if (rangeValue) {
        rangeValue.innerText = valor;
    }

    renderTabelaCedidos();
};

window.handleModoAnalise = function(modo) {

    analiseState.modoAnalise = modo;

    const btnGeral = document.getElementById('btn-geral');
    const btnMando = document.getElementById('btn-mando');

    if (modo === 'GERAL') {

        btnGeral.className =
            'flex-1 h-11 rounded-2xl bg-orange-500 text-white font-black text-sm transition-all';

        btnMando.className =
            'flex-1 h-11 rounded-2xl bg-slate-100 text-slate-400 font-black text-sm transition-all';

    } else {

        btnMando.className =
            'flex-1 h-11 rounded-2xl bg-orange-500 text-white font-black text-sm transition-all';

        btnGeral.className =
            'flex-1 h-11 rounded-2xl bg-slate-100 text-slate-400 font-black text-sm transition-all';
    }

    renderTabelaCedidos();
};

/* ============================================================
   HELPERS
   ============================================================ */

function getShield(teamId) {
    return `images/escudos_brasileirao/${teamId}.png`;
}

function getTeamName(teamId) {

    return CLUBES[teamId] || 'TIME';
}

/* ============================================================
   ANALISE SCOUTS CEDIDOS
   ============================================================ */

function obterScoutCedidos(clubeId, scout, posicao, ultimasRodadas, tipoMando) {

    if (!window.dadosCartola || !window.dadosCartola.times) {
        return '0.00';
    }

    const scoutsAlvo = SCOUTS_MAP[scout] || [];

    let total = 0;
    let partidasValidas = [];

    Object.values(window.dadosCartola.times).forEach(partidas => {

        partidas.forEach(partida => {

            if (partida.id_adv !== clubeId) return;

            if (partida.rodada >= analiseState.rodadaAtual) return;

            if (analiseState.modoAnalise === 'MANDO') {

                if (tipoMando === 'CASA' && partida.mando !== 'CASA') {
                    return;
                }

                if (tipoMando === 'FORA' && partida.mando !== 'FORA') {
                    return;
                }

            }

            partidasValidas.push(partida);

        });

    });

    partidasValidas = partidasValidas
        .sort((a, b) => b.rodada - a.rodada)
        .slice(0, ultimasRodadas);

    partidasValidas.forEach(partida => {

        if (scout === 'SG') {

            const teveSG = partida.atletas.some(a => Number(a.SG) > 0);

            if (teveSG) {
                total += 1;
            }

            return;
        }

        partida.atletas.forEach(atleta => {

            if (posicao !== 'GERAL' && atleta.pos !== posicao) {
                return;
            }

            scoutsAlvo.forEach(sc => {
                total += Number(atleta[sc] || 0);
            });

        });

    });

    if (partidasValidas.length === 0) return '0.00';

    return (total / partidasValidas.length).toFixed(2);
}

/* ============================================================
   RENDER TABELA
   ============================================================ */

function renderTabelaCedidos() {

    const container = document.getElementById('analise-tabela');

    if (!container) return;

    const partidas = analiseState.partidas;

    container.innerHTML = `

        <div class="grid grid-cols-1 xl:grid-cols-2 gap-5">

            ${partidas.map(match => {

                const cedidosCasa = obterScoutCedidos(
                    match.clube_casa_id,
                    analiseState.scoutSelecionado,
                    analiseState.posicaoSelecionada,
                    analiseState.ultimasRodadas,
                    'CASA'
                );

                const cedidosFora = obterScoutCedidos(
                    match.clube_visitante_id,
                    analiseState.scoutSelecionado,
                    analiseState.posicaoSelecionada,
                    analiseState.ultimasRodadas,
                    'FORA'
                );

                return `

                    <div class="bg-white rounded-[34px] border border-slate-100 shadow-sm p-5 md:p-7 hover:shadow-xl transition-all">

                        <div class="flex items-center justify-between gap-4">

                            <!-- CASA -->
                            <div class="flex flex-col items-center gap-4 flex-1 min-w-0">

                                <img src="${getShield(match.clube_casa_id)}"
                                     class="w-16 h-16 md:w-20 md:h-20 object-contain">

                                <p class="font-black text-slate-800 text-lg uppercase tracking-tight">
                                    ${getTeamName(match.clube_casa_id)}
                                </p>

                                <div class="inline-flex items-center justify-center min-w-[100px] h-16 rounded-3xl bg-orange-50 border border-orange-100 text-orange-700 font-black text-3xl shadow-sm px-5">
                                    ${cedidosCasa}
                                </div>

                            </div>

                            <!-- X -->
                            <div class="flex items-center justify-center">

                                <div class="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">

                                    <span class="font-jogos text-lg text-slate-300">
                                        X
                                    </span>

                                </div>

                            </div>

                            <!-- FORA -->
                            <div class="flex flex-col items-center gap-4 flex-1 min-w-0">

                                <img src="${getShield(match.clube_visitante_id)}"
                                     class="w-16 h-16 md:w-20 md:h-20 object-contain">

                                <p class="font-black text-slate-800 text-lg uppercase tracking-tight">
                                    ${getTeamName(match.clube_visitante_id)}
                                </p>

                                <div class="inline-flex items-center justify-center min-w-[100px] h-16 rounded-3xl bg-orange-50 border border-orange-100 text-orange-700 font-black text-3xl shadow-sm px-5">
                                    ${cedidosFora}
                                </div>

                            </div>

                        </div>

                    </div>

                `;

            }).join('')}

        </div>

    `;
}
