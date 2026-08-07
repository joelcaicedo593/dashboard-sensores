// ============================================
// SISTEMA DE REGISTRO DE EVENTOS - VERSIÓN COMPLETA
// ============================================

// Configuración global
let eventos = [];
let contadorEventos = 0;
let filtroActual = 'todos';
let autoScroll = true;
let chart = null;
let simulacionActiva = false;
let intervaloSimulacion = null;
let humedadBase = null;
let gasBase = null;
let contadorMuestras = 0;
let puertoSerial = null;
let lectorSerial = null;
let ultimoValorHumedad = null;
let ultimoValorGas = null;
let conectado = false;
let datosSimulados = { humedad: 500, gas: 100, subiendoH: true, subiendoG: true };

// Niveles de alerta
const NIVELES = {
    HUMEDAD: {
        CRITICO_BAJO: 200,
        ALERTA_BAJO: 300,
        OPTIMO_MIN: 300,
        OPTIMO_MAX: 700,
        ALERTA_ALTO: 700,
        CRITICO_ALTO: 800
    },
    GAS: {
        NORMAL: 100,
        ALERTA: 150,
        CRITICO: 250
    }
};

// Umbrales para registrar eventos
const UMBRAL_EVENTO_HUMEDAD = 20;
const UMBRAL_EVENTO_GAS = 15;

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando Dashboard...');
    inicializarGrafica();
    agregarAlerta('info', '💡 Sistema de registro de eventos activado');
    agregarEvento('sistema', 'info', 'Sistema iniciado', null, null, 'NORMAL', '✅ Sistema listo');
    actualizarResumenEventos();
    
    // Configurar botones
    document.getElementById('btnConectar').addEventListener('click', conectarSerial);
    document.getElementById('btnSimular').addEventListener('click', toggleSimulacion);
    
    console.log('✅ Dashboard iniciado correctamente');
});

// ============================================
// INICIALIZAR GRÁFICA
// ============================================
function inicializarGrafica() {
    const ctx = document.getElementById('chartSensores').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Humedad',
                data: [],
                borderColor: '#007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 0
            }, {
                label: 'Gas',
                data: [],
                borderColor: '#dc3545',
                backgroundColor: 'rgba(220, 53, 69, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 0
            }, {
                label: 'Frecuencia (Hz)',
                data: [],
                borderColor: '#28a745',
                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 0,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    position: 'left',
                    grid: {
                        color: 'rgba(0,0,0,0.05)'
                    }
                },
                y1: {
                    beginAtZero: true,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// ============================================
// SISTEMA DE EVENTOS
// ============================================
function agregarEvento(tipo, severidad, descripcion, valorAnterior, valorActual, nivel, estado) {
    const timestamp = new Date();
    const evento = {
        id: ++contadorEventos,
        timestamp: timestamp,
        timestampStr: timestamp.toLocaleString(),
        tipo: tipo,
        severidad: severidad,
        descripcion: descripcion,
        valorAnterior: valorAnterior,
        valorActual: valorActual,
        nivel: nivel,
        estado: estado
    };
    
    eventos.unshift(evento);
    if (eventos.length > 500) eventos = eventos.slice(0, 500);
    
    actualizarTablaEventos();
    actualizarResumenEventos();
    document.getElementById('eventosRegistrados').textContent = `📝 Eventos: ${eventos.length}`;
    document.getElementById('ultimoEvento').textContent = `Último: ${evento.timestampStr}`;
}

function actualizarTablaEventos() {
    const tbody = document.getElementById('eventsBody');
    const eventosFiltrados = filtrarEventosLista();
    
    if (eventosFiltrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="no-events">No hay eventos que coincidan con el filtro</td></tr>`;
        return;
    }
    
    let html = '';
    eventosFiltrados.forEach(evento => {
        const claseFila = `event-${evento.tipo}`;
        const icono = getIconoEvento(evento.tipo);
        const badgeNivel = getBadgeNivel(evento.nivel);
        const cambio = (evento.valorAnterior !== null && evento.valorActual !== null) ? 
            (evento.valorActual - evento.valorAnterior) : '-';
        
        html += `
            <tr class="${claseFila}">
                <td>${evento.id}</td>
                <td>${evento.timestampStr}</td>
                <td>${icono} ${evento.tipo.charAt(0).toUpperCase() + evento.tipo.slice(1)}</td>
                <td><span class="badge badge-${evento.severidad}">${evento.severidad}</span></td>
                <td>${evento.valorAnterior !== null ? evento.valorAnterior : '-'}</td>
                <td>${evento.valorActual !== null ? evento.valorActual : '-'}</td>
                <td>${cambio !== '-' ? (cambio > 0 ? '+' : '') + cambio : '-'}</td>
                <td>${badgeNivel}</td>
                <td>${evento.estado}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    if (autoScroll) {
        const wrapper = document.querySelector('.events-table-wrapper');
        wrapper.scrollTop = 0;
    }
}

function filtrarEventosLista() {
    if (filtroActual === 'todos') return eventos;
    return eventos.filter(e => e.tipo === filtroActual);
}

function filtrarEventos(filtro) {
    filtroActual = filtro;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filtro) btn.classList.add('active');
    });
    actualizarTablaEventos();
}

function getIconoEvento(tipo) {
    const iconos = {
        'humedad': '💧',
        'gas': '🌫️',
        'alerta': '🔔',
        'critico': '🚨',
        'sistema': 'ℹ️'
    };
    return iconos[tipo] || '📌';
}

function getBadgeNivel(nivel) {
    const badges = {
        'NORMAL': '<span class="badge badge-success">✅ NORMAL</span>',
        'ALERTA': '<span class="badge badge-warning">⚠️ ALERTA</span>',
        'CRITICO': '<span class="badge badge-danger">🚨 CRÍTICO</span>',
        'OPTIMO': '<span class="badge badge-success">✅ ÓPTIMO</span>',
        'SECO': '<span class="badge badge-warning">💧 SECO</span>',
        'HUMEDO': '<span class="badge badge-warning">💧 HÚMEDO</span>'
    };
    return badges[nivel] || `<span class="badge badge-info">${nivel}</span>`;
}

function actualizarResumenEventos() {
    document.getElementById('totalEventos').textContent = eventos.length;
    document.getElementById('totalAlertas').textContent = eventos.filter(e => e.tipo === 'alerta' || e.tipo === 'critico').length;
    document.getElementById('totalHumedad').textContent = eventos.filter(e => e.tipo === 'humedad').length;
    document.getElementById('totalGas').textContent = eventos.filter(e => e.tipo === 'gas').length;
    document.getElementById('totalCriticos').textContent = eventos.filter(e => e.tipo === 'critico').length;
}

function limpiarEventos() {
    if (confirm('¿Seguro que quieres eliminar todos los eventos?')) {
        eventos = [];
        contadorEventos = 0;
        actualizarTablaEventos();
        actualizarResumenEventos();
        document.getElementById('eventosRegistrados').textContent = '📝 Eventos: 0';
        agregarAlerta('info', '🗑️ Todos los eventos han sido eliminados');
    }
}

function toggleAutoScroll() {
    autoScroll = !autoScroll;
    const btn = document.getElementById('btnAutoScroll');
    btn.textContent = autoScroll ? '📌 Auto-scroll ON' : '📌 Auto-scroll OFF';
    btn.style.background = autoScroll ? '#17a2b8' : '#6c757d';
}

function exportarEventos() {
    if (eventos.length === 0) {
        alert('No hay eventos para exportar');
        return;
    }
    
    let csv = 'ID,Timestamp,Tipo,Severidad,Descripcion,ValorAnterior,ValorActual,Nivel,Estado\n';
    eventos.forEach(e => {
        csv += `${e.id},"${e.timestampStr}",${e.tipo},${e.severidad},"${e.descripcion}",${e.valorAnterior ?? ''},${e.valorActual ?? ''},${e.nivel},"${e.estado}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `eventos_sensores_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    agregarAlerta('success', `📥 Exportados ${eventos.length} eventos a CSV`);
}

// ============================================
// DETECCIÓN DE NIVELES
// ============================================
function determinarNivelHumedad(valor) {
    if (valor < NIVELES.HUMEDAD.CRITICO_BAJO) return 'CRITICO';
    if (valor < NIVELES.HUMEDAD.ALERTA_BAJO) return 'ALERTA';
    if (valor >= NIVELES.HUMEDAD.OPTIMO_MIN && valor <= NIVELES.HUMEDAD.OPTIMO_MAX) return 'OPTIMO';
    if (valor > NIVELES.HUMEDAD.ALERTA_ALTO) return 'ALERTA';
    if (valor > NIVELES.HUMEDAD.CRITICO_ALTO) return 'CRITICO';
    return 'NORMAL';
}

function determinarNivelGas(valor) {
    if (valor > NIVELES.GAS.CRITICO) return 'CRITICO';
    if (valor > NIVELES.GAS.ALERTA) return 'ALERTA';
    return 'NORMAL';
}

function determinarEstadoHumedad(valor) {
    if (valor < NIVELES.HUMEDAD.ALERTA_BAJO) return '💧 SECO';
    if (valor > NIVELES.HUMEDAD.ALERTA_ALTO) return '💧 HÚMEDO';
    return '✅ ÓPTIMO';
}

function determinarEstadoGas(valor) {
    if (valor > NIVELES.GAS.CRITICO) return '🚨 CRÍTICO';
    if (valor > NIVELES.GAS.ALERTA) return '⚠️ ALERTA';
    return '✅ NORMAL';
}

// ============================================
// CONEXIÓN SERIAL
// ============================================
async function conectarSerial() {
    const btn = document.getElementById('btnConectar');
    const status = document.getElementById('statusConexion');
    
    // Si ya está conectado, desconectar
    if (conectado) {
        await desconectarSerial();
        return;
    }
    
    try {
        btn.textContent = '⏳ Conectando...';
        btn.disabled = true;
        status.textContent = '⏳ Solicitando puerto...';
        status.style.color = 'orange';
        
        // Solicitar puerto serial
        puertoSerial = await navigator.serial.requestPort();
        await puertoSerial.open({ baudRate: 9600 });
        
        conectado = true;
        status.textContent = '🟢 Conectado';
        status.style.color = '#28a745';
        btn.textContent = '🔌 Desconectar';
        btn.disabled = false;
        
        agregarAlerta('success', '✅ Conectado al puerto serial correctamente');
        agregarEvento('sistema', 'success', 'Puerto serial conectado', null, null, 'NORMAL', '✅ Conectado');
        
        // Iniciar lectura
        iniciarLecturaSerial();
        
    } catch (error) {
        console.error('Error de conexión:', error);
        status.textContent = '🔴 Error: ' + error.message;
        status.style.color = '#dc3545';
        btn.textContent = '🔌 Conectar Puerto Serial';
        btn.disabled = false;
        agregarAlerta('danger', '❌ Error al conectar: ' + error.message);
    }
}

async function desconectarSerial() {
    try {
        if (lectorSerial) {
            await lectorSerial.cancel();
            lectorSerial = null;
        }
        if (puertoSerial) {
            await puertoSerial.close();
            puertoSerial = null;
        }
        conectado = false;
        document.getElementById('statusConexion').textContent = '🔴 Desconectado';
        document.getElementById('statusConexion').style.color = '#dc3545';
        document.getElementById('btnConectar').textContent = '🔌 Conectar Puerto Serial';
        agregarAlerta('info', '🔌 Desconectado del puerto serial');
    } catch (error) {
        console.error('Error al desconectar:', error);
    }
}

async function iniciarLecturaSerial() {
    if (!puertoSerial) return;
    
    try {
        lectorSerial = puertoSerial.readable.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
            const { value, done } = await lectorSerial.read();
            if (done) break;
            
            const texto = decoder.decode(value);
            const lineas = texto.split('\n');
            
            for (const linea of lineas) {
                const lineaTrim = linea.trim();
                if (lineaTrim && !lineaTrim.startsWith('=') && !lineaTrim.startsWith('---')) {
                    procesarLineaSerial(lineaTrim);
                }
            }
        }
    } catch (error) {
        if (error.name !== 'CancelError') {
            console.error('Error en lectura serial:', error);
            agregarAlerta('danger', '❌ Error leyendo datos serial');
        }
    }
}

function procesarLineaSerial(linea) {
    try {
        const partes = linea.split(',');
        if (partes.length >= 8) {
            const humedad = parseFloat(partes[2]);
            const gas = parseFloat(partes[3]);
            const frecuencia = parseFloat(partes[4]);
            
            if (!isNaN(humedad) && !isNaN(gas) && !isNaN(frecuencia)) {
                procesarLectura(humedad, gas, frecuencia);
            }
        }
    } catch (e) {
        console.error('Error procesando línea serial:', e);
    }
}

// ============================================
// MODO SIMULACIÓN
// ============================================
function toggleSimulacion() {
    const btn = document.getElementById('btnSimular');
    
    if (simulacionActiva) {
        // Detener simulación
        clearInterval(intervaloSimulacion);
        intervaloSimulacion = null;
        simulacionActiva = false;
        btn.textContent = '🎮 Modo Simulación';
        btn.style.background = 'linear-gradient(135deg, #f093fb, #f5576c)';
        agregarAlerta('info', '⏹️ Simulación detenida');
        agregarEvento('sistema', 'info', 'Simulación detenida', null, null, 'NORMAL', '⏹️ Detenida');
    } else {
        // Iniciar simulación
        simulacionActiva = true;
        btn.textContent = '⏹️ Detener Simulación';
        btn.style.background = 'linear-gradient(135deg, #f5576c, #ff6b6b)';
        agregarAlerta('info', '🎮 Modo simulación activado');
        agregarEvento('sistema', 'info', 'Simulación iniciada', null, null, 'NORMAL', '🎮 Activa');
        
        // Inicializar valores de simulación
        datosSimulados = {
            humedad: 500,
            gas: 100,
            subiendoH: true,
            subiendoG: true
        };
        
        // Ejecutar simulación
        intervaloSimulacion = setInterval(() => {
            // Simular cambios de humedad
            if (datosSimulados.subiendoH) {
                datosSimulados.humedad += Math.random() * 30 + 5;
                if (datosSimulados.humedad > 800) datosSimulados.subiendoH = false;
            } else {
                datosSimulados.humedad -= Math.random() * 30 + 5;
                if (datosSimulados.humedad < 200) datosSimulados.subiendoH = true;
            }
            
            // Simular cambios de gas
            if (datosSimulados.subiendoG) {
                datosSimulados.gas += Math.random() * 20 + 3;
                if (datosSimulados.gas > 300) datosSimulados.subiendoG = false;
            } else {
                datosSimulados.gas -= Math.random() * 20 + 3;
                if (datosSimulados.gas < 50) datosSimulados.subiendoG = true;
            }
            
            // Limitar valores
            datosSimulados.humedad = Math.max(100, Math.min(900, datosSimulados.humedad));
            datosSimulados.gas = Math.max(20, Math.min(350, datosSimulados.gas));
            
            // Calcular frecuencia basada en gas
            const frecuencia = 1000 + (datosSimulados.gas / 350) * 4000;
            
            // Procesar lectura
            procesarLectura(
                Math.round(datosSimulados.humedad),
                Math.round(datosSimulados.gas),
                Math.round(frecuencia)
            );
            
        }, 1000);
    }
}

// ============================================
// PROCESAR LECTURA PRINCIPAL
// ============================================
function procesarLectura(humedad, gas, frecuencia) {
    // Guardar base si es primera lectura
    if (humedadBase === null) {
        humedadBase = humedad;
        document.getElementById('humedadBase').textContent = humedadBase;
    }
    if (gasBase === null) {
        gasBase = gas;
        document.getElementById('gasBase').textContent = gasBase;
    }
    
    contadorMuestras++;
    
    // Verificar cambios significativos para registrar eventos
    let eventoRegistrado = false;
    
    // Evento de humedad
    if (ultimoValorHumedad !== null && Math.abs(humedad - ultimoValorHumedad) >= UMBRAL_EVENTO_HUMEDAD) {
        const nivel = determinarNivelHumedad(humedad);
        const estado = determinarEstadoHumedad(humedad);
        const descripcion = `Cambio de humedad: ${ultimoValorHumedad} → ${humedad}`;
        const tipo = (nivel === 'CRITICO' || nivel === 'ALERTA') ? 'critico' : 'humedad';
        const severidad = (nivel === 'CRITICO') ? 'critical' : (nivel === 'ALERTA') ? 'warning' : 'info';
        
        agregarEvento(tipo, severidad, descripcion, ultimoValorHumedad, humedad, nivel, estado);
        eventoRegistrado = true;
    }
    
    // Evento de gas
    if (ultimoValorGas !== null && Math.abs(gas - ultimoValorGas) >= UMBRAL_EVENTO_GAS) {
        const nivel = determinarNivelGas(gas);
        const estado = determinarEstadoGas(gas);
        const descripcion = `Cambio de gas: ${ultimoValorGas} → ${gas}`;
        const tipo = (nivel === 'CRITICO') ? 'critico' : (nivel === 'ALERTA' ? 'alerta' : 'gas');
        const severidad = (nivel === 'CRITICO') ? 'critical' : (nivel === 'ALERTA') ? 'warning' : 'info';
        
        agregarEvento(tipo, severidad, descripcion, ultimoValorGas, gas, nivel, estado);
        eventoRegistrado = true;
    }
    
    // Alertas especiales
    if (gas > NIVELES.GAS.CRITICO) {
        agregarAlerta('danger', `🚨 ¡GAS CRÍTICO! Valor: ${gas}`);
        agregarEvento('critico', 'critical', `¡ALERTA CRÍTICA DE GAS! Valor: ${gas}`, ultimoValorGas, gas, 'CRITICO', '🚨 CRÍTICO');
    } else if (gas > NIVELES.GAS.ALERTA) {
        agregarAlerta('warning', `⚠️ Alerta de gas: ${gas}`);
    }
    
    if (humedad < NIVELES.HUMEDAD.ALERTA_BAJO || humedad > NIVELES.HUMEDAD.ALERTA_ALTO) {
        const estado = humedad < NIVELES.HUMEDAD.ALERTA_BAJO ? 'SECO' : 'HÚMEDO';
        agregarAlerta('warning', `⚠️ Humedad fuera de rango: ${humedad} (${estado})`);
    }
    
    // Actualizar valores actuales
    ultimoValorHumedad = humedad;
    ultimoValorGas = gas;
    
    // Actualizar dashboard
    actualizarDashboard(humedad, gas, frecuencia);
}

// ============================================
// ACTUALIZAR DASHBOARD
// ============================================
function actualizarDashboard(humedad, gas, frecuencia) {
    // Actualizar valores
    document.getElementById('humedadValor').textContent = humedad;
    document.getElementById('gasValor').textContent = gas;
    document.getElementById('frecuenciaValor').textContent = frecuencia;
    
    // Actualizar estados y tendencias
    const nivelH = determinarNivelHumedad(humedad);
    const nivelG = determinarNivelGas(gas);
    const estadoH = determinarEstadoHumedad(humedad);
    const estadoG = determinarEstadoGas(gas);
    
    // Tendencia de humedad
    if (ultimoValorHumedad !== null && ultimoValorHumedad !== humedad) {
        const tendencia = humedad > ultimoValorHumedad ? '⬆' : '⬇';
        document.getElementById('humedadTendencia').textContent = tendencia;
        document.getElementById('humedadEstado').textContent = humedad > ultimoValorHumedad ? 'SUBIENDO' : 'BAJANDO';
    }
    
    // Tendencia de gas
    if (ultimoValorGas !== null && ultimoValorGas !== gas) {
        const tendencia = gas > ultimoValorGas ? '⬆' : '⬇';
        document.getElementById('gasTendencia').textContent = tendencia;
        document.getElementById('gasEstado').textContent = gas > ultimoValorGas ? 'SUBIENDO' : 'BAJANDO';
    }
    
    // Badges
    const badgeH = document.getElementById('humedadBadge');
    const badgeG = document.getElementById('gasBadge');
    
    if (nivelH === 'CRITICO') {
        badgeH.textContent = '🚨 CRÍTICO';
        badgeH.className = 'badge badge-critical';
    } else if (nivelH === 'ALERTA') {
        badgeH.textContent = '⚠️ ALERTA';
        badgeH.className = 'badge badge-warning';
    } else if (nivelH === 'OPTIMO') {
        badgeH.textContent = '✅ ÓPTIMO';
        badgeH.className = 'badge badge-success';
    } else {
        badgeH.textContent = estadoH;
        badgeH.className = 'badge badge-info';
    }
    
    if (nivelG === 'CRITICO') {
        badgeG.textContent = '🚨 CRÍTICO';
        badgeG.className = 'badge badge-critical';
    } else if (nivelG === 'ALERTA') {
        badgeG.textContent = '⚠️ ALERTA';
        badgeG.className = 'badge badge-warning';
    } else {
        badgeG.textContent = estadoG;
        badgeG.className = 'badge badge-success';
    }
    
    // Niveles
    document.getElementById('humedadNivel').textContent = `Nivel: ${nivelH}`;
    document.getElementById('gasNivel').textContent = `Nivel: ${nivelG}`;
    
    // Estado general
    const estadoGeneral = document.getElementById('estadoGeneral');
    const alertaActiva = document.getElementById('alertaActiva');
    
    if (nivelG === 'CRITICO') {
        estadoGeneral.innerHTML = '🚨 ALERTA CRÍTICA - GAS';
        estadoGeneral.style.color = '#dc3545';
        alertaActiva.textContent = '🚨 ALERTA CRÍTICA';
        alertaActiva.style.color = '#dc3545';
    } else if (nivelG === 'ALERTA') {
        estadoGeneral.innerHTML = '⚠️ ALERTA DE GAS';
        estadoGeneral.style.color = '#ffc107';
        alertaActiva.textContent = '⚠️ ALERTA ACTIVA';
        alertaActiva.style.color = '#ffc107';
    } else if (nivelH === 'CRITICO' || nivelH === 'ALERTA') {
        estadoGeneral.innerHTML = `⚠️ Humedad ${nivelH}`;
        estadoGeneral.style.color = '#ffc107';
        alertaActiva.textContent = '⚠️ ALERTA ACTIVA';
        alertaActiva.style.color = '#ffc107';
    } else {
        estadoGeneral.innerHTML = '✅ TODO NORMAL';
        estadoGeneral.style.color = '#28a745';
        alertaActiva.textContent = '✅ Sin alertas';
        alertaActiva.style.color = '#28a745';
    }
    
    // Actualizar muestras
    document.getElementById('muestrasBadge').textContent = `Muestras: ${contadorMuestras}`;
    
    // Timestamp
    const ahora = new Date();
    document.getElementById('ultimaActualizacion').textContent = `⏰ ${ahora.toLocaleTimeString()}`;
    
    // Actualizar gráfica
    actualizarGrafica(humedad, gas, frecuencia);
}

// ============================================
// ACTUALIZAR GRÁFICA
// ============================================
function actualizarGrafica(humedad, gas, frecuencia) {
    const tiempo = new Date().toLocaleTimeString();
    
    chart.data.labels.push(tiempo);
    chart.data.datasets[0].data.push(humedad);
    chart.data.datasets[1].data.push(gas);
    chart.data.datasets[2].data.push(frecuencia);
    
    if (chart.data.labels.length > 50) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
        chart.data.datasets[1].data.shift();
        chart.data.datasets[2].data.shift();
    }
    
    chart.update();
}

// ============================================
// SISTEMA DE ALERTAS
// ============================================
function agregarAlerta(tipo, mensaje) {
    const lista = document.getElementById('alertasLista');
    const alerta = document.createElement('div');
    alerta.className = `alert-item ${tipo}`;
    const timestamp = new Date().toLocaleTimeString();
    alerta.innerHTML = `<strong>${timestamp}</strong> - ${mensaje}`;
    lista.insertBefore(alerta, lista.firstChild);
    
    while (lista.children.length > 20) {
        lista.removeChild(lista.lastChild);
    }
}

function limpiarAlertas() {
    const lista = document.getElementById('alertasLista');
    while (lista.children.length > 1) {
        lista.removeChild(lista.lastChild);
    }
    agregarAlerta('info', '🗑️ Alertas limpiadas');
}

// ============================================
// EXPORTAR FUNCIONES GLOBALES
// ============================================
window.conectarSerial = conectarSerial;
window.toggleSimulacion = toggleSimulacion;
window.filtrarEventos = filtrarEventos;
window.limpiarEventos = limpiarEventos;
window.limpiarAlertas = limpiarAlertas;
window.exportarEventos = exportarEventos;
window.toggleAutoScroll = toggleAutoScroll;

console.log('✅ Script cargado correctamente');
console.log('📌 Comandos disponibles:');
console.log('  conectarSerial() - Conectar/desconectar puerto serial');
console.log('  toggleSimulacion() - Iniciar/detener simulación');
console.log('  exportarEventos() - Exportar eventos a CSV');
console.log('  limpiarEventos() - Limpiar todos los eventos');
console.log('  limpiarAlertas() - Limpiar alertas');
