// ============================================
// SISTEMA DE REGISTRO DE EVENTOS
// ============================================

// Configuración
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
let ultimoValorHumedad = null;
let ultimoValorGas = null;

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

// Inicializar
document.addEventListener('DOMContentLoaded', function() {
    inicializarGrafica();
    agregarAlerta('info', '💡 Sistema de registro de eventos activado');
    agregarEvento('Sistema', 'info', 'Sistema iniciado', 0, 0, 'NORMAL', '✅ Sistema listo');
});

// === INICIALIZAR GRÁFICA ===
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

// === SISTEMA DE EVENTOS ===
function agregarEvento(tipo, severidad, descripcion, valorAnterior, valorActual, nivel, estado) {
    const timestamp = new Date();
    const evento = {
        id: ++contadorEventos,
        timestamp: timestamp,
        timestampStr: timestamp.toLocaleString(),
        tipo: tipo, // 'humedad', 'gas', 'alerta', 'critico', 'sistema'
        severidad: severidad, // 'info', 'warning', 'danger', 'success', 'critical'
        descripcion: descripcion,
        valorAnterior: valorAnterior,
        valorActual: valorActual,
        nivel: nivel,
        estado: estado
    };
    
    // Agregar al inicio (más reciente primero)
    eventos.unshift(evento);
    
    // Mantener solo últimos 500 eventos
    if (eventos.length > 500) {
        eventos = eventos.slice(0, 500);
    }
    
    // Actualizar UI
    actualizarTablaEventos();
    actualizarResumenEventos();
    
    // Actualizar contador en header
    document.getElementById('eventosRegistrados').textContent = `📝 Eventos: ${eventos.length}`;
    
    // Actualizar último evento
    document.getElementById('ultimoEvento').textContent = `Último: ${evento.timestampStr}`;
    
    // Log en consola
    console.log(`[${evento.timestampStr}] ${tipo.toUpperCase()} - ${descripcion}`);
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
        
        html += `
            <tr class="${claseFila}">
                <td>${evento.id}</td>
                <td>${evento.timestampStr}</td>
                <td>${icono} ${evento.tipo.charAt(0).toUpperCase() + evento.tipo.slice(1)}</td>
                <td>${evento.severidad}</td>
                <td>${evento.valorAnterior !== null ? evento.valorAnterior : '-'}</td>
                <td>${evento.valorActual !== null ? evento.valorActual : '-'}</td>
                <td>${evento.valorAnterior !== null && evento.valorActual !== null ? (evento.valorActual - evento.valorAnterior) : '-'}</td>
                <td>${badgeNivel}</td>
                <td>${evento.estado}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    
    // Auto-scroll si está activado
    if (autoScroll) {
        const wrapper = document.querySelector('.events-table-wrapper');
        wrapper.scrollTop = 0;
    }
}

function filtrarEventosLista() {
    if (filtroActual === 'todos') return eventos;
    if (filtroActual === 'humedad') return eventos.filter(e => e.tipo === 'humedad');
    if (filtroActual === 'gas') return eventos.filter(e => e.tipo === 'gas');
    if (filtroActual === 'alerta') return eventos.filter(e => e.tipo === 'alerta');
    if (filtroActual === 'critico') return eventos.filter(e => e.tipo === 'critico');
    return eventos;
}

function filtrarEventos(filtro) {
    filtroActual = filtro;
    
    // Actualizar botones activos
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filtro) {
            btn.classList.add('active');
        }
    });
    
    actualizarTablaEventos();
}

function getIconoEvento(tipo) {
    const iconos = {
        'humedad': '💧',
        'gas': '🌫️',
        'alerta': '🔔',
        'critico': '🚨',
        'sistema': 'ℹ️',
        'info': 'ℹ️'
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
    const total = eventos.length;
    const alertas = eventos.filter(e => e.tipo === 'alerta' || e.tipo === 'critico').length;
    const humedad = eventos.filter(e => e.tipo === 'humedad').length;
    const gas = eventos.filter(e => e.tipo === 'gas').length;
    const criticos = eventos.filter(e => e.tipo === 'critico').length;
    
    document.getElementById('totalEventos').textContent = total;
    document.getElementById('totalAlertas').textContent = alertas;
    document.getElementById('totalHumedad').textContent = humedad;
    document.getElementById('totalGas').textContent = gas;
    document.getElementById('totalCriticos').textContent = criticos;
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
    
    // Crear CSV
    let csv = 'ID,Timestamp,Tipo,Severidad,Descripcion,ValorAnterior,ValorActual,Nivel,Estado\n';
    eventos.forEach(e => {
        csv += `${e.id},"${e.timestampStr}",${e.tipo},${e.severidad},"${e.descripcion}",${e.valorAnterior ?? ''},${e.valorActual ?? ''},${e.nivel},"${e.estado}"\n`;
    });
    
    // Descargar
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

// === DETECCIÓN DE NIVELES ===
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

// === PROCESAR DATOS CON REGISTRO DE EVENTOS ===
function procesarDatosConEventos(humedad, gas) {
    // Primera lectura - establecer base
    if (ultimoValorHumedad === null) {
        ultimoValorHumedad = humedad;
        ultimoValorGas = gas;
        if (humedadBase === null) humedadBase = humedad;
        if (gasBase === null) gasBase = gas;
        
        // Registrar estado inicial
        const nivelH = determinarNivelHumedad(humedad);
        const nivelG = determinarNivelGas(gas);
        const estadoH = determinarEstadoHumedad(humedad);
        const estadoG = determinarEstadoGas(gas);
        
       
