// Configuración de GitHub (¡Reemplaza estos valores con los tuyos!)
const GITHUB_TOKEN = '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'; // Ej: ghp_xxxxxxxxxxxxxxxxxxxx
const GITHUB_OWNER = 'Yxff26';
const GITHUB_REPO = 'HOMS-FIRMAS';

// Función para subir archivos a la API de GitHub
async function uploadToGitHub(filename, base64Content, folderName) {
    if (GITHUB_TOKEN === 'TU_TOKEN_AQUI') {
        alert("Falta configurar: Debes poner tu GITHUB_TOKEN, USUARIO y REPOSITORIO en las primeras líneas de script.js");
        return false;
    }

    const path = `${folderName}/${filename}`;
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
    
    // Remover el prefijo 'data:image/png;base64,' o 'data:application/pdf;base64,'
    const cleanBase64 = base64Content.split(',')[1] || base64Content;

    const data = {
        message: `Agregado ${filename} desde la tablet`,
        content: cleanBase64
    };

    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            console.log(`Guardado exitoso: ${path}`);
            return true;
        } else {
            const error = await response.json();
            console.error("Error de GitHub:", error);
            alert(`Error de GitHub: ${error.message}`);
            return false;
        }
    } catch (error) {
        console.error("Error de red:", error);
        alert("Error de conexión al intentar subir el archivo a GitHub.");
        return false;
    }
}

// Arreglo para almacenar referencias de los canvas si se necesitan
const canvases = {};

// Inicializa la funcionalidad de dibujo en un canvas específico
function initCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let isDrawing = false;

    // Configuración del lápiz
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000000';

    // Función para limpiar fondo (opcional, para evitar transparencia al exportar a veces)
    // Para firmas lo mantenemos transparente en la web pero le daremos fondo al exportar.

    canvases[canvasId] = { canvas, ctx };

    function getCoordinates(e) {
        const rect = canvas.getBoundingClientRect();
        // Calcular escala para compensar si el canvas se renderiza a un tamaño distinto de su width/height
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        let clientX = e.clientX;
        let clientY = e.clientY;
        
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        }

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    function startDrawing(e) {
        isDrawing = true;
        const coords = getCoordinates(e);
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
        e.preventDefault();
    }

    function draw(e) {
        if (!isDrawing) return;
        const coords = getCoordinates(e);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
        e.preventDefault();
    }

    function stopDrawing() {
        if (isDrawing) {
            ctx.closePath();
            isDrawing = false;
        }
    }

    // Eventos de Mouse
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // Eventos Touch (Móviles)
    canvas.addEventListener('touchstart', startDrawing, {passive: false});
    canvas.addEventListener('touchmove', draw, {passive: false});
    canvas.addEventListener('touchend', stopDrawing);
}

// Limpiar el canvas
function clearCanvas(canvasId) {
    const canvasData = canvases[canvasId];
    if (canvasData) {
        const { canvas, ctx } = canvasData;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

// Inicializar todos los canvas cuando el DOM cargue
document.addEventListener('DOMContentLoaded', () => {
    initCanvas('canvas-doctor');
    initCanvas('canvas-consent');
});

// Función para generar la imagen de la firma del médico
async function generateDoctorImage() {
    const name = document.getElementById('doc-name').value.trim();
    const specialty = document.getElementById('doc-specialty').value.trim();
    const exq = document.getElementById('doc-exq').value.trim();
    const sigCanvas = document.getElementById('canvas-doctor');

    if (!name) {
        alert('Por favor ingrese el nombre del médico.');
        return;
    }

    // Crear un canvas temporal para combinar la firma y los textos
    const finalCanvas = document.createElement('canvas');
    const fCtx = finalCanvas.getContext('2d');
    
    // Dimensiones de la imagen final (semejante a la imagen de referencia)
    finalCanvas.width = 600;
    finalCanvas.height = 350;

    // Fondo blanco
    fCtx.fillStyle = '#ffffff';
    fCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

    // Dibujar la firma centrada arriba
    // El canvas original es 500x200
    fCtx.drawImage(sigCanvas, 50, 10);

    // Dibujar línea horizontal
    fCtx.beginPath();
    fCtx.moveTo(80, 220);
    fCtx.lineTo(520, 220);
    fCtx.lineWidth = 2.5;
    fCtx.strokeStyle = '#000000';
    fCtx.stroke();

    // Dibujar textos
    fCtx.fillStyle = '#000000';
    fCtx.textAlign = 'center';
    fCtx.textBaseline = 'top';
    
    // Nombre (Bold)
    fCtx.font = 'bold 22px Arial, sans-serif';
    fCtx.fillText(name, finalCanvas.width / 2, 235);

    // Especialidad (Normal pero gruesa)
    fCtx.font = 'bold 18px Arial, sans-serif';
    if (specialty) {
        fCtx.fillText(specialty, finalCanvas.width / 2, 265);
    }

    // Exequatur
    fCtx.font = 'bold 18px Arial, sans-serif';
    if (exq) {
        fCtx.fillText(`Exq. : ${exq}`, finalCanvas.width / 2, 290);
    }

    // Preparar archivo
    const dataUrl = finalCanvas.toDataURL('image/png');
    const filename = `Firma_${name.replace(/\s+/g, '_')}.png`;

    // Cambiar estado del botón
    const btn = document.querySelector('#doctor-section .btn-primary');
    const originalText = btn.innerText;
    btn.innerText = "Guardando en GitHub...";
    btn.disabled = true;

    // Subir a GitHub en la carpeta FIRMAS
    const success = await uploadToGitHub(filename, dataUrl, 'FIRMAS');

    if (success) {
        alert(`¡Firma guardada exitosamente en la carpeta FIRMAS de GitHub como ${filename}!`);
        // Opcional: Limpiar el canvas para el próximo uso
        // clearCanvas('canvas-doctor');
    }

    // Restaurar botón
    btn.innerText = originalText;
    btn.disabled = false;
}

// Función para generar el PDF del consentimiento
async function generateConsentPDF() {
    // Asegurarse de que jsPDF esté cargado
    if (!window.jspdf) {
        alert('La librería para crear PDF no se pudo cargar. Verifique su conexión a internet.');
        return;
    }

    // Obtener nombre del doctor
    const doctorName = document.getElementById('doc-name').value.trim();
    if (!doctorName) {
        alert('Por favor ingrese el nombre del médico en la Sección 1 para generar el consentimiento a su nombre.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Configuración inicial
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Logo HOMS (homsLogoBase64 está definido en logo.js)
    if (typeof homsLogoBase64 !== 'undefined') {
        doc.addImage(homsLogoBase64, 'PNG', pageWidth / 2 - 35, 20, 70, 30);
    }
    
    // Título
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("CONSENTIMIENTO DE USO DE FIRMA DIGITAL", pageWidth / 2, 70, { align: "center" });
    
    // Texto de consentimiento
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    const text = "Por medio de la presente, yo, " + doctorName + ", autorizo formalmente al Hospital Metropolitano de Santiago (HOMS) a utilizar mi firma digital registrada en este documento exclusivamente para la validación, autorización y emisión de reportes médicos dentro del nuevo sistema Ramsoft. Entiendo y acepto que el uso de esta firma tiene la misma validez legal que mi firma autógrafa.";
    
    // Ajustar texto
    const textLines = doc.splitTextToSize(text, 170);
    doc.text(textLines, pageWidth / 2, 85, { align: "center", lineHeightFactor: 1.5 });

    // Obtener imagen del canvas de consentimiento
    const sigCanvas = document.getElementById('canvas-consent');
    const sigData = sigCanvas.toDataURL('image/png');
    
    // Añadir imagen de la firma al PDF (centrada)
    const imgWidth = 110;
    const imgHeight = 44;
    const imgX = (pageWidth - imgWidth) / 2;
    doc.addImage(sigData, 'PNG', imgX, 125, imgWidth, imgHeight);

    // Línea debajo de la firma
    doc.setLineWidth(0.5);
    doc.line(imgX + 5, 170, imgX + imgWidth - 5, 170);

    // Etiqueta debajo de la línea
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(doctorName, pageWidth / 2, 178, { align: "center" });

    doc.setFontSize(11);
    doc.setFont("helvetica", "italic");
    doc.text("Firma del Médico Autorizante", pageWidth / 2, 185, { align: "center" });

    // Fecha
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const date = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Santiago, República Dominicana a ${date}`, pageWidth / 2, 195, { align: "center" });

    // Obtener PDF en formato Base64 (data URI)
    const pdfDataUri = doc.output('datauristring');
    const filename = `Consentimiento_Ramsoft_${doctorName.replace(/\s+/g, '_')}.pdf`;

    // Cambiar estado del botón
    const btn = document.querySelector('#consent-section .btn-primary');
    const originalText = btn.innerText;
    btn.innerText = "Guardando en GitHub...";
    btn.disabled = true;

    // Subir a GitHub en la carpeta CONSENTIMIENTOS
    const success = await uploadToGitHub(filename, pdfDataUri, 'CONSENTIMIENTOS');

    if (success) {
        alert(`¡Consentimiento guardado exitosamente en la carpeta CONSENTIMIENTOS de GitHub como ${filename}!`);
        // Opcional: Limpiar el canvas
        // clearCanvas('canvas-consent');
    }

    // Restaurar botón
    btn.innerText = originalText;
    btn.disabled = false;
}
