// =============================================
// CONFIGURACIÓ - Canvia aquests valors
// =============================================

// ID de la Google Sheet
const SHEET_ID = '1PLmSQnNZ_fZNb7N_Mk93hADC97VWA9atW3HB8NeZRWE';

// URL d'acció del Google Form
const FORM_ACTION_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSciSleZEyeOfPXwaAduC7rQVScHNM2S8HfZGYIdZWi6EcxFeA/formResponse';

// IDs dels camps del Google Form
const FORM_FIELDS = {
    dia: 'entry.1222053896',
    nom: 'entry.443078001',
    contacte: 'entry.1604692171',
    missatge: 'entry.2108800721',
};

// =============================================
// ABRIL 2026: Dimecres 1 d'abril
// =============================================
const DAYS_IN_APRIL = 30;

// =============================================
// DADES OFFLINE (fallback si no hi ha Sheet)
// =============================================
// Si no has configurat la Google Sheet encara, pots editar
// l'estat dels dies directament aquí.
// Estats: 'disponible', 'pendiente', 'confirmado'
const OFFLINE_DATA = {};
// Exemple:
// const OFFLINE_DATA = {
//     1: { estado: 'confirmado', nombre: 'Pere' },
//     2: { estado: 'pendiente', nombre: 'Maria' },
//     15: { estado: 'confirmado', nombre: 'Anna' },
// };

// =============================================
// APP
// =============================================

const calendarGrid = document.getElementById('calendarGrid');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');
const modalDay = document.getElementById('modalDay');
const modalFormContainer = document.getElementById('modalFormContainer');
const loadingMsg = document.getElementById('loadingMsg');
const inscriptionForm = document.getElementById('inscriptionForm');
const formSuccess = document.getElementById('formSuccess');
const successDay = document.getElementById('successDay');
const formSubmit = document.getElementById('formSubmit');

let calendarData = {};
let selectedDay = null;

// Fetch data from published Google Sheet (CSV)
async function fetchSheetData() {
    if (!SHEET_ID) {
        console.log('No SHEET_ID configurat. Usant dades offline.');
        return OFFLINE_DATA;
    }

    // Usar Google Visualization API (soporta CORS sin necesidad de "Publicar en la web")
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=2049338348`;

    try {
        const response = await fetch(gvizUrl);
        if (!response.ok) throw new Error('Error fetching sheet');
        const csv = await response.text();
        return parseCSV(csv);
    } catch (err) {
        console.warn('Error carregant Google Sheet, usant dades offline:', err);
        return OFFLINE_DATA;
    }
}

// Parse CSV from "Calendario" sheet
// Columnes: Dia | Estado | Nombre | Hora | Lugar
function parseCSV(csv) {
    const data = {};
    const lines = csv.split('\n');

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = parseCSVLine(line);
        const day = parseInt(cols[0]);
        if (isNaN(day) || day < 1 || day > 30) continue;

        data[day] = {
            estado: (cols[1] || 'disponible').trim().toLowerCase(),
            nombre: (cols[2] || '').trim(),
            hora: (cols[3] || '').trim(),
            lugar: (cols[4] || '').trim(),
            foto: (cols[5] || '').trim(),
            km: (cols[6] || '').trim(),
        };
    }

    return data;
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    result.push(current);
    return result;
}

// Render calendar grid
function renderCalendar(data) {
    calendarGrid.innerHTML = '';

    // 1 April 2026 = Wednesday. Mon-based grid: Mon=0, Tue=1, Wed=2
    const emptyBefore = 2;

    for (let i = 0; i < emptyBefore; i++) {
        const empty = document.createElement('div');
        empty.className = 'calendar-day empty';
        calendarGrid.appendChild(empty);
    }

    for (let day = 1; day <= DAYS_IN_APRIL; day++) {
        const dayData = data[day] || { estado: 'disponible', nombre: '' };
        const estado = dayData.estado || 'disponible';

        const cell = document.createElement('div');
        cell.className = `calendar-day ${estado}`;

        const dayNum = document.createElement('span');
        dayNum.textContent = day;
        cell.appendChild(dayNum);

        // Si hay foto, mostrar miniatura
        if (estado === 'confirmado' && dayData.foto) {
            const img = document.createElement('img');
            img.src = dayData.foto;
            img.className = 'day-photo';
            cell.appendChild(img);
        }

        // Si hay km, mostrar texto
        if (estado === 'confirmado' && dayData.km) {
            const kmEl = document.createElement('div');
            kmEl.className = 'day-km';
            kmEl.textContent = `${dayData.km} km`;
            cell.appendChild(kmEl);
        }

        if (estado === 'disponible') {
            cell.addEventListener('click', () => openModal(day));
        }

        calendarGrid.appendChild(cell);
    }

    loadingMsg.classList.add('hidden');
}

// Open modal
function openModal(day) {
    selectedDay = day;
    modalDay.textContent = day;
    successDay.textContent = day;

    // Reset form
    inscriptionForm.reset();
    inscriptionForm.classList.remove('hidden');
    formSuccess.classList.add('hidden');
    formSubmit.disabled = false;
    formSubmit.textContent = 'Enviar sol·licitud';

    // Clear error states
    inscriptionForm.querySelectorAll('.error').forEach(el => el.classList.remove('error'));

    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Focus first field
    setTimeout(() => document.getElementById('formName').focus(), 300);
}

// Close modal
function closeModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
    selectedDay = null;
}

// Form submission
inscriptionForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('formName').value.trim();
    const contact = document.getElementById('formContact').value.trim();
    const message = document.getElementById('formMessage').value.trim();

    // Validate
    let valid = true;
    if (!name) {
        document.getElementById('formName').classList.add('error');
        valid = false;
    } else {
        document.getElementById('formName').classList.remove('error');
    }
    if (!contact) {
        document.getElementById('formContact').classList.add('error');
        valid = false;
    } else {
        document.getElementById('formContact').classList.remove('error');
    }

    if (!valid) return;

    formSubmit.disabled = true;
    formSubmit.textContent = 'Enviant...';

    // Submit to Google Form if configured
    if (FORM_ACTION_URL) {
        try {
            const formData = new URLSearchParams();
            formData.append(FORM_FIELDS.dia, selectedDay);
            formData.append(FORM_FIELDS.nom, name);
            formData.append(FORM_FIELDS.contacte, contact);
            formData.append(FORM_FIELDS.missatge, message);

            // Use hidden iframe to avoid CORS issues
            const iframe = document.getElementById('hiddenFrame');
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = FORM_ACTION_URL;
            form.target = 'hiddenFrame';

            for (const [key, value] of formData.entries()) {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = value;
                form.appendChild(input);
            }

            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);
        } catch (err) {
            console.warn('Error enviant formulari:', err);
        }
    } else {
        console.log('Formulari enviat (sense Google Form configurat):', {
            dia: selectedDay, nom: name, contacte: contact, missatge: message
        });
    }

    // Show success
    inscriptionForm.classList.add('hidden');
    formSuccess.classList.remove('hidden');
});

// Close modal events
modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

// Init
async function init() {
    calendarData = await fetchSheetData();
    renderCalendar(calendarData);
}

init();
