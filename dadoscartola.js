/* ============================================================
   DADOS CARTOLA — MOTOR ANALÍTICO
   ============================================================ */

window.analiseState = {
    rodadaAtual: 1,
    partidas: [],
    scoutSelecionado: 'GOL',
    posicaoSelecionada: 'GERAL',
    ultimasRodadas: 5
};

/* ============================================================
   CONFIG
   ============================================================ */

const ANALISE_PROXY = 'https://proxy-f5nr.onrender.com';

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

const POSICOES_VALIDAS = ['GERAL', 'GOL', 'ZAG', 'LAT', 'MEI', 'ATA'];

/* ============================================================
   RENDER PRINCIPAL
   ============================================================ */

window.renderAnaliseCartola = async function () {

    const main = document.getElementById('main-content');

    if (!main) return;

    main.innerHTML = `

        <div class="max-w-7xl mx-auto space-y-6">

            <!-- HEADER -->
            <div class="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8">

                <div class="flex items-center gap-5 mb-8">

                    <div class="w-20 h-20 rounded-[28px] bg-orange-50 flex items-center justify-center text-orange-500 border border-orange-100">

                        <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 3v18h18"/>
                            <path d="M7 14l3-3 3 2 4-5"/>
                            <circle cx="7" cy="14" r="1" fill="currentColor"/>
                            <circle cx="10" cy="11" r="1" fill="currentColor"/>
                            <circle cx="13" cy="13" r="1" fill="currentColor"/>
                            <circle cx="17" cy="8" r="1" fill="currentColor"/>
                        </svg>

                    </div>

                    <div>
                        <h1 class="font-jersey text-5xl text-slate-800 leading-none">
                            ANÁLISE
                        </h1>

                        <p class="font-jogos text-xs tracking-[0.35em] text-slate-400 uppercase mt-2">
                            SCOUTS CEDIDOS
                        </p>
                    </div>

                </div>

                <!-- CONTROLES -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-5">

                    <!-- SCOUT -->
                    <div>
                        <label class="block text-[10px] font-jogos tracking-[0.25em] text-slate-400 uppercase mb-2">
                            Scout
                        </label>

                        <select id="select-scout"
                                onchange="window.handleScoutChange(this.value)"
                                class="w-full h-14 rounded-2xl border border-slate-200 bg-slate-50 px-5 font-black text-slate-700 outline-none focus:border-orange-400">

                            <option value="GOL">GOL</option>
                            <option value="ASSISTENCIA">ASSISTENCIA</option>
                            <option value="FINALIZACAO">FINALIZAÇÃO</option>
                            <option value="DESARMES">DESARMES</option>
                            <option value="SG">SG</option>
                            <option value="DEFESAS">DEFESAS</option>
                            <option value="FALTAS">FALTAS</option>
                            <option value="PONTUACAO">PONTUAÇÃO</option>

                        </select>
                    </div>

                    <!-- POSICAO -->
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
                    <div>

                        <div class="flex items-center justify-between mb-2">
                            <label class="text-[10px] font-jogos tracking-[0.25em] text-slate-400 uppercase">
                                Últimas Rodadas
                            </label>

                            <span id="range-value" class="text-sm font-black text-orange-600">
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

/* ============================================================
   HELPERS
   ============================================================ */

function getShield(teamId) {
    return `images/escudos_brasileirao/${teamId}.png`;
}

function obterScoutCedidos(clubeId, scout, posicao, ultimasRodadas) {

    if (!window.dadosCartola?.times) return 0;

    const scoutsAlvo = SCOUTS_MAP[scout] || [];

    let total = 0;
    let partidasContadas = 0;

    Object.values(window.dadosCartola.times).forEach(partidas => {

        partidas.forEach(partida => {

            if (partida.id_adv !== clubeId) return;

            if (partida.rodada >= analiseState.rodadaAtual) return;

            partidasContadas++;

            partida.atletas.forEach(atleta => {

                if (posicao !== 'GERAL' && atleta.pos !== posicao) {
                    return;
                }

                scoutsAlvo.forEach(sc => {

                    if (scout === 'SG') {

                        if (Number(atleta[sc]) > 0) {
                            total += 1;
                        }

                    } else {

                        total += Number(atleta[sc] || 0);

                    }

                });

            });

        });

    });

    if (partidasContadas === 0) return 0;

    return (total / ultimasRodadas).toFixed(2);
}

/* ============================================================
   RENDER TABELA
   ============================================================ */

function renderTabelaCedidos() {

    const container = document.getElementById('analise-tabela');

    if (!container) return;

    const partidas = analiseState.partidas;

    container.innerHTML = `

        <div class="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">

            <div class="px-8 py-6 border-b border-slate-100 flex items-center justify-between">

                <div>
                    <h2 class="font-jersey text-4xl text-slate-800 leading-none">
                        SCOUTS CEDIDOS
                    </h2>

                    <p class="font-jogos text-[10px] tracking-[0.25em] text-slate-400 uppercase mt-2">
                        MÉDIA DAS ÚLTIMAS ${analiseState.ultimasRodadas} RODADAS
                    </p>
                </div>

            </div>

            <div class="overflow-x-auto">

                <table class="w-full min-w-[900px]">

                    <thead>
                        <tr class="border-b border-slate-100 bg-slate-50">

                            <th class="px-6 py-5 text-left text-[10px] font-jogos tracking-[0.2em] text-slate-400 uppercase">
                                Mandante
                            </th>

                            <th class="px-6 py-5 text-center text-[10px] font-jogos tracking-[0.2em] text-slate-400 uppercase">
                                Cedidos
                            </th>

                            <th class="px-6 py-5 text-center text-[10px] font-jogos tracking-[0.2em] text-slate-400 uppercase">
                                Scout
                            </th>

                            <th class="px-6 py-5 text-center text-[10px] font-jogos tracking-[0.2em] text-slate-400 uppercase">
                                Cedidos
                            </th>

                            <th class="px-6 py-5 text-right text-[10px] font-jogos tracking-[0.2em] text-slate-400 uppercase">
                                Visitante
                            </th>

                        </tr>
                    </thead>

                    <tbody>

                        ${partidas.map(match => {

                            const cedidosCasa = obterScoutCedidos(
                                match.clube_visitante_id,
                                analiseState.scoutSelecionado,
                                analiseState.posicaoSelecionada,
                                analiseState.ultimasRodadas
                            );

                            const cedidosFora = obterScoutCedidos(
                                match.clube_casa_id,
                                analiseState.scoutSelecionado,
                                analiseState.posicaoSelecionada,
                                analiseState.ultimasRodadas
                            );

                            return `

                                <tr class="border-b border-slate-50 hover:bg-orange-50/40 transition-all">

                                    <td class="px-6 py-5">

                                        <div class="flex items-center gap-4">

                                            <img src="${getShield(match.clube_casa_id)}"
                                                 class="w-12 h-12 object-contain">

                                            <div>
                                                <p class="font-black text-slate-800 text-sm uppercase">
                                                    ${match.clube_casa_nome}
                                                </p>
                                            </div>

                                        </div>

                                    </td>

                                    <td class="px-6 py-5 text-center">

                                        <div class="inline-flex items-center justify-center min-w-[90px] h-14 rounded-2xl bg-orange-50 border border-orange-100 text-orange-700 font-black text-2xl shadow-sm">
                                            ${cedidosCasa}
                                        </div>

                                    </td>

                                    <td class="px-6 py-5 text-center">

                                        <span class="font-jogos text-xs tracking-[0.2em] text-slate-400 uppercase">
                                            ${analiseState.scoutSelecionado}
                                        </span>

                                    </td>

                                    <td class="px-6 py-5 text-center">

                                        <div class="inline-flex items-center justify-center min-w-[90px] h-14 rounded-2xl bg-orange-50 border border-orange-100 text-orange-700 font-black text-2xl shadow-sm">
                                            ${cedidosFora}
                                        </div>

                                    </td>

                                    <td class="px-6 py-5">

                                        <div class="flex items-center justify-end gap-4">

                                            <div class="text-right">
                                                <p class="font-black text-slate-800 text-sm uppercase">
                                                    ${match.clube_visitante_nome}
                                                </p>
                                            </div>

                                            <img src="${getShield(match.clube_visitante_id)}"
                                                 class="w-12 h-12 object-contain">

                                        </div>

                                    </td>

                                </tr>

                            `;

                        }).join('')}

                    </tbody>

                </table>

            </div>

        </div>

    `;
}
```
