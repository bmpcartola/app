/* ============================================================
   JOSABET
   ============================================================ */

const API_URL = "https://raw.githubusercontent.com/bmpcartola/app/main/bd/cartola.json";

let bmpData = null;
let bmpState = {
    activeSerie: "A", // "A" or "B"
    selectedRound: 1,
    selectedTeam: null, // Team Name
    viewMode: "campo", // "campo", "tabela" or "provaveis"
    activeProvaveis: false
};

const PROXY_URL = 'https://proxy-f5nr.onrender.com';
const API_CARTOLA = {
    MERCADO_STATUS: "https://api.cartola.globo.com/mercado/status",
    PARTIDAS: "https://api.cartola.globo.com/partidas"
};

const SLUG_TO_CARTOLA_ID = {
    corinthians_v2: 264, palmeiras_v2: 275, flamengo_v2: 262, vasco_v2: 267,
    'atletico-mg_v2': 282, cruzeiro_v2: 283, gremio_v2: 284, internacional_v2: 285,
    botafogo_v2: 263, fluminense_v2: 266, 'sao-paulo_v2': 276, santos_v2: 277,
    bragantino_v2: 280, 'athletico-pr_v2': 293, bahia_v2: 265, vitoria_v2: 287,
    mirassol_v2: 2305, chapecoense_v2: 315, coritiba_v2: 294, remo_v2: 364,
};

let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    renderApp(); 
});

window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    renderApp();
});

async function installApp() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
        deferredPrompt = null;
    }
    renderApp();
}

// ========== DATA FETCHING ==========

async function fetchBmpData() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Erro ao carregar dados da API");
        
        // Convert response to ArrayBuffer to handle encoding manually
        const buf = await response.arrayBuffer();
        // Decode using ISO-8859-1 which is common for these cartola data sources
        const decoder = new TextDecoder("iso-8859-1");
        const text = decoder.decode(buf);
        
        bmpData = JSON.parse(text);
        
        // Initialize state with max round
        bmpState.selectedRound = getMaxRound();
        renderApp();
    } catch (error) {
        console.error("❌ Error fetching data:", error);
        renderError(error.message);
    }
}

// ========== DATA UTILS ==========

function getTeamEscudo(team) {
    if (!team) return '';
    
    // 1. Prioridade: URL direta da API
    if (team.escudo && typeof team.escudo === 'string' && team.escudo.startsWith('http')) {
        return encodeURI(team.escudo.trim());
    }
    
    // 2. Se não tem escudo na API ou falhou, tenta construir a URL baseada no nome (padrão GitHub do usuário)
    const name = (team.nome || '').trim();
    if (!name) return '';
    
    const GITHUB_BASE_ESCUDOS = "https://raw.githubusercontent.com/bmpcartola/app/main/images/escudos_bmp/";
    return encodeURI(`${GITHUB_BASE_ESCUDOS}${name}.png`);
}

function getLeaderImage(team) {
    if (!team) return '';
    const name = (team.nome || '').trim();
    return encodeURI(`images/lider/${name}.png`);
}

function getGarconImage(team) {
    if (!team) return '';
    const name = (team.nome || '').trim();
    return encodeURI(`images/garcons/${name}.png`);
}

function getSerieData() {
    if (!bmpData) return [];
    return bmpState.activeSerie === "A" ? bmpData.serieA : bmpData.serieB;
}

function getMaxRound() {
    const serieData = getSerieData();
    if (!serieData || serieData.length === 0) return 1;
    let max = 1;
    serieData.forEach(team => {
        team.rodadas.forEach(round => {
            if (round.rdd > max) max = round.rdd;
        });
    });
    return max;
}

function getRanking(round) {
    const serieData = getSerieData();
    if (!serieData) return [];

    const ranking = serieData.map(team => {
        let totalPoints = 0;
        let roundScore = 0;
        let lastRoundData = null;

        team.rodadas.forEach(r => {
            const score = (r.val || 0) + (r.re || 0) - (r.pen || 0);
            if (r.rdd <= round) {
                totalPoints += score;
            }
            if (r.rdd === round) {
                roundScore = score;
                lastRoundData = r;
            }
        });

        return {
            nome: team.nome,
            escudo: team.escudo,
            pontos: totalPoints,
            roundScore: roundScore,
            roundData: lastRoundData
        };
    });

    return ranking.sort((a, b) => b.pontos - a.pontos);
}

// ========== RENDERING ==========

function toggleSidebar(force) {
    const sidebar = document.getElementById("sidebar-menu");
    const toggleBtn = document.getElementById("sidebar-toggle");
    const backdrop = document.getElementById("sidebar-backdrop");
    if (!sidebar) return;

    const isOpen = sidebar.style.left === "0px";
    const nextState = force !== undefined ? force : !isOpen;

    if (nextState) {
        renderSidebar();
        sidebar.style.left = "0px";
        if (toggleBtn) {
            toggleBtn.style.opacity = "0";
            toggleBtn.style.pointerEvents = "none";
        }
        if (backdrop) {
            backdrop.style.opacity = "1";
            backdrop.style.pointerEvents = "auto";
        }
    } else {
        sidebar.style.left = "-200px";
        if (toggleBtn) {
            toggleBtn.style.opacity = "1";
            toggleBtn.style.pointerEvents = "auto";
        }
        if (backdrop) {
            backdrop.style.opacity = "0";
            backdrop.style.pointerEvents = "none";
        }
    }
}

// Scroll listener
window.addEventListener("scroll", () => {
    const topBtn = document.getElementById("scroll-to-top");
    if (!topBtn) return;
    if (window.scrollY > 400) {
        topBtn.style.opacity = "1";
        topBtn.style.pointerEvents = "auto";
    } else {
        topBtn.style.opacity = "0";
        topBtn.style.pointerEvents = "none";
    }
});

function renderApp() {
    renderHeaderControls();
    renderSidebar();
    renderContent();
    if (typeof lucide !== "undefined") lucide.createIcons();
}

function renderSidebar() {
    const sidebar = document.getElementById("sidebar-menu");
    if (!sidebar) return;

    const btnClass = "flex flex-col items-center gap-2.5 group w-full px-4 py-2 transition-all hover:scale-110 active:scale-95";
    const iconBase = "w-16 h-16 rounded-[28px] flex items-center justify-center transition-all shadow-lg border-2 border-transparent";
    const activeIcon = "bg-orange-600 text-white shadow-2xl shadow-orange-600/40 border-orange-400 ring-4 ring-orange-50";
    const inactiveIcon = "bg-slate-50 text-slate-400 border-slate-200 group-hover:bg-orange-50 group-hover:text-orange-600 group-hover:border-orange-100";
    const labelBase = "text-[12px] font-black font-jogos uppercase text-center tracking-tight transition-all";

    sidebar.innerHTML = `
        <div class="flex flex-col items-center justify-between h-full py-20 w-full">
            <div class="flex flex-col items-center gap-14 w-full">
                <!-- JOSA.BET -->
                <button onclick="bmpSetViewMode('campo'); toggleSidebar(false);" class="${btnClass}">
                    <div class="${iconBase} ${bmpState.viewMode === 'campo' ? activeIcon : inactiveIcon}">
                        <i data-lucide="layout-grid" class="w-9 h-9"></i>
                    </div>
                    <span class="${labelBase} ${bmpState.viewMode === 'campo' ? 'text-orange-600' : 'text-slate-400 opacity-60'}">JOSA.BET</span>
                </button>

                <!-- PROVÁVEIS -->
                <button id="nav-provaveis" onclick="bmpSetViewMode('provaveis'); toggleSidebar(false);" class="${btnClass}">
                    <div class="${iconBase} ${bmpState.viewMode === 'provaveis' ? activeIcon : inactiveIcon}">
                        <i data-lucide="users" class="w-9 h-9"></i>
                    </div>
                    <span class="${labelBase} ${bmpState.viewMode === 'provaveis' ? 'text-orange-600' : 'text-slate-400 opacity-60'}">PROVÁVEIS</span>
                </button>

                ${deferredPrompt ? `
                    <!-- INSTALAR -->
                    <button onclick="installApp(); toggleSidebar(false);" class="${btnClass}">
                        <div class="w-16 h-16 rounded-[28px] bg-orange-700 text-white flex items-center justify-center shadow-2xl">
                            <i data-lucide="download" class="w-9 h-9"></i>
                        </div>
                        <span class="${labelBase} text-orange-700">INSTALAR</span>
                    </button>
                ` : ''}
            </div>

            <div class="mt-auto w-full flex flex-col items-center gap-8">
               <!-- JOGOS (BOLA) -->
               <button onclick="bmpSetViewMode('jogos'); toggleSidebar(false);" class="${btnClass}">
                   <div class="${iconBase} ${bmpState.viewMode === 'jogos' ? activeIcon : 'bg-white text-slate-300 border border-slate-100 group-hover:bg-slate-100 group-hover:text-slate-500'}">
                       <i data-lucide="futbol" class="w-9 h-9"></i>
                   </div>
                   <span class="${labelBase} ${bmpState.viewMode === 'jogos' ? 'text-orange-600' : 'text-slate-400 opacity-60'}">JOGOS</span>
               </button>

                <div class="flex flex-col items-center opacity-40 hover:opacity-100 transition-all pb-8 group/brand">
                    <div class="p-5 bg-orange-50 rounded-full mb-3 group-hover/brand:scale-110 transition-transform">
                        <i data-lucide="trophy" class="w-12 h-12 text-orange-800"></i>
                    </div>
                    <p class="text-[12px] font-black font-jogos text-orange-950 uppercase tracking-widest text-center mt-2 leading-tight">TAÇA<br>BMP</p>
                    <div class="w-12 h-1 bg-orange-200 rounded-full mt-2"></div>
                </div>
            </div>
        </div>
    `;
    if (typeof lucide !== "undefined") lucide.createIcons();
}

function renderHeaderControls() {
    const headerControls = document.getElementById("header-controls");
    if (!headerControls) return;

    // Se estiver no modo JOGOS, esconde os controles
    if (bmpState.viewMode === "jogos") {
        headerControls.innerHTML = "";
        return;
    }

    if (bmpState.viewMode === "provaveis") {
        headerControls.innerHTML = "";
        return;
    }

    const maxRound = getMaxRound();
    const rounds = Array.from({ length: maxRound }, (_, i) => i + 1).reverse();

    headerControls.innerHTML = `
        <div class="flex items-center gap-2 md:gap-3">
            <div class="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button onclick="bmpSetSerie('A')" class="px-4 py-1.5 rounded-lg text-[10px] font-jogos transition-all ${bmpState.activeSerie === 'A' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500'}">SÉRIE A</button>
                <button onclick="bmpSetSerie('B')" class="px-4 py-1.5 rounded-lg text-[10px] font-jogos transition-all ${bmpState.activeSerie === 'B' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500'}">SÉRIE B</button>
            </div>

            <select onchange="bmpSetRound(this.value)" class="bg-white border border-slate-200 text-slate-700 text-[10px] font-jogos px-4 py-2 rounded-xl focus:outline-none focus:border-orange-400 transition-colors shadow-sm">
                ${rounds.map(r => `<option value="${r}" ${bmpState.selectedRound === r ? 'selected' : ''}>RDD ${r}</option>`).join("")}
            </select>
        </div>
    `;
    if (typeof lucide !== "undefined") lucide.createIcons();
}

function renderContent() {
    const main = document.getElementById("main-content");
    if (!main) return;

    if (bmpState.selectedTeam) {
        renderTeamDetail(main);
        return;
    }

    if (bmpState.viewMode === "provaveis") {
        if (window.renderProvaveis) {
            window.renderProvaveis();
        }
        return;
    }

    const ranking = getRanking(bmpState.selectedRound);
    
    if (ranking.length === 0) {
        main.innerHTML = `<div class="text-center py-20 text-gray-500 font-jogos tracking-widest uppercase">Sem dados disponíveis</div>`;
        return;
    }

    main.innerHTML = `
        <div class="space-y-12 max-w-5xl mx-auto">
            ${renderPodium(ranking)}
            
            <div class="space-y-12">
                <div class="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    ${renderField(ranking)}
                </div>

                <div class="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                    ${renderTable(ranking)}
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                    ${renderBottomCards(ranking)}
                </div>
            </div>
        </div>
    `;
}

function renderPodium(ranking) {
    const leader = ranking[0];
    return `
        <div class="relative p-6 md:p-8 bg-white rounded-[40px] border border-slate-100 overflow-hidden group shadow-sm">
            <div class="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-50"></div>
            <div class="absolute -right-10 -bottom-10 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl group-hover:bg-orange-500/10 transition-all duration-700"></div>
            
            <!-- Golden Crown -->
            <div class="absolute top-0 right-0 p-6 md:p-8">
                <i data-lucide="crown" class="w-16 h-16 text-yellow-500/10 group-hover:text-yellow-500 group-hover:scale-110 transition-all drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]"></i>
            </div>

            <div class="relative z-10 flex flex-col md:flex-row items-center gap-4 md:gap-8">
                <div class="relative cursor-pointer" onclick="bmpSelectTeam('${leader.nome}')">
                    <div class="absolute -inset-4 bg-orange-400/10 rounded-full blur-2xl animate-pulse"></div>
                    <img src="${getLeaderImage(leader)}" class="w-48 h-48 md:w-64 md:h-64 object-contain relative z-10 drop-shadow-[0_10px_20px_rgba(255,99,33,0.1)] transition-transform duration-500 hover:scale-110" onerror="this.onerror=null; this.style.opacity='0.5';">
                </div>
                
                <div class="text-center md:text-left">
                    <h2 class="text-6xl md:text-8xl font-jersey text-slate-800 mb-0 tracking-tight leading-none">${leader.nome}</h2>
                    <div class="flex items-baseline justify-center md:justify-start gap-2 -mt-2">
                        <span class="text-4xl font-mono font-black text-orange-500 font-bold">${leader.pontos.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderField(ranking) {
    const top10 = ranking.slice(0, 10);
    const lastTeam = ranking[ranking.length - 1];
    
    const pos = [
        { t: 15, l: 50 }, // 1º
        { t: 25, l: 20 }, // 2º
        { t: 25, l: 80 }, // 3º
        { t: 42, l: 50 }, // 4º
        { t: 48, l: 15 }, // 5º
        { t: 48, l: 85 }, // 6º
        { t: 65, l: 55 }, // 7º
        { t: 72, l: 20 }, // 8º
        { t: 72, l: 80 }, // 9º
        { t: 88, l: 50 }  // 10º
    ];

    return `
        <div class="relative aspect-[4/5] w-full max-w-2xl mx-auto rounded-[50px] border-8 border-white overflow-hidden shadow-xl" style="background: linear-gradient(180deg, #2d5a27 0%, #1e3c1a 100%);">
            <!-- Grass Patterns -->
            <div class="absolute inset-0 opacity-10">
                <div class="w-full h-full" style="background-image: repeating-linear-gradient(90deg, transparent, transparent 10%, rgba(255,255,255,0.05) 10%, rgba(255,255,255,0.05) 20%);"></div>
            </div>

            <!-- Authentic Field Lines -->
            <div class="absolute inset-0 pointer-events-none p-1">
                <div class="absolute inset-4 border-2 border-white/40 rounded-sm"></div>
                <!-- Middle Line -->
                <div class="absolute top-1/2 left-4 right-4 h-[2px] bg-white/40"></div>
                <!-- Middle Circle -->
                <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/40 rounded-full"></div>
                <!-- Penalty Areas -->
                <div class="absolute top-4 left-1/2 -translate-x-1/2 w-48 h-24 border-2 border-t-0 border-white/40"></div>
                <div class="absolute bottom-4 left-1/2 -translate-x-1/2 w-48 h-24 border-2 border-b-0 border-white/40"></div>
                <!-- Goals -->
                <div class="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-white/10 border-x-2 border-b-2 border-white/40"></div>
                <div class="absolute bottom-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-white/10 border-x-2 border-t-2 border-white/40"></div>
            </div>

            <!-- Teams on Field -->
            ${top10.map((team, i) => {
                let garcomImg = '';
                if (i === 9 && lastTeam) {
                    garcomImg = `<div class="absolute bottom-0 -left-14 w-20 h-20 md:w-32 md:h-32 z-30 transition-transform group-hover:-rotate-6 pointer-events-none">
                                    <img src="${getGarconImage(lastTeam)}" class="w-full h-full object-contain drop-shadow-lg" onerror="this.onerror=null; this.style.display='none';">
                                </div>`;
                }
                
                let numberTextColor = "text-white";

                if (bmpState.activeSerie === "A" && i >= 8) { // Last two (9th, 10th)
                    numberTextColor = "text-red-500";
                } else if (bmpState.activeSerie === "B" && i < 2) { // First two (1st, 2nd)
                    numberTextColor = "text-emerald-400";
                }

                return `
                <div class="absolute group animate-in fade-in zoom-in duration-700" style="top: ${pos[i].t}%; left: ${pos[i].l}%; transform: translate(-50%, -50%)">
                    <div class="flex flex-col items-center cursor-pointer" onclick="bmpSelectTeam('${team.nome}')">
                        <div class="relative">
                            ${garcomImg}
                            <div class="w-20 h-20 md:w-28 md:h-28 flex items-center justify-center p-1 transition-all duration-300 group-hover:scale-110 z-10 relative drop-shadow-[0_15px_15px_rgba(0,0,0,0.6)]">
                                <img src="${getTeamEscudo(team)}" class="w-full h-full object-contain" onerror="this.onerror=null; this.style.opacity='0.5';">
                            </div>
                            <div class="absolute -top-3 -right-3 z-30 font-jersey text-3xl md:text-5xl drop-shadow-[0_3px_6px_rgba(0,0,0,0.9)] ${numberTextColor}">
                                ${i + 1}
                            </div>
                        </div>
                        <div class="mt-0.5 text-center drop-shadow-md">
                            <p class="text-[9px] md:text-[11px] text-white font-jogos leading-none tracking-widest">${team.nome}</p>
                            <p class="text-[11px] md:text-base text-yellow-300 font-mono font-bold leading-none mt-0.5">${team.pontos.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
                `;
            }).join("")}
        </div>
    `;
}

function renderTable(ranking) {
    return `
        <div class="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden w-full">
            <div class="overflow-x-auto w-full">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50 border-b border-slate-100">
                            <th class="px-4 md:px-8 py-5 text-[10px] font-jogos text-slate-400 tracking-[0.2em]">POS</th>
                            <th class="px-4 md:px-8 py-5 text-[10px] font-jogos text-slate-400 tracking-[0.2em]">TIME</th>
                            <th class="px-4 md:px-8 py-5 text-[10px] font-jogos text-slate-400 text-right tracking-[0.2em]">RDD</th>
                            <th class="px-4 md:px-8 py-5 text-[10px] font-jogos text-slate-400 text-right tracking-[0.2em]">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">
                        ${ranking.map((team, i) => {
                            let statusColor = "bg-slate-200";
                            if (bmpState.activeSerie === "A" && i >= ranking.length - 2) statusColor = "bg-red-400";
                            if (bmpState.activeSerie === "B" && i < 2) statusColor = "bg-emerald-400";

                            const gap = i > 0 ? (ranking[i-1].pontos - team.pontos) : 0;

                            return `
                            <tr class="group hover:bg-orange-50 transition-colors cursor-pointer" onclick="bmpSelectTeam('${team.nome}')">
                                <td class="px-4 md:px-8 py-1 md:py-2">
                                    <div class="flex items-center gap-2 md:gap-4">
                                        <div class="w-1 h-8 rounded-full ${statusColor} opacity-50 group-hover:opacity-100 transition-opacity flex-shrink-0"></div>
                                        <span class="text-lg md:text-3xl font-jersey text-slate-300">
                                            ${(i + 1).toString().padStart(2, '0')}
                                        </span>
                                    </div>
                                </td>
                                <td class="px-4 md:px-8 py-1 md:py-2">
                                    <div class="flex items-center gap-3 md:gap-5">
                                        <div class="w-12 h-12 md:w-16 md:h-16 bg-white rounded-2xl p-1 md:p-2 border border-slate-100 group-hover:border-orange-200 transition-all flex-shrink-0 shadow-sm">
                                            <img src="${getTeamEscudo(team)}" class="w-full h-full object-contain" onerror="this.onerror=null; this.style.opacity='0.5';">
                                        </div>
                                        <span class="font-jogos text-[12px] md:text-xl text-slate-700 group-hover:text-slate-900 transition-colors truncate max-w-[100px] sm:max-w-[180px] md:max-w-none">${team.nome}</span>
                                    </div>
                                </td>
                                <td class="px-4 md:px-8 py-1 md:py-2 text-right">
                                    <span class="font-mono text-[11px] md:text-sm ${team.roundScore >= 0 ? 'text-orange-500' : 'text-red-500'} font-bold">
                                        ${team.roundScore > 0 ? '+' : ''}${team.roundScore.toFixed(2)}
                                    </span>
                                </td>
                                <td class="px-4 md:px-8 py-1 md:py-2 text-right">
                                    <div class="flex flex-col items-end">
                                        <span class="text-lg md:text-2xl font-mono font-black text-slate-900 group-hover:text-orange-600 transition-colors">
                                            ${team.pontos.toFixed(2)}
                                        </span>
                                        ${i > 0 ? `
                                            <span class="font-mono text-[11px] md:text-sm text-slate-400 font-bold leading-none mt-1">
                                                -${gap.toFixed(2)}
                                            </span>
                                        ` : ''}
                                    </div>
                                </td>
                            </tr>
                            `;
                        }).join("")}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderBottomCards(ranking) {
    const mito = [...ranking].sort((a, b) => b.roundScore - a.roundScore)[0];
    const bolaMurcha = [...ranking].sort((a, b) => a.roundScore - b.roundScore)[0];
    
    const historicalMitos = [];
    const maxR = getMaxRound();
    for(let r = maxR; r >= 1; r--) {
        const mitosRodada = { rdd: r, A: null, B: null };
        
        let bestA = -Infinity, teamA = null;
        bmpData.serieA.forEach(t => {
            const rd = t.rodadas.find(rd => rd.rdd === r);
            if (rd) {
                const s = (rd.val || 0) + (rd.re || 0) - (rd.pen || 0);
                if (s > bestA) { bestA = s; teamA = { nome: t.nome, score: s, escudo: t.escudo }; }
            }
        });
        mitosRodada.A = teamA;

        let bestB = -Infinity, teamB = null;
        bmpData.serieB.forEach(t => {
            const rd = t.rodadas.find(rd => rd.rdd === r);
            if (rd) {
                const s = (rd.val || 0) + (rd.re || 0) - (rd.pen || 0);
                if (s > bestB) { bestB = s; teamB = { nome: t.nome, score: s, escudo: t.escudo }; }
            }
        });
        mitosRodada.B = teamB;
        if (mitosRodada.A || mitosRodada.B) historicalMitos.push(mitosRodada);
    }

    return `
        <!-- High Scorer Card -->
        <div class="bg-white rounded-[32px] p-6 border border-orange-500/10 shadow-sm relative overflow-hidden group">
            <div class="absolute top-0 right-0 p-4">
                <i data-lucide="crown" class="w-10 h-10 text-orange-500/10 group-hover:text-orange-500 group-hover:scale-110 transition-all"></i>
            </div>
            <p class="text-[9px] font-black font-jogos text-orange-500 tracking-[0.2em] mb-4">MITO DA RODADA</p>
            <div class="flex items-center gap-4">
                <div class="w-20 h-20 bg-slate-50 rounded-2xl p-3 border border-slate-100">
                    <img src="${getTeamEscudo(mito)}" class="w-full h-full object-contain" onerror="this.onerror=null; this.style.opacity='0.5';">
                </div>
                <div>
                    <h3 class="text-sm font-jogos text-slate-800 truncate w-32 mb-1">${mito.nome}</h3>
                    <p class="text-3xl font-mono font-black text-orange-600 tracking-tighter">+${mito.roundScore.toFixed(2)}</p>
                </div>
            </div>
        </div>

        <!-- Low Scorer Card -->
        <div class="bg-white rounded-[32px] p-6 border border-red-500/10 group relative overflow-hidden shadow-sm">
            <div class="absolute top-0 right-0 p-4">
                <i data-lucide="frown" class="w-10 h-10 text-red-500/10 group-hover:text-red-500 scale-100 group-hover:scale-110 transition-all duration-500"></i>
            </div>
            <p class="text-[9px] font-black font-jogos text-slate-400 tracking-[0.2em] mb-4">BOLA MURCHA</p>
            <div class="flex items-center gap-4">
                <div class="w-16 h-16 bg-slate-50 rounded-2xl p-3 border border-slate-100 opacity-50 gray-filter transition-all group-hover:opacity-80">
                    <img src="${getTeamEscudo(bolaMurcha)}" class="w-full h-full object-contain" onerror="this.onerror=null; this.style.opacity='0.5';">
                </div>
                <div>
                    <h3 class="text-xs font-jogos text-slate-500 mb-1">${bolaMurcha.nome}</h3>
                    <p class="text-xl font-mono font-black text-red-400 opacity-80">${bolaMurcha.roundScore.toFixed(2)}</p>
                </div>
            </div>
        </div>

        <!-- Historical List -->
        <div class="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm md:col-span-2 lg:col-span-1">
            <h3 class="text-[10px] font-black font-jogos text-slate-400 mb-4 tracking-[0.2em] uppercase">HISTÓRICO MITOS</h3>
            
            <!-- Side-by-side Series Headers -->
            <div class="grid grid-cols-2 gap-2 mb-4 px-2">
                <div class="text-center">
                    <span class="text-[10px] font-black font-jogos text-orange-600 tracking-[0.3em] uppercase">SÉRIE A</span>
                </div>
                <div class="text-center border-l border-slate-100">
                    <span class="text-[10px] font-black font-jogos text-slate-600 tracking-[0.3em] uppercase">SÉRIE B</span>
                </div>
            </div>

            <div class="space-y-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                ${historicalMitos.map(m => `
                    <div class="p-3 bg-slate-50/30 rounded-2xl border border-slate-100/50 mb-2 transition-all hover:bg-white hover:shadow-md hover:border-orange-500/20">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-[8px] font-bold text-slate-400 font-mono">RODADA ${m.rdd.toString().padStart(2, '0')}</span>
                            <div class="h-[1px] flex-1 bg-slate-100 mx-3"></div>
                        </div>
                        <div class="grid grid-cols-2 gap-2">
                            <!-- Serie A Mito -->
                            <div class="flex items-center gap-2 overflow-hidden">
                                <div class="w-7 h-7 bg-white rounded-lg p-1 border border-slate-100 flex-shrink-0">
                                    <img src="${getTeamEscudo(m.A)}" class="w-full h-full object-contain" onerror="this.onerror=null; this.style.opacity='0.5';">
                                </div>
                                <div class="min-w-0">
                                    <p class="text-[10px] font-jogos text-slate-700 truncate leading-tight">${m.A?.nome || '-'}</p>
                                    <p class="text-[9px] font-mono text-orange-500 font-black leading-none">${m.A?.score.toFixed(2) || '0.00'}</p>
                                </div>
                            </div>
                            <!-- Serie B Mito -->
                            <div class="flex items-center gap-2 border-l border-slate-200 pl-2 overflow-hidden">
                                <div class="w-7 h-7 bg-white rounded-lg p-1 border border-slate-100 flex-shrink-0">
                                    <img src="${getTeamEscudo(m.B)}" class="w-full h-full object-contain" onerror="this.onerror=null; this.style.opacity='0.5';">
                                </div>
                                <div class="min-w-0">
                                    <p class="text-[10px] font-jogos text-slate-700 truncate leading-tight">${m.B?.nome || '-'}</p>
                                    <p class="text-[9px] font-mono text-orange-500 font-black leading-none">${m.B?.score.toFixed(2) || '0.00'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join("")}
            </div>
        </div>
    `;
}

function renderTeamDetail(container) {
    const teamName = bmpState.selectedTeam;
    const serieData = getSerieData();
    const team = serieData.find(t => t.nome === teamName);
    
    if (!team) {
        bmpState.selectedTeam = null;
        renderApp();
        return;
    }

    const currentRoundData = team.rodadas.find(r => r.rdd === bmpState.selectedRound) || { jogadores: [], val: 0, re: 0, pen: 0 };
    const totalPoints = team.rodadas
        .filter(r => r.rdd <= (bmpState.selectedRound || 99))
        .reduce((acc, r) => acc + (r.val || 0) + (r.re || 0) - (r.pen || 0), 0);
    const roundScore = (currentRoundData.val || 0) + (currentRoundData.re || 0) - (currentRoundData.pen || 0);

    container.innerHTML = `
        <div class="animate-in fade-in slide-in-from-bottom-6 duration-700 space-y-10 pb-12">
            <!-- Nav -->
            <button onclick="bmpSelectTeam(null)" class="flex items-center gap-3 text-slate-400 hover:text-orange-500 transition-all group">
                <div class="p-2 rounded-xl bg-white border border-slate-100 group-hover:border-orange-500 shadow-sm">
                    <i data-lucide="arrow-left" class="w-5 h-5 transition-transform group-hover:-translate-x-1"></i>
                </div>
                <span class="text-[10px] font-black font-jogos tracking-[0.2em]">VOLTAR</span>
            </button>

            <!-- Hero Profiler -->
            <div class="bg-white rounded-[40px] border border-slate-100 p-5 md:p-6 flex flex-col md:flex-row items-center gap-5 md:gap-8 relative overflow-hidden shadow-sm">
                <div class="absolute -top-20 -right-20 opacity-[0.05]">
                    <img src="${getTeamEscudo(team)}" class="w-80 h-80 rotate-12" onerror="this.style.display='none'">
                </div>

                <div class="w-24 h-24 md:w-32 md:h-32 bg-slate-50 rounded-3xl flex items-center justify-center p-4 relative z-10 border border-slate-100">
                    <img src="${getTeamEscudo(team)}" class="w-full h-full object-contain drop-shadow-[0_5px_15px_rgba(0,0,0,0.1)]" onerror="this.onerror=null; this.style.opacity='0.5';">
                </div>
                
                <div class="text-center md:text-left space-y-3 relative z-10 flex-1">
                    <div>
                        <div class="flex items-center justify-center md:justify-start gap-3 mb-0.5">
                            <span class="px-2 py-0.5 bg-orange-100 text-orange-600 text-[8px] font-black rounded font-jogos uppercase">SÉRIE ${bmpState.activeSerie}</span>
                        </div>
                        <h2 class="text-4xl md:text-5xl font-jersey text-slate-800 leading-none tracking-tight">${team.nome}</h2>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-2 max-w-xs mx-auto md:mx-0">
                        <div class="bg-slate-50 px-3 py-2 md:px-4 md:py-2.5 rounded-2xl border border-slate-100">
                            <p class="text-[8px] text-slate-400 font-black font-jogos tracking-widest mb-0.5">GERAL</p>
                            <p class="text-xl md:text-2xl font-mono font-black text-slate-800 leading-none">${totalPoints.toFixed(2)}</p>
                        </div>
                        <div class="bg-orange-50 px-3 py-2 md:px-4 md:py-2.5 rounded-2xl border border-orange-100">
                            <p class="text-[8px] text-orange-600 font-black font-jogos tracking-widest mb-0.5 uppercase">RODADA</p>
                            <p class="text-xl md:text-2xl font-mono font-black text-orange-600 leading-none">${roundScore.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Detail Grid -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                <!-- Squad -->
                <div class="bg-white rounded-[40px] border border-slate-100 p-6 md:p-8 shadow-sm">
                    <div class="flex items-center justify-between mb-6 border-b border-slate-50 pb-4">
                        <h3 class="text-[10px] font-black font-jogos tracking-[0.2em] text-slate-800 uppercase">RD ${bmpState.selectedRound} • ESCALAÇÃO</h3>
                    </div>

                    <div class="space-y-0.5">
                        ${currentRoundData.jogadores && currentRoundData.jogadores.length > 0 ? 
                            currentRoundData.jogadores.map(p => `
                                <div class="flex items-center justify-between p-1.5 md:p-2 hover:bg-orange-50/50 rounded-xl transition-all group">
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 flex items-center justify-center bg-slate-50 rounded-lg text-[8px] font-black font-jogos text-slate-400 group-hover:text-orange-500 transition-colors">
                                            ${p.pos}
                                        </div>
                                        <div>
                                            <p class="text-xs md:text-sm font-jogos text-slate-700 leading-none">${p.nome}</p>
                                            <p class="text-[8px] text-slate-400 font-mono uppercase mt-0.5">${p.clube}</p>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <p class="font-mono text-xs md:text-sm font-black ${p.val >= 0 ? 'text-orange-500' : 'text-red-500'}">
                                            ${p.val >= 0 ? '+' : ''}${p.val.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            `).join("") : 
                            `<div class="text-center py-20 flex flex-col items-center gap-4">
                                <i data-lucide="shield-alert" class="w-12 h-12 text-slate-200"></i>
                                <p class="text-slate-400 font-jogos text-xs tracking-widest italic uppercase">Sem escalação disponível</p>
                            </div>`
                        }
                    </div>
                </div>

                <!-- History -->
                <div class="bg-white rounded-[40px] border border-slate-100 p-8 shadow-sm">
                    <h3 class="text-xs font-black font-jogos tracking-[0.2em] text-slate-800 mb-8 border-b border-slate-50 pb-6 uppercase">DESEMPENHO POR RODADA</h3>
                    <div class="space-y-6">
                        ${team.rodadas.map(r => {
                            const roundTotal = (r.val || 0) + (r.re || 0) - (r.pen || 0);
                            const perc = Math.min(100, Math.max(0, (roundTotal / 25) * 100));
                            
                            const extraInfo = [];
                            if (r.re && r.re !== 0) {
                                extraInfo.push(`<span class="text-emerald-500">+${r.re.toFixed(2)}</span>`);
                            }
                            if (r.pen && r.pen !== 0) {
                                extraInfo.push(`<span class="text-red-500">-${r.pen.toFixed(2)}</span>`);
                            }

                            return `
                                <div class="space-y-2 group">
                                    <div class="flex justify-between items-center">
                                        <span class="text-[12px] font-mono font-bold text-slate-400 tracking-tighter">RDD ${r.rdd.toString().padStart(2, '0')}</span>
                                        <div class="text-right">
                                            <span class="text-[12px] font-mono font-black ${roundTotal >= 0 ? 'text-orange-500' : 'text-red-500'} group-hover:scale-110 transition-transform block leading-none">
                                                ${roundTotal.toFixed(2)} PTS
                                            </span>
                                            ${extraInfo.length > 0 ? `
                                                <div class="text-[9px] font-mono font-bold flex justify-end gap-1 mt-0.5">${extraInfo.join("")}</div>
                                            ` : ''}
                                        </div>
                                    </div>
                                    <div class="bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-50">
                                        <div class="bg-gradient-to-r from-orange-400 to-orange-500 h-full transition-all duration-1000" style="width: ${perc}%"></div>
                                    </div>
                                </div>
                            `;
                        }).join("")}
                    </div>
                </div>
            </div>
        </div>
    `;
    if (typeof lucide !== "undefined") lucide.createIcons();
}

function renderError(msg) {
    const main = document.getElementById("main-content");
    if (main) {
        main.innerHTML = `
            <div class="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-6 animate-in fade-in duration-700">
                <div class="p-8 bg-white rounded-[40px] border border-red-100 text-red-500 shadow-sm">
                    <i data-lucide="alert-octagon" class="w-16 h-16"></i>
                </div>
                <div class="space-y-2">
                    <h2 class="text-2xl font-bold text-slate-800 uppercase tracking-tight">Falha Critica</h2>
                    <p class="text-slate-400 max-w-sm font-mono text-[10px] leading-relaxed uppercase tracking-widest">${msg || "Erro ao conectar com o serviço de dados."}</p>
                </div>
                <button onclick="bmpReload()" class="px-10 py-4 bg-orange-500 rounded-2xl text-white font-black font-jogos text-[10px] tracking-[0.2em] hover:scale-105 transition-all">REINICIAR</button>
            </div>
        `;
        if (typeof lucide !== "undefined") lucide.createIcons();
    }
}

// ========== ACTIONS ==========

window.bmpSetSerie = (s) => {
    bmpState.activeSerie = s;
    bmpState.selectedRound = getMaxRound();
    bmpState.selectedTeam = null;
    renderApp();
};

window.bmpSetRound = (r) => {
    bmpState.selectedRound = parseInt(r);
    renderApp();
};

window.bmpSetViewMode = (m) => {
    bmpState.viewMode = m;
    bmpState.selectedTeam = null;
    renderApp();
};

window.bmpSelectTeam = (tName) => {
    bmpState.selectedTeam = tName;
    renderApp();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.bmpReload = () => {
    const main = document.getElementById("main-content");
    if (main) {
        main.innerHTML = `
            <div class="flex flex-col items-center justify-center min-h-[60vh] gap-8 animate-in fade-in duration-700">
                <div class="relative">
                    <div class="w-20 h-20 border-2 border-orange-500/10 rounded-full"></div>
                    <div class="absolute top-0 left-0 w-20 h-20 border-t-2 border-orange-500 rounded-full animate-spin"></div>
                </div>
                <div class="text-center">
                    <p class="text-slate-800 font-jogos text-[10px] tracking-[0.3em] uppercase mb-1">Atualizando Dados</p>
                    <p class="text-orange-500/50 font-mono text-[9px] tracking-[0.2em] uppercase">Buscando informações da liga...</p>
                </div>
            </div>
        `;
    }
    fetchBmpData();
};


// ========== INIT ==========
document.addEventListener("DOMContentLoaded", () => {
    renderSidebar(); // Render menu structure immediately
    fetchBmpData();  // Then fetch data
});
