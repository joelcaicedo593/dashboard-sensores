// Configuración
let datosHistoricos = [];
let chart = null;
let simulacionActiva = false;
let intervaloSimulacion = null;
let humedadBase = null;
let gasBase = null;
let contadorMuestras = 0;
let puertoSerial = null;

// Inicializar gráfica al cargar
document.addEventListener('DOMContentLoaded', function() {
    inicializarGrafica();
    agregarAlerta('info', '💡 Sistema listo - Conecta tu Arduino o usa simulación');
});

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

// === FUNCIONES DE CONEXIÓN SERIAL ===
async function conectarSerial() {
    try {
        const status = document.getElementById('statusConexion');
        status.textContent = '⏳ Conectando...';
        status.style.color = 'orange';
        
        // Solicitar puerto
        puertoSerial = await navigator.serial.requestPort();
        await puertoSerial.open({ baudRate: 9600 });
        
        status.textContent = '🟢 Conectado';
        status.style.color = '#28a745';
        
        agregarAlerta('success', '✅ Conectado al puerto serial correctamente');
        
        // Iniciar lectura
        leerDatosSerial();
        
    } catch (error) {
        console.error('Error de conexión:', error);
        document.getElementById('statusConexion').textContent = '🔴 Error de conexión';
        agregarAlerta('danger', '❌ Error al conectar: ' + error.message);
    }
}

async function leerDatosSerial() {
    if (!puertoSerial) return;
    
    try {
        const reader = puertoSerial.readable.getReader();
        
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            const texto = new TextDecoder().decode(value);
            const lineas = texto.split('\n');
            
            for (const linea of lineas) {
                if (linea.trim() && !linea.startsWith('=') && !linea.startsWith('---')) {
                    procesarLinea(linea);
                }
            }
        }
    } catch (error) {
        console.error('Error leyendo datos:', error);
        agregarAlerta('danger', '❌ Error leyendo datos serial');
    }
}

// === PROCESAR DATOS ===
function procesarLinea(linea) {
    try {
        const partes = linea.split(',');
        if (partes.length >= 8) {
            const datos = {
                timestamp: partes[0],
                fecha: partes[1],
                humedad: parseFloat(partes[2]),
                gas: parseFloat(partes[3]),
                frecuencia: parseFloat(partes[4]),
                velocidad: parseFloat(partes[5]),
                estado_h: partes[6],
                estado_g: partes[7]
            };
            
            // Establecer base si es primera lectura
            if (humedadBase === null && datos.humedad) {
                humedadBase = datos.humedad;
            }
            if (gasBase === null && datos.gas) {
                gasBase = datos.gas;
            }
            
            contadorMuestras++;
            actualizarDashboard(datos);
        }
    } catch (e) {
        console.error('Error procesando línea:', e);
    }
}

// === ACTUALIZAR DASHBOARD ===
function actualizarDashboard(datos) {
    // Actualizar valores
    document.getElementById('humedadValor').textContent = datos.humedad.toFixed(0);
    document.getElementById('gasValor').textContent = datos.gas.toFixed(0);
    document.getElementById('frecuenciaValor').textContent = datos.frecuencia.toFixed(0);
    
    // Actualizar estados
    const estadoH = datos.estado_h || '';
    const estadoG = datos.estado_g || '';
    
    document.getElementById('humedadEstado').textContent = estadoH;
    document.getElementById('humedadTendencia').textContent = 
        estadoH.includes('SUBIENDO') ? '⬆' : 
        estadoH.includes('BAJANDO') ? '⬇' : '➡';
    
    document.getElementById('gasEstado').textContent = estadoG;
    document.getElementById('gasTendencia').textContent = 
        estadoG.includes('SUBIENDO') ? '⬆' : 
        estadoG.includes('BAJANDO') ? '⬇' : '➡';
    
    // Actualizar badges
    const humedad = datos.humedad;
    const gas = datos.gas;
    
    // Badge humedad
    const badgeH = document.getElementById('humedadBadge');
    if (humedad < 300) {
        badgeH.textContent = '⚠️ SECO';
        badgeH.className = 'badge badge-warning';
    } else if (humedad > 700) {
        badgeH.textContent = '⚠️ HÚMEDO';
        badgeH.className = 'badge badge-warning';
    } else {
        badgeH.textContent = '✅ ÓPTIMO';
        badgeH.className = 'badge badge-success';
    }
    
    // Badge gas
    const badgeG = document.getElementById('gasBadge');
    if (gas > 150) {
        badgeG.textContent = '💨 ¡GAS!';
        badgeG.className = 'badge badge-danger';
        agregarAlerta('danger', `🚨 ¡GAS DETECTADO! Valor: ${gas.toFixed(0)}`);
    } else {
        badgeG.textContent = '✅ NORMAL';
        badgeG.className = 'badge badge-success';
    }
    
    // Estado general
    const estadoGeneral = document.getElementById('estadoGeneral');
    if (gas > 150) {
        estadoGeneral.innerHTML = '🚨 ALERTA DE GAS';
        estadoGeneral.style.color = '#dc3545';
        document.getElementById('alertaActiva').textContent = '🚨 ALERTA ACTIVA';
        document.getElementById('alertaActiva').style.color = '#dc3545';
    } else if (humedad < 300 || humedad > 700) {
        estadoGeneral.innerHTML = '⚠️ Humedad fuera de rango';
        estadoGeneral.style.color = '#ffc107';
        document.getElementById('alertaActiva').textContent = '⚠️ ALERTA ACTIVA';
        document.getElementById('alertaActiva').style.color = '#ffc107';
    } else {
        estadoGeneral.innerHTML = '✅ TODO NORMAL';
        estadoGeneral.style.color = '#28a745';
        document.getElementById('alertaActiva').textContent = '✅ Sin alertas';
        document.getElementById('alertaActiva').style.color = '#28a745';
    }
    
    // Actualizar muestras
    document.getElementById('muestrasBadge').textContent = `Muestras: ${contadorMuestras}`;
    
    // Actualizar timestamp
    const ahora = new Date();
    document.getElementById('ultimaActualizacion').textContent = 
        `⏰ ${ahora.toLocaleTimeString()}`;
    
    // Actualizar gráfica
    actualizarGrafica(datos);
}

// === ACTUALIZAR GRÁFICA ===
function actualizarGrafica(datos) {
    const tiempo = new Date().toLocaleTimeString();
    
    chart.data.labels.push(tiempo);
    chart.data.datasets[0].data.push(datos.humedad);
    chart.data.datasets[1].data.push(datos.gas);
    chart.data.datasets[2].data.push(datos.frecuencia);
    
    // Mantener solo 50 puntos
    if (chart.data.labels.length > 50) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
        chart.data.datasets[1].data.shift();
        chart.data.datasets[2].data.shift();
    }
    
    chart.update();
}

// === MODO SIMULACIÓN ===
function iniciarSimulacion() {
    if (simulacionActiva) {
        clearInterval(intervaloSimulacion);
        simulacionActiva = false;
        document.getElementById('btnSimular').textContent = '🎮 Modo Simulación';
        agregarAlerta('info', '⏹️ Simulación detenida');
        return;
    }
    
    simulacionActiva = true;
    document.getElementById('btnSimular').textContent = '⏹️ Detener Simulación';
    agregarAlerta('info', '🎮 Modo simulación activado');
    
    let humedad = 500;
    let gas = 100;
    let subiendoH = true;
    let subiendoG = true;
    
    intervaloSimulacion = setInterval(() => {
        // Simular cambios
        if (subiendoH) {
            humedad += Math.random() * 30;
            if (humedad > 800) subiendoH = false;
        } else {
            humedad -= Math.random() * 30;
            if (humedad < 200) subiendoH = true;
        }
        
        if (subiendoG) {
            gas += Math.random() * 20;
            if (gas > 250) subiendoG = false;
        } else {
            gas -= Math.random() * 20;
            if (gas < 50) subiendoG = true;
        }
        
        // Crear datos simulados
        const datos = {
            humedad: Math.round(humedad),
            gas: Math.round(gas),
            frecuencia: Math.round(1000 + (gas / 1023) * 4000),
            estado_h: subiendoH ? '⬆ SUBIENDO' : '⬇ BAJANDO',
            estado_g: subiendoG ? '⬆ SUBIENDO' : '⬇ BAJANDO'
        };
        
        // Establecer base si es primera simulación
        if (humedadBase === null) {
            humedadBase = datos.humedad;
        }
        if (gasBase === null) {
            gasBase = datos.gas;
        }
        
        contadorMuestras++;
        actualizarDashboard(datos);
        
    }, 1500);
}

// === ALERTAS ===
function agregarAlerta(tipo, mensaje) {
    const lista = document.getElementById('alertasLista');
    const alerta = document.createElement('div');
    alerta.className = `alert-item ${tipo}`;
    const timestamp = new Date().toLocaleTimeString();
    alerta.innerHTML = `
        <strong>${timestamp}</strong> - ${mensaje}
    `;
    lista.insertBefore(alerta, lista.firstChild);
    
    // Mantener solo 20 alertas
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

// === COMANDOS DESDE CONSOLA ===
console.log('=== DASHBOARD SENSORES ===');
console.log('Comandos disponibles:');
console.log('  conectarSerial() - Conectar puerto serial');
console.log('  iniciarSimulacion() - Iniciar modo simulación');
console.log('  limpiarAlertas() - Limpiar alertas');
console.log('========================');
