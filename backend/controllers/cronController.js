// controllers/cronController.js
const admin = require('firebase-admin');
const db = admin.firestore();

function todayInEuropeMadrid() {
    const now = new Date();
    const fmt = new Intl.DateTimeFormat('es-ES', {
        timeZone: 'Europe/Madrid',
        year: 'numeric', month: '2-digit', day: '2-digit'
    });
    const parts = fmt.formatToParts(now).reduce((a, p) => (a[p.type] = p.value, a), {});
    return new Date(parseInt(parts.year, 10), parseInt(parts.month, 10) - 1, parseInt(parts.day, 10));
}

// 'YYYY-MM-DD' -> Date
function parseYyyyMmDd(s) {
    if (!s || typeof s !== 'string') return null;
    const [yyyy, mm, dd] = s.split('-').map(Number);
    if (!yyyy || !mm || !dd) return null;
    return new Date(yyyy, mm - 1, dd);
}

const dailyStudyStatus = async (req, res) => {
    try {
        const hoy = todayInEuropeMadrid();

        // 1) Trae los estudios en "Sin empezar"
        // Firestore permite dot notation para campos anidados:
        const snap = await db.collection('estudios')
            .where('data.NuevoEstudioFormData.estado', '==', 'Sin empezar')
            .get();

        if (snap.empty) {
            return res.status(200).json({ ok: true, updatedToEnCurso: 0 });
        }

        // 2) Filtra por fechaInicio <= hoy
        const candidatos = snap.docs.filter(d => {
            const fechaInicioStr = d.get('data.NuevoEstudioFormData.fechaInicio'); // 'YYYY-MM-DD'
            const di = parseYyyyMmDd(fechaInicioStr);
            return di && di <= hoy;
        });

        // 3) Actualiza en lotes de 500
        const BATCH_SIZE = 500;
        let total = 0;
        for (let i = 0; i < candidatos.length; i += BATCH_SIZE) {
            const slice = candidatos.slice(i, i + BATCH_SIZE);
            const batch = db.batch();
            slice.forEach(doc => {
                const ref = doc.ref;
                batch.update(ref, {
                    'data.NuevoEstudioFormData.estado': 'En curso',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            });
            await batch.commit();
            total += slice.length;
        }

        return res.status(200).json({ ok: true, updatedToEnCurso: total });
    } catch (e) {
        console.error('dailyStudyStatus error:', e);
        return res.status(500).json({ ok: false, error: e.message });
    }
};

module.exports = { dailyStudyStatus };
