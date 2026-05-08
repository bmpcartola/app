/* ============================================================
   JOSABET
   ============================================================ */

const API_URL = "https://raw.githubusercontent.com/bmpcartola/app/main/bd/cartola.json";

let bmpData = null;
let bmpState = {
    activeSerie: "A",
    selectedRound: 1,
    selectedTeam: null,
    viewMode: "campo"
};

// ========== DATA FETCHING ==========
async function fetchBmpData() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Erro ao carregar dados da API");
        const buf = await response.arrayBuffer();
        const decoder = new TextDecoder("iso-8859-1");
        const text = decoder.decode(buf);
        bmpData = JSON.parse(text);
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
    if (team.escudo && typeof team.escudo === 'string' && team.escudo.startsWith('http')) {
        return encodeURI(team.escudo.trim());
    }
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
    return serieData.map(team => {
        let totalPoints = 0;
        let roundScore = 0;
        team.rodadas.forEach(r => {
            const score = (r.val || 0) + (r.re || 0) - (r.pen || 0);
            if (r.rdd <= round) totalPoints += score;
            if (r.rdd === round) roundScore = score;
        });
        return { nome: team.nome, escudo: team.escudo, pontos: totalPoints, roundScore };
    }).sort((a, b) => b.pontos - a.pontos);
}

// ========== RENDERING ==========
function renderHeaderControls() {
    const headerControls = document.getElementById("header-controls");
    if (!headerControls) return;
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
            <select onchange="bmpSetRound(this.value)" class="bg-white border border-slate-200 text-slate-700 text-[10px] font-jogos px-4 py-2 rounded-xl">
                ${rounds.map(r => `<option value="${r}" ${bmpState.selectedRound === r ? 'selected' : ''}>RDD ${r}</option>`).join("")}
            </select>
        </div>
    `;
    if (typeof lucide !== "undefined") lucide.createIcons();
}

function renderApp() {
    renderHeaderControls();
    renderContent();
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
        if (window.renderProvaveis) window.renderProvaveis();
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
                <div>${renderField(ranking)}</div>
                <div>${renderTable(ranking)}</div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">${renderBottomCards(ranking)}</div>
            </div>
        </div>
    `;
}

function renderPodium(ranking) {
    const leader = ranking[0];
    return `<div class="relative p-6 md:p-8 bg-white rounded-[40px] border border-slate-100 shadow-sm"><div class="absolute top-0 right-0 p-6 md:p-8"><i data-lucide="crown" class="w-16 h-16 text-yellow-500/10"></i></div><div class="relative z-10 flex flex-col md:flex-row items-center gap-4 md:gap-8"><div class="relative cursor-pointer" onclick="bmpSelectTeam('${leader.nome}')"><img src="${getLeaderImage(leader)}" class="w-48 h-48 md:w-64 md:h-64 object-contain drop-shadow-lg" onerror="this.style.opacity='0.5';"></div><div><h2 class="text-6xl md:text-8xl font-jersey text-slate-800">${leader.nome}</h2><div class="flex items-baseline gap-2"><span class="text-4xl font-mono font-black text-orange-500">${leader.pontos.toFixed(2)}</span></div></div></div></div>`;
}

function renderField(ranking) {
    const top10 = ranking.slice(0, 10);
    const lastTeam = ranking[ranking.length - 1];
    const pos = [{t:15,l:50},{t:25,l:20},{t:25,l:80},{t:42,l:50},{t:48,l:15},{t:48,l:85},{t:65,l:55},{t:72,l:20},{t:72,l:80},{t:88,l:50}];
    return `<div class="relative aspect-[4/5] w-full max-w-2xl mx-auto rounded-[50px] border-8 border-white overflow-hidden shadow-xl" style="background: linear-gradient(180deg,#2d5a27,#1e3c1a);"><div class="absolute inset-0 opacity-10"><div class="w-full h-full" style="background-image: repeating-linear-gradient(90deg,transparent,transparent 10%,rgba(255,255,255,0.05) 10%,rgba(255,255,255,0.05) 20%);"></div></div><div class="absolute inset-0 pointer-events-none p-1"><div class="absolute inset-4 border-2 border-white/40 rounded-sm"></div><div class="absolute top-1/2 left-4 right-4 h-[2px] bg-white/40"></div><div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/40 rounded-full"></div><div class="absolute top-4 left-1/2 -translate-x-1/2 w-48 h-24 border-2 border-t-0 border-white/40"></div><div class="absolute bottom-4 left-1/2 -translate-x-1/2 w-48 h-24 border-2 border-b-0 border-white/40"></div><div class="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-white/10 border-x-2 border-b-2 border-white/40"></div><div class="absolute bottom-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-white/10 border-x-2 border-t-2 border-white/40"></div></div>${top10.map((team, i) => { let garcomImg = (i===9 && lastTeam) ? `<div class="absolute bottom-0 -left-14 w-20 h-20 md:w-32 md:h-32"><img src="${getGarconImage(lastTeam)}" class="w-full h-full object-contain drop-shadow-lg" onerror="this.style.display='none';"></div>` : ''; let numberTextColor = (bmpState.activeSerie==="A" && i>=8) ? "text-red-500" : (bmpState.activeSerie==="B" && i<2) ? "text-emerald-400" : "text-white"; return `<div class="absolute group animate-in fade-in zoom-in duration-700" style="top:${pos[i].t}%; left:${pos[i].l}%; transform:translate(-50%,-50%)"><div class="flex flex-col items-center cursor-pointer" onclick="bmpSelectTeam('${team.nome}')"><div class="relative">${garcomImg}<div class="w-20 h-20 md:w-28 md:h-28 flex items-center justify-center p-1 transition-all duration-300 group-hover:scale-110 drop-shadow-[0_15px_15px_rgba(0,0,0,0.6)]"><img src="${getTeamEscudo(team)}" class="w-full h-full object-contain" onerror="this.style.opacity='0.5';"></div><div class="absolute -top-3 -right-3 z-30 font-jersey text-3xl md:text-5xl drop-shadow-[0_3px_6px_rgba(0,0,0,0.9)] ${numberTextColor}">${i+1}</div></div><div class="mt-0.5 text-center drop-shadow-md"><p class="text-[9px] md:text-[11px] text-white font-jogos leading-none">${team.nome}</p><p class="text-[11px] md:text-base text-yellow-300 font-mono font-bold">${team.pontos.toFixed(2)}</p></div></div></div>`; }).join('')}</div>`;
}

function renderTable(ranking) {
    return `<div class="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden w-full"><div class="overflow-x-auto w-full"><table class="w-full text-left border-collapse"><thead><tr class="bg-slate-50 border-b border-slate-100"><th class="px-4 md:px-8 py-5 text-[10px] font-jogos text-slate-400">POS</th><th class="px-4 md:px-8 py-5 text-[10px] font-jogos text-slate-400">TIME</th><th class="px-4 md:px-8 py-5 text-[10px] font-jogos text-slate-400 text-right">RDD</th><th class="px-4 md:px-8 py-5 text-[10px] font-jogos text-slate-400 text-right">TOTAL</th></tr></thead><tbody>${ranking.map((team,i)=>{ let statusColor = (bmpState.activeSerie==="A" && i>=ranking.length-2) ? "bg-red-400" : (bmpState.activeSerie==="B" && i<2) ? "bg-emerald-400" : "bg-slate-200"; let gap = i>0 ? (ranking[i-1].pontos - team.pontos) : 0; return `<tr class="group hover:bg-orange-50 transition-colors cursor-pointer" onclick="bmpSelectTeam('${team.nome}')"><td class="px-4 md:px-8 py-1 md:py-2"><div class="flex items-center gap-2 md:gap-4"><div class="w-1 h-8 rounded-full ${statusColor} opacity-50 group-hover:opacity-100"></div><span class="text-lg md:text-3xl font-jersey text-slate-300">${(i+1).toString().padStart(2,'0')}</span></div></td><td class="px-4 md:px-8 py-1 md:py-2"><div class="flex items-center gap-3 md:gap-5"><div class="w-12 h-12 md:w-16 md:h-16 bg-white rounded-2xl p-1 md:p-2 border border-slate-100 shadow-sm"><img src="${getTeamEscudo(team)}" class="w-full h-full object-contain" onerror="this.style.opacity='0.5';"></div><span class="font-jogos text-[12px] md:text-xl text-slate-700">${team.nome}</span></div></td><td class="px-4 md:px-8 py-1 md:py-2 text-right"><span class="font-mono text-[11px] md:text-sm ${team.roundScore>=0?'text-orange-500':'text-red-500'} font-bold">${team.roundScore>0?'+':''}${team.roundScore.toFixed(2)}</span></td><td class="px-4 md:px-8 py-1 md:py-2 text-right"><div class="flex flex-col items-end"><span class="text-lg md:text-2xl font-mono font-black text-slate-900 group-hover:text-orange-600">${team.pontos.toFixed(2)}</span>${i>0?`<span class="font-mono text-[11px] md:text-sm text-slate-400 font-bold leading-none mt-1">-${gap.toFixed(2)}</span>`:''}</div></td></tr>`; }).join('')}</tbody></table></div></div>`;
}

function renderBottomCards(ranking) {
    const mito = [...ranking].sort((a,b)=>b.roundScore - a.roundScore)[0];
    const bolaMurcha = [...ranking].sort((a,b)=>a.roundScore - b.roundScore)[0];
    let historicalMitos = [];
    const maxR = getMaxRound();
    for(let r=maxR;r>=1;r--){
        let bestA=-Infinity, teamA=null, bestB=-Infinity, teamB=null;
        bmpData.serieA.forEach(t=>{ let rd=t.rodadas.find(rd=>rd.rdd===r); if(rd){ let s=(rd.val||0)+(rd.re||0)-(rd.pen||0); if(s>bestA){bestA=s; teamA={nome:t.nome,score:s,escudo:t.escudo};} } });
        bmpData.serieB.forEach(t=>{ let rd=t.rodadas.find(rd=>rd.rdd===r); if(rd){ let s=(rd.val||0)+(rd.re||0)-(rd.pen||0); if(s>bestB){bestB=s; teamB={nome:t.nome,score:s,escudo:t.escudo};} } });
        if(teamA||teamB) historicalMitos.push({rdd:r, A:teamA, B:teamB});
    }
    return `<div class="bg-white rounded-[32px] p-6 border border-orange-500/10 shadow-sm"><p class="text-[9px] font-black font-jogos text-orange-500 mb-4">MITO DA RODADA</p><div class="flex items-center gap-4"><div class="w-20 h-20 bg-slate-50 rounded-2xl p-3"><img src="${getTeamEscudo(mito)}" onerror="this.style.opacity='0.5'"></div><div><h3 class="text-sm font-jogos text-slate-800">${mito.nome}</h3><p class="text-3xl font-mono font-black text-orange-600">+${mito.roundScore.toFixed(2)}</p></div></div></div><div class="bg-white rounded-[32px] p-6 border border-red-500/10 shadow-sm"><p class="text-[9px] font-black font-jogos text-slate-400 mb-4">BOLA MURCHA</p><div class="flex items-center gap-4"><div class="w-16 h-16 bg-slate-50 rounded-2xl p-3 opacity-50 gray-filter"><img src="${getTeamEscudo(bolaMurcha)}" onerror="this.style.opacity='0.5'"></div><div><h3 class="text-xs font-jogos text-slate-500">${bolaMurcha.nome}</h3><p class="text-xl font-mono font-black text-red-400">${bolaMurcha.roundScore.toFixed(2)}</p></div></div></div><div class="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm"><h3 class="text-[10px] font-black font-jogos text-slate-400 mb-4 uppercase">HISTÓRICO MITOS</h3><div class="grid grid-cols-2 gap-2 mb-4 px-2"><div class="text-center"><span class="text-[10px] font-black font-jogos text-orange-600">SÉRIE A</span></div><div class="text-center border-l border-slate-100"><span class="text-[10px] font-black font-jogos text-slate-600">SÉRIE B</span></div></div><div class="space-y-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">${historicalMitos.map(m=>`<div class="p-3 bg-slate-50/30 rounded-2xl border border-slate-100/50"><div class="flex items-center justify-between mb-2"><span class="text-[8px] font-bold text-slate-400 font-mono">RODADA ${m.rdd}</span><div class="h-[1px] flex-1 bg-slate-100 mx-3"></div></div><div class="grid grid-cols-2 gap-2"><div class="flex items-center gap-2"><div class="w-7 h-7 bg-white rounded-lg p-1"><img src="${getTeamEscudo(m.A)}" onerror="this.style.opacity='0.5'"></div><div><p class="text-[10px] font-jogos text-slate-700">${m.A?.nome||'-'}</p><p class="text-[9px] font-mono text-orange-500">${m.A?.score.toFixed(2)||'0.00'}</p></div></div><div class="flex items-center gap-2 border-l border-slate-200 pl-2"><div class="w-7 h-7 bg-white rounded-lg p-1"><img src="${getTeamEscudo(m.B)}" onerror="this.style.opacity='0.5'"></div><div><p class="text-[10px] font-jogos text-slate-700">${m.B?.nome||'-'}</p><p class="text-[9px] font-mono text-orange-500">${m.B?.score.toFixed(2)||'0.00'}</p></div></div></div></div>`).join('')}</div></div>`;
}

function renderTeamDetail(container) {
    const team = getSerieData().find(t => t.nome === bmpState.selectedTeam);
    if(!team){ bmpState.selectedTeam=null; renderApp(); return; }
    const current = team.rodadas.find(r=>r.rdd===bmpState.selectedRound) || {jogadores:[],val:0,re:0,pen:0};
    const total = team.rodadas.filter(r=>r.rdd<=bmpState.selectedRound).reduce((a,r)=>a+(r.val||0)+(r.re||0)-(r.pen||0),0);
    const roundScore = (current.val||0)+(current.re||0)-(current.pen||0);
    container.innerHTML = `<div class="animate-in fade-in slide-in-from-bottom-6 duration-700 space-y-10 pb-12"><button onclick="bmpSelectTeam(null)" class="flex items-center gap-3 text-slate-400 hover:text-orange-500"><div class="p-2 rounded-xl bg-white border border-slate-100"><i data-lucide="arrow-left" class="w-5 h-5"></i></div><span class="text-[10px] font-black font-jogos">VOLTAR</span></button><div class="bg-white rounded-[40px] border border-slate-100 p-5 flex flex-col md:flex-row items-center gap-5 relative"><div class="w-24 h-24 md:w-32 md:h-32 bg-slate-50 rounded-3xl p-4"><img src="${getTeamEscudo(team)}" class="w-full h-full object-contain"></div><div><div><span class="px-2 py-0.5 bg-orange-100 text-orange-600 text-[8px] font-black rounded">SÉRIE ${bmpState.activeSerie}</span><h2 class="text-4xl font-jersey text-slate-800">${team.nome}</h2></div><div class="grid grid-cols-2 gap-2 mt-2"><div class="bg-slate-50 px-3 py-2 rounded-2xl"><p class="text-[8px] text-slate-400 font-black">GERAL</p><p class="text-xl font-mono font-black text-slate-800">${total.toFixed(2)}</p></div><div class="bg-orange-50 px-3 py-2 rounded-2xl"><p class="text-[8px] text-orange-600 font-black">RODADA</p><p class="text-xl font-mono font-black text-orange-600">${roundScore.toFixed(2)}</p></div></div></div></div><div class="grid grid-cols-1 lg:grid-cols-2 gap-6"><div class="bg-white rounded-[40px] border border-slate-100 p-6"><h3 class="text-[10px] font-black font-jogos mb-6">RD ${bmpState.selectedRound} • ESCALAÇÃO</h3><div class="space-y-0.5">${current.jogadores?.length? current.jogadores.map(p=>`<div class="flex justify-between p-1.5 hover:bg-orange-50/50 rounded-xl"><div class="flex gap-3"><div class="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-[8px] font-black">${p.pos}</div><div><p class="text-xs font-jogos">${p.nome}</p><p class="text-[8px] text-slate-400 font-mono">${p.clube}</p></div></div><div><p class="font-mono text-xs font-black ${p.val>=0?'text-orange-500':'text-red-500'}">${p.val>=0?'+':''}${p.val.toFixed(2)}</p></div></div>`).join(''):`<div class="text-center py-20"><i data-lucide="shield-alert" class="w-12 h-12 text-slate-200"></i><p class="text-slate-400 font-jogos text-xs">Sem escalação</p></div>`}</div></div><div class="bg-white rounded-[40px] border border-slate-100 p-6"><h3 class="text-xs font-black font-jogos mb-6">DESEMPENHO POR RODADA</h3><div class="space-y-6">${team.rodadas.map(r=>{ let rt=(r.val||0)+(r.re||0)-(r.pen||0); let perc=Math.min(100,Math.max(0,(rt/25)*100)); let extras=[]; if(r.re) extras.push(`+${r.re.toFixed(2)}`); if(r.pen) extras.push(`-${r.pen.toFixed(2)}`); return `<div><div class="flex justify-between"><span class="text-[12px] font-mono font-bold text-slate-400">RDD ${r.rdd}</span><div><span class="text-[12px] font-mono font-black ${rt>=0?'text-orange-500':'text-red-500'}">${rt.toFixed(2)} PTS</span>${extras.length?`<div class="text-[9px] font-mono font-bold flex justify-end gap-1">${extras.join('')}</div>`:''}</div></div><div class="bg-slate-100 h-2 rounded-full mt-1"><div class="bg-orange-500 h-full rounded-full" style="width:${perc}%"></div></div></div>`; }).join('')}</div></div></div></div>`;
    if(typeof lucide!=="undefined") lucide.createIcons();
}

function renderError(msg) {
    const main = document.getElementById("main-content");
    if(main) main.innerHTML = `<div class="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center"><div class="p-8 bg-white rounded-[40px] border border-red-100 text-red-500"><i data-lucide="alert-octagon" class="w-16 h-16"></i></div><h2 class="text-2xl font-bold text-slate-800">Falha Critica</h2><p class="text-slate-400 max-w-sm font-mono text-[10px]">${msg||"Erro ao conectar."}</p><button onclick="bmpReload()" class="px-10 py-4 bg-orange-500 rounded-2xl text-white font-black font-jogos text-[10px]">REINICIAR</button></div>`;
    if(typeof lucide!=="undefined") lucide.createIcons();
}

// ========== ACTIONS ==========
window.bmpSetSerie = (s) => { bmpState.activeSerie = s; bmpState.selectedRound = getMaxRound(); bmpState.selectedTeam = null; renderApp(); };
window.bmpSetRound = (r) => { bmpState.selectedRound = parseInt(r); renderApp(); };
window.bmpSetViewMode = (m) => { bmpState.viewMode = m; bmpState.selectedTeam = null; renderApp(); };
window.bmpSelectTeam = (tName) => { bmpState.selectedTeam = tName; renderApp(); window.scrollTo({top:0,behavior:'smooth'}); };
window.bmpReload = () => { fetchBmpData(); };

// ========== INIT ==========
document.addEventListener("DOMContentLoaded", () => {
    if (typeof lucide !== "undefined") lucide.createIcons();
    fetchBmpData();
});
